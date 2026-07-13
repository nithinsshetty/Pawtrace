// ==========================================================================
// PET MANAGEMENT MODULE (CRUD, Profile Details, QR Tag generator, Shared Panels)
// ==========================================================================

import { db, storage, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate, calculateAge, getPetImageHTML, getPetPlaceholder, generatePawTraceId } from './utils.js';
import { Router } from './router.js';
import { renderCaregiverManager } from './caregiver.js';
import { showOrderModal } from './orders.js';

/**
 * Renders the main pets list page
 */
export async function renderPets() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'My Companions';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div class="flex-between mb-2">
      <div>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Register, view, and print PawTrace tags for your pets.</p>
      </div>
      <button id="btn-add-pet" class="btn btn-primary">
        <i class="fa-solid fa-plus"></i> Add Pet Profile
      </button>
    </div>

    <div id="pets-list-container" class="pets-grid">
      <!-- Loading Skeletons -->
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>
  `;

  // Bind Add Pet Wizard route
  document.getElementById('btn-add-pet').onclick = () => Router.navigate('/pet/register');

  // Load pets
  await loadUserPetsList(user.uid);
}

/**
 * Fetch pets matching user uid from Firestore
 */
async function loadUserPetsList(uid) {
  const container = document.getElementById('pets-list-container');
  if (!db) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-database"></i>
        <p>Database config missing. Please set your credentials.</p>
      </div>
    `;
    return;
  }

  showLoading(true, "Fetching pet profiles...");
  try {
    const snapshot = await db.collection('pets').where('ownerId', '==', uid).get();
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-paw" style="font-size:3rem; color:var(--teal); opacity:0.6;"></i>
          <h3>No pets registered</h3>
          <p>Get started by clicking the "Add Pet Profile" button above.</p>
        </div>
      `;
      return;
    }

    snapshot.forEach((doc) => {
      const pet = doc.data();
      pet.id = doc.id;

      const isDraft = pet.isDraft === true;
      const badgeClass = isDraft ? 'draft' : (pet.lostStatus === 'LOST' ? 'lost' : 'safe');
      const badgeText = isDraft ? 'DRAFT' : (pet.lostStatus || 'SAFE');
      const actionLink = isDraft ? `#/pet/${pet.id}/edit` : `#/pet/${pet.id}`;
      const actionText = isDraft ? '<i class="fa-solid fa-pen-to-square"></i> Edit Draft' : '<i class="fa-solid fa-folder-open"></i> View Records';

      const card = document.createElement('div');
      card.className = 'glass-card pet-card magnetic-card';
      card.innerHTML = `
        <div class="pet-image-container">
          ${getPetImageHTML(pet, 'large')}
          <span class="pet-status-badge ${badgeClass}">
            ${badgeText}
          </span>
        </div>
        <div class="pet-card-content">
          <h4 class="pet-card-name" style="display:flex; justify-content:space-between; align-items:center;">
            <span>${pet.name}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:500;">${pet.pawTraceId || 'PT-PENDING'}</span>
          </h4>
          <div class="pet-card-meta">
            <span><i class="fa-solid fa-dna"></i> ${pet.breed || 'Unknown'}</span>
            <span>•</span>
            <span><i class="fa-solid fa-venus-mars"></i> ${pet.gender || 'N/A'}</span>
          </div>
          <div class="pet-card-actions">
            <a href="${actionLink}" class="btn btn-secondary btn-full" style="font-size:0.8rem; padding: 0.5rem 1rem;">
              ${actionText}
            </a>
            <button class="btn btn-danger btn-delete-pet" data-id="${pet.id}" data-name="${pet.name}" style="padding: 0.5rem;">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Bind Delete Handlers
    container.querySelectorAll('.btn-delete-pet').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        confirmDeletePet(id, name);
      };
    });

  } catch (error) {
    console.error("Error loading pets list:", error);
    showToast("Failed to load pet profiles.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Dialog Form to Add/Edit Pet
 */
function showAddPetModal(existingPet = null) {
  const isEdit = !!existingPet;
  showModal({
    title: isEdit ? `Edit Profile: ${existingPet.name}` : "Register New Companion",
    bodyHtml: `
      <form id="pet-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-row">
          <div class="form-group">
            <label for="pet-name">Pet Name *</label>
            <input type="text" id="pet-name" class="form-control" value="${isEdit ? existingPet.name : ''}" required placeholder="E.g. Rex">
          </div>
          <div class="form-group">
            <label for="pet-breed">Breed *</label>
            <input type="text" id="pet-breed" class="form-control" value="${isEdit ? existingPet.breed : ''}" required placeholder="E.g. Golden Retriever">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="pet-dob">Date of Birth</label>
            <input type="date" id="pet-dob" class="form-control" value="${isEdit ? existingPet.dob || '' : ''}">
          </div>
          <div class="form-group">
            <label for="pet-gender">Gender</label>
            <select id="pet-gender" class="form-control">
              <option value="Male" ${isEdit && existingPet.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${isEdit && existingPet.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Unknown" ${isEdit && existingPet.gender === 'Unknown' ? 'selected' : ''}>Unknown/Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="pet-weight">Weight (kg) *</label>
            <input type="number" step="0.1" id="pet-weight" class="form-control" value="${isEdit ? existingPet.weight || '' : ''}" required placeholder="E.g. 12.5">
          </div>
          <div class="form-group">
            <label for="pet-privacy">Privacy Settings</label>
            <select id="pet-privacy" class="form-control">
              <option value="public" ${isEdit && existingPet.privacySettings === 'public' ? 'selected' : ''}>Public Recovery (Contact Info Visible)</option>
              <option value="private" ${isEdit && existingPet.privacySettings === 'private' ? 'selected' : ''}>Private (Hide details until lost)</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="pet-emergency">Emergency Contact Phone *</label>
            <input type="tel" id="pet-emergency" class="form-control" value="${isEdit ? existingPet.emergencyContact || '' : ''}" required placeholder="+1 (555) 123-4567">
          </div>
          <div class="form-group">
            <label for="pet-vacc">Vaccination Status</label>
            <select id="pet-vacc" class="form-control">
              <option value="Up-to-date" ${isEdit && existingPet.vaccinationStatus === 'Up-to-date' ? 'selected' : ''}>Up to Date</option>
              <option value="Incomplete" ${isEdit && existingPet.vaccinationStatus === 'Incomplete' ? 'selected' : ''}>Incomplete/Pending</option>
              <option value="Unknown" ${isEdit && existingPet.vaccinationStatus === 'Unknown' ? 'selected' : ''}>Unknown</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="pet-image">Profile Photo</label>
          <input type="file" id="pet-image" class="form-control" accept="image/*">
          <small style="color:var(--text-muted); font-size:0.75rem;">Max file size 3MB. Formats: JPG, PNG, WEBP.</small>
        </div>

        <div class="form-group">
          <label for="pet-notes">Critical Medical Notes</label>
          <textarea id="pet-notes" class="form-control" rows="3" placeholder="Allergies, chronic diseases, or medication schedule details...">${isEdit ? existingPet.medicalNotes || '' : ''}</textarea>
        </div>
      </form>
    `,
    confirmText: isEdit ? "Save Updates" : "Create Profile",
    onConfirm: async () => {
      const form = document.getElementById('pet-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const name = document.getElementById('pet-name').value.trim();
      const breed = document.getElementById('pet-breed').value.trim();
      const dob = document.getElementById('pet-dob').value;
      const gender = document.getElementById('pet-gender').value;
      const weight = parseFloat(document.getElementById('pet-weight').value);
      const privacy = document.getElementById('pet-privacy').value;
      const emergency = document.getElementById('pet-emergency').value.trim();
      const vacc = document.getElementById('pet-vacc').value;
      const notes = document.getElementById('pet-notes').value.trim();
      const imageFileInput = document.getElementById('pet-image');

      const user = getCurrentUser();
      if (!user) return false;

      let profileImageUrl = isEdit ? existingPet.profileImage : '';
      if (imageFileInput.files.length > 0) {
        const file = imageFileInput.files[0];
        const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
        if (error) {
          showToast(error, "warning");
          return true;
        }

        try {
          if (storage) {
            const petIdPlaceholder = isEdit ? existingPet.id : `temp-${Date.now()}`;
            const ref = storage.ref(`pets/${petIdPlaceholder}/profile_${Date.now()}`);
            const snapshot = await ref.put(file);
            profileImageUrl = await snapshot.ref.getDownloadURL();
          } else {
            profileImageUrl = await readFileAsDataURL(file);
          }
        } catch (storageError) {
          profileImageUrl = await readFileAsDataURL(file);
        }
      }

      const age = calculateAge(dob);
      const petData = {
        name,
        breed,
        dob,
        age,
        gender,
        weight,
        privacySettings: privacy,
        emergencyContact: emergency,
        vaccinationStatus: vacc,
        medicalNotes: notes,
        profileImage: profileImageUrl,
        ownerId: user.uid,
        ownerContact: user.email,
        lastUpdated: fb.firestore.FieldValue.serverTimestamp()
      };

      try {
        if (isEdit) {
          await db.collection('pets').doc(existingPet.id).update(petData);
          showToast(`Successfully updated profile for ${name}`, "success");
        } else {
          const traceId = await generatePawTraceId();
          petData.pawTraceId = traceId;
          petData.lostStatus = 'SAFE';
          petData.createdAt = fb.firestore.FieldValue.serverTimestamp();
          petData.sharedWithVets = [];
          
          await db.collection('pets').add(petData);
          showToast(`Successfully registered ${name}!`, "success");
        }

        closeModal();
        if (isEdit) {
          renderPetDetail({ id: existingPet.id });
        } else {
          renderPets();
        }
        return false;
      } catch (err) {
        console.error("Save Pet Error:", err);
        showToast("Error updating pet profile.", "error");
        return true;
      }
    }
  });
}

/**
 * Confirm delete validation check
 */
function confirmDeletePet(id, name) {
  showModal({
    title: "Delete Profile?",
    bodyHtml: `
      <div style="text-align:center; padding: 1rem 0;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <p>Are you sure you want to permanently delete the profile for <strong>${name}</strong>?</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top:0.5rem;">This will delete all medical records, reminders, and journal timelines. This action cannot be undone.</p>
      </div>
    `,
    confirmText: "Yes, Delete Profile",
    onConfirm: async () => {
      try {
        await db.collection('pets').doc(id).delete();
        showToast(`Profile for ${name} deleted.`, "info");
        renderPets();
        return false;
      } catch (err) {
        showToast("Failed to delete pet profile.", "error");
        return true;
      }
    }
  });
}

/**
 * Render single pet details page with full navigation tabs
 */
export async function renderPetDetail(params) {
  const petId = params.id;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Companion Profile';

  if (!db) {
    viewport.innerHTML = `<div class="empty-state"><p>Database offline.</p></div>`;
    return;
  }

  showLoading(true, "Fetching detailed records...");
  try {
    const doc = await db.collection('pets').doc(petId).get();
    if (!doc.exists) {
      showToast("Pet profile not found.", "error");
      Router.navigate('/pets');
      return;
    }

    const pet = doc.data();
    pet.id = doc.id;

    // Verify Ownership
    const user = getCurrentUser();
    if (pet.ownerId !== user.uid) {
      showToast("Access Denied: Not owner.", "error");
      Router.navigate('/pets');
      return;
    }

    // Compute mock AI Wellness Index (SaaS Ring Animation)
    let aiWellnessScore = 95;
    if (pet.vaccinationStatus === 'Incomplete') aiWellnessScore -= 20;
    if (pet.medicalNotes && pet.medicalNotes.length > 50) aiWellnessScore -= 10;
    if (pet.lostStatus === 'LOST') aiWellnessScore -= 30;
    aiWellnessScore = Math.max(aiWellnessScore, 35);

    const svgOffset = 377 - (377 * aiWellnessScore) / 100;

    const renderPrivacyIndicator = (label, isPublic) => {
      const visible = isPublic !== false;
      return `
        <div class="flex-between" style="font-size:0.8rem; padding: 0.25rem 0; border-bottom: 1px dashed rgba(0,0,0,0.05);">
          <span style="color:var(--text-muted); font-weight:500;">${label}</span>
          ${visible 
            ? `<span style="background: rgba(82, 183, 136, 0.08); color: var(--accent-green); padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:0.25rem;"><i class="fa-solid fa-eye" style="font-size:0.6rem;"></i> Public</span>` 
            : `<span style="background: rgba(230, 57, 70, 0.08); color: var(--accent-red); padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); font-size:0.7rem; font-weight:700; display:inline-flex; align-items:center; gap:0.25rem;"><i class="fa-solid fa-eye-slash" style="font-size:0.6rem;"></i> Private</span>`
          }
        </div>
      `;
    };

    viewport.innerHTML = `
      <!-- Pet Detail Header Card -->
      <div class="glass-card detail-header magnetic-card" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.03) 0%, rgba(219, 93, 57, 0.03) 100%); margin-bottom: 2rem;">
        <div class="detail-avatar">
          ${getPetImageHTML(pet, 'small')}
        </div>
        <div class="detail-info">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
            <span>${pet.name}</span>
            <span class="pet-status-badge ${pet.lostStatus === 'LOST' ? 'lost' : 'safe'}" id="detail-status-badge">
              ${pet.lostStatus || 'SAFE'}
            </span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            <i class="fa-solid fa-dna"></i> ${pet.breed} &nbsp;|&nbsp; 
            <i class="fa-solid fa-venus-mars"></i> ${pet.gender} &nbsp;|&nbsp;
            <i class="fa-solid fa-scale-balanced"></i> ${pet.weight} kg &nbsp;|&nbsp;
            <i class="fa-solid fa-id-card"></i> ${pet.pawTraceId}
          </p>
        </div>
        <div class="detail-actions">
          <button id="btn-toggle-lost-header" class="btn ${pet.lostStatus === 'LOST' ? 'btn-secondary' : 'btn-danger'}">
            <i class="fa-solid ${pet.lostStatus === 'LOST' ? 'fa-shield-halved' : 'fa-triangle-exclamation'}"></i>
            <span>${pet.lostStatus === 'LOST' ? 'Mark Found' : 'Report Lost'}</span>
          </button>
          <button id="btn-edit-pet" class="btn btn-outline">
            <i class="fa-solid fa-pencil"></i> Edit Profile
          </button>
        </div>
      </div>

      <!-- Detail Sub-Navigation Tabs -->
      <div class="detail-tabs" style="margin-bottom: 1.5rem;">
        <a href="#/pet/${pet.id}" class="tab-link active" id="tab-profile">Profile Info</a>
        <a href="#/pet/${pet.id}/medical" class="tab-link" id="tab-medical">Medical Log</a>
        <a href="#/pet/${pet.id}/reminders" class="tab-link" id="tab-reminders">Reminders</a>
        <a href="#/pet/${pet.id}/journal" class="tab-link" id="tab-journal">Growth Journal</a>
      </div>

      <!-- Content Grid: 6 cards organized cleanly -->
      <div class="grid-split-2-1" style="align-items: start; margin-top:0; gap: 1.5rem;">
        
        <!-- Left Side Cards: Identity, Owner, Medical, Lifestyle -->
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          
          <!-- Card 1: Identity -->
          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-id-card" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Identity</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">PET TYPE</span>
                <strong>${pet.petType || 'Other'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">BREED</span>
                <strong>${pet.breed || 'Unknown'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">GENDER</span>
                <strong>${pet.gender || 'Unknown'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">DATE OF BIRTH</span>
                <strong>${formatFriendlyDate(pet.dob)}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">CALCULATED AGE</span>
                <strong>${pet.age || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">WEIGHT</span>
                <strong>${pet.weight ? pet.weight + ' kg' : 'N/A'}</strong>
              </div>
              
              <!-- Species specific fields -->
              ${pet.size ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">SIZE</span>
                  <strong>${pet.size}</strong>
                </div>
              ` : ''}
              ${pet.indoorOutdoor ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ENVIRONMENT</span>
                  <strong>${pet.indoorOutdoor}</strong>
                </div>
              ` : ''}
              ${pet.neutered ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">SPAYED / NEUTERED</span>
                  <strong>${pet.neutered}</strong>
                </div>
              ` : ''}
              
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">MICROCHIP ID</span>
                <strong>${pet.microchipId || 'None'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ADOPTION SOURCE</span>
                <strong>${pet.adoptionSource || 'N/A'}</strong>
              </div>
              ${pet.registrationDate ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">REGISTRATION DATE</span>
                  <strong>${formatFriendlyDate(pet.registrationDate)}</strong>
                </div>
              ` : ''}
              ${pet.adoptionDate ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ADOPTION DATE</span>
                  <strong>${formatFriendlyDate(pet.adoptionDate)}</strong>
                </div>
              ` : ''}
            </div>

            <!-- Additional Photos Gallery -->
            ${pet.additionalPhotos && pet.additionalPhotos.length > 0 ? `
              <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-glass); padding-top: 1.25rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase; margin-bottom:0.75rem;">Photos Gallery</span>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap:0.75rem;">
                  ${pet.additionalPhotos.map(url => `
                    <div style="aspect-ratio: 1; border-radius: var(--radius-sm); overflow:hidden; border: 1px solid var(--border-glass); box-shadow:var(--shadow-sm);">
                      <img src="${url}" style="width:100%; height:100%; object-fit:cover; cursor:pointer;" onclick="window.open('${url}', '_blank')">
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Card 2: Owner Details -->
          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-user-shield" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Owner</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">OWNER NAME</span>
                <strong>${pet.ownerName || 'Ecosystem Owner'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">PRIMARY PHONE</span>
                <strong>${pet.ownerPhone || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">EMERGENCY CONTACT NAME</span>
                <strong>${pet.emergencyContactName || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">EMERGENCY PHONE</span>
                <strong>${pet.emergencyContact || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">RELATIONSHIP</span>
                <strong>${pet.relationship || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">OWNER EMAIL</span>
                <strong>${pet.ownerContact || 'N/A'}</strong>
              </div>
            </div>
            ${pet.address ? `
              <div style="margin-top:1.25rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">HOME ADDRESS</span>
                <strong>${pet.address}${pet.city ? ', ' + pet.city : ''}${pet.state ? ', ' + pet.state : ''}${pet.postalCode ? ' - ' + pet.postalCode : ''}</strong>
              </div>
            ` : ''}
          </div>

          <!-- Card 3: Medical -->
          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-heart-pulse" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Medical</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">VACCINATION STATUS</span>
                <strong>${pet.vaccinationStatus || 'Unknown'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">BLOOD TYPE</span>
                <strong>${pet.bloodType || 'Unknown'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">PET INSURANCE</span>
                <strong>${pet.insurance || 'None'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">KNOWN ALLERGIES</span>
                <strong style="color:${pet.allergies ? 'var(--terracotta)' : 'inherit'};">${pet.allergies || 'None'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">MEDICAL CONDITIONS</span>
                <strong>${pet.conditions || 'None'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">CURRENT MEDICATIONS</span>
                <strong>${pet.medications || 'None'}</strong>
              </div>
            </div>
            ${pet.medicalNotes ? `
              <div style="margin-top:1.25rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">CRITICAL MEDICAL NOTES</span>
                <p style="font-size:0.9rem; line-height:1.5; margin-top:0.25rem;">${pet.medicalNotes}</p>
              </div>
            ` : ''}
          </div>

          <!-- Card 4: Lifestyle -->
          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-paw" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Lifestyle</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">DIET TYPE</span>
                <strong>${pet.dietType || 'Kibble'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">FEEDING SCHEDULE</span>
                <strong>${pet.feedingSchedule || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ACTIVITY LEVEL</span>
                <strong>${pet.activityLevel || 'Moderate'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">TREATS ALLOWED</span>
                <strong>${pet.treats || 'Yes'}</strong>
              </div>
            </div>
            ${pet.behaviorNotes ? `
              <div style="margin-top:1.25rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">BEHAVIOR & SOCIALIZATION</span>
                <p style="font-size:0.9rem; line-height:1.5; margin-top:0.25rem;">${pet.behaviorNotes}</p>
              </div>
            ` : ''}
            ${pet.trainingDetails ? `
              <div style="margin-top:1rem; border-top: 1px dashed var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">TRAINING DETAILS</span>
                <p style="font-size:0.9rem; line-height:1.5; margin-top:0.25rem;">${pet.trainingDetails}</p>
              </div>
            ` : ''}
          </div>

          <!-- Caregiver Manager Section -->
          <div id="caregiver-manager-section"></div>

          <!-- Vet Shared Access Section -->
          <div id="vet-sharing-section"></div>

        </div>

        <!-- Right Side Sidebar Cards: Recovery, Privacy, QR Tag, AI Score -->
        <div style="display:flex; flex-direction:column; gap:1.5rem;">
          
          <!-- Card 5: Recovery Info -->
          <div class="glass-card" style="padding:1.5rem; border-left:4px solid ${pet.lostStatus === 'LOST' ? 'var(--accent-red)' : 'var(--teal)'};">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-house-chimney-medical" style="color:${pet.lostStatus === 'LOST' ? 'var(--accent-red)' : 'var(--teal)'}; font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Recovery</h3>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">RECOVERY CONTACT PHONE</span>
                <strong>${pet.recoveryContact || pet.ownerPhone || pet.emergencyContact || 'N/A'}</strong>
              </div>
              
              ${pet.rewardAmount ? `
                <div style="background:rgba(244, 208, 104, 0.15); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--accent-yellow);">
                  <span style="font-size:0.7rem; color:#856404; display:block; font-weight:600; text-transform:uppercase;">REWARD OFFERED</span>
                  <strong style="color:#856404; font-size:1rem;">${pet.rewardAmount}</strong>
                </div>
              ` : ''}
              
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">FINDER SCAN INSTRUCTIONS</span>
                <p style="font-size:0.8rem; line-height:1.4; margin-top:0.2rem;">${pet.recoveryInstructions || "Please keep safe and contact immediately. Pet is friendly but may be scared."}</p>
              </div>
            </div>

            <!-- Lost Status Action Button -->
            <button id="btn-toggle-lost-card" class="btn ${pet.lostStatus === 'LOST' ? 'btn-secondary' : 'btn-danger'} btn-full" style="font-size:0.85rem; padding:0.6rem;">
              <i class="fa-solid ${pet.lostStatus === 'LOST' ? 'fa-shield-halved' : 'fa-triangle-exclamation'}"></i>
              <span>${pet.lostStatus === 'LOST' ? 'Mark Found & Safe' : 'Report Lost / Missing'}</span>
            </button>
          </div>

          <!-- Card 6: Privacy Settings -->
          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-user-lock" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Privacy</h3>
            </div>
            
            <div style="display:flex; flex-direction:column; gap:0.65rem;">
              ${renderPrivacyIndicator('Owner Name', pet.privacy?.ownerName)}
              ${renderPrivacyIndicator('Phone Number', pet.privacy?.phoneNumber)}
              ${renderPrivacyIndicator('Emergency Contact', pet.privacy?.emergencyContact)}
              ${renderPrivacyIndicator('Street Address', pet.privacy?.address)}
              ${renderPrivacyIndicator('Medical Notes', pet.privacy?.medicalInfo)}
              ${renderPrivacyIndicator('Vaccination Card', pet.privacy?.vaccinationStatus)}
              ${renderPrivacyIndicator('Pedigree Breed', pet.privacy?.breed)}
              ${renderPrivacyIndicator('Microchip ID', pet.privacy?.microchipId)}
            </div>
          </div>

          <!-- AI Score Ring Card -->
          <div class="glass-card text-center magnetic-card" style="padding:1.5rem 1rem;">
            <h3 style="font-weight:800; font-family:'Outfit'; font-size:1.1rem; margin-bottom:1rem; color:var(--teal);">
              AI Wellness Score
            </h3>
            <div class="ai-score-container">
              <svg class="ai-score-svg" viewBox="0 0 140 140">
                <circle class="ai-score-track" cx="70" cy="70" r="60"></circle>
                <circle class="ai-score-fill" cx="70" cy="70" r="60" style="stroke-dashoffset: ${svgOffset};"></circle>
              </svg>
              <div class="ai-score-value">
                <span>${aiWellnessScore}</span>
                <span class="ai-score-label">Index</span>
              </div>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:1rem; line-height:1.4;">
              AI wellness score is derived from vaccination compliance logs and historical veterinary treatment records.
            </p>
          </div>

          <!-- QR Code Tag Card -->
          ${pet.hasTag ? `
            <div class="glass-card qr-container magnetic-card" style="padding:1.5rem; text-align:center;">
              <h3 style="font-weight:700; font-family:'Outfit'; margin-bottom:0.25rem;">Recovery QR Code</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom:1rem;">Secure digital identity badge tag</p>
              <div id="qrcode-box" class="qr-code-box" style="margin:0 auto 1.25rem;"></div>
              <button id="btn-download-tag" class="btn btn-secondary btn-full" style="font-size:0.85rem;">
                <i class="fa-solid fa-print"></i> Print Tag Badge
              </button>
            </div>
          ` : `
            <div class="glass-card qr-container magnetic-card text-center" style="position:relative; overflow:hidden; padding:1.5rem;">
              <h3 style="font-weight:700; font-family:'Outfit'; margin-bottom:0.25rem;">Recovery QR Code</h3>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom:1.25rem;">Secure digital identity badge tag</p>
              
              <div class="locked-qr-placeholder" style="margin: 0 auto 1.5rem; width:140px; height:140px; position:relative; border-radius:var(--radius-sm); border: 1px dashed var(--border-glass); background:rgba(0,0,0,0.02); display:flex; align-items:center; justify-content:center;">
                <div class="blurred-qr-grid" style="position:absolute; inset:0; opacity:0.1; background-image: radial-gradient(var(--text-main) 2px, transparent 2.5px); background-size: 10px 10px; filter: blur(1.5px);"></div>
                <div style="z-index:2; text-align:center;">
                  <i class="fa-solid fa-lock" style="font-size:2.2rem; color:var(--terracotta); display:block; margin-bottom:0.25rem;"></i>
                  <span style="font-size:0.65rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">QR Locked</span>
                </div>
              </div>
              
              ${pet.tagOrderId ? `
                <a href="#/orders" class="btn btn-outline btn-full" style="font-size:0.85rem;">
                  <i class="fa-solid fa-truck-fast"></i> Track Pendant Order
                </a>
              ` : `
                <button id="btn-order-tag" class="btn btn-primary btn-full" style="font-size:0.85rem; background:var(--terracotta); border:none;">
                  <i class="fa-solid fa-tags"></i> Order Smart Tag ₹299
                </button>
              `}
            </div>
          `}

        </div>

      </div>
    `;

    // Dynamic bindings
    document.getElementById('btn-edit-pet').onclick = () => Router.navigate(`/pet/${pet.id}/edit`);
    
    const toggleHeaderBtn = document.getElementById('btn-toggle-lost-header');
    if (toggleHeaderBtn) toggleHeaderBtn.onclick = () => togglePetLostStatus(pet);
    
    const toggleCardBtn = document.getElementById('btn-toggle-lost-card');
    if (toggleCardBtn) toggleCardBtn.onclick = () => togglePetLostStatus(pet);
    
    // Generate QR Tag Code if Tag is active
    if (pet.hasTag) {
      generateQrTagCode(pet.id);
    } else if (!pet.tagOrderId) {
      document.getElementById('btn-order-tag').onclick = () => showOrderModal(pet.id, pet.name);
    }

    // Render Caregiver management controls
    const cgContainer = document.getElementById('caregiver-manager-section');
    if (cgContainer) {
      renderCaregiverManager(pet.id, cgContainer);
    }

    // Render Vet access controls
    const vetContainer = document.getElementById('vet-sharing-section');
    if (vetContainer) {
      renderVetSharingPanel(pet, vetContainer);
    }

  } catch (error) {
    console.error("Pet Detail View Error:", error);
    viewport.innerHTML = `<div class="empty-state"><p>Error loading profile details.</p></div>`;
  } finally {
    showLoading(false);
  }
}

/**
 * Generate QR Image via QRCode.js
 */
function generateQrTagCode(petId) {
  const qrBox = document.getElementById('qrcode-box');
  if (!qrBox) return;

  qrBox.innerHTML = '';
  const currentDomain = window.location.origin + window.location.pathname;
  const qrUrl = `${currentDomain}#/scan/${petId}`;

  try {
    new QRCode(qrBox, {
      text: qrUrl,
      width: 160,
      height: 160,
      colorDark: "#1f7a8c",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    const downloadBtn = document.getElementById('btn-download-tag');
    if (downloadBtn) {
      downloadBtn.onclick = () => {
        showModal({
          title: "Print Smart Digital Collar ID",
          bodyHtml: `
            <div style="text-align:center; padding:1rem;">
              <h4 style="color:var(--teal); font-weight:700;">PawTrace Digital Collar Attachment</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0.5rem 0 1.5rem;">
                Attach this tag directly to your pet's collar harness.
              </p>
              <div style="background:#1f7a8c; padding:2rem; border-radius: var(--radius-md); display:inline-block; color:white;">
                <h3 style="font-family:'Outfit', sans-serif; font-weight:800; font-size:1.4rem; margin-bottom: 1rem;">🐾 PAWTRACE</h3>
                <div style="background:white; padding:1rem; border-radius:var(--radius-sm); display:inline-block;">
                  ${qrBox.innerHTML}
                </div>
                <p style="font-size: 0.75rem; margin-top: 1rem; font-weight:600; letter-spacing:1px;">SCAN TO REPORT SCANNER GPS LOCATIONS</p>
              </div>
            </div>
          `,
          confirmText: "Print Design Layout",
          onConfirm: () => {
            window.print();
            return false;
          }
        });
      };
    }
  } catch (err) {
    console.error("Error generating QR Tag:", err);
  }
}

/**
 * Handle marking pet as lost or found
 */
async function togglePetLostStatus(pet) {
  const currentStatus = pet.lostStatus || 'SAFE';
  const targetStatus = currentStatus === 'LOST' ? 'SAFE' : 'LOST';

  showLoading(true, "Updating lost status...");
  try {
    await db.collection('pets').doc(pet.id).update({
      lostStatus: targetStatus,
      lastUpdated: fb.firestore.FieldValue.serverTimestamp()
    });

    const notificationMessage = targetStatus === 'LOST' 
      ? `Alert: ${pet.name} has been marked as MISSING. Watch for scans.`
      : `Success: ${pet.name} has been marked as FOUND and safe.`;

    await db.collection('users').doc(pet.ownerId).collection('notifications').add({
      type: 'STATUS_CHANGE',
      petId: pet.id,
      message: notificationMessage,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    showToast(`Pet marked as ${targetStatus === 'LOST' ? 'Missing' : 'Found'}`, targetStatus === 'LOST' ? 'warning' : 'success');
    renderPetDetail({ id: pet.id });
  } catch (error) {
    showToast("Failed to switch lost/found status.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Vet Sharing Widget (Rendered in Pet Details Profile Tab)
 */
async function renderVetSharingPanel(pet, container) {
  container.innerHTML = `
    <h3 style="font-weight:700; font-family:'Outfit'; margin-bottom:0.5rem;">Vet Clinical Authorization</h3>
    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem;">
      Provide verified veterinarians with permission to view your pet's medical histories and file reports/prescriptions.
    </p>
    
    <div class="grid-split">
      <div>
        <h4 style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem;">Authorized Veterinarians</h4>
        <div id="authorized-vets-list" style="display:flex; flex-direction:column; gap:0.5rem;">
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>
      <div>
        <h4 style="font-weight:600; font-size:0.9rem; margin-bottom:0.5rem;">Share Access With Vet</h4>
        <form id="vet-share-email-form" style="display:flex; gap:0.5rem; flex-direction:column;">
          <input type="email" id="vet-share-email" class="form-control" placeholder="doctor@example.com" style="padding:0.5rem 1rem; font-size:0.8rem;" required>
          <button type="submit" class="btn btn-primary" style="font-size:0.8rem; padding:0.5rem 1rem;">
            <i class="fa-solid fa-plus"></i> Share Access
          </button>
        </form>
      </div>
    </div>
  `;

  // Fetch authorized vets
  await loadAuthorizedVetsList(pet, document.getElementById('authorized-vets-list'));

  // Bind share form submission
  const shareForm = document.getElementById('vet-share-email-form');
  if (shareForm) {
    shareForm.onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('vet-share-email').value.trim();
      await requestVetAccess(pet, email);
    };
  }
}

/**
 * Validates a vet's email, creates a vetAccess document, and updates pet permissions
 */
async function requestVetAccess(pet, email) {
  showLoading(true, "Authorizing veterinarian...");
  try {
    // 1. Search vetProfiles by email (case-insensitive conversion)
    const emailLower = email.toLowerCase().trim();
    const snapshot = await db.collection('vetProfiles').where('email', '==', emailLower).get();
    if (snapshot.empty) {
      showToast("No registered veterinarian clinic found with that email address.", "warning");
      return;
    }

    const vetDoc = snapshot.docs[0];
    const vet = vetDoc.data();
    const vetUid = vetDoc.id;

    // 2. Check if already shared
    const currentList = pet.sharedWithVets || [];
    if (currentList.includes(vetUid)) {
      showToast("Access is already shared with this clinic.", "info");
      return;
    }

    const resolvedPetName = pet.name || pet.petName || "Unnamed Pet";

    // 3. Create vetAccess document
    await db.collection('vetAccess').add({
      petId: pet.id,
      petName: resolvedPetName,
      ownerId: pet.ownerId,
      ownerName: pet.ownerName || "Pet Owner",
      vetId: vetUid,
      vetName: vet.name || "Vet Doctor",
      vetEmail: vet.email || emailLower,
      vetClinic: vet.clinic || "Clinic",
      active: true,
      status: 'active',
      createdAt: fb.firestore.FieldValue.serverTimestamp()
    });

    // 4. Update pet sharedWithVets array
    currentList.push(vetUid);
    await db.collection('pets').doc(pet.id).update({
      sharedWithVets: currentList
    });

    // 5. Send notification to vet
    await db.collection('users').doc(vetUid).collection('notifications').add({
      type: 'STATUS_CHANGE',
      petId: pet.id,
      message: `You have been granted medical clinical access to pet companion: ${resolvedPetName}.`,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    showToast(`Access shared with ${vet.name} successfully!`, "success");
    renderPetDetail({ id: pet.id });
  } catch (err) {
    console.error("Vet authorization error:", err);
    showToast(`Failed to share access with vet: ${err.message || err}`, "error");
  } finally {
    showLoading(false);
  }
}

async function revokeVetAccess(pet, vetUid) {
  showLoading(true, "Revoking authorization...");
  try {
    const currentList = pet.sharedWithVets || [];
    const index = currentList.indexOf(vetUid);
    if (index > -1) {
      currentList.splice(index, 1);
      await db.collection('pets').doc(pet.id).update({
        sharedWithVets: currentList
      });
      showToast("Clinic access privileges revoked.", "info");
      renderPetDetail({ id: pet.id });
    }
  } catch (err) {
    showToast("Failed to revoke access.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Loads and renders the list of authorized veterinarians for a pet
 */
async function loadAuthorizedVetsList(pet, container) {
  if (!container) return;
  const currentList = pet.sharedWithVets || [];
  if (currentList.length === 0) {
    container.innerHTML = `
      <div class="empty-state-mini" style="padding:1rem 0; text-align: center;">
        <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">No authorized clinics listed.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = '';
  try {
    for (const vetUid of currentList) {
      const doc = await db.collection('vetProfiles').doc(vetUid).get();
      const vet = doc.exists ? doc.data() : { name: "Clinic Veterinarian", email: "N/A" };
      
      const item = document.createElement('div');
      item.className = 'reminder-item';
      item.style.background = 'rgba(255,255,255,0.01)';
      item.style.border = '1px solid var(--border-glass)';
      item.style.padding = '0.6rem 0.8rem';
      item.style.margin = '0';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:0.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.15rem; font-size:0.75rem;">
            <strong style="color:var(--text-main);">${vet.name || vet.clinic || "Clinic"}</strong>
            <span style="color:var(--text-muted); font-size:0.7rem;">${vet.clinic || "Veterinary Clinic"} &bull; ${vet.email || ''}</span>
          </div>
          <button class="btn btn-secondary btn-revoke-vet" data-id="${vetUid}" style="font-size:0.65rem; padding:0.3rem 0.6rem; border-color:rgba(230,57,70,0.3); color:var(--accent-red); background:transparent;">
            Revoke Access
          </button>
        </div>
      `;
      container.appendChild(item);
    }

    // Bind revoke buttons
    container.querySelectorAll('.btn-revoke-vet').forEach(btn => {
      btn.onclick = async () => {
        const vetUid = btn.getAttribute('data-id');
        await revokeVetAccess(pet, vetUid);
      };
    });

  } catch (err) {
    console.error("Error loading authorized vets:", err);
    container.innerHTML = `<p style="font-size:0.75rem; color:var(--accent-red);">Failed to load authorized clinics.</p>`;
  }
}

/**
 * Render Platform-wide Lost and Found Pets Index
 */
export async function renderLostPets() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Lost & Found Board';

  viewport.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Missing Companions Directory</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        These pets are currently missing. If you spot them, click their card to scan/record a report or directly contact their owners.
      </p>
    </div>

    <div id="lost-pets-board" class="pets-grid">
      <!-- Loading skeletons -->
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>

    <div id="lost-pets-pagination" class="flex-center" style="margin-top: 2rem; display: none;">
      <button id="btn-load-more-lost" class="btn btn-secondary">
        <i class="fa-solid fa-angles-down"></i> Load More
      </button>
    </div>
  `;

  const board = document.getElementById('lost-pets-board');
  const paginationContainer = document.getElementById('lost-pets-pagination');
  const loadMoreBtn = document.getElementById('btn-load-more-lost');

  if (!db) {
    board.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-database"></i>
        <p>Database offline.</p>
      </div>
    `;
    return;
  }

  const pageSize = 12;
  let lastVisibleDoc = null;

  async function fetchPage(isFirstPage = false) {
    if (isFirstPage) {
      board.innerHTML = `
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      `;
      paginationContainer.style.display = 'none';
      lastVisibleDoc = null;
    } else {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
    }

    try {
      let query = db.collection('pets')
        .where('lostStatus', '==', 'LOST')
        .limit(pageSize);

      if (!isFirstPage && lastVisibleDoc) {
        query = query.startAfter(lastVisibleDoc);
      }

      const snapshot = await query.get();

      if (isFirstPage) {
        board.innerHTML = '';
      }

      if (snapshot.empty) {
        if (isFirstPage) {
          board.innerHTML = `
            <div class="empty-state">
              <i class="fa-solid fa-circle-check" style="color: var(--accent-green); font-size:3rem;"></i>
              <h3>No missing pet reports!</h3>
              <p>All pets are safely tracked with their owners.</p>
            </div>
          `;
        } else {
          showToast("No more missing pets to load.", "info");
        }
        paginationContainer.style.display = 'none';
        return;
      }

      snapshot.forEach((doc) => {
        const pet = doc.data();
        pet.id = doc.id;

        const card = document.createElement('div');
        card.className = 'glass-card pet-card magnetic-card';
        card.innerHTML = `
          <div class="pet-image-container">
            ${getPetImageHTML(pet, 'large')}
            <span class="pet-status-badge lost">MISSING</span>
          </div>
          <div class="pet-card-content">
            <h4 class="pet-card-name">${pet.name}</h4>
            <div class="pet-card-meta" style="flex-direction: column; gap: 0.25rem;">
              <span><strong>Breed:</strong> ${pet.breed || 'Unknown'}</span>
              <span><strong>Age:</strong> ${pet.age || 'N/A'}</span>
              <span style="color: var(--accent-red); margin-top: 0.25rem; font-weight:600;">
                <i class="fa-solid fa-circle-exclamation"></i> Emergency Phone: ${pet.emergencyContact || 'N/A'}
              </span>
            </div>
            <div class="pet-card-actions">
              <a href="#/scan/${pet.id}" class="btn btn-danger btn-full" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                <i class="fa-solid fa-location-crosshairs"></i> Report Spotting
              </a>
            </div>
          </div>
        `;
        board.appendChild(card);
      });

      lastVisibleDoc = snapshot.docs[snapshot.docs.length - 1];

      if (snapshot.docs.length < pageSize) {
        paginationContainer.style.display = 'none';
      } else {
        paginationContainer.style.display = 'flex';
      }

    } catch (error) {
      console.error("Error loading lost board:", error);
      showToast("Failed to fetch lost pets index.", "error");
    } finally {
      loadMoreBtn.disabled = false;
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-angles-down"></i> Load More`;
      if (isFirstPage) {
        showLoading(false);
      }
    }
  }

  loadMoreBtn.onclick = () => fetchPage(false);
  await fetchPage(true);
}

/**
 * Multi-Step Digital Identity Registration & Editing Wizard
 */
export async function renderPetRegisterWizard(params) {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  const user = getCurrentUser();
  if (!user) {
    Router.navigate('/login');
    return;
  }

  const isEdit = !!(params && params.id);
  if (titleEl) {
    titleEl.textContent = isEdit ? 'Edit Companion Profile' : 'Register New Companion';
  }

  showLoading(true, "Initializing wizard...");
  
  let pet = null;
  if (isEdit) {
    try {
      const doc = await db.collection('pets').doc(params.id).get();
      if (doc.exists) {
        pet = doc.data();
        pet.id = doc.id;
      } else {
        showToast("Pet profile not found.", "error");
        Router.navigate('/pets');
        return;
      }
    } catch (err) {
      console.error("Error loading pet:", err);
      showToast("Failed to load pet details.", "error");
      Router.navigate('/pets');
      return;
    }
  }

  showLoading(false);

  // Initialize wizard state
  const wizardData = {
    name: pet ? (pet.name || '') : '',
    petType: pet ? (pet.petType || 'Dog') : 'Dog',
    breed: pet ? (pet.breed || '') : '',
    gender: pet ? (pet.gender || 'Male') : 'Male',
    dob: pet ? (pet.dob || '') : '',
    age: pet ? (pet.age || '') : '',
    weight: pet ? (pet.weight || '') : '',
    profileImage: pet ? (pet.profileImage || '') : '',
    
    // Species-specific
    size: pet ? (pet.size || 'Medium') : 'Medium',
    indoorOutdoor: pet ? (pet.indoorOutdoor || 'Indoor') : 'Indoor',
    neutered: pet ? (pet.neutered || 'Not Neutered') : 'Not Neutered',

    // Step 2: Identity & Tracking
    microchipId: pet ? (pet.microchipId || '') : '',
    adoptionSource: pet ? (pet.adoptionSource || '') : '',
    registrationDate: pet ? (pet.registrationDate || '') : '',
    adoptionDate: pet ? (pet.adoptionDate || '') : '',

    // Step 3: Owner Information
    ownerName: pet ? (pet.ownerName || user.displayName || '') : (user.displayName || ''),
    ownerPhone: pet ? (pet.ownerPhone || '') : '',
    emergencyContactName: pet ? (pet.emergencyContactName || '') : '',
    emergencyContact: pet ? (pet.emergencyContact || '') : '',
    relationship: pet ? (pet.relationship || '') : '',
    address: pet ? (pet.address || '') : '',
    city: pet ? (pet.city || '') : '',
    state: pet ? (pet.state || '') : '',
    postalCode: pet ? (pet.postalCode || '') : '',

    // Step 4: Medical Profile
    bloodType: pet ? (pet.bloodType || 'Unknown') : 'Unknown',
    insurance: pet ? (pet.insurance || '') : '',
    vaccinationStatus: pet ? (pet.vaccinationStatus || 'Unknown') : 'Unknown',
    allergies: pet ? (pet.allergies || '') : '',
    conditions: pet ? (pet.conditions || '') : '',
    medications: pet ? (pet.medications || '') : '',
    medicalNotes: pet ? (pet.medicalNotes || '') : '',

    // Step 5: Lifestyle & Training
    dietType: pet ? (pet.dietType || 'Kibble') : 'Kibble',
    feedingSchedule: pet ? (pet.feedingSchedule || '') : '',
    activityLevel: pet ? (pet.activityLevel || 'Moderate') : 'Moderate',
    treats: pet ? (pet.treats || '') : '',
    behaviorNotes: pet ? (pet.behaviorNotes || '') : '',
    trainingDetails: pet ? (pet.trainingDetails || '') : '',
    additionalPhotos: pet ? (pet.additionalPhotos || []) : [],

    // Step 6: Recovery Info
    recoveryContact: pet ? (pet.recoveryContact || '') : '',
    recoveryInstructions: pet ? (pet.recoveryInstructions || '') : '',
    rewardAmount: pet ? (pet.rewardAmount || '') : '',

    // Step 7: Privacy Controls
    privacy: pet && pet.privacy ? {
      ownerName: pet.privacy.ownerName !== false,
      phoneNumber: pet.privacy.phoneNumber !== false,
      emergencyContact: pet.privacy.emergencyContact !== false,
      address: pet.privacy.address !== false,
      medicalInfo: pet.privacy.medicalInfo !== false,
      vaccinationStatus: pet.privacy.vaccinationStatus !== false,
      breed: pet.privacy.breed !== false,
      microchipId: pet.privacy.microchipId !== false
    } : {
      ownerName: true,
      phoneNumber: true,
      emergencyContact: true,
      address: true,
      medicalInfo: true,
      vaccinationStatus: true,
      breed: true,
      microchipId: true
    }
  };

  let currentStep = 1;
  const totalSteps = 7;

  // Render wizard structural shell
  viewport.innerHTML = `
    <div class="wizard-layout">
      <!-- Sidebar Checklist -->
      <div class="wizard-sidebar">
        <h4 style="font-family:'Outfit'; font-weight:700; margin-bottom:1rem; color:var(--teal);">Registration Checklist</h4>
        <div class="wizard-step-item active" data-step="1">
          <div class="wizard-step-number">1</div>
          <span>Basic Info</span>
        </div>
        <div class="wizard-step-item" data-step="2">
          <div class="wizard-step-number">2</div>
          <span>Identity & Tracking</span>
        </div>
        <div class="wizard-step-item" data-step="3">
          <div class="wizard-step-number">3</div>
          <span>Owner Information</span>
        </div>
        <div class="wizard-step-item" data-step="4">
          <div class="wizard-step-number">4</div>
          <span>Medical Profile</span>
        </div>
        <div class="wizard-step-item" data-step="5">
          <div class="wizard-step-number">5</div>
          <span>Lifestyle & Training</span>
        </div>
        <div class="wizard-step-item" data-step="6">
          <div class="wizard-step-number">6</div>
          <span>Recovery Info</span>
        </div>
        <div class="wizard-step-item" data-step="7">
          <div class="wizard-step-number">7</div>
          <span>Privacy Controls</span>
        </div>
      </div>

      <!-- Content Area -->
      <div class="glass-card" style="padding:2rem;">
        <div class="wizard-progress-container">
          <div class="flex-between">
            <h3 id="wizard-step-title" style="font-family:'Outfit'; font-weight:700; font-size:1.3rem; color:var(--text-main);">Basic Information</h3>
            <span id="wizard-step-indicator" style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">Step 1 of 7</span>
          </div>
          <div class="wizard-progress-bar">
            <div id="wizard-progress-fill" class="wizard-progress-fill" style="width: 14.3%;"></div>
          </div>
        </div>

        <form id="wizard-form" onsubmit="return false;" style="display:flex; flex-direction:column; gap:1.5rem;">
          <div id="wizard-step-panel"></div>

          <!-- Wizard Action Buttons -->
          <div class="wizard-actions">
            <div>
              <button type="button" id="btn-wizard-draft" class="btn btn-secondary">
                <i class="fa-solid fa-floppy-disk"></i> Save Draft
              </button>
            </div>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <button type="button" id="btn-wizard-back" class="btn btn-outline" style="display:none;">
                <i class="fa-solid fa-arrow-left"></i> Back
              </button>
              <button type="button" id="btn-wizard-skip" class="btn btn-outline" style="display:none;">
                Skip for Now
              </button>
              <button type="button" id="btn-wizard-next" class="btn btn-primary">
                Next <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;

  // Render the initial step
  renderStep(1);

  // Define step rendering function
  function renderStep(stepNum) {
    currentStep = stepNum;
    const panel = document.getElementById('wizard-step-panel');
    const stepTitleEl = document.getElementById('wizard-step-title');
    const stepIndicatorEl = document.getElementById('wizard-step-indicator');
    const progressFillEl = document.getElementById('wizard-progress-fill');
    
    // Update sidebar styling
    const stepItems = document.querySelectorAll('.wizard-step-item');
    stepItems.forEach(item => {
      const stepIdx = parseInt(item.getAttribute('data-step'));
      item.className = 'wizard-step-item';
      if (stepIdx === currentStep) {
        item.classList.add('active');
      } else if (stepIdx < currentStep) {
        item.classList.add('completed');
      }
    });

    // Update headers and progress
    const percentage = Math.round((currentStep / totalSteps) * 100);
    progressFillEl.style.width = `${percentage}%`;
    stepIndicatorEl.textContent = `Step ${currentStep} of ${totalSteps}`;

    // Configure buttons
    const backBtn = document.getElementById('btn-wizard-back');
    const skipBtn = document.getElementById('btn-wizard-skip');
    const nextBtn = document.getElementById('btn-wizard-next');

    // Show/hide Back button
    if (currentStep === 1) {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = 'inline-flex';
    }

    // Show/hide Skip button (Optional sections: Steps 2, 4, 5, 7)
    const isOptionalStep = [2, 4, 5, 7].includes(currentStep);
    skipBtn.style.display = isOptionalStep ? 'inline-flex' : 'none';

    // Next/Finish button label
    if (currentStep === totalSteps) {
      nextBtn.innerHTML = isEdit ? 'Save Changes <i class="fa-solid fa-check"></i>' : 'Complete Registration <i class="fa-solid fa-check"></i>';
    } else {
      nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
    }

    // Load Step HTML
    if (currentStep === 1) {
      stepTitleEl.textContent = 'Basic Information';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-name">Pet Name *</label>
            <input type="text" id="w-name" class="form-control" value="${wizardData.name}" required placeholder="E.g. Rex">
          </div>
          <div class="form-group">
            <label for="w-pet-type">Pet Type *</label>
            <select id="w-pet-type" class="form-control" required>
              <option value="Dog" ${wizardData.petType === 'Dog' ? 'selected' : ''}>Dog</option>
              <option value="Cat" ${wizardData.petType === 'Cat' ? 'selected' : ''}>Cat</option>
              <option value="Bird" ${wizardData.petType === 'Bird' ? 'selected' : ''}>Bird</option>
              <option value="Rabbit" ${wizardData.petType === 'Rabbit' ? 'selected' : ''}>Rabbit</option>
              <option value="Other" ${wizardData.petType === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-breed">Breed *</label>
            <input type="text" id="w-breed" class="form-control" value="${wizardData.breed}" required placeholder="E.g. Golden Retriever">
          </div>
          <div class="form-group">
            <label for="w-gender">Gender *</label>
            <select id="w-gender" class="form-control" required>
              <option value="Male" ${wizardData.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${wizardData.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Unknown" ${wizardData.gender === 'Unknown' ? 'selected' : ''}>Unknown/Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-dob">Date of Birth</label>
            <input type="date" id="w-dob" class="form-control" value="${wizardData.dob}">
          </div>
          <div class="form-group">
            <label for="w-age">Approximate Age *</label>
            <input type="text" id="w-age" class="form-control" value="${wizardData.age}" required placeholder="E.g. 2 years (auto-fills from DOB)">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-weight">Weight (kg) *</label>
            <input type="number" step="0.1" id="w-weight" class="form-control" value="${wizardData.weight}" required placeholder="E.g. 12.5">
          </div>
          <div class="form-group">
            <label>Profile Photo *</label>
            <div style="display:flex; gap:1.5rem; align-items:center;">
              <div class="profile-photo-upload-zone" id="w-photo-zone">
                <img id="w-photo-preview" src="${wizardData.profileImage || ''}" alt="Preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display: ${wizardData.profileImage ? 'block' : 'none'}; width:100%; height:100%; object-fit:cover;">
                <div class="pet-placeholder-card small" style="background: ${getPetPlaceholder(wizardData.petType, wizardData.name).background}; display: ${wizardData.profileImage ? 'none' : 'flex'};">
                  <span class="pet-placeholder-emoji">${getPetPlaceholder(wizardData.petType, wizardData.name).emoji}</span>
                </div>
                <div class="upload-overlay">
                  <i class="fa-solid fa-camera"></i>
                  <span>Upload Photo</span>
                </div>
                <input type="file" id="w-photo-file" style="display:none;" accept="image/*">
              </div>
              <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4;">
                Add a high quality photo of your pet to help identify them. Max file size: 3MB.
              </p>
            </div>
          </div>
        </div>

        <div id="w-species-specific-container" style="margin-top:0.5rem;"></div>
      `;

      // Setup dynamic type listener & species inputs
      const typeSelect = document.getElementById('w-pet-type');
      typeSelect.onchange = () => {
        wizardData.petType = typeSelect.value;
        renderSpeciesFields();
      };
      renderSpeciesFields();

      // Setup dynamic age calculation trigger
      const dobInput = document.getElementById('w-dob');
      const ageInput = document.getElementById('w-age');
      dobInput.onchange = () => {
        if (dobInput.value) {
          const calculated = calculateAge(dobInput.value);
          ageInput.value = calculated;
          wizardData.age = calculated;
        }
      };

      // Photo upload click handler
      const photoZone = document.getElementById('w-photo-zone');
      const photoFile = document.getElementById('w-photo-file');
      const photoPreview = document.getElementById('w-photo-preview');
      photoZone.onclick = () => photoFile.click();
      photoFile.onchange = async () => {
        if (photoFile.files.length > 0) {
          const file = photoFile.files[0];
          const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
          if (error) {
            showToast(error, "warning");
            return;
          }
          const base64 = await readFileAsDataURL(file);
          photoPreview.src = base64;
          photoPreview.style.display = 'block';
          if (photoPreview.nextElementSibling && photoPreview.nextElementSibling.classList.contains('pet-placeholder-card')) {
            photoPreview.nextElementSibling.style.display = 'none';
          }
          wizardData.profileImage = base64;
        }
      };

    } else if (currentStep === 2) {
      stepTitleEl.textContent = 'Identity & Tracking (Optional)';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-microchip">Microchip ID (Optional)</label>
            <input type="text" id="w-microchip" class="form-control" value="${wizardData.microchipId}" placeholder="Enter microchip tag code">
          </div>
          <div class="form-group">
            <label for="w-adoption-source">Adoption Source (Optional)</label>
            <input type="text" id="w-adoption-source" class="form-control" value="${wizardData.adoptionSource}" placeholder="E.g. Shelter Name, Breeder, Rescue">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-reg-date">Registration Date (Optional)</label>
            <input type="date" id="w-reg-date" class="form-control" value="${wizardData.registrationDate}">
          </div>
          <div class="form-group">
            <label for="w-adopt-date">Adoption Date (Optional)</label>
            <input type="date" id="w-adopt-date" class="form-control" value="${wizardData.adoptionDate}">
          </div>
        </div>
      `;
    } else if (currentStep === 3) {
      stepTitleEl.textContent = 'Owner Information';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-owner-name">Owner Name *</label>
            <input type="text" id="w-owner-name" class="form-control" value="${wizardData.ownerName}" required placeholder="Full Name">
          </div>
          <div class="form-group">
            <label for="w-owner-phone">Primary Phone Number *</label>
            <input type="tel" id="w-owner-phone" class="form-control" value="${wizardData.ownerPhone}" required placeholder="+1 (555) 123-4567">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-emg-name">Emergency Contact Name *</label>
            <input type="text" id="w-emg-name" class="form-control" value="${wizardData.emergencyContactName}" required placeholder="Emergency Contact Name">
          </div>
          <div class="form-group">
            <label for="w-emg-phone">Emergency Contact Number *</label>
            <input type="tel" id="w-emg-phone" class="form-control" value="${wizardData.emergencyContact}" required placeholder="+1 (555) 987-6543">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-relationship">Relationship to Pet (Optional)</label>
            <input type="text" id="w-relationship" class="form-control" value="${wizardData.relationship}" placeholder="E.g. Parent, Sibling, Friend">
          </div>
          <div class="form-group">
            <label for="w-address">Street Address (Optional)</label>
            <input type="text" id="w-address" class="form-control" value="${wizardData.address}" placeholder="House No, Street name">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-city">City (Optional)</label>
            <input type="text" id="w-city" class="form-control" value="${wizardData.city}" placeholder="City">
          </div>
          <div class="form-group">
            <label for="w-state">State (Optional)</label>
            <input type="text" id="w-state" class="form-control" value="${wizardData.state}" placeholder="State">
          </div>
          <div class="form-group">
            <label for="w-zip">Postal Code (Optional)</label>
            <input type="text" id="w-zip" class="form-control" value="${wizardData.postalCode}" placeholder="Zip Code">
          </div>
        </div>
      `;
    } else if (currentStep === 4) {
      stepTitleEl.textContent = 'Medical Profile (Optional)';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-blood">Blood Type (Optional)</label>
            <input type="text" id="w-blood" class="form-control" value="${wizardData.bloodType}" placeholder="E.g. DEA 1.1+, A, B, etc.">
          </div>
          <div class="form-group">
            <label for="w-insurance">Pet Insurance Provider/Policy (Optional)</label>
            <input type="text" id="w-insurance" class="form-control" value="${wizardData.insurance}" placeholder="E.g. Healthy Paws, Policy #12345">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-vacc-status">Vaccination Status (Optional)</label>
            <select id="w-vacc-status" class="form-control">
              <option value="Up-to-date" ${wizardData.vaccinationStatus === 'Up-to-date' ? 'selected' : ''}>Up to Date</option>
              <option value="Incomplete" ${wizardData.vaccinationStatus === 'Incomplete' ? 'selected' : ''}>Incomplete/Pending</option>
              <option value="Unknown" ${wizardData.vaccinationStatus === 'Unknown' ? 'selected' : ''}>Unknown</option>
            </select>
          </div>
          <div class="form-group">
            <label for="w-allergies">Known Allergies (Optional)</label>
            <input type="text" id="w-allergies" class="form-control" value="${wizardData.allergies}" placeholder="E.g. Chicken, Penicillin, Dust mites">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-conditions">Existing Medical Conditions (Optional)</label>
            <input type="text" id="w-conditions" class="form-control" value="${wizardData.conditions}" placeholder="E.g. Diabetes, Arthritis, none">
          </div>
          <div class="form-group">
            <label for="w-medications">Current Medications (Optional)</label>
            <input type="text" id="w-medications" class="form-control" value="${wizardData.medications}" placeholder="E.g. Insulin daily, Joint chews">
          </div>
        </div>

        <div class="form-group">
          <label for="w-medical-notes">Critical Medical / Healthcare Notes (Optional)</label>
          <textarea id="w-medical-notes" class="form-control" rows="3" placeholder="Any additional healthcare directives or clinical history details...">${wizardData.medicalNotes}</textarea>
        </div>
      `;
    } else if (currentStep === 5) {
      stepTitleEl.textContent = 'Lifestyle & Training (Optional)';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-diet">Diet Type (Optional)</label>
            <select id="w-diet" class="form-control">
              <option value="Kibble" ${wizardData.dietType === 'Kibble' ? 'selected' : ''}>Kibble</option>
              <option value="Wet" ${wizardData.dietType === 'Wet' ? 'selected' : ''}>Wet/Canned</option>
              <option value="Raw" ${wizardData.dietType === 'Raw' ? 'selected' : ''}>Raw Diet</option>
              <option value="Home-cooked" ${wizardData.dietType === 'Home-cooked' ? 'selected' : ''}>Home Cooked</option>
              <option value="Other" ${wizardData.dietType === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          <div class="form-group">
            <label for="w-feeding">Feeding Schedule (Optional)</label>
            <input type="text" id="w-feeding" class="form-control" value="${wizardData.feedingSchedule}" placeholder="E.g. Twice daily at 8am & 6pm">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-activity">Activity Level (Optional)</label>
            <select id="w-activity" class="form-control">
              <option value="Low" ${wizardData.activityLevel === 'Low' ? 'selected' : ''}>Low (Couch Potato)</option>
              <option value="Moderate" ${wizardData.activityLevel === 'Moderate' ? 'selected' : ''}>Moderate (Daily walks)</option>
              <option value="High" ${wizardData.activityLevel === 'High' ? 'selected' : ''}>High (Runner/Agility)</option>
              <option value="Hyperactive" ${wizardData.activityLevel === 'Hyperactive' ? 'selected' : ''}>Hyperactive (Non-stop energy)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="w-treats">Treats Allowed / Details (Optional)</label>
            <input type="text" id="w-treats" class="form-control" value="${wizardData.treats}" placeholder="E.g. Salmon skin, freeze-dried liver">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-behavior">Behavior & Social Notes (Optional)</label>
            <textarea id="w-behavior" class="form-control" rows="2" placeholder="E.g. Super friendly, nervous around loud trucks, barks at postman...">${wizardData.behaviorNotes}</textarea>
          </div>
          <div class="form-group">
            <label for="w-training">Training & Skill Details (Optional)</label>
            <textarea id="w-training" class="form-control" rows="2" placeholder="E.g. Basic obedience, crate trained, service dog certified...">${wizardData.trainingDetails}</textarea>
          </div>
        </div>

        <div class="form-group">
          <label>Additional Photos (Gallery - Optional)</label>
          <div class="gallery-upload-zone" id="w-gallery-zone">
            <i class="fa-solid fa-images" style="font-size: 2rem; color: var(--teal); margin-bottom: 0.5rem;"></i>
            <p style="font-size:0.85rem; color:var(--text-muted);">Click to upload additional photos of your pet</p>
            <input type="file" id="w-gallery-files" style="display:none;" accept="image/*" multiple>
          </div>
          <div id="w-gallery-previews" class="gallery-previews-grid"></div>
        </div>
      `;

      // Gallery previews binding
      const galleryZone = document.getElementById('w-gallery-zone');
      const galleryFiles = document.getElementById('w-gallery-files');
      galleryZone.onclick = () => galleryFiles.click();
      galleryFiles.onchange = async () => {
        if (galleryFiles.files.length > 0) {
          for (let i = 0; i < galleryFiles.files.length; i++) {
            const file = galleryFiles.files[i];
            const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
            if (error) {
              showToast(error, "warning");
              continue;
            }
            const base64 = await readFileAsDataURL(file);
            wizardData.additionalPhotos.push(base64);
          }
          renderGalleryPreviews();
        }
      };
      renderGalleryPreviews();

    } else if (currentStep === 6) {
      stepTitleEl.textContent = 'Recovery Information';
      
      // Auto populate contact number if empty
      let recContact = wizardData.recoveryContact;
      if (!recContact) {
        recContact = wizardData.ownerPhone || wizardData.emergencyContact || '';
      }

      // Auto populate instructions if empty
      let recInstructions = wizardData.recoveryInstructions;
      if (!recInstructions) {
        recInstructions = "Please keep safe and contact immediately. Pet is friendly but may be scared.";
      }

      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-rec-contact">Recovery Contact Phone Number *</label>
            <input type="tel" id="w-rec-contact" class="form-control" value="${recContact}" required placeholder="Phone number to call if lost">
          </div>
          <div class="form-group">
            <label for="w-reward">Reward Offered (Optional)</label>
            <input type="text" id="w-reward" class="form-control" value="${wizardData.rewardAmount}" placeholder="E.g. ₹5,000 or $500">
          </div>
        </div>

        <div class="form-group">
          <label for="w-rec-instructions">Recovery / Scanning Instructions *</label>
          <textarea id="w-rec-instructions" class="form-control" rows="3" required placeholder="Instructions shown to a finder who scans the collar tag...">${recInstructions}</textarea>
        </div>
      `;
    } else if (currentStep === 7) {
      stepTitleEl.textContent = 'Privacy Controls (Optional)';
      panel.innerHTML = `
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
          Configure which details are shown publicly when someone scans your pet's smart collar tag.
          Note: If your pet's status is set to LOST, contact and recovery information will be shown regardless of these settings.
        </p>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          
          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Owner Name</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Show your name to the person who scans the tag.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-owner" ${wizardData.privacy.ownerName ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Primary Phone Number</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Allow finders to call your primary phone directly.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-phone" ${wizardData.privacy.phoneNumber ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Emergency Contact Number</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Display emergency contact phone on scan portal.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-emg" ${wizardData.privacy.emergencyContact ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Street Address</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Show address detail if searcher needs to return pet home.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-address" ${wizardData.privacy.address ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Medical Information</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Expose allergies, medications, or critical notes.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-med" ${wizardData.privacy.medicalInfo ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Vaccination Status</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Show whether vaccination card records are up to date.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-vacc" ${wizardData.privacy.vaccinationStatus ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Breed Info</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Show the pet's pedigree breed details on scan page.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-breed" ${wizardData.privacy.breed ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

          <div class="privacy-toggle-item">
            <div class="switch-label-group">
              <strong>Microchip ID</strong>
              <span style="font-size:0.75rem; color:var(--text-muted);">Expose microchip code index for shelter database matching.</span>
            </div>
            <label class="switch">
              <input type="checkbox" id="p-micro" ${wizardData.privacy.microchipId ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>

        </div>
      `;
    }
  }

  function renderSpeciesFields() {
    const container = document.getElementById('w-species-specific-container');
    if (!container) return;
    
    if (wizardData.petType === 'Dog') {
      container.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-size">Pet Size *</label>
            <select id="w-size" class="form-control" required>
              <option value="Small" ${wizardData.size === 'Small' ? 'selected' : ''}>Small (Under 10kg)</option>
              <option value="Medium" ${wizardData.size === 'Medium' ? 'selected' : ''}>Medium (10kg - 25kg)</option>
              <option value="Large" ${wizardData.size === 'Large' ? 'selected' : ''}>Large (Over 25kg)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="w-neutered">Spayed/Neutered Status *</label>
            <select id="w-neutered" class="form-control" required>
              <option value="Neutered" ${wizardData.neutered === 'Neutered' ? 'selected' : ''}>Neutered / Spayed</option>
              <option value="Not Neutered" ${wizardData.neutered === 'Not Neutered' ? 'selected' : ''}>Not Neutered</option>
            </select>
          </div>
        </div>
      `;
    } else if (wizardData.petType === 'Cat') {
      container.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-indoor-outdoor">Environment Status *</label>
            <select id="w-indoor-outdoor" class="form-control" required>
              <option value="Indoor" ${wizardData.indoorOutdoor === 'Indoor' ? 'selected' : ''}>Indoor Only</option>
              <option value="Outdoor" ${wizardData.indoorOutdoor === 'Outdoor' ? 'selected' : ''}>Outdoor Only</option>
              <option value="Both" ${wizardData.indoorOutdoor === 'Both' ? 'selected' : ''}>Indoor & Outdoor</option>
            </select>
          </div>
          <div class="form-group">
            <label for="w-neutered">Spayed/Neutered Status *</label>
            <select id="w-neutered" class="form-control" required>
              <option value="Neutered" ${wizardData.neutered === 'Neutered' ? 'selected' : ''}>Neutered / Spayed</option>
              <option value="Not Neutered" ${wizardData.neutered === 'Not Neutered' ? 'selected' : ''}>Not Neutered</option>
            </select>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = '';
    }
  }

  function renderGalleryPreviews() {
    const list = document.getElementById('w-gallery-previews');
    if (!list) return;
    list.innerHTML = '';
    wizardData.additionalPhotos.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-preview-item';
      item.innerHTML = `
        <img src="${img}" alt="Preview ${idx + 1}">
        <button type="button" class="delete-btn" data-index="${idx}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.delete-btn').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.getAttribute('data-index'));
        wizardData.additionalPhotos.splice(idx, 1);
        renderGalleryPreviews();
      };
    });
  }

  // Handle capturing inputs from the current step's DOM elements
  function saveCurrentStepDOM() {
    if (currentStep === 1) {
      wizardData.name = document.getElementById('w-name').value.trim();
      wizardData.petType = document.getElementById('w-pet-type').value;
      wizardData.breed = document.getElementById('w-breed').value.trim();
      wizardData.gender = document.getElementById('w-gender').value;
      wizardData.dob = document.getElementById('w-dob').value;
      wizardData.age = document.getElementById('w-age').value.trim();
      wizardData.weight = parseFloat(document.getElementById('w-weight').value) || '';
      
      const sizeSelect = document.getElementById('w-size');
      if (sizeSelect) wizardData.size = sizeSelect.value;
      
      const inOutSelect = document.getElementById('w-indoor-outdoor');
      if (inOutSelect) wizardData.indoorOutdoor = inOutSelect.value;
      
      const neuteredSelect = document.getElementById('w-neutered');
      if (neuteredSelect) wizardData.neutered = neuteredSelect.value;

    } else if (currentStep === 2) {
      wizardData.microchipId = document.getElementById('w-microchip').value.trim();
      wizardData.adoptionSource = document.getElementById('w-adoption-source').value.trim();
      wizardData.registrationDate = document.getElementById('w-reg-date').value;
      wizardData.adoptionDate = document.getElementById('w-adopt-date').value;

    } else if (currentStep === 3) {
      wizardData.ownerName = document.getElementById('w-owner-name').value.trim();
      wizardData.ownerPhone = document.getElementById('w-owner-phone').value.trim();
      wizardData.emergencyContactName = document.getElementById('w-emg-name').value.trim();
      wizardData.emergencyContact = document.getElementById('w-emg-phone').value.trim();
      
      const relInput = document.getElementById('w-relationship');
      if (relInput) wizardData.relationship = relInput.value.trim();
      
      const addrInput = document.getElementById('w-address');
      if (addrInput) wizardData.address = addrInput.value.trim();
      
      const cityInput = document.getElementById('w-city');
      if (cityInput) wizardData.city = cityInput.value.trim();
      
      const stateInput = document.getElementById('w-state');
      if (stateInput) wizardData.state = stateInput.value.trim();
      
      const zipInput = document.getElementById('w-zip');
      if (zipInput) wizardData.postalCode = zipInput.value.trim();

    } else if (currentStep === 4) {
      wizardData.bloodType = document.getElementById('w-blood').value.trim();
      wizardData.insurance = document.getElementById('w-insurance').value.trim();
      wizardData.vaccinationStatus = document.getElementById('w-vacc-status').value;
      wizardData.allergies = document.getElementById('w-allergies').value.trim();
      wizardData.conditions = document.getElementById('w-conditions').value.trim();
      wizardData.medications = document.getElementById('w-medications').value.trim();
      wizardData.medicalNotes = document.getElementById('w-medical-notes').value.trim();

    } else if (currentStep === 5) {
      wizardData.dietType = document.getElementById('w-diet').value;
      wizardData.feedingSchedule = document.getElementById('w-feeding').value.trim();
      wizardData.activityLevel = document.getElementById('w-activity').value;
      wizardData.treats = document.getElementById('w-treats').value.trim();
      wizardData.behaviorNotes = document.getElementById('w-behavior').value.trim();
      wizardData.trainingDetails = document.getElementById('w-training').value.trim();

    } else if (currentStep === 6) {
      wizardData.recoveryContact = document.getElementById('w-rec-contact').value.trim();
      wizardData.recoveryInstructions = document.getElementById('w-rec-instructions').value.trim();
      wizardData.rewardAmount = document.getElementById('w-reward').value.trim();

    } else if (currentStep === 7) {
      wizardData.privacy = {
        ownerName: document.getElementById('p-owner').checked,
        phoneNumber: document.getElementById('p-phone').checked,
        emergencyContact: document.getElementById('p-emg').checked,
        address: document.getElementById('p-address').checked,
        medicalInfo: document.getElementById('p-med').checked,
        vaccinationStatus: document.getElementById('p-vacc').checked,
        breed: document.getElementById('p-breed').checked,
        microchipId: document.getElementById('p-micro').checked
      };
    }
  }

  // Validate fields for the current step
  function validateStep() {
    const form = document.getElementById('wizard-form');
    return form.checkValidity();
  }

  // Bind Buttons
  document.getElementById('btn-wizard-back').onclick = () => {
    saveCurrentStepDOM();
    if (currentStep > 1) {
      renderStep(currentStep - 1);
    }
  };

  document.getElementById('btn-wizard-skip').onclick = () => {
    // Save whatever is entered in the current step without enforcing validation
    saveCurrentStepDOM();
    if (currentStep < totalSteps) {
      renderStep(currentStep + 1);
    } else {
      // Step 7 Skip: Finish with current values
      finalizeSubmission(false);
    }
  };

  document.getElementById('btn-wizard-next').onclick = () => {
    if (!validateStep()) {
      const form = document.getElementById('wizard-form');
      form.reportValidity();
      return;
    }
    saveCurrentStepDOM();
    if (currentStep < totalSteps) {
      renderStep(currentStep + 1);
    } else {
      finalizeSubmission(false);
    }
  };

  document.getElementById('btn-wizard-draft').onclick = () => {
    // Read current step inputs, only require Name to save a draft
    saveCurrentStepDOM();
    if (!wizardData.name) {
      showToast("Please enter at least the Pet Name to save a draft.", "warning");
      if (currentStep !== 1) {
        renderStep(1);
      }
      const nameInput = document.getElementById('w-name');
      if (nameInput) nameInput.focus();
      return;
    }
    finalizeSubmission(true);
  };

  async function finalizeSubmission(isDraftFlag) {
    showLoading(true, isDraftFlag ? "Saving draft companion..." : "Registering companion...");
    try {
      // 1. Upload Images if they are Base64
      let profileImageUrl = wizardData.profileImage;
      if (profileImageUrl && profileImageUrl.startsWith('data:image')) {
        const path = `pets/${pet ? pet.id : `temp-${Date.now()}`}/profile_${Date.now()}`;
        profileImageUrl = await uploadImageToStorage(profileImageUrl, path);
      }

      const additionalPhotosUrls = [];
      for (let i = 0; i < wizardData.additionalPhotos.length; i++) {
        const photo = wizardData.additionalPhotos[i];
        if (photo.startsWith('data:image')) {
          const path = `pets/${pet ? pet.id : `temp-${Date.now()}`}/gallery_${i}_${Date.now()}`;
          const url = await uploadImageToStorage(photo, path);
          additionalPhotosUrls.push(url);
        } else {
          additionalPhotosUrls.push(photo);
        }
      }

      // 2. Prepare Pet Document Data
      const petDocData = {
        name: wizardData.name,
        petType: wizardData.petType,
        breed: wizardData.breed,
        gender: wizardData.gender,
        dob: wizardData.dob,
        age: wizardData.age,
        weight: wizardData.weight,
        profileImage: profileImageUrl,
        
        size: wizardData.size || '',
        indoorOutdoor: wizardData.indoorOutdoor || '',
        neutered: wizardData.neutered || '',

        microchipId: wizardData.microchipId,
        adoptionSource: wizardData.adoptionSource,
        registrationDate: wizardData.registrationDate,
        adoptionDate: wizardData.adoptionDate,

        ownerName: wizardData.ownerName,
        ownerPhone: wizardData.ownerPhone,
        emergencyContactName: wizardData.emergencyContactName,
        emergencyContact: wizardData.emergencyContact,
        relationship: wizardData.relationship,
        address: wizardData.address,
        city: wizardData.city,
        state: wizardData.state,
        postalCode: wizardData.postalCode,

        bloodType: wizardData.bloodType,
        insurance: wizardData.insurance,
        vaccinationStatus: wizardData.vaccinationStatus,
        allergies: wizardData.allergies,
        conditions: wizardData.conditions,
        medications: wizardData.medications,
        medicalNotes: wizardData.medicalNotes,

        dietType: wizardData.dietType,
        feedingSchedule: wizardData.feedingSchedule,
        activityLevel: wizardData.activityLevel,
        treats: wizardData.treats,
        behaviorNotes: wizardData.behaviorNotes,
        trainingDetails: wizardData.trainingDetails,
        additionalPhotos: additionalPhotosUrls,

        recoveryContact: wizardData.recoveryContact || wizardData.ownerPhone || wizardData.emergencyContact || '',
        recoveryInstructions: wizardData.recoveryInstructions || "Please keep safe and contact immediately. Pet is friendly but may be scared.",
        rewardAmount: wizardData.rewardAmount,

        privacy: wizardData.privacy,

        ownerId: user.uid,
        ownerContact: user.email,
        isDraft: isDraftFlag,
        lastUpdated: fb.firestore.FieldValue.serverTimestamp()
      };

      // 3. Save or Update in Firestore
      let targetId = pet ? pet.id : null;
      if (isEdit && pet) {
        await db.collection('pets').doc(pet.id).update(petDocData);
        showToast(isDraftFlag ? `Draft for ${wizardData.name} updated.` : `${wizardData.name} updated successfully!`, "success");
      } else {
        const traceId = await generatePawTraceId();
        petDocData.pawTraceId = traceId;
        petDocData.lostStatus = 'SAFE';
        petDocData.createdAt = fb.firestore.FieldValue.serverTimestamp();
        petDocData.sharedWithVets = [];
        petDocData.hasTag = false;
        
        const docRef = await db.collection('pets').add(petDocData);
        targetId = docRef.id;
        showToast(isDraftFlag ? `Draft saved for ${wizardData.name}.` : `${wizardData.name} registered successfully!`, "success");
      }

      // 4. Redirect
      if (isDraftFlag) {
        Router.navigate('/pets');
      } else {
        Router.navigate(`/pet/${targetId || params.id}`);
      }

    } catch (err) {
      console.error("Save Pet Error:", err);
      showToast("Error saving pet profile data.", "error");
    } finally {
      showLoading(false);
    }
  }

  // Local helper to upload base64 to Firebase storage
  async function uploadImageToStorage(base64Data, path) {
    if (!storage) return base64Data;
    try {
      const res = await fetch(base64Data);
      const blob = await res.blob();
      const ref = storage.ref(path);
      const snapshot = await ref.put(blob);
      return await snapshot.ref.getDownloadURL();
    } catch (err) {
      console.warn("Storage upload failed, fallback to Base64:", err);
      return base64Data;
    }
  }
}


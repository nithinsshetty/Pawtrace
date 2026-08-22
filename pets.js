// ==========================================================================
// PET MANAGEMENT MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate, calculateAge, getPetImageHTML, getPetPlaceholder, generatePawTraceId, uploadToStorage, escapeHTML } from './utils.js';
import { Router } from './router.js';
import { renderCaregiverManager } from './caregiver.js';
import { showOrderModal } from './orders.js';


/**
 * Checks if all mandatory fields are filled. Operates on the JS-shaped pet
 * object (camelCase) used throughout this file's UI layer.
 */
export function isProfileComplete(pet) {
  if (!pet) return false;
  const requiredFields = [
    'name', 'petType', 'breed', 'gender', 'age', 'weight',
    'ownerName', 'ownerPhone', 'emergencyContactName', 'emergencyContact'
  ];
  for (const field of requiredFields) {
    if (pet[field] === undefined || pet[field] === null || String(pet[field]).trim() === '') {
      return false;
    }
  }
  if (!pet.recoveryContact || String(pet.recoveryContact).trim() === '') return false;
  if (pet.petType === 'Dog' && !pet.size) return false;
  if ((pet.petType === 'Dog' || pet.petType === 'Cat') && !pet.neutered) return false;
  if (pet.petType === 'Cat' && !pet.indoorOutdoor) return false;
  return true;
}

/**
 * Maps a Supabase pets row (snake_case) into the JS shape (camelCase)
 * used across the pet UI/wizard code.
 */
function mapPetRow(row) {
  return {
    id: row.id,
    name: row.name,
    petType: row.species,
    breed: row.breed,
    gender: row.gender,
    dob: row.date_of_birth,
    age: row.date_of_birth ? calculateAge(row.date_of_birth) : '',
    weight: row.weight,
    profileImage: row.photo_url,
    size: row.size,
    indoorOutdoor: row.indoor_outdoor,
    neutered: row.neutered,
    microchipId: row.microchip_id,
    adoptionSource: row.adoption_source,
    registrationDate: row.registration_date,
    adoptionDate: row.adoption_date,
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    emergencyContactName: row.emergency_contact_name,
    emergencyContact: row.emergency_contact,
    relationship: row.relationship,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    bloodType: row.blood_type,
    insurance: row.insurance,
    vaccinationStatus: row.vaccination_status,
    allergies: row.allergies,
    conditions: row.conditions,
    medications: row.medications,
    medicalNotes: row.medical_notes,
    dietType: row.diet_type,
    feedingSchedule: row.feeding_schedule,
    activityLevel: row.activity_level,
    treats: row.treats,
    behaviorNotes: row.behavior_notes,
    trainingDetails: row.training_details,
    additionalPhotos: row.additional_photos || [],
    recoveryContact: row.recovery_contact,
    recoveryInstructions: row.recovery_instructions,
    rewardAmount: row.reward_amount,
    privacy: row.privacy || {},
    ownerId: row.owner_id,
    ownerContact: row.owner_contact,
    isDraft: row.is_draft,
    pawTraceId: row.pawtrace_id,
    lostStatus: row.is_lost ? 'LOST' : 'SAFE',
    hasTag: row.has_tag,
    tagOrderId: row.tag_order_id
  };
}

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
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
    </div>
  `;

  document.getElementById('btn-add-pet').onclick = () => Router.navigate('/pet/register');

  await loadUserPetsList(user.uid);
}

/**
 * Fetch pets matching user uid from Supabase
 */
async function loadUserPetsList(uid) {
  const container = document.getElementById('pets-list-container');

  showLoading(true, "Fetching pet profiles...");
  try {
    const { data: rows, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', uid);

    if (error) throw error;

    container.innerHTML = '';

    if (!rows || rows.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-paw" style="font-size:3rem; color:var(--teal); opacity:0.6;"></i>
          <h3>No pets registered</h3>
          <p>Get started by clicking the "Add Pet Profile" button above.</p>
        </div>
      `;
      return;
    }

    rows.forEach((row) => {
      const pet = mapPetRow(row);

      const isDraft = pet.isDraft === true;
      let badgeClass = 'safe';
      let badgeText = pet.lostStatus || 'SAFE';

      if (isDraft) {
        badgeClass = 'draft';
        badgeText = 'DRAFT';
      } else if (pet.lostStatus === 'LOST') {
        badgeClass = 'lost';
        badgeText = 'MISSING';
      } else if (!isProfileComplete(pet)) {
        badgeClass = 'warning';
        badgeText = 'INCOMPLETE';
      }
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
            <span>${escapeHTML(pet.name)}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight:500;">${escapeHTML(pet.pawTraceId || 'PT-PENDING')}</span>
          </h4>
          <div class="pet-card-meta">
            <span><i class="fa-solid fa-dna"></i> ${escapeHTML(pet.breed || 'Unknown')}</span>
            <span>•</span>
            <span><i class="fa-solid fa-venus-mars"></i> ${escapeHTML(pet.gender || 'N/A')}</span>
          </div>
          <div class="pet-card-actions" style="flex-wrap: wrap; gap: 0.5rem 0;">
            <a href="${actionLink}" class="btn btn-secondary" style="font-size:0.8rem; padding: 0.5rem 1rem; flex: 1;">
              ${actionText}
            </a>
            <button class="btn btn-danger btn-delete-pet" data-id="${pet.id}" data-name="${escapeHTML(pet.name)}" style="padding: 0.5rem;">
              <i class="fa-solid fa-trash"></i>
            </button>
            ${!isDraft ? `
              <a href="#/marketplace/new/${pet.id}" class="btn btn-outline btn-full" style="font-size:0.75rem; padding: 0.40rem; border:1px solid var(--terracotta); color:var(--terracotta); width: 100%; text-align: center;">
                 <i class="fa-solid fa-store"></i> List on Marketplace
              </a>
            ` : ''}
          </div>
        </div>
      `;
      container.appendChild(card);
    });

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
 * Confirm delete validation check
 */
function confirmDeletePet(id, name) {
  showModal({
    title: "Delete Profile?",
    bodyHtml: `
      <div style="text-align:center; padding: 1rem 0;">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <p>Are you sure you want to permanently delete the profile for <strong>${escapeHTML(name)}</strong>?</p>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top:0.5rem;">This will delete all medical records, reminders, and journal timelines. This action cannot be undone.</p>
      </div>
    `,
    confirmText: "Yes, Delete Profile",
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('pets').delete().eq('id', id);
        if (error) throw error;
        showToast(`Profile for ${escapeHTML(name)} deleted.`, "info");
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

  showLoading(true, "Fetching detailed records...");
  try {
    const { data: row, error } = await supabase.from('pets').select('*').eq('id', petId).single();
    if (error || !row) {
      showToast("Pet profile not found.", "error");
      Router.navigate('/pets');
      return;
    }

    const pet = mapPetRow(row);

    const user = getCurrentUser();
    if (pet.ownerId !== user.uid) {
      showToast("Access Denied: Not owner.", "error");
      Router.navigate('/pets');
      return;
    }

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
      <div class="glass-card detail-header magnetic-card" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.03) 0%, rgba(219, 93, 57, 0.03) 100%); margin-bottom: 2rem;">
        <div class="detail-avatar">
          ${getPetImageHTML(pet, 'small')}
        </div>
        <div class="detail-info">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
            <span>${escapeHTML(pet.name)}</span>
            <span class="pet-status-badge ${pet.lostStatus === 'LOST' ? 'lost' : !isProfileComplete(pet) ? 'warning' : 'safe'}" id="detail-status-badge">
              ${pet.lostStatus || (!isProfileComplete(pet) ? 'INCOMPLETE' : 'SAFE')}
            </span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            <i class="fa-solid fa-dna"></i> ${escapeHTML(pet.breed)} &nbsp;|&nbsp;
            <i class="fa-solid fa-venus-mars"></i> ${escapeHTML(pet.gender)} &nbsp;|&nbsp;
            <i class="fa-solid fa-scale-balanced"></i> ${escapeHTML(pet.weight)} kg &nbsp;|&nbsp;
            <i class="fa-solid fa-id-card"></i> ${escapeHTML(pet.pawTraceId)}
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

      <div class="detail-tabs" style="margin-bottom: 1.5rem;">
        <a href="#/pet/${pet.id}" class="tab-link active" id="tab-profile">Profile Info</a>
        <a href="#/pet/${pet.id}/medical" class="tab-link" id="tab-medical">Medical Log</a>
        <a href="#/pet/${pet.id}/reminders" class="tab-link" id="tab-reminders">Reminders</a>
        <a href="#/pet/${pet.id}/journal" class="tab-link" id="tab-journal">Growth Journal</a>
      </div>

      <div class="grid-split-2-1" style="align-items: start; margin-top:0; gap: 1.5rem;">

        <div style="display:flex; flex-direction:column; gap:1.5rem;">

          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-id-card" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Identity</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">PET TYPE</span>
                <strong>${escapeHTML(pet.petType || 'Other')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">BREED</span>
                <strong>${escapeHTML(pet.breed || 'Unknown')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">GENDER</span>
                <strong>${escapeHTML(pet.gender || 'Unknown')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">DATE OF BIRTH</span>
                <strong>${formatFriendlyDate(pet.dob)}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">CALCULATED AGE</span>
                <strong>${calculateAge(pet.dob) || pet.age || 'N/A'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">WEIGHT</span>
                <strong>${pet.weight ? escapeHTML(pet.weight) + ' kg' : 'N/A'}</strong>
              </div>

              ${pet.size ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">SIZE</span>
                  <strong>${escapeHTML(pet.size)}</strong>
                </div>
              ` : ''}
              ${pet.indoorOutdoor ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ENVIRONMENT</span>
                  <strong>${escapeHTML(pet.indoorOutdoor)}</strong>
                </div>
              ` : ''}
              ${pet.neutered ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">SPAYED / NEUTERED</span>
                  <strong>${escapeHTML(pet.neutered)}</strong>
                </div>
              ` : ''}

              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">MICROCHIP ID</span>
                <strong>${escapeHTML(pet.microchipId) || 'None'}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ADOPTION SOURCE</span>
                <strong>${escapeHTML(pet.adoptionSource) || 'N/A'}</strong>
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

            ${pet.additionalPhotos && pet.additionalPhotos.length > 0 ? `
              <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-glass); padding-top: 1.25rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase; margin-bottom:0.75rem;">Photos Gallery</span>
                <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap:0.75rem;">
                  ${pet.additionalPhotos.map((url) => `
                    <div style="aspect-ratio: 1; border-radius: var(--radius-sm); overflow:hidden; border: 1px solid var(--border-glass); box-shadow:var(--shadow-sm);">
                      <img src="${escapeHTML(url)}" data-photo-url="${escapeHTML(url)}" class="gallery-photo-open" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-user-shield" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Owner</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">OWNER NAME</span>
                <strong>${escapeHTML(pet.ownerName || 'Ecosystem Owner')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">PRIMARY PHONE</span>
                <strong>${escapeHTML(pet.ownerPhone || 'N/A')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">EMERGENCY CONTACT NAME</span>
                <strong>${escapeHTML(pet.emergencyContactName || 'N/A')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">EMERGENCY PHONE</span>
                <strong>${escapeHTML(pet.emergencyContact || 'N/A')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">RELATIONSHIP</span>
                <strong>${escapeHTML(pet.relationship || 'N/A')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">OWNER EMAIL</span>
                <strong>${escapeHTML(pet.ownerContact || 'N/A')}</strong>
              </div>
            </div>
            ${pet.address ? `
              <div style="margin-top:1.25rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">HOME ADDRESS</span>
                <strong>${escapeHTML(pet.address)}${pet.city ? ', ' + escapeHTML(pet.city) : ''}${pet.state ? ', ' + escapeHTML(pet.state) : ''}${pet.postalCode ? ' - ' + escapeHTML(pet.postalCode) : ''}</strong>
              </div>
            ` : ''}
          </div>

          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-heart-pulse" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Medical</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">VACCINATION STATUS</span>
                <strong>${escapeHTML(pet.vaccinationStatus || 'Unknown')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">BLOOD TYPE</span>
                <strong>${escapeHTML(pet.bloodType || 'Unknown')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">PET INSURANCE</span>
                <strong>${escapeHTML(pet.insurance || 'None')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">KNOWN ALLERGIES</span>
                <strong style="color:${pet.allergies ? 'var(--terracotta)' : 'inherit'};">${escapeHTML(pet.allergies || 'None')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">MEDICAL CONDITIONS</span>
                <strong>${escapeHTML(pet.conditions || 'None')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">CURRENT MEDICATIONS</span>
                <strong>${escapeHTML(pet.medications || 'None')}</strong>
              </div>
            </div>
            ${pet.medicalNotes ? `
              <div style="margin-top:1.25rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">CRITICAL MEDICAL NOTES</span>
                <p style="font-size:0.9rem; line-height:1.5; margin-top:0.25rem;">${escapeHTML(pet.medicalNotes)}</p>
              </div>
            ` : ''}
          </div>

          <div class="glass-card" style="padding:1.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-paw" style="color:var(--teal); font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Lifestyle</h3>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">DIET TYPE</span>
                <strong>${escapeHTML(pet.dietType || 'Kibble')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">FEEDING SCHEDULE</span>
                <strong>${escapeHTML(pet.feedingSchedule || 'N/A')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">ACTIVITY LEVEL</span>
                <strong>${escapeHTML(pet.activityLevel || 'Moderate')}</strong>
              </div>
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">TREATS ALLOWED</span>
                <strong>${escapeHTML(pet.treats || 'Yes')}</strong>
              </div>
            </div>
            ${pet.behaviorNotes ? `
              <div style="margin-top:1.25rem; border-top: 1px solid var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">BEHAVIOR & SOCIALIZATION</span>
                <p style="font-size:0.9rem; line-height:1.5; margin-top:0.25rem;">${escapeHTML(pet.behaviorNotes)}</p>
              </div>
            ` : ''}
            ${pet.trainingDetails ? `
              <div style="margin-top:1rem; border-top: 1px dashed var(--border-glass); padding-top: 1rem;">
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-transform:uppercase;">TRAINING DETAILS</span>
                <p style="font-size:0.9rem; line-height:1.5; margin-top:0.25rem;">${escapeHTML(pet.trainingDetails)}</p>
              </div>
            ` : ''}
          </div>
          <div id="caregiver-manager-section"></div>
          <div id="vet-sharing-section"></div>

        </div>

        <div style="display:flex; flex-direction:column; gap:1.5rem;">

          <div class="glass-card" style="padding:1.5rem; border-left:4px solid ${pet.lostStatus === 'LOST' ? 'var(--accent-red)' : 'var(--teal)'};">
            <div style="display:flex; align-items:center; gap:0.5rem; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.75rem; margin-bottom:1.25rem;">
              <i class="fa-solid fa-house-chimney-medical" style="color:${pet.lostStatus === 'LOST' ? 'var(--accent-red)' : 'var(--teal)'}; font-size:1.3rem;"></i>
              <h3 style="font-weight:700; font-family:'Outfit'; margin:0;">Recovery</h3>
            </div>

            <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.25rem;">
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">RECOVERY CONTACT PHONE</span>
                <strong>${escapeHTML(pet.recoveryContact || pet.ownerPhone || pet.emergencyContact || 'N/A')}</strong>
              </div>

              ${pet.rewardAmount ? `
                <div style="background:rgba(244, 208, 104, 0.15); padding:0.5rem 0.75rem; border-radius:var(--radius-sm); border:1px solid var(--accent-yellow);">
                  <span style="font-size:0.7rem; color:#856404; display:block; font-weight:600; text-transform:uppercase;">REWARD OFFERED</span>
                  <strong style="color:#856404; font-size:1rem;">${escapeHTML(pet.rewardAmount)}</strong>
                </div>
              ` : ''}

              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">FINDER SCAN INSTRUCTIONS</span>
                <p style="font-size:0.8rem; line-height:1.4; margin-top:0.2rem;">${escapeHTML(pet.recoveryInstructions || "Please keep safe and contact immediately. Pet is friendly but may be scared.")}</p>
              </div>
            </div>

            <button id="btn-toggle-lost-card" class="btn ${pet.lostStatus === 'LOST' ? 'btn-secondary' : 'btn-danger'} btn-full" style="font-size:0.85rem; padding:0.6rem;">
              <i class="fa-solid ${pet.lostStatus === 'LOST' ? 'fa-shield-halved' : 'fa-triangle-exclamation'}"></i>
              <span>${pet.lostStatus === 'LOST' ? 'Mark Found & Safe' : 'Report Lost / Missing'}</span>
            </button>
          </div>

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
    document.getElementById('btn-edit-pet').onclick = () => Router.navigate(`/pet/${pet.id}/edit`);

    const toggleHeaderBtn = document.getElementById('btn-toggle-lost-header');
    if (toggleHeaderBtn) toggleHeaderBtn.onclick = () => togglePetLostStatus(pet);

    const toggleCardBtn = document.getElementById('btn-toggle-lost-card');
    if (toggleCardBtn) toggleCardBtn.onclick = () => togglePetLostStatus(pet);

    if (pet.hasTag) {
      generateQrTagCode(pet.id);
    } else if (!pet.tagOrderId) {
      document.getElementById('btn-order-tag').onclick = () => showOrderModal(pet.id, pet.name);
    }

    document.querySelectorAll('.gallery-photo-open').forEach(img => {
      img.onclick = () => window.open(img.getAttribute('data-photo-url'), '_blank');
    });

    const cgContainer = document.getElementById('caregiver-manager-section');
    if (cgContainer) {
      renderCaregiverManager(pet.id, cgContainer);
    }

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
    const { error } = await supabase
      .from('pets')
      .update({ is_lost: targetStatus === 'LOST', updated_at: new Date().toISOString() })
      .eq('id', pet.id);
    if (error) throw error;

    const notificationMessage = targetStatus === 'LOST'
      ? `Alert: ${pet.name} has been marked as MISSING. Watch for scans.`
      : `Success: ${pet.name} has been marked as FOUND and safe.`;

    await supabase.from('notifications').insert({
      user_id: pet.ownerId,
      type: 'STATUS_CHANGE',
      message: notificationMessage,
      is_read: false
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

  await loadAuthorizedVetsList(pet, document.getElementById('authorized-vets-list'));

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
 * Validates a vet's email, creates a vet_access row.
 * Vets are just users with role='vet' in public.users — no separate vetProfiles table needed.
 */
async function requestVetAccess(pet, email) {
  showLoading(true, "Authorizing veterinarian...");
  try {
    const emailLower = email.toLowerCase().trim();
    const { data: vet, error: vetErr } = await supabase
      .from('users')
      .select('id, display_name, email, vet_details')
      .eq('email', emailLower)
      .eq('role', 'vet')
      .maybeSingle();

    if (vetErr) throw vetErr;
    if (!vet) {
      showToast("No registered veterinarian clinic found with that email address.", "warning");
      return;
    }

    const { data: existing } = await supabase
      .from('vet_access')
      .select('id')
      .eq('pet_id', pet.id)
      .eq('vet_id', vet.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      showToast("Access is already shared with this clinic.", "info");
      return;
    }

    const { error: insertErr } = await supabase.from('vet_access').insert({
      pet_id: pet.id,
      owner_id: pet.ownerId,
      vet_id: vet.id,
      status: 'active'
    });
    if (insertErr) throw insertErr;

    await supabase.from('notifications').insert({
      user_id: vet.id,
      type: 'STATUS_CHANGE',
      message: `You have been granted medical clinical access to pet companion: ${pet.name}.`,
      is_read: false
    });

    showToast(`Access shared with ${vet.display_name || 'the clinic'} successfully!`, "success");
    renderPetDetail({ id: pet.id });
  } catch (err) {
    console.error("Vet authorization error:", err);
    showToast(`Failed to share access with vet: ${err.message || err}`, "error");
  } finally {
    showLoading(false);
  }
}
async function revokeVetAccess(pet, accessId) {
  showLoading(true, "Revoking authorization...");
  try {
    const { error } = await supabase.from('vet_access').delete().eq('id', accessId);
    if (error) throw error;
    showToast("Clinic access privileges revoked.", "info");
    renderPetDetail({ id: pet.id });
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

  try {
    const { data: grants, error } = await supabase
      .from('vet_access')
      .select('id, vet_id, users!vet_access_vet_id_fkey(display_name, email, vet_details)')
      .eq('pet_id', pet.id)
      .eq('status', 'active');

    if (error) throw error;

    if (!grants || grants.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mini" style="padding:1rem 0; text-align: center;">
          <p style="margin:0; font-size:0.8rem; color:var(--text-muted);">No authorized clinics listed.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    grants.forEach(grant => {
      const vet = grant.users || {};
      const clinicName = vet.vet_details?.clinicName || vet.display_name || "Clinic";

      const item = document.createElement('div');
      item.className = 'reminder-item';
      item.style.background = 'rgba(255,255,255,0.01)';
      item.style.border = '1px solid var(--border-glass)';
      item.style.padding = '0.6rem 0.8rem';
      item.style.margin = '0';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; gap:0.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.15rem; font-size:0.75rem;">
            <strong style="color:var(--text-main);">${escapeHTML(vet.display_name || "Clinic")}</strong>
            <span style="color:var(--text-muted); font-size:0.7rem;">${escapeHTML(clinicName)} &bull; ${escapeHTML(vet.email || '')}</span>
          </div>
          <button class="btn btn-secondary btn-revoke-vet" data-id="${grant.id}" style="font-size:0.65rem; padding:0.3rem 0.6rem; border-color:rgba(230,57,70,0.3); color:var(--accent-red); background:transparent;">
            Revoke Access
          </button>
        </div>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('.btn-revoke-vet').forEach(btn => {
      btn.onclick = async () => {
        const accessId = btn.getAttribute('data-id');
        await revokeVetAccess(pet, accessId);
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

  const pageSize = 12;
  let offset = 0;

  async function fetchPage(isFirstPage = false) {
    if (isFirstPage) {
      board.innerHTML = `
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-card"></div>
      `;
      paginationContainer.style.display = 'none';
      offset = 0;
      showLoading(true, "Loading missing pet alerts...");
    } else {
      loadMoreBtn.disabled = true;
      loadMoreBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Loading...`;
    }

    try {
      const { data: rows, error } = await supabase
        .from('pets')
        .select('*')
        .eq('is_lost', true)
        .range(offset, offset + pageSize - 1);

      if (error) throw error;

      if (isFirstPage) {
        board.innerHTML = '';
      }

      if (!rows || rows.length === 0) {
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

      rows.forEach((row) => {
        const pet = mapPetRow(row);

        const card = document.createElement('div');
        card.className = 'glass-card pet-card magnetic-card';
        card.innerHTML = `
          <div class="pet-image-container">
            ${getPetImageHTML(pet, 'large')}
            <span class="pet-status-badge lost">MISSING</span>
          </div>
          <div class="pet-card-content">
            <h4 class="pet-card-name">${escapeHTML(pet.name)}</h4>
            <div class="pet-card-meta" style="flex-direction: column; gap: 0.25rem;">
              <span><strong>Breed:</strong> ${escapeHTML(pet.breed || 'Unknown')}</span>
              <span><strong>Age:</strong> ${calculateAge(pet.dob) || pet.age || 'N/A'}</span>
              <span style="color: var(--accent-red); margin-top: 0.25rem; font-weight:600;">
                <i class="fa-solid fa-circle-exclamation"></i> Emergency Phone: ${escapeHTML(pet.emergencyContact || 'N/A')}
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

      offset += rows.length;

      if (rows.length < pageSize) {
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
      const { data: row, error } = await supabase.from('pets').select('*').eq('id', params.id).single();
      if (error || !row) {
        showToast("Pet profile not found.", "error");
        Router.navigate('/pets');
        return;
      }
      pet = mapPetRow(row);
    } catch (err) {
      console.error("Error loading pet:", err);
      showToast("Failed to load pet details.", "error");
      Router.navigate('/pets');
      return;
    }
  }

  showLoading(false);

  const wizardData = {
    name: pet ? (pet.name || '') : '',
    petType: pet ? (pet.petType || 'Dog') : 'Dog',
    breed: pet ? (pet.breed || '') : '',
    gender: pet ? (pet.gender || 'Male') : 'Male',
    dob: pet ? (pet.dob || '') : '',
    age: pet ? (pet.age || '') : '',
    weight: pet ? (pet.weight || '') : '',
    profileImage: pet ? (pet.profileImage || '') : '',

    size: pet ? (pet.size || 'Medium') : 'Medium',
    indoorOutdoor: pet ? (pet.indoorOutdoor || 'Indoor') : 'Indoor',
    neutered: pet ? (pet.neutered || 'Not Neutered') : 'Not Neutered',

    microchipId: pet ? (pet.microchipId || '') : '',
    adoptionSource: pet ? (pet.adoptionSource || '') : '',
    registrationDate: pet ? (pet.registrationDate || '') : '',
    adoptionDate: pet ? (pet.adoptionDate || '') : '',

    ownerName: pet ? (pet.ownerName || user.displayName || '') : (user.displayName || ''),
    ownerPhone: pet ? (pet.ownerPhone || '') : '',
    emergencyContactName: pet ? (pet.emergencyContactName || '') : '',
    emergencyContact: pet ? (pet.emergencyContact || '') : '',
    relationship: pet ? (pet.relationship || '') : '',
    address: pet ? (pet.address || '') : '',
    city: pet ? (pet.city || '') : '',
    state: pet ? (pet.state || '') : '',
    postalCode: pet ? (pet.postalCode || '') : '',

    bloodType: pet ? (pet.bloodType || 'Unknown') : 'Unknown',
    insurance: pet ? (pet.insurance || '') : '',
    vaccinationStatus: pet ? (pet.vaccinationStatus || 'Unknown') : 'Unknown',
    allergies: pet ? (pet.allergies || '') : '',
    conditions: pet ? (pet.conditions || '') : '',
    medications: pet ? (pet.medications || '') : '',
    medicalNotes: pet ? (pet.medicalNotes || '') : '',

    dietType: pet ? (pet.dietType || 'Kibble') : 'Kibble',
    feedingSchedule: pet ? (pet.feedingSchedule || '') : '',
    activityLevel: pet ? (pet.activityLevel || 'Moderate') : 'Moderate',
    treats: pet ? (pet.treats || '') : '',
    behaviorNotes: pet ? (pet.behaviorNotes || '') : '',
    trainingDetails: pet ? (pet.trainingDetails || '') : '',
    additionalPhotos: pet ? (pet.additionalPhotos || []) : [],

    recoveryContact: pet ? (pet.recoveryContact || '') : '',
    recoveryInstructions: pet ? (pet.recoveryInstructions || '') : '',
    rewardAmount: pet ? (pet.rewardAmount || '') : '',

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

  viewport.innerHTML = `
    <div class="wizard-layout">
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

  renderStep(1);

  function renderStep(stepNum) {
    currentStep = stepNum;
    const panel = document.getElementById('wizard-step-panel');
    const stepTitleEl = document.getElementById('wizard-step-title');
    const stepIndicatorEl = document.getElementById('wizard-step-indicator');
    const progressFillEl = document.getElementById('wizard-progress-fill');

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

    const percentage = Math.round((currentStep / totalSteps) * 100);
    progressFillEl.style.width = `${percentage}%`;
    stepIndicatorEl.textContent = `Step ${currentStep} of ${totalSteps}`;

    const backBtn = document.getElementById('btn-wizard-back');
    const skipBtn = document.getElementById('btn-wizard-skip');
    const nextBtn = document.getElementById('btn-wizard-next');

    if (currentStep === 1) {
      backBtn.style.display = 'none';
    } else {
      backBtn.style.display = 'inline-flex';
    }

    const isOptionalStep = [2, 4, 5, 7].includes(currentStep);
    skipBtn.style.display = isOptionalStep ? 'inline-flex' : 'none';

    if (currentStep === totalSteps) {
      nextBtn.innerHTML = isEdit ? 'Save Changes <i class="fa-solid fa-check"></i>' : 'Complete Registration <i class="fa-solid fa-check"></i>';
    } else {
      nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
    }

    if (currentStep === 1) {
      stepTitleEl.textContent = 'Basic Information';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-name">Pet Name *</label>
            <input type="text" id="w-name" class="form-control" value="${escapeHTML(wizardData.name)}" required placeholder="E.g. Rex">
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
            <input type="text" id="w-breed" class="form-control" value="${escapeHTML(wizardData.breed)}" required placeholder="E.g. Golden Retriever">
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
            <input type="date" id="w-dob" class="form-control" value="${escapeHTML(wizardData.dob)}" max="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="w-age">Approximate Age *</label>
            <input type="text" id="w-age" class="form-control" value="${escapeHTML(wizardData.age)}" required placeholder="E.g. 2 years (auto-fills from DOB)">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-weight">Weight (kg) *</label>
            <input type="number" step="0.1" id="w-weight" class="form-control" value="${escapeHTML(wizardData.weight)}" required placeholder="E.g. 12.5">
          </div>
          <div class="form-group">
            <label>Profile Photo *</label>
            <div style="display:flex; gap:1.5rem; align-items:center;">
              <div class="profile-photo-upload-zone" id="w-photo-zone">
                <img id="w-photo-preview" src="${escapeHTML(wizardData.profileImage || '')}" alt="Preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display: ${wizardData.profileImage ? 'block' : 'none'}; width:100%; height:100%; object-fit:cover;">
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

      const typeSelect = document.getElementById('w-pet-type');
      typeSelect.onchange = () => {
        wizardData.petType = typeSelect.value;
        renderSpeciesFields();
      };
      renderSpeciesFields();

      const dobInput = document.getElementById('w-dob');
      const ageInput = document.getElementById('w-age');
      const updateAge = () => {
        if (dobInput.value) {
          const calculated = calculateAge(dobInput.value);
          ageInput.value = calculated;
          wizardData.age = calculated;
        }
      };
      dobInput.onchange = updateAge;

      if (dobInput.value) {
        updateAge();
      }

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
            <input type="text" id="w-microchip" class="form-control" value="${escapeHTML(wizardData.microchipId)}" placeholder="Enter microchip tag code">
          </div>
          <div class="form-group">
            <label for="w-adoption-source">Adoption Source (Optional)</label>
            <input type="text" id="w-adoption-source" class="form-control" value="${escapeHTML(wizardData.adoptionSource)}" placeholder="E.g. Shelter Name, Breeder, Rescue">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-reg-date">Registration Date (Optional)</label>
            <input type="date" id="w-reg-date" class="form-control" value="${escapeHTML(wizardData.registrationDate)}">
          </div>
          <div class="form-group">
            <label for="w-adopt-date">Adoption Date (Optional)</label>
            <input type="date" id="w-adopt-date" class="form-control" value="${escapeHTML(wizardData.adoptionDate)}">
          </div>
        </div>
      `;
    } else if (currentStep === 3) {
      stepTitleEl.textContent = 'Owner Information';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-owner-name">Owner Name *</label>
            <input type="text" id="w-owner-name" class="form-control" value="${escapeHTML(wizardData.ownerName)}" required placeholder="Full Name">
          </div>
          <div class="form-group">
            <label for="w-owner-phone">Primary Phone Number *</label>
            <input type="tel" id="w-owner-phone" class="form-control" value="${escapeHTML(wizardData.ownerPhone)}" required placeholder="+1 (555) 123-4567">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-emg-name">Emergency Contact Name *</label>
            <input type="text" id="w-emg-name" class="form-control" value="${escapeHTML(wizardData.emergencyContactName)}" required placeholder="Emergency Contact Name">
          </div>
          <div class="form-group">
            <label for="w-emg-phone">Emergency Contact Number *</label>
            <input type="tel" id="w-emg-phone" class="form-control" value="${escapeHTML(wizardData.emergencyContact)}" required placeholder="+1 (555) 987-6543">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-relationship">Relationship to Pet (Optional)</label>
            <input type="text" id="w-relationship" class="form-control" value="${escapeHTML(wizardData.relationship)}" placeholder="E.g. Parent, Sibling, Friend">
          </div>
          <div class="form-group">
            <label for="w-address">Street Address (Optional)</label>
            <input type="text" id="w-address" class="form-control" value="${escapeHTML(wizardData.address)}" placeholder="House No, Street name">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-city">City (Optional)</label>
            <input type="text" id="w-city" class="form-control" value="${escapeHTML(wizardData.city)}" placeholder="City">
          </div>
          <div class="form-group">
            <label for="w-state">State (Optional)</label>
            <input type="text" id="w-state" class="form-control" value="${escapeHTML(wizardData.state)}" placeholder="State">
          </div>
          <div class="form-group">
            <label for="w-zip">Postal Code (Optional)</label>
            <input type="text" id="w-zip" class="form-control" value="${escapeHTML(wizardData.postalCode)}" placeholder="Zip Code">
          </div>
        </div>
      `;
    } else if (currentStep === 4) {
      stepTitleEl.textContent = 'Medical Profile (Optional)';
      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-blood">Blood Type (Optional)</label>
            <input type="text" id="w-blood" class="form-control" value="${escapeHTML(wizardData.bloodType)}" placeholder="E.g. DEA 1.1+, A, B, etc.">
          </div>
          <div class="form-group">
            <label for="w-insurance">Pet Insurance Provider/Policy (Optional)</label>
            <input type="text" id="w-insurance" class="form-control" value="${escapeHTML(wizardData.insurance)}" placeholder="E.g. Healthy Paws, Policy #12345">
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
            <input type="text" id="w-allergies" class="form-control" value="${escapeHTML(wizardData.allergies)}" placeholder="E.g. Chicken, Penicillin, Dust mites">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-conditions">Existing Medical Conditions (Optional)</label>
            <input type="text" id="w-conditions" class="form-control" value="${escapeHTML(wizardData.conditions)}" placeholder="E.g. Diabetes, Arthritis, none">
          </div>
          <div class="form-group">
            <label for="w-medications">Current Medications (Optional)</label>
            <input type="text" id="w-medications" class="form-control" value="${escapeHTML(wizardData.medications)}" placeholder="E.g. Insulin daily, Joint chews">
          </div>
        </div>

        <div class="form-group">
          <label for="w-medical-notes">Critical Medical / Healthcare Notes (Optional)</label>
          <textarea id="w-medical-notes" class="form-control" rows="3" placeholder="Any additional healthcare directives or clinical history details...">${escapeHTML(wizardData.medicalNotes)}</textarea>
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
            <input type="text" id="w-feeding" class="form-control" value="${escapeHTML(wizardData.feedingSchedule)}" placeholder="E.g. Twice daily at 8am & 6pm">
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
            <input type="text" id="w-treats" class="form-control" value="${escapeHTML(wizardData.treats)}" placeholder="E.g. Salmon skin, freeze-dried liver">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="w-behavior">Behavior & Social Notes (Optional)</label>
            <textarea id="w-behavior" class="form-control" rows="2" placeholder="E.g. Super friendly, nervous around loud trucks, barks at postman...">${escapeHTML(wizardData.behaviorNotes)}</textarea>
          </div>
          <div class="form-group">
            <label for="w-training">Training & Skill Details (Optional)</label>
            <textarea id="w-training" class="form-control" rows="2" placeholder="E.g. Basic obedience, crate trained, service dog certified...">${escapeHTML(wizardData.trainingDetails)}</textarea>
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

      let recContact = wizardData.recoveryContact;
      if (!recContact) {
        recContact = wizardData.ownerPhone || wizardData.emergencyContact || '';
      }

      let recInstructions = wizardData.recoveryInstructions;
      if (!recInstructions) {
        recInstructions = "Please keep safe and contact immediately. Pet is friendly but may be scared.";
      }

      panel.innerHTML = `
        <div class="form-row">
          <div class="form-group">
            <label for="w-rec-contact">Recovery Contact Phone Number *</label>
            <input type="tel" id="w-rec-contact" class="form-control" value="${escapeHTML(recContact)}" required placeholder="Phone number to call if lost">
          </div>
          <div class="form-group">
            <label for="w-reward">Reward Offered (Optional)</label>
            <input type="text" id="w-reward" class="form-control" value="${escapeHTML(wizardData.rewardAmount)}" placeholder="E.g. ₹5,000 or $500">
          </div>
        </div>

        <div class="form-group">
          <label for="w-rec-instructions">Recovery / Scanning Instructions *</label>
          <textarea id="w-rec-instructions" class="form-control" rows="3" required placeholder="Instructions shown to a finder who scans the collar tag...">${escapeHTML(recInstructions)}</textarea>
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
        <img src="${escapeHTML(img)}" alt="Preview ${idx + 1}">
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

  function validateStep() {
    const form = document.getElementById('wizard-form');
    if (!form.checkValidity()) return false;

    if (currentStep === 1) {
      const dobInput = document.getElementById('w-dob');
      if (dobInput && dobInput.value) {
        const selectedDate = new Date(dobInput.value);
        const today = new Date();
        selectedDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (selectedDate > today) {
          showToast("Date of Birth cannot be in the future.", "error");
          return false;
        }
      }
    }

    return true;
  }

  document.getElementById('btn-wizard-back').onclick = () => {
    saveCurrentStepDOM();
    if (currentStep > 1) {
      renderStep(currentStep - 1);
    }
  };

  document.getElementById('btn-wizard-skip').onclick = () => {
    saveCurrentStepDOM();
    if (currentStep < totalSteps) {
      renderStep(currentStep + 1);
    } else {
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
      let profileImageUrl = wizardData.profileImage;
      if (profileImageUrl && profileImageUrl.startsWith('data:image')) {
        const blob = await (await fetch(profileImageUrl)).blob();
        const ext = blob.type.split('/')[1] || 'jpg';
        profileImageUrl = await uploadToStorage('pet-photos', user.uid, `profile_${Date.now()}.${ext}`, blob);
      }

      const additionalPhotosUrls = [];
      for (let i = 0; i < wizardData.additionalPhotos.length; i++) {
        const photo = wizardData.additionalPhotos[i];
        if (photo.startsWith('data:image')) {
          const blob = await (await fetch(photo)).blob();
          const ext = blob.type.split('/')[1] || 'jpg';
          const url = await uploadToStorage('pet-photos', user.uid, `gallery_${i}_${Date.now()}.${ext}`, blob);
          additionalPhotosUrls.push(url);
        } else {
          additionalPhotosUrls.push(photo);
        }
      }

      const petDocData = {
        name: wizardData.name,
        species: wizardData.petType,
        breed: wizardData.breed,
        gender: wizardData.gender,
        date_of_birth: wizardData.dob || null,
        weight: wizardData.weight || null,
        photo_url: profileImageUrl,

        size: wizardData.size || '',
        indoor_outdoor: wizardData.indoorOutdoor || '',
        neutered: wizardData.neutered || '',

        microchip_id: wizardData.microchipId,
        adoption_source: wizardData.adoptionSource,
        registration_date: wizardData.registrationDate || null,
        adoption_date: wizardData.adoptionDate || null,

        owner_name: wizardData.ownerName,
        owner_phone: wizardData.ownerPhone,
        emergency_contact_name: wizardData.emergencyContactName,
        emergency_contact: wizardData.emergencyContact,
        relationship: wizardData.relationship,
        address: wizardData.address,
        city: wizardData.city,
        state: wizardData.state,
        postal_code: wizardData.postalCode,

        blood_type: wizardData.bloodType,
        insurance: wizardData.insurance,
        vaccination_status: wizardData.vaccinationStatus,
        allergies: wizardData.allergies,
        conditions: wizardData.conditions,
        medications: wizardData.medications,
        medical_notes: wizardData.medicalNotes,

        diet_type: wizardData.dietType,
        feeding_schedule: wizardData.feedingSchedule,
        activity_level: wizardData.activityLevel,
        treats: wizardData.treats,
        behavior_notes: wizardData.behaviorNotes,
        training_details: wizardData.trainingDetails,
        additional_photos: additionalPhotosUrls,

        recovery_contact: wizardData.recoveryContact || wizardData.ownerPhone || wizardData.emergencyContact || '',
        recovery_instructions: wizardData.recoveryInstructions || "Please keep safe and contact immediately. Pet is friendly but may be scared.",
        reward_amount: wizardData.rewardAmount,

        privacy: wizardData.privacy,

        owner_id: user.uid,
        owner_contact: user.email,
        is_draft: isDraftFlag,
        updated_at: new Date().toISOString()
      };

      let targetId = pet ? pet.id : null;
      if (isEdit && pet) {
        const { error } = await supabase.from('pets').update(petDocData).eq('id', pet.id);
        if (error) throw error;
        showToast(isDraftFlag ? `Draft for ${wizardData.name} updated.` : `${wizardData.name} updated successfully!`, "success");
      } else {
        const traceId = await generatePawTraceId();
        petDocData.pawtrace_id = traceId;
        petDocData.is_lost = false;
        petDocData.has_tag = false;

        const { data: inserted, error } = await supabase.from('pets').insert(petDocData).select('id').single();
        if (error) throw error;
        targetId = inserted.id;
        showToast(isDraftFlag ? `Draft saved for ${wizardData.name}.` : `${wizardData.name} registered successfully!`, "success");
      }

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
}
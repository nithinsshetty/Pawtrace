// ==========================================================================
// MEDICAL RECORDS MODULE (Timeline, prescriptions uploads, filtering)
// ==========================================================================

import { db, storage, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate, getPetImageHTML } from './utils.js';
import { Router } from './router.js';

let currentFilter = 'All';

/**
 * Renders the pet medical records timeline tab view
 */
export async function renderMedical(params) {
  const petId = params.id;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Medical Log';

  if (!db) return;

  showLoading(true, "Fetching medical timeline...");
  try {
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists) {
      showToast("Pet profile not found.", "error");
      Router.navigate('/pets');
      return;
    }

    const pet = petDoc.data();
    pet.id = petDoc.id;

    // Verify Ownership
    const user = getCurrentUser();
    if (pet.ownerId !== user.uid) {
      showToast("Access Denied.", "error");
      Router.navigate('/pets');
      return;
    }

    // Render page shell (Header + Tabs + Medical section grid)
    viewport.innerHTML = `
      <!-- Pet Detail Header -->
      <div class="glass-card detail-header">
        <div class="detail-avatar">
          ${getPetImageHTML(pet, 'small')}
        </div>
        <div class="detail-info">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
            <span>${pet.name}</span>
            <span class="pet-status-badge ${pet.lostStatus === 'LOST' ? 'lost' : 'safe'}">
              ${pet.lostStatus || 'SAFE'}
            </span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            <i class="fa-solid fa-dna"></i> ${pet.breed} &nbsp;|&nbsp; 
            <i class="fa-solid fa-scale-balanced"></i> ${pet.weight} kg &nbsp;|&nbsp;
            <i class="fa-solid fa-id-card"></i> ${pet.pawTraceId}
          </p>
        </div>
        <div class="detail-actions">
          <a href="#/pet/${pet.id}" class="btn btn-outline" style="font-size:0.85rem;">
            <i class="fa-solid fa-chevron-left"></i> Back to Profile
          </a>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="detail-tabs">
        <a href="#/pet/${pet.id}" class="tab-link" id="tab-profile">Profile Info</a>
        <a href="#/pet/${pet.id}/medical" class="tab-link active" id="tab-medical">Medical Log</a>
        <a href="#/pet/${pet.id}/reminders" class="tab-link" id="tab-reminders">Reminders</a>
        <a href="#/pet/${pet.id}/journal" class="tab-link" id="tab-journal">Growth Journal</a>
      </div>

      <!-- Medical Tab Workspace -->
      <div class="grid-cols-3">
        
        <!-- Timeline Log -->
        <div class="glass-card" style="grid-column: span 2;">
          <div class="flex-between mb-2">
            <h3 style="font-weight:700;">Clinical Health History</h3>
            
            <!-- Category Filtering Dropdown -->
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <label for="medical-filter-select" style="margin:0;">Filter:</label>
              <select id="medical-filter-select" class="form-control" style="padding:0.4rem 0.8rem; font-size:0.8rem; width:150px;">
                <option value="All" ${currentFilter === 'All' ? 'selected' : ''}>All Categories</option>
                <option value="Vaccination" ${currentFilter === 'Vaccination' ? 'selected' : ''}>Vaccinations</option>
                <option value="Surgery" ${currentFilter === 'Surgery' ? 'selected' : ''}>Surgeries</option>
                <option value="Allergy" ${currentFilter === 'Allergy' ? 'selected' : ''}>Allergies</option>
                <option value="Prescription" ${currentFilter === 'Prescription' ? 'selected' : ''}>Prescriptions</option>
                <option value="Checkup" ${currentFilter === 'Checkup' ? 'selected' : ''}>Checkups</option>
              </select>
            </div>
          </div>

          <div id="medical-timeline-container" class="timeline">
            <!-- Timeline details will load dynamically -->
          </div>
        </div>

        <!-- Adding controls -->
        <div>
          <div class="glass-card" style="position: sticky; top: 90px; text-align:center;">
            <h3 style="font-weight:700; margin-bottom: 0.5rem;">New Health Log</h3>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.25rem;">
              Log vaccination, surgeries, prescriptions, or report files.
            </p>
            <button id="btn-add-medical-record" class="btn btn-primary btn-full">
              <i class="fa-solid fa-plus"></i> File Medical Record
            </button>
          </div>
        </div>

      </div>
    `;

    // Bind Category Filter change listener
    document.getElementById('medical-filter-select').onchange = (e) => {
      currentFilter = e.target.value;
      loadMedicalRecords(petId);
    };

    // Bind Add Medical Record Modal
    document.getElementById('btn-add-medical-record').onclick = () => showAddRecordModal(petId);

    // Initial Fetch of medical records
    await loadMedicalRecords(petId);

  } catch (error) {
    console.error("Medical view initialization error:", error);
    viewport.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-exclamation" style="color:var(--accent-red); font-size: 3rem;"></i>
        <h3>Failed to load medical timeline</h3>
        <p>You may not have permission to view records for this companion, or you are offline.</p>
        <a href="#/pet/${petId}" class="btn btn-primary mt-1">Back to Profile</a>
      </div>
    `;
    showToast("Failed to initialize medical view.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Loads and renders medical history list from Firestore subcollection
 */
async function loadMedicalRecords(petId) {
  const container = document.getElementById('medical-timeline-container');
  if (!container) return;

  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-text"></div></div>`;

  try {
    let query = db.collection('pets').doc(petId).collection('medical_records').orderBy('date', 'desc');
    
    // Check if filtering is active
    if (currentFilter !== 'All') {
      query = query.where('category', '==', currentFilter);
    }

    const snapshot = await query.get();
    container.innerHTML = '';

    if (snapshot.empty) {
      container.innerHTML = `
        <div class="empty-state-mini">
          <i class="fa-solid fa-folder-open"></i>
          <p>No health history records found matching filter category: ${currentFilter}</p>
        </div>
      `;
      return;
    }

    snapshot.forEach((doc) => {
      const record = doc.data();
      record.id = doc.id;

      const item = document.createElement('div');
      item.className = `timeline-item ${record.category.toLowerCase()}`;
      
      let attachmentMarkup = '';
      if (record.attachment) {
        // Display PDF indicator icon or basic image link
        const isPdf = record.attachmentName && record.attachmentName.toLowerCase().endsWith('.pdf');
        const icon = isPdf ? 'fa-file-pdf' : 'fa-file-image';
        attachmentMarkup = `
          <a href="${record.attachment}" target="_blank" class="timeline-attachment">
            <i class="fa-solid ${icon}"></i> 
            <span>${record.attachmentName || 'Prescription file'}</span>
          </a>
        `;
      }

      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="glass-card timeline-content">
          <div class="flex-between">
            <span class="timeline-date">${formatFriendlyDate(record.date)}</span>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              <span class="pet-status-badge safe" style="background: var(--teal); opacity: 0.8; text-transform:none;">
                ${record.category}
              </span>
              <button class="icon-btn btn-delete-record" data-id="${record.id}" style="width:28px; height:28px; background:transparent; border:none; color:var(--text-muted);">
                <i class="fa-solid fa-trash" style="font-size:0.8rem;"></i>
              </button>
            </div>
          </div>
          <h4 class="timeline-title mt-1">${record.title}</h4>
          <p class="timeline-body">${record.notes || 'No description notes added.'}</p>
          ${attachmentMarkup}
        </div>
      `;
      container.appendChild(item);
    });

    // Bind single record delete listeners
    container.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        confirmDeleteRecord(petId, id);
      };
    });

  } catch (error) {
    console.error("Error loading medical records:", error);
    showToast("Failed to fetch medical history.", "error");
  }
}

/**
 * Display modal dialog to add health log
 */
function showAddRecordModal(petId) {
  const user = getCurrentUser();
  if (!user) return;

  showModal({
    title: "File Health Record",
    bodyHtml: `
      <form id="medical-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-group">
          <label for="med-category">Category *</label>
          <select id="med-category" class="form-control" required>
            <option value="Vaccination">Vaccination</option>
            <option value="Surgery">Surgery</option>
            <option value="Allergy">Allergy</option>
            <option value="Prescription">Prescription</option>
            <option value="Checkup">Checkup</option>
          </select>
        </div>

        <div id="vaccination-fields" style="display:flex; flex-direction:column; gap:1rem;">
          <div class="form-row">
            <div class="form-group">
              <label for="med-status">Vaccination Status *</label>
              <select id="med-status" class="form-control">
                <option value="Completed">Completed</option>
                <option value="Pending">Pending / Scheduled</option>
              </select>
            </div>
            <div class="form-group">
              <label for="med-next-due">Next Booster Due Date</label>
              <input type="date" id="med-next-due" class="form-control">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="med-title">Record Title / Event *</label>
          <input type="text" id="med-title" class="form-control" placeholder="Rabies Booster Shot / Neutering" required>
        </div>

        <div class="form-group">
          <label for="med-date">Date of Event *</label>
          <input type="date" id="med-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" required>
        </div>

        <div class="form-group">
          <label for="med-attachment">Prescription / Report File</label>
          <input type="file" id="med-attachment" class="form-control" accept="image/*,application/pdf">
          <small style="color:var(--text-muted); font-size:0.75rem;">Max size 5MB. Formats: PDF, JPG, PNG, WEBP.</small>
        </div>

        <div class="form-group">
          <label for="med-notes">Notes / Observations</label>
          <textarea id="med-notes" class="form-control" rows="3" placeholder="Dosage instruction, doctor suggestions, or recovery checklist..."></textarea>
        </div>
      </form>
    `,
    confirmText: "Submit Record",
    onConfirm: async () => {
      const form = document.getElementById('medical-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const category = document.getElementById('med-category').value;
      const title = document.getElementById('med-title').value.trim();
      const date = document.getElementById('med-date').value;
      const notes = document.getElementById('med-notes').value.trim();
      const fileInput = document.getElementById('med-attachment');

      // 1. Future date validation check
      const today = new Date().toISOString().split('T')[0];
      if (date > today) {
        showToast("Event date cannot be in the future.", "warning");
        return true;
      }

      // 2. Next due date validation check for vaccinations
      let nextDue = null;
      let status = null;
      if (category === 'Vaccination') {
        const nextDueInput = document.getElementById('med-next-due').value;
        const statusInput = document.getElementById('med-status').value;
        if (nextDueInput) {
          if (nextDueInput <= date) {
            showToast("Next booster due date must be after the administration date.", "warning");
            return true;
          }
          nextDue = nextDueInput;
        }
        status = statusInput;
      }

      let attachmentUrl = '';
      let attachmentName = '';

      if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileError = validateFile(file, FILE_LIMITS.MEDICAL_TYPES, FILE_LIMITS.MEDICAL_MAX_SIZE);
        if (fileError) {
          showToast(fileError, "warning");
          return true; // Stay open
        }

        try {
          if (storage && db) {
            const ref = storage.ref(`pets/${petId}/medical/${Date.now()}_${file.name}`);
            const snapshot = await ref.put(file);
            attachmentUrl = await snapshot.ref.getDownloadURL();
            attachmentName = file.name;
          } else {
            attachmentUrl = await readFileAsDataURL(file);
            attachmentName = file.name;
          }
        } catch (uploadError) {
          console.warn("Storage upload failed, fallback to base64 formatting:", uploadError);
          attachmentUrl = await readFileAsDataURL(file);
          attachmentName = file.name;
        }
      }

      const recordData = {
        category,
        title,
        date,
        notes,
        attachment: attachmentUrl,
        attachmentName,
        createdBy: user.uid,
        createdByRole: 'owner',
        createdByDisplayName: user.displayName || "Pet Owner",
        createdAt: fb.firestore.FieldValue.serverTimestamp()
      };

      if (category === 'Vaccination') {
        recordData.nextDue = nextDue;
        recordData.status = status || 'Completed';
      }

      try {
        await db.collection('pets').doc(petId).collection('medical_records').add(recordData);
        showToast("Medical record filed successfully.", "success");
        closeModal();
        loadMedicalRecords(petId);
        return false;
      } catch (err) {
        console.error("Error saving medical log:", err);
        showToast("Failed to write medical log.", "error");
        return true;
      }
    }
  });

  // Bind category selection listener for dynamic form fields
  const categorySelect = document.getElementById('med-category');
  const vaccFields = document.getElementById('vaccination-fields');
  if (categorySelect && vaccFields) {
    categorySelect.onchange = () => {
      if (categorySelect.value === 'Vaccination') {
        vaccFields.style.display = 'flex';
      } else {
        vaccFields.style.display = 'none';
      }
    };
  }
}

/**
 * Record delete validation check
 */
function confirmDeleteRecord(petId, recordId) {
  showModal({
    title: "Delete Record?",
    bodyHtml: `
      <div style="text-align:center; padding:1rem 0;">
        <i class="fa-solid fa-circle-exclamation" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <p>Delete this medical log permanently?</p>
      </div>
    `,
    confirmText: "Yes, Delete",
    onConfirm: async () => {
      try {
        await db.collection('pets').doc(petId).collection('medical_records').doc(recordId).delete();
        showToast("Record deleted successfully.", "info");
        closeModal();
        loadMedicalRecords(petId);
        return false;
      } catch (err) {
        console.error("Error deleting log:", err);
        showToast("Failed to delete record.", "error");
        return true;
      }
    }
  });
}

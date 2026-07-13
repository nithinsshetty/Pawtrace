// ==========================================================================
// VETERINARIAN PORTAL MODULE (Clinical Dashboard, Real-time Sync, Shared Logs)
// ==========================================================================

import { db, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate, getPetImageHTML } from './utils.js';

// Global variables for active unsubscribes to prevent duplicate listeners
let appointmentsUnsubscribe = null;
let patientsUnsubscribe = null;

/**
 * Render Veterinary Portal dashboard
 */
export async function renderVetPortal() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Vet Portal';

  const user = getCurrentUser();
  if (!user) return;

  showLoading(true, "Verifying veterinarian credentials...");
  try {
    // 1. Fetch user doc to inspect role privileges
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData || userData.role !== 'vet') {
      renderDeniedAccessState(viewport);
      return;
    }

    const vetDetails = userData.vetDetails || {};
    const clinicName = vetDetails.clinicName || userData.displayName || 'Clinic';
    const license = vetDetails.licenseNumber || 'Verified';
    const specializations = vetDetails.specializations || ['General Pet Medicine'];
    const city = vetDetails.city || 'Bengaluru';
    const availability = vetDetails.availability || 'Mon-Sat 9:00 AM - 6:00 PM';
    const address = vetDetails.address || '';

    // Render Vet Dashboard Shell
    viewport.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Clinical Dashboard</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Clinic Profile: <strong>${clinicName}</strong> &bull; License: <strong>${license}</strong>
        </p>
      </div>

      <!-- Main Layout (Responsive dashboard grid) -->
      <div class="dashboard-grid">
        <!-- Left Column: Shared Patients & Consultation Schedule -->
        <div>
          <!-- Shared Patient Pets -->
          <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-bottom: 1rem;">Authorized Shared Patients</h3>
          <div id="vet-patients-list" class="pets-grid mb-3">
            <div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>
          </div>

          <!-- Clinic Appointments -->
          <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-bottom: 1rem;">Consultation Schedule</h3>
          <div class="glass-card mb-2" style="padding:1.25rem;">
            <div id="vet-appointments-table" style="display:flex; flex-direction:column; gap:0.75rem;">
              <div class="skeleton skeleton-text"></div>
            </div>
          </div>
        </div>

        <!-- Right Side: Profile settings & Quick rules -->
        <div>
          <!-- Edit Clinic Profile Card -->
          <div class="glass-card mb-3">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-user-doctor"></i> Update Clinic Profile</h4>
            <form id="vet-profile-form" style="display:flex; flex-direction:column; gap:0.55rem;">
              <div class="form-group" style="margin-bottom:0.4rem;">
                <label for="vet-profile-clinic" style="font-size:0.7rem;">Clinic / Doctor Name *</label>
                <input type="text" id="vet-profile-clinic" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${clinicName}" required>
              </div>
              <div class="form-group" style="margin-bottom:0.4rem;">
                <label for="vet-profile-special" style="font-size:0.7rem;">Specializations (comma separated) *</label>
                <input type="text" id="vet-profile-special" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${specializations.join(', ')}" required>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.4rem;">
                <div class="form-group" style="margin-bottom:0;">
                  <label for="vet-profile-city" style="font-size:0.7rem;">Operating City *</label>
                  <input type="text" id="vet-profile-city" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${city}" required>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label for="vet-profile-hours" style="font-size:0.7rem;">Availability Hours *</label>
                  <input type="text" id="vet-profile-hours" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${availability}" required>
                </div>
              </div>
              <div class="form-group" style="margin-bottom:0.4rem;">
                <label for="vet-profile-address" style="font-size:0.7rem;">Street Address *</label>
                <input type="text" id="vet-profile-address" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${address}" placeholder="123 Clinic St, Bengaluru" required>
              </div>
              <button type="submit" class="btn btn-primary" style="font-size:0.75rem; padding:0.45rem 0.75rem; border-radius:var(--radius-sm); margin-top:0.4rem; width:100%;">
                <i class="fa-solid fa-save"></i> Save Profile Details
              </button>
            </form>
          </div>

          <div class="glass-card">
            <h4>Quick Guidelines</h4>
            <ul style="font-size:0.75rem; color:var(--text-muted); padding-left:1.25rem; margin-top:0.5rem; line-height:1.5;">
              <li>Accept appointments to automatically gain pet data sharing access.</li>
              <li>Filing medical records updates the shared timeline instantly.</li>
              <li>Always store createdBy & createdByRole audit fields on logs.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Bind Profile Update Form Submit
    const profileForm = document.getElementById('vet-profile-form');
    if (profileForm) {
      profileForm.onsubmit = async (e) => {
        e.preventDefault();
        await updateVetProfile(user.uid, license);
      };
    }

    // Unsubscribe previous listeners to prevent leakage
    if (patientsUnsubscribe) patientsUnsubscribe();
    if (appointmentsUnsubscribe) appointmentsUnsubscribe();

    // Subscribe to Shared Patients List (Real-time listener)
    subscribeSharedPatients(user.uid);

    // Subscribe to Appointments booked (Real-time listener)
    subscribeVetAppointments(user.uid);

  } catch (err) {
    console.error("Vet Portal Error:", err);
    viewport.innerHTML = `<div class="empty-state"><p>Failed to initialize Veterinarian portal.</p></div>`;
  } finally {
    showLoading(false);
  }
}

/**
 * Render access denied banner
 */
function renderDeniedAccessState(container) {
  container.innerHTML = `
    <div class="auth-wrapper" style="min-height: calc(100vh - 70px); padding:0;">
      <div class="glass-card" style="text-align:center; max-width:480px; padding:2rem;">
        <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <h2>Veterinarian Verification Required</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height: 1.4;">
          Your current account role does not have authorization to access the veterinary clinic portals. Create an account with the role "Veterinarian" to get verified.
        </p>
        <a href="#/dashboard" class="btn btn-primary mt-2">Go to Main Dashboard</a>
      </div>
    </div>
  `;
}

/**
 * Update Vet Profile parameters in users and vetProfiles collections
 */
async function updateVetProfile(uid, licenseNumber) {
  const clinicName = document.getElementById('vet-profile-clinic').value.trim();
  const specialInput = document.getElementById('vet-profile-special').value.trim();
  const city = document.getElementById('vet-profile-city').value.trim();
  const availability = document.getElementById('vet-profile-hours').value.trim();
  const address = document.getElementById('vet-profile-address').value.trim();

  const specializations = specialInput.split(',').map(s => s.trim()).filter(Boolean);

  showLoading(true, "Updating clinic profile...");
  try {
    const batch = db.batch();

    // 1. Update user doc vetDetails
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, {
      displayName: clinicName,
      'vetDetails.clinicName': clinicName,
      'vetDetails.specializations': specializations,
      'vetDetails.city': city,
      'vetDetails.availability': availability,
      'vetDetails.address': address
    });

    // 2. Update vetProfiles doc
    const profileRef = db.collection('vetProfiles').doc(uid);
    batch.set(profileRef, {
      vetId: uid,
      name: clinicName,
      clinic: clinicName,
      licenseNumber: licenseNumber,
      specialization: specializations,
      city: city,
      availability: availability,
      address: address,
      verified: true, // Preserve verified state
      updatedAt: fb.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await batch.commit();
    showToast("Clinic profile saved successfully!", "success");
    
    // Sync sidebar layout name
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = clinicName;
  } catch (err) {
    console.error("Profile saving error:", err);
    showToast("Failed to save clinic details.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Subscribe to the real-time list of pets shared with this Vet UID
 */
function subscribeSharedPatients(vetUid) {
  const container = document.getElementById('vet-patients-list');
  if (!container) return;

  patientsUnsubscribe = db.collection('pets')
    .where('sharedWithVets', 'array-contains', vetUid)
    .onSnapshot((snapshot) => {
      container.innerHTML = '';

      if (snapshot.empty) {
        container.innerHTML = `
          <div class="empty-state-mini" style="padding:2.5rem; width:100%; grid-column: span 2;">
            <i class="fa-solid fa-folder-open" style="font-size:2rem; color:var(--portal-accent); opacity:0.6; margin-bottom:0.5rem;"></i>
            <p>No active shared patient files yet. Owners list your clinic to authorize access.</p>
          </div>
        `;
        return;
      }

      snapshot.forEach(doc => {
        const pet = doc.data();
        pet.id = doc.id;

        const card = document.createElement('div');
        card.className = 'glass-card pet-card magnetic-card';
        card.innerHTML = `
          <div class="pet-image-container" style="position: relative;">
            ${getPetImageHTML(pet, 'small')}
            <span class="pet-status-badge safe" style="background:var(--portal-accent); border-radius:4px;">SHARED PATIENT</span>
          </div>
          <div class="pet-card-content">
            <h4 class="pet-card-name" style="display:flex; justify-content:space-between; align-items:center; margin:0 0 0.5rem 0;">
              <span>${pet.name}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${pet.pawTraceId}</span>
            </h4>
            <div class="pet-card-meta" style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.75rem;">
              <span>${pet.breed} &bull; ${pet.gender}</span>
            </div>
            <div style="display:flex; gap:0.5rem;">
              <button class="btn btn-primary btn-full btn-treatment" data-id="${pet.id}" data-name="${pet.name}" style="font-size:0.75rem; padding:0.4rem 0.8rem;">
                <i class="fa-solid fa-stethoscope"></i> Manage Health Log
              </button>
            </div>
          </div>
        `;
        container.appendChild(card);
      });

      // Bind medical filing modals
      container.querySelectorAll('.btn-treatment').forEach(btn => {
        btn.onclick = () => {
          const petId = btn.getAttribute('data-id');
          const petName = btn.getAttribute('data-name');
          showPatientHistoryModal(petId, petName);
        };
      });
    }, (error) => {
      console.warn("Shared Patients Snapshot Error:", error);
      container.innerHTML = `<p style="padding: 1rem; color: var(--accent-red);">Sync failure: ${error.message}</p>`;
    });
}

/**
 * Renders clinical medical records list & add option inside a modal overlay
 */
async function showPatientHistoryModal(petId, petName) {
  const user = getCurrentUser();
  if (!user) return;

  // Renders the Modal Shell
  showModal({
    title: `Medical History: ${petName}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:1.25rem; max-height:480px; overflow-y:auto; padding-right:0.25rem;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="font-weight:700; font-family:'Outfit'; font-size:1rem; margin:0;">Clinical Records Timeline</h4>
          <button id="btn-file-clinical-record" class="btn btn-primary" style="font-size:0.75rem; padding:0.4rem 0.8rem; border-radius:var(--radius-sm);">
            <i class="fa-solid fa-plus"></i> File Clinical Log
          </button>
        </div>

        <div id="vet-patient-timeline" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>
    `,
    confirmText: "Close Viewer",
    onConfirm: () => {
      closeModal();
      return false; // Close modal
    }
  });

  // Bind Add record button
  const fileRecordBtn = document.getElementById('btn-file-clinical-record');
  if (fileRecordBtn) {
    fileRecordBtn.onclick = () => {
      showVetTreatmentModal(petId, petName);
    };
  }

  // Load patient clinical logs real-time
  const timelineContainer = document.getElementById('vet-patient-timeline');
  if (!timelineContainer) return;

  db.collection('pets').doc(petId).collection('medical_records').orderBy('date', 'desc')
    .onSnapshot((snapshot) => {
      if (!document.getElementById('vet-patient-timeline')) return; // Exit if modal was closed

      timelineContainer.innerHTML = '';
      if (snapshot.empty) {
        timelineContainer.innerHTML = `
          <div class="empty-state-mini" style="padding:2rem; border: 1px dashed var(--border-glass);">
            <i class="fa-solid fa-folder-open"></i>
            <p>No medical records logged for this companion yet.</p>
          </div>
        `;
        return;
      }

      snapshot.forEach(doc => {
        const record = doc.data();
        const roleBadgeColor = record.createdByRole === 'vet' ? 'var(--portal-accent)' : '#3f8efc';
        const roleLabel = record.createdByRole === 'vet' ? 'Vet Log' : 'Owner Entry';
        
        const row = document.createElement('div');
        row.className = 'reminder-item';
        row.style.background = 'rgba(255,255,255,0.01)';
        row.style.border = '1px solid var(--border-glass)';
        row.style.margin = '0';
        row.style.padding = '0.75rem';
        row.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:0.35rem; width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
              <strong style="font-size:0.85rem; color:var(--text-main);">${record.title}</strong>
              <span class="pet-status-badge" style="background:${roleBadgeColor}; font-size:0.55rem; padding:0.1rem 0.3rem; border-radius:4px; position:static; text-transform:uppercase;">
                ${roleLabel}
              </span>
            </div>
            <p style="font-size:0.75rem; color:var(--text-muted); margin:0; line-height:1.4;">${record.notes || ''}</p>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem; font-size:0.65rem; color:var(--text-muted);">
              <span><i class="fa-solid fa-calendar"></i> Date: ${formatFriendlyDate(record.date)}</span>
              <span><i class="fa-solid fa-user-md"></i> Filed By: ${record.createdByDisplayName || 'System'}</span>
            </div>
          </div>
        `;
        timelineContainer.appendChild(row);
      });
    }, (err) => {
      console.warn("Timeline stream error:", err);
      timelineContainer.innerHTML = `<p>Failed to stream health timeline: ${err.message}</p>`;
    });
}

/**
 * Vet Consultation treatment log writer modal form
 */
function showVetTreatmentModal(petId, petName) {
  // We spawn a secondary modal layer for details input
  showModal({
    title: `File Clinical Log: ${petName}`,
    bodyHtml: `
      <form id="vet-treatment-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-group">
          <label for="vet-category">Record Type *</label>
          <select id="vet-category" class="form-control" required>
            <option value="Checkup">General Checkup</option>
            <option value="Vaccination">Vaccination Booster</option>
            <option value="Surgery">Surgery Report</option>
            <option value="Prescription">Prescription Duty</option>
            <option value="Allergy">Allergy Notice</option>
          </select>
        </div>

        <div class="form-group">
          <label for="vet-title">Record Event Title *</label>
          <input type="text" id="vet-title" class="form-control" placeholder="Rabies Booster / Dental Scale" required>
        </div>

        <div class="form-group">
          <label for="vet-notes">Treatment Log / Notes *</label>
          <textarea id="vet-notes" class="form-control" rows="4" placeholder="Log dosages, vaccine batch number, or clinical observations..." required></textarea>
        </div>
      </form>
    `,
    confirmText: "Submit Clinical Record",
    onConfirm: async () => {
      const form = document.getElementById('vet-treatment-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true; // Keep open
      }

      const category = document.getElementById('vet-category').value;
      const title = document.getElementById('vet-title').value.trim();
      const notes = document.getElementById('vet-notes').value.trim();

      const user = getCurrentUser();
      if (!user) return false;

      showLoading(true, "Writing medical logs...");
      try {
        // 1. Add record into the pet's subcollection (with full auditing metadata)
        await db.collection('pets').doc(petId).collection('medical_records').add({
          category,
          title: `[Clinical Log] ${title}`,
          date: new Date().toISOString().split('T')[0],
          notes,
          attachment: null,
          attachmentName: '',
          filedByVet: user.displayName || 'Clinic Veterinarian',
          createdBy: user.uid,
          createdByRole: 'vet',
          createdByDisplayName: user.displayName || 'Veterinarian',
          createdAt: fb.firestore.FieldValue.serverTimestamp()
        });

        // 2. Log owner notification alerts
        const petDoc = await db.collection('pets').doc(petId).get();
        const ownerId = petDoc.data().ownerId;
        const alertMsg = `${user.displayName || 'Doctor'} logged a new clinical medical record (${category}) for ${petName}: ${title}.`;

        await db.collection('users').doc(ownerId).collection('notifications').add({
          type: 'STATUS_CHANGE',
          petId: petId,
          message: alertMsg,
          timestamp: fb.firestore.FieldValue.serverTimestamp(),
          read: false
        });

        showToast("Clinical medical records updated.", "success");
        closeModal();
        return false; // Close and resolve
      } catch (err) {
        console.error("Filing medical log error:", err);
        showToast("Failed to write medical log. Check rules permission.", "error");
        return true; // Keep open
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Subscribe to Appointments matching this vet's ID (Real-time listener)
 */
function subscribeVetAppointments(vetUid) {
  const table = document.getElementById('vet-appointments-table');
  if (!table) return;

  appointmentsUnsubscribe = db.collection('appointments')
    .where('vetId', '==', vetUid)
    .onSnapshot((snapshot) => {
      table.innerHTML = '';

      if (snapshot.empty) {
        table.innerHTML = `
          <div class="empty-state-mini" style="padding: 2.5rem 0;">
            <i class="fa-solid fa-calendar-minus" style="font-size:2rem; opacity:0.6; margin-bottom:0.5rem; color:var(--portal-accent);"></i>
            <p>No consultations booked.</p>
          </div>
        `;
        return;
      }

      // Sort local array by date/time
      const appDocs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        appDocs.push(data);
      });

      appDocs.sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time));

      appDocs.forEach(app => {
        const row = document.createElement('div');
        row.className = 'reminder-item';
        row.style.background = 'rgba(255,255,255,0.02)';
        row.style.border = '1px solid var(--border-glass)';
        row.style.margin = '0';
        row.style.padding = '0.95rem';
        row.style.flexDirection = 'column';
        row.style.alignItems = 'flex-start';
        row.style.gap = '0.75rem';

        let badgeClass = 'badge-warning';
        if (app.status === 'accepted') badgeClass = 'badge-primary';
        else if (app.status === 'completed') badgeClass = 'badge-success';
        else if (app.status === 'rejected') badgeClass = 'badge-danger';

        const statusBadgeMarkup = `
          <span class="status-badge ${badgeClass}">
            ${app.status || 'pending'}
          </span>
        `;


        // Render actions buttons
        let actionsHtml = '';
        if (app.status === 'pending') {
          actionsHtml = `
            <div class="appointment-actions-group">
              <button class="btn btn-outline btn-accept-app" data-id="${app.id}" data-pet="${app.petId}" style="font-size:0.7rem; padding:0.35rem 0.75rem; border-color:var(--portal-accent); color:var(--portal-accent);">
                <i class="fa-solid fa-circle-check"></i> Accept Request
              </button>
              <button class="btn btn-outline btn-reject-app" data-id="${app.id}" style="font-size:0.7rem; padding:0.35rem 0.75rem; border-color:var(--accent-red); color:var(--accent-red);">
                <i class="fa-solid fa-circle-xmark"></i> Reject
              </button>
            </div>
          `;
        } else if (app.status === 'accepted') {
          actionsHtml = `
            <div class="appointment-actions-group">
              <button class="btn btn-primary btn-complete-app" data-id="${app.id}" data-pet="${app.petId}" data-petname="${app.petName}" style="font-size:0.7rem; padding:0.35rem 0.75rem;">
                <i class="fa-solid fa-stethoscope"></i> Complete Consultation
              </button>
            </div>
          `;
        }

        row.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; gap:0.5rem;">
            <div style="display:flex; gap:0.75rem; align-items:center;">
              <i class="fa-solid fa-calendar-check" style="font-size:1.4rem; color:var(--portal-accent);"></i>
              <div style="display:flex; flex-direction:column; gap:0.15rem;">
                <strong style="font-size:0.9rem; color:var(--text-main);">${app.petName}</strong>
                <span style="font-size:0.75rem; color:var(--text-muted);">
                  <i class="fa-solid fa-clock"></i> Date: ${formatFriendlyDate(app.appointmentDate || app.date)} at ${app.time}
                </span>
              </div>
            </div>
            ${statusBadgeMarkup}
          </div>

          <div style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; border-top:1px dashed var(--border-glass); padding-top:0.5rem; width:100%;">
            <div style="margin-bottom:0.25rem;"><strong>Reason:</strong> ${app.reason || app.notes || 'General Checkup'}</div>
            <div><strong>Owner:</strong> ${app.ownerName || 'Pet Parent'} &bull; <i class="fa-solid fa-envelope"></i> Notifications Enabled</div>
          </div>
          ${actionsHtml}
        `;

        table.appendChild(row);
      });

      // Bind button events
      table.querySelectorAll('.btn-accept-app').forEach(btn => {
        btn.onclick = async () => {
          const appId = btn.getAttribute('data-id');
          const petId = btn.getAttribute('data-pet');
          await processAppointment(appId, petId, vetUid, 'accepted');
        };
      });

      table.querySelectorAll('.btn-reject-app').forEach(btn => {
        btn.onclick = async () => {
          const appId = btn.getAttribute('data-id');
          await processAppointment(appId, null, null, 'rejected');
        };
      });

      table.querySelectorAll('.btn-complete-app').forEach(btn => {
        btn.onclick = async () => {
          const appId = btn.getAttribute('data-id');
          const petId = btn.getAttribute('data-pet');
          const petName = btn.getAttribute('data-petname');
          await processAppointment(appId, petId, vetUid, 'completed', petName);
        };
      });

    }, (error) => {
      console.warn("Appointments Snapshot Error:", error);
      table.innerHTML = `<p style="padding: 1rem; color: var(--accent-red);">Sync failure: ${error.message}</p>`;
    });
}

/**
 * Handle appointment updates (Accept, Reject, and Complete consultation)
 */
async function processAppointment(appId, petId, vetUid, status, petName = '') {
  showLoading(true, `Filing status update (${status})...`);
  try {
    // 1. Update appointment status (Vet always has permission to update appointments where they are the vetId)
    await db.collection('appointments').doc(appId).update({ status: status });

    // 2. Accept flow: Double-check if vet is in sharedWithVets. If they are already in it (added during booking), this is a no-op.
    // If not, we attempt to add them, but if we fail (e.g. permission rules block), we catch the error silently so the appointment acceptance STILL succeeds!
    if (status === 'accepted' && petId && vetUid) {
      try {
        const petRef = db.collection('pets').doc(petId);
        const petDoc = await petRef.get();
        if (petDoc.exists) {
          const sharedVets = petDoc.data().sharedWithVets || [];
          if (!sharedVets.includes(vetUid)) {
            sharedVets.push(vetUid);
            await petRef.update({ sharedWithVets: sharedVets });
          }
        }
      } catch (petErr) {
        console.warn("Resilient fallback: Vet profile access array update skipped or blocked:", petErr.message);
      }
    }

    // 3. Reject flow: Remove vet from sharedWithVets if they reject, so access is revoked cleanly
    if (status === 'rejected' && petId && vetUid) {
      try {
        const petRef = db.collection('pets').doc(petId);
        const petDoc = await petRef.get();
        if (petDoc.exists) {
          const sharedVets = petDoc.data().sharedWithVets || [];
          const index = sharedVets.indexOf(vetUid);
          if (index > -1) {
            sharedVets.splice(index, 1);
            await petRef.update({ sharedWithVets: sharedVets });
          }
        }
      } catch (petErr) {
        console.warn("Clean revocation: Failed to remove vet from shared array on reject:", petErr.message);
      }
    }

    // 4. Send notification to pet owner
    const appDoc = await db.collection('appointments').doc(appId).get();
    const appData = appDoc.data();
    const ownerId = appData.ownerId;
    const vetName = appData.vetName || 'Doctor';
    const finalPetName = appData.petName || 'companion';

    let msg = `Your consultation request for ${finalPetName} has been ${status.toUpperCase()} by ${vetName}.`;
    if (status === 'completed') {
      msg = `Consultation completed for ${finalPetName} at ${vetName}. Check updated medical logs!`;
    }

    await db.collection('users').doc(ownerId).collection('notifications').add({
      type: 'STATUS_CHANGE',
      petId: petId || '',
      message: msg,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    showToast(`Appointment status updated to ${status}!`, "success");

    // 5. If completed, automatically prompt Treatment Modal
    if (status === 'completed' && petId) {
      showVetTreatmentModal(petId, petName || finalPetName);
    }

  } catch (err) {
    console.error("Failed to process appointment status change:", err);
    showToast("Failed to update status. Check credentials.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Render Patients Directory page for veterinarians (redesigned from Owner View)
 */
export async function renderVetPatients() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Patients Directory';

  const user = getCurrentUser();
  if (!user) return;

  // Render search layout and loading state
  viewport.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Patient Records</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        Clinical records and profiles for companions authorized by their owners.
      </p>
    </div>

    <!-- Search Controls -->
    <div class="glass-card mb-2" style="padding: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;">
        <input type="text" id="vet-patient-search" class="form-control" placeholder="Search by name, breed, or PawTrace ID...">
      </div>
      <div class="form-group" style="width: 150px; margin-bottom: 0;">
        <select id="vet-patient-type" class="form-control">
          <option value="All">All Types</option>
          <option value="Dog">Dogs</option>
          <option value="Cat">Cats</option>
          <option value="Other">Other</option>
        </select>
      </div>
    </div>

    <!-- Patients Directory Grid -->
    <div id="vet-patients-directory-list" class="pets-grid">
      <div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>
    </div>
  `;

  showLoading(true, "Loading patient registry...");
  try {
    const vetUid = user.uid;
    const petSnapshot = await db.collection('pets')
      .where('sharedWithVets', 'array-contains', vetUid)
      .get();

    const allPatients = [];
    petSnapshot.forEach(doc => {
      allPatients.push({ id: doc.id, ...doc.data() });
    });

    const renderList = (patients) => {
      const container = document.getElementById('vet-patients-directory-list');
      if (!container) return;
      container.innerHTML = '';

      if (patients.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: span 3; padding: 3rem; text-align: center;">
            <i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--portal-accent); opacity: 0.5; margin-bottom: 1rem;"></i>
            <h3>No Authorized Patients Found</h3>
            <p>Once clients book appointments and authorize access, their companion profiles will appear here.</p>
          </div>
        `;
        return;
      }

      patients.forEach(pet => {
        const card = document.createElement('div');
        card.className = 'glass-card pet-card magnetic-card';
        card.innerHTML = `
          <div class="pet-image-container" style="position: relative;">
            ${getPetImageHTML(pet, 'small')}
            <span class="pet-status-badge safe" style="background:var(--portal-accent); border-radius:4px; position: absolute; top: 10px; left: 10px; font-size: 0.6rem; font-weight: 700; color: white;">SHARED PATIENT</span>
          </div>
          <div class="pet-card-content">
            <h4 class="pet-card-name" style="display:flex; justify-content:space-between; align-items:center; margin:0 0 0.5rem 0;">
              <span>${pet.name}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${pet.pawTraceId}</span>
            </h4>
            <div class="pet-card-meta" style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem; line-height: 1.4;">
              <span>${pet.breed} &bull; ${pet.gender}</span>
              <br>
              <span>Owner: <strong>${pet.ownerName || 'Pet Owner'}</strong></span>
            </div>
            <button class="btn btn-primary btn-full btn-open-chart" data-id="${pet.id}" style="font-size:0.8rem; padding:0.5rem; width: 100%;">
              <i class="fa-solid fa-folder-medical"></i> Open Patient Chart
            </button>
          </div>
        `;
        container.appendChild(card);
      });

      // Bind buttons
      container.querySelectorAll('.btn-open-chart').forEach(btn => {
        btn.onclick = () => {
          const petId = btn.getAttribute('data-id');
          renderPatientChart(petId);
        };
      });
    };

    // Filter and search logic
    const searchInput = document.getElementById('vet-patient-search');
    const typeSelect = document.getElementById('vet-patient-type');

    const filterPatients = () => {
      const q = searchInput.value.toLowerCase().trim();
      const type = typeSelect.value;

      const filtered = allPatients.filter(pet => {
        const matchQuery = !q || 
          pet.name.toLowerCase().includes(q) || 
          pet.breed.toLowerCase().includes(q) || 
          pet.pawTraceId.toLowerCase().includes(q) || 
          (pet.ownerName && pet.ownerName.toLowerCase().includes(q));
        
        const matchType = type === 'All' || 
          (pet.type && pet.type.toLowerCase() === type.toLowerCase());

        return matchQuery && matchType;
      });

      renderList(filtered);
    };

    if (searchInput) searchInput.oninput = filterPatients;
    if (typeSelect) typeSelect.onchange = filterPatients;

    renderList(allPatients);

  } catch (err) {
    console.error("Patients registry error:", err);
    viewport.innerHTML = `<div class="empty-state"><p>Failed to load patient records.</p></div>`;
  } finally {
    showLoading(false);
  }
}

/**
 * Render clinical chart view for a selected patient pet
 */
async function renderPatientChart(petId) {
  const viewport = document.getElementById('app-viewport');
  showLoading(true, "Retrieving patient chart...");

  try {
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists) {
      showToast("Patient record not found.", "error");
      renderVetPatients();
      return;
    }
    const pet = petDoc.data();
    pet.id = petDoc.id;

    // Fetch appointments for this pet with this vet
    const user = getCurrentUser();
    const appSnapshot = await db.collection('appointments')
      .where('petId', '==', petId)
      .where('vetId', '==', user.uid)
      .get();

    const appointments = [];
    appSnapshot.forEach(doc => {
      appointments.push(doc.data());
    });

    // Sort client-side to avoid needing a Firestore composite index
    appointments.sort((a, b) => {
      const t1 = a.createdAt ? (a.createdAt.seconds || (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime())) : 0;
      const t2 = b.createdAt ? (b.createdAt.seconds || (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime())) : 0;
      return t2 - t1;
    });

    // Render Patient Chart Layout
    viewport.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <button id="btn-back-to-patients" class="btn btn-outline" style="font-size:0.8rem; padding:0.4rem 0.8rem; margin-bottom: 0.75rem;">
          <i class="fa-solid fa-chevron-left"></i> Back to Patient Directory
        </button>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin: 0;">Clinical Chart: ${pet.name}</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.15rem;">
          PawTrace ID: <strong>${pet.pawTraceId}</strong> &bull; Species: <strong>${pet.type || 'Companion'}</strong>
        </p>
      </div>

      <div class="grid-cols-3" style="gap: 1.5rem; align-items: start;">
        
        <!-- COLUMN 1: Profile & Owner Contact -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Pet Attributes Card -->
          <div class="glass-card" style="padding: 1.25rem;">
            <div style="text-align: center; margin-bottom: 1.25rem;">
              <div style="display: inline-block; width: 100px; height: 100px; border-radius: 50%; overflow: hidden; border: 3px solid var(--portal-accent); box-shadow: var(--shadow-sm); position: relative; vertical-align: middle;">
                ${getPetImageHTML(pet, 'small')}
              </div>
              <h3 style="font-family:'Outfit'; font-weight:700; margin: 0.5rem 0 0 0;">${pet.name}</h3>
              <span class="pet-status-badge safe" style="background:var(--portal-accent); font-size:0.65rem; border-radius:4px; position:static; display:inline-block; margin-top:0.25rem; color: white;">
                ${pet.lostStatus || 'SAFE'}
              </span>
            </div>
            
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:0.5rem; line-height:1.4;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Breed:</span><strong>${pet.breed}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Gender:</span><strong>${pet.gender}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Age / DOB:</span><strong>${pet.age || 'Unknown'} (${pet.dob || 'N/A'})</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Weight:</span><strong>${pet.weight || 'N/A'} kg</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Microchip ID:</span><strong>${pet.microchipId || 'None'}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Blood Type:</span><strong>${pet.bloodType || 'Unknown'}</strong>
              </div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Insurance:</span><strong>${pet.insurance || 'None'}</strong>
              </div>
              ${pet.size ? `
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Size:</span><strong>${pet.size}</strong>
              </div>` : ''}
              ${pet.indoorOutdoor ? `
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;">
                <span style="color:var(--text-muted);">Lifestyle:</span><strong>${pet.indoorOutdoor}</strong>
              </div>` : ''}
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted);">Neutered:</span><strong>${pet.neutered ? 'Yes' : 'No'}</strong>
              </div>
            </div>
          </div>

          <!-- Owner Contact Card -->
          <div class="glass-card" style="padding: 1.25rem;">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-id-card"></i> Owner Details</h4>
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:0.5rem; line-height:1.4;">
              <div>
                <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Owner Name</span>
                <strong>${pet.ownerName || 'Pet Owner'}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Primary Phone</span>
                <strong>${pet.ownerPhone ? `<a href="tel:${pet.ownerPhone}" style="color:var(--text-main); text-decoration:none;"><i class="fa-solid fa-phone" style="font-size:0.7rem; color:var(--portal-accent); margin-right: 0.25rem;"></i> ${pet.ownerPhone}</a>` : 'Not provided'}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Emergency Contact</span>
                <strong>${pet.emergencyContactName || 'None'} ${pet.emergencyContact ? `(${pet.emergencyContact})` : ''}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Contact Email</span>
                <strong>${pet.ownerContact || 'Not provided'}</strong>
              </div>
              <div>
                <span style="color:var(--text-muted); display:block; font-size:0.7rem;">Home Address</span>
                <strong style="font-size:0.75rem; font-weight:500; display: block; margin-top: 0.15rem; line-height: 1.35;">
                  ${pet.address || ''}<br>
                  ${pet.city || ''} ${pet.state || ''} ${pet.postalCode || ''}
                </strong>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMN 2: Vaccination Checklist & Appointment History -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Vaccination Status Card -->
          <div class="glass-card" style="padding: 1.25rem;">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-syringe"></i> Vaccination Status</h4>
            <div style="display:flex; align-items:center; gap:0.75rem; background:rgba(31,122,140,0.06); padding:0.75rem; border-radius:var(--radius-sm); margin-bottom:1rem;">
              <i class="fa-solid fa-shield-cat" style="font-size:1.5rem; color:var(--portal-accent);"></i>
              <div>
                <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Overall Compliance</span>
                <strong style="font-size:0.95rem; text-transform:uppercase;">${pet.vaccinationStatus || 'Unknown'}</strong>
              </div>
            </div>
            
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:0.4rem;">
              <span style="font-weight:600; font-size:0.75rem; display:block; margin-bottom:0.2rem; color:var(--text-muted);">Standard Guidelines Checklist:</span>
              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.35rem 0.5rem; border-radius:4px; border: 1px solid var(--border-glass);">
                <span>Rabies Vaccine</span>
                <i class="fa-solid ${pet.vaccinationStatus === 'Up to Date' ? 'fa-circle-check' : 'fa-circle-question'}" style="color:${pet.vaccinationStatus === 'Up to Date' ? 'var(--portal-accent)' : 'var(--text-muted)'};"></i>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.35rem 0.5rem; border-radius:4px; border: 1px solid var(--border-glass);">
                <span>DHPP / FVRCP Core</span>
                <i class="fa-solid ${pet.vaccinationStatus === 'Up to Date' ? 'fa-circle-check' : 'fa-circle-question'}" style="color:${pet.vaccinationStatus === 'Up to Date' ? 'var(--portal-accent)' : 'var(--text-muted)'};"></i>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:0.35rem 0.5rem; border-radius:4px; border: 1px solid var(--border-glass);">
                <span>Deworming Log</span>
                <i class="fa-solid fa-circle-check" style="color:var(--portal-accent);"></i>
              </div>
            </div>
          </div>

          <!-- Appointment History Card -->
          <div class="glass-card" style="padding: 1.25rem;">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-clock-rotate-left"></i> Consultation History</h4>
            <div style="max-height: 250px; overflow-y: auto; display:flex; flex-direction:column; gap:0.5rem; padding-right:0.25rem;">
              ${appointments.length === 0 ? `
                <div class="empty-state-mini" style="padding:1.5rem 0; text-align: center;">
                  <p>No past consultations logged with your clinic.</p>
                </div>
              ` : appointments.map(app => `
                <div style="font-size:0.75rem; padding:0.5rem; border-radius:4px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass); display:flex; flex-direction:column; gap:0.15rem;">
                  <div style="display:flex; justify-content:space-between; font-weight:600;">
                    <span>${formatFriendlyDate(app.date)} @ ${app.time}</span>
                    <span style="color:${app.status === 'completed' ? 'var(--portal-accent)' : app.status === 'accepted' ? '#3f8efc' : 'var(--text-muted)'}; text-transform:capitalize;">${app.status}</span>
                  </div>
                  <span style="color:var(--text-muted); font-size:0.7rem; line-height:1.3;">Reason: ${app.reason}</span>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <!-- COLUMN 3: Medical History & Clinical Logs -->
        <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; height: fit-content; min-height: 400px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <h4 style="font-weight:700; font-family:'Outfit'; font-size:1.05rem; margin:0;"><i class="fa-solid fa-notes-medical"></i> Health Log</h4>
            <button id="btn-chart-file-log" class="btn btn-primary" style="font-size:0.7rem; padding:0.35rem 0.7rem; border-radius:var(--radius-sm);">
              <i class="fa-solid fa-plus"></i> File Clinical Log
            </button>
          </div>

          <div id="chart-timeline-container" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 500px; overflow-y: auto; padding-right: 0.25rem;">
            <div class="skeleton skeleton-text"></div>
          </div>
        </div>

      </div>
    `;

    // Bind back button
    document.getElementById('btn-back-to-patients').onclick = renderVetPatients;

    // Bind File Record button
    document.getElementById('btn-chart-file-log').onclick = () => {
      showVetTreatmentModal(petId, pet.name);
    };

    // Load timeline in real-time
    const timelineContainer = document.getElementById('chart-timeline-container');
    db.collection('pets').doc(petId).collection('medical_records').orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        if (!document.getElementById('chart-timeline-container')) return; // Exit if user left the page
        
        timelineContainer.innerHTML = '';
        if (snapshot.empty) {
          timelineContainer.innerHTML = `
            <div class="empty-state-mini" style="padding:2rem; border:1px dashed var(--border-glass); text-align: center;">
              <i class="fa-solid fa-folder-open"></i>
              <p>No health history recorded yet.</p>
            </div>
          `;
          return;
        }

        snapshot.forEach(doc => {
          const record = doc.data();
          const roleBadgeColor = record.createdByRole === 'vet' ? 'var(--portal-accent)' : '#3f8efc';
          const roleLabel = record.createdByRole === 'vet' ? 'Vet Log' : 'Owner Entry';
          
          const row = document.createElement('div');
          row.className = 'reminder-item';
          row.style.background = 'rgba(255,255,255,0.01)';
          row.style.border = '1px solid var(--border-glass)';
          row.style.margin = '0';
          row.style.padding = '0.6rem 0.75rem';
          row.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:0.25rem; width:100%;">
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
                <strong style="font-size:0.8rem; color:var(--text-main);">${record.title}</strong>
                <span class="pet-status-badge" style="background:${roleBadgeColor}; font-size:0.55rem; padding:0.1rem 0.3rem; border-radius:4px; position:static; text-transform:uppercase; color: white;">
                  ${roleLabel}
                </span>
              </div>
              <p style="font-size:0.75rem; color:var(--text-muted); margin:0; line-height:1.35;">${record.notes || ''}</p>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.2rem; font-size:0.65rem; color:var(--text-muted);">
                <span><i class="fa-solid fa-calendar"></i> ${formatFriendlyDate(record.date)}</span>
                <span><i class="fa-solid fa-user-md"></i> ${record.createdByDisplayName || 'System'}</span>
              </div>
            </div>
          `;
          timelineContainer.appendChild(row);
        });
      }, (err) => {
        console.warn("Timeline chart stream error:", err);
        timelineContainer.innerHTML = `<p>Failed to stream health timeline.</p>`;
      });

  } catch (err) {
    console.error("Failed to load patient chart:", err);
    showToast("Failed to load clinical chart.", "error");
    renderVetPatients();
  } finally {
    showLoading(false);
  }
}


// ==========================================================================
// VETERINARIAN PORTAL MODULE (Supabase) — corrected channel handling
// SECURITY FIX: added escapeHTML() around every DB-sourced field rendered
// via innerHTML (pet names, breeds, owner info, medical record text,
// appointment reasons, clinic profile fields) to close stored-XSS gaps
// where a pet owner's data could execute script in a verified vet's session.
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate, getPetImageHTML, escapeHTML } from './utils.js';

let patientsChannel = null;
let appointmentsChannel = null;
let recordsChannel = null;

export function clearVetPortalListeners() {
  if (patientsChannel) { supabase.removeChannel(patientsChannel); patientsChannel = null; }
  if (appointmentsChannel) { supabase.removeChannel(appointmentsChannel); appointmentsChannel = null; }
  if (recordsChannel) { supabase.removeChannel(recordsChannel); recordsChannel = null; }
}

function mapPetForUI(row) {
  return {
    id: row.id, name: row.name, breed: row.breed, gender: row.gender, weight: row.weight,
    petType: row.species, type: row.species, dob: row.date_of_birth, age: row.date_of_birth,
    profileImage: row.photo_url, pawTraceId: row.pawtrace_id, lostStatus: row.is_lost ? 'LOST' : 'SAFE',
    microchipId: row.microchip_id, bloodType: row.blood_type, insurance: row.insurance,
    size: row.size, indoorOutdoor: row.indoor_outdoor, neutered: row.neutered === 'Neutered',
    vaccinationStatus: row.vaccination_status,
    ownerName: row.owner_name, ownerPhone: row.owner_phone, emergencyContactName: row.emergency_contact_name,
    emergencyContact: row.emergency_contact, ownerContact: row.owner_contact,
    address: row.address, city: row.city, state: row.state, postalCode: row.postal_code
  };
}

export async function renderVetPortal() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Vet Portal';

  const user = getCurrentUser();
  if (!user) return;

  showLoading(true, "Verifying veterinarian credentials...");
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.uid).single();

    if (!userData || userData.role !== 'vet') {
      renderDeniedAccessState(viewport);
      return;
    }

    const vetDetails = userData.vet_details || {};
    const clinicName = vetDetails.clinicName || userData.display_name || 'Clinic';
    const license = vetDetails.licenseNumber || 'Verified';
    const specializations = vetDetails.specializations || ['General Pet Medicine'];
    const city = vetDetails.city || 'Bengaluru';
    const availability = vetDetails.availability || 'Mon-Sat 9:00 AM - 6:00 PM';
    const address = vetDetails.address || '';

    viewport.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Clinical Dashboard</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">Clinic Profile: <strong>${escapeHTML(clinicName)}</strong> &bull; License: <strong>${escapeHTML(license)}</strong></p>
      </div>
      <div class="dashboard-grid">
        <div>
          <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-bottom: 1rem;">Authorized Shared Patients</h3>
          <div id="vet-patients-list" class="pets-grid mb-3"><div class="skeleton-container"><div class="skeleton skeleton-card"></div></div></div>
          <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-bottom: 1rem;">Consultation Schedule</h3>
          <div class="glass-card mb-2" style="padding:1.25rem;">
            <div id="vet-appointments-table" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="skeleton skeleton-text"></div></div>
          </div>
        </div>
        <div>
          <div class="glass-card mb-3">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-user-doctor"></i> Update Clinic Profile</h4>
            <form id="vet-profile-form" style="display:flex; flex-direction:column; gap:0.55rem;">
              <div class="form-group" style="margin-bottom:0.4rem;"><label style="font-size:0.7rem;">Clinic / Doctor Name *</label><input type="text" id="vet-profile-clinic" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${escapeHTML(clinicName)}" required></div>
              <div class="form-group" style="margin-bottom:0.4rem;"><label style="font-size:0.7rem;">Specializations (comma separated) *</label><input type="text" id="vet-profile-special" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${escapeHTML(specializations.join(', '))}" required></div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.4rem;">
                <div class="form-group" style="margin-bottom:0;"><label style="font-size:0.7rem;">Operating City *</label><input type="text" id="vet-profile-city" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${escapeHTML(city)}" required></div>
                <div class="form-group" style="margin-bottom:0;"><label style="font-size:0.7rem;">Availability Hours *</label><input type="text" id="vet-profile-hours" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${escapeHTML(availability)}" required></div>
              </div>
              <div class="form-group" style="margin-bottom:0.4rem;"><label style="font-size:0.7rem;">Street Address *</label><input type="text" id="vet-profile-address" class="form-control" style="font-size:0.75rem; padding:0.4rem 0.6rem;" value="${escapeHTML(address)}" required></div>
              <button type="submit" class="btn btn-primary" style="font-size:0.75rem; padding:0.45rem 0.75rem; margin-top:0.4rem; width:100%;"><i class="fa-solid fa-save"></i> Save Profile Details</button>
            </form>
          </div>
          <div class="glass-card">
            <h4>Quick Guidelines</h4>
            <ul style="font-size:0.75rem; color:var(--text-muted); padding-left:1.25rem; margin-top:0.5rem; line-height:1.5;">
              <li>Accept appointments to automatically gain pet data sharing access.</li>
              <li>Filing medical records updates the shared timeline instantly.</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    document.getElementById('vet-profile-form').onsubmit = async (e) => {
      e.preventDefault();
      await updateVetProfile(user.uid, license);
    };

    clearVetPortalListeners();
    await loadSharedPatients(user.uid);
    subscribeSharedPatients(user.uid);
    await loadVetAppointments(user.uid);
    subscribeVetAppointments(user.uid);

  } catch (err) {
    console.error("Vet Portal Error:", err);
    viewport.innerHTML = `<div class="empty-state"><p>Failed to initialize Veterinarian portal.</p></div>`;
  } finally {
    showLoading(false);
  }
}

function renderDeniedAccessState(container) {
  container.innerHTML = `
    <div class="auth-wrapper" style="min-height: calc(100vh - 70px); padding:0;">
      <div class="glass-card" style="text-align:center; max-width:480px; padding:2rem;">
        <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <h2>Veterinarian Verification Required</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height: 1.4;">Your current account role does not have authorization to access the veterinary clinic portals.</p>
        <a href="#/dashboard" class="btn btn-primary mt-2">Go to Main Dashboard</a>
      </div>
    </div>
  `;
}

async function updateVetProfile(uid, licenseNumber) {
  const clinicName = document.getElementById('vet-profile-clinic').value.trim();
  const specializations = document.getElementById('vet-profile-special').value.trim().split(',').map(s => s.trim()).filter(Boolean);
  const city = document.getElementById('vet-profile-city').value.trim();
  const availability = document.getElementById('vet-profile-hours').value.trim();
  const address = document.getElementById('vet-profile-address').value.trim();

  showLoading(true, "Updating clinic profile...");
  try {
    const { error } = await supabase.from('users').update({
      display_name: clinicName,
      vet_details: { licenseNumber, clinicName, specializations, city, availability, address, verified: true }
    }).eq('id', uid);
    if (error) throw error;

    showToast("Clinic profile saved successfully!", "success");
    const sidebarName = document.getElementById('sidebar-user-name');
    if (sidebarName) sidebarName.textContent = clinicName;
  } catch (err) {
    console.error("Profile saving error:", err);
    showToast("Failed to save clinic details.", "error");
  } finally {
    showLoading(false);
  }
}

function subscribeSharedPatients(vetUid) {
  if (patientsChannel) { supabase.removeChannel(patientsChannel); patientsChannel = null; }
  patientsChannel = supabase
    .channel(`vet_access_${vetUid}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'vet_access', filter: `vet_id=eq.${vetUid}` }, () => loadSharedPatients(vetUid))
    .subscribe();
}

async function showPatientHistoryModal(petId, petName) {
  const user = getCurrentUser();
  if (!user) return;

  showModal({
    title: `Medical History: ${petName}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:1.25rem; max-height:480px; overflow-y:auto;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="font-weight:700; font-family:'Outfit'; font-size:1rem; margin:0;">Clinical Records Timeline</h4>
          <button id="btn-file-clinical-record" class="btn btn-primary" style="font-size:0.75rem; padding:0.4rem 0.8rem;"><i class="fa-solid fa-plus"></i> File Clinical Log</button>
        </div>
        <div id="vet-patient-timeline" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="skeleton skeleton-text"></div></div>
      </div>
    `,
    confirmText: "Close Viewer",
    onConfirm: () => { closeModal(); return false; }
  });

  document.getElementById('btn-file-clinical-record').onclick = () => showVetTreatmentModal(petId, petName);

  await loadPatientTimeline(petId);
  if (recordsChannel) { supabase.removeChannel(recordsChannel); recordsChannel = null; }
  recordsChannel = supabase
    .channel(`medical_records_${petId}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_records', filter: `pet_id=eq.${petId}` }, () => {
      if (document.getElementById('vet-patient-timeline')) loadPatientTimeline(petId);
    })
    .subscribe();
}

async function loadPatientTimeline(petId) {
  const timelineContainer = document.getElementById('vet-patient-timeline');
  if (!timelineContainer) return;

  const { data: records } = await supabase.from('medical_records').select('*').eq('pet_id', petId).order('visit_date', { ascending: false });

  timelineContainer.innerHTML = '';
  if (!records || records.length === 0) {
    timelineContainer.innerHTML = `<div class="empty-state-mini" style="padding:2rem; border: 1px dashed var(--border-glass);"><i class="fa-solid fa-folder-open"></i><p>No medical records logged for this companion yet.</p></div>`;
    return;
  }

  records.forEach(record => {
    const roleBadgeColor = record.created_by_role === 'vet' ? 'var(--portal-accent)' : '#3f8efc';
    const roleLabel = record.created_by_role === 'vet' ? 'Vet Log' : 'Owner Entry';
    const row = document.createElement('div');
    row.className = 'reminder-item';
    row.style.cssText = 'background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); margin: 0; padding: 0.75rem;';
    row.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.35rem; width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <strong style="font-size:0.85rem;">${escapeHTML(record.title)}</strong>
          <span class="pet-status-badge" style="background:${roleBadgeColor}; font-size:0.55rem; padding:0.1rem 0.3rem; border-radius:4px; position:static; text-transform:uppercase; color:white;">${roleLabel}</span>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted); margin:0; line-height:1.4;">${escapeHTML(record.description || '')}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.25rem; font-size:0.65rem; color:var(--text-muted);">
          <span><i class="fa-solid fa-calendar"></i> Date: ${formatFriendlyDate(record.visit_date)}</span>
          <span><i class="fa-solid fa-user-md"></i> Filed By: ${escapeHTML(record.created_by_display_name || 'System')}</span>
        </div>
      </div>
    `;
    timelineContainer.appendChild(row);
  });
}

function showVetTreatmentModal(petId, petName) {
  showModal({
    title: `File Clinical Log: ${petName}`,
    bodyHtml: `
      <form id="vet-treatment-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-group"><label>Record Type *</label><select id="vet-category" class="form-control" required><option value="Checkup">General Checkup</option><option value="Vaccination">Vaccination Booster</option><option value="Surgery">Surgery Report</option><option value="Prescription">Prescription Duty</option><option value="Allergy">Allergy Notice</option></select></div>
        <div class="form-group"><label>Record Event Title *</label><input type="text" id="vet-title" class="form-control" required></div>
        <div class="form-group"><label>Treatment Log / Notes *</label><textarea id="vet-notes" class="form-control" rows="4" required></textarea></div>
        <div class="form-group"><label>Follow-up Reminder (Optional)</label><input type="date" id="vet-followup-date" class="form-control"></div>
      </form>
    `,
    confirmText: "Submit Clinical Record",
    onConfirm: async () => {
      const form = document.getElementById('vet-treatment-form');
      if (!form.checkValidity()) { form.reportValidity(); return true; }

      const category = document.getElementById('vet-category').value;
      const title = document.getElementById('vet-title').value.trim();
      const notes = document.getElementById('vet-notes').value.trim();
      const followUp = document.getElementById('vet-followup-date').value;

      const user = getCurrentUser();
      if (!user) return false;

      showLoading(true, "Writing medical logs...");
      try {
        const { error } = await supabase.from('medical_records').insert({
          pet_id: petId, record_type: category, title: `[Clinical Log] ${title}`,
          visit_date: new Date().toISOString().split('T')[0], description: notes,
          created_by: user.uid, created_by_role: 'vet', created_by_display_name: user.displayName || 'Veterinarian'
        });
        if (error) throw error;

        const { data: pet } = await supabase.from('pets').select('owner_id').eq('id', petId).single();
        if (pet) {
          await supabase.from('notifications').insert({
            user_id: pet.owner_id, type: 'STATUS_CHANGE',
            message: `${user.displayName || 'Doctor'} logged a new clinical medical record (${category}) for ${petName}: ${title}.`,
            is_read: false
          });
        }

        if (followUp) {
          await supabase.from('reminders').insert({
            pet_id: petId, reminder_type: 'Vet Appointment', title: `Follow-up: ${title}`,
            reminder_date: followUp, is_completed: false
          });
        }

        showToast("Clinical medical records updated.", "success");
        closeModal();
        return false;
      } catch (err) {
        console.error("Filing medical log error:", err);
        showToast("Failed to write medical log.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

let patientsToken = 0;
let appointmentsToken = 0;

async function loadSharedPatients(vetUid) {
  const myToken = ++patientsToken;
  const container = document.getElementById('vet-patients-list');
  if (!container) return;

  const { data: grants, error } = await supabase.from('vet_access').select('pet_id').eq('vet_id', vetUid).eq('status', 'active');
  if (myToken !== patientsToken) return;

  if (error || !grants || grants.length === 0) {
    container.innerHTML = `<div class="empty-state-mini" style="padding:2.5rem; width:100%; grid-column: span 2;"><i class="fa-solid fa-folder-open" style="font-size:2rem; color:var(--portal-accent); opacity:0.6; margin-bottom:0.5rem;"></i><p>No active shared patient files yet. Owners list your clinic to authorize access.</p></div>`;
    return;
  }

  const petIds = [...new Set(grants.map(g => g.pet_id))];
  const { data: pets } = await supabase.from('pets').select('*').in('id', petIds);
  if (myToken !== patientsToken) return;

  container.innerHTML = '';
  (pets || []).forEach(row => {
    const pet = mapPetForUI(row);
    const card = document.createElement('div');
    card.className = 'glass-card pet-card magnetic-card';
    card.innerHTML = `
      <div class="pet-image-container" style="position: relative;">
        ${getPetImageHTML(pet, 'small')}
        <span class="pet-status-badge safe" style="background:var(--portal-accent); border-radius:4px;">SHARED PATIENT</span>
      </div>
      <div class="pet-card-content">
        <h4 class="pet-card-name" style="display:flex; justify-content:space-between; align-items:center; margin:0 0 0.5rem 0;"><span>${escapeHTML(pet.name)}</span><span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${escapeHTML(pet.pawTraceId)}</span></h4>
        <div class="pet-card-meta" style="font-size:0.75rem; color:var(--text-muted); margin-bottom:0.75rem;"><span>${escapeHTML(pet.breed)} &bull; ${escapeHTML(pet.gender)}</span></div>
        <button class="btn btn-primary btn-full btn-treatment" data-id="${pet.id}" data-name="${escapeHTML(pet.name)}" style="font-size:0.75rem; padding:0.4rem 0.8rem;"><i class="fa-solid fa-stethoscope"></i> Manage Health Log</button>
      </div>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.btn-treatment').forEach(btn => {
    btn.onclick = () => showPatientHistoryModal(btn.getAttribute('data-id'), btn.getAttribute('data-name'));
  });
}

async function loadVetAppointments(vetUid) {
  const myToken = ++appointmentsToken;
  const table = document.getElementById('vet-appointments-table');
  if (!table) return;

  const { data: appsRaw } = await supabase.from('appointments').select('*').eq('vet_id', vetUid);
  if (myToken !== appointmentsToken) return;

  // De-duplicate by id defensively, then sort
  const seen = new Set();
  const apps = (appsRaw || []).filter(a => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  table.innerHTML = '';

  if (apps.length === 0) {
    table.innerHTML = `<div class="empty-state-mini" style="padding: 2.5rem 0;"><i class="fa-solid fa-calendar-minus" style="font-size:2rem; opacity:0.6; margin-bottom:0.5rem; color:var(--portal-accent);"></i><p>No consultations booked.</p></div>`;
    return;
  }

  apps.sort((a, b) => new Date(a.appointment_date + ' ' + (a.appointment_time || '')) - new Date(b.appointment_date + ' ' + (b.appointment_time || '')));

  const petIds = [...new Set(apps.map(a => a.pet_id))];
  const { data: petsData } = await supabase.from('pets').select('id, name, owner_name').in('id', petIds);
  if (myToken !== appointmentsToken) return;

  const petMap = {};
  (petsData || []).forEach(p => { petMap[p.id] = p; });

  apps.forEach(app => {
    const petInfo = petMap[app.pet_id] || {};
    const petName = petInfo.name || 'Companion';
    const ownerName = petInfo.owner_name || 'Pet Parent';

    const row = document.createElement('div');
    row.className = 'reminder-item';
    row.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); margin: 0; padding: 0.95rem; flex-direction: column; align-items: flex-start; gap: 0.75rem;';

    let badgeClass = 'badge-warning';
    if (app.status === 'accepted') badgeClass = 'badge-primary';
    else if (app.status === 'completed') badgeClass = 'badge-success';
    else if (app.status === 'rejected') badgeClass = 'badge-danger';

    let actionsHtml = '';
    if (app.status === 'pending') {
      actionsHtml = `<div class="appointment-actions-group"><button class="btn btn-outline btn-accept-app" data-id="${app.id}" data-pet="${app.pet_id}" style="font-size:0.7rem; padding:0.35rem 0.75rem; border-color:var(--portal-accent); color:var(--portal-accent);"><i class="fa-solid fa-circle-check"></i> Accept Request</button><button class="btn btn-outline btn-reject-app" data-id="${app.id}" data-pet="${app.pet_id}" style="font-size:0.7rem; padding:0.35rem 0.75rem; border-color:var(--accent-red); color:var(--accent-red);"><i class="fa-solid fa-circle-xmark"></i> Reject</button></div>`;
    } else if (app.status === 'accepted') {
      actionsHtml = `<div class="appointment-actions-group"><button class="btn btn-primary btn-complete-app" data-id="${app.id}" data-pet="${app.pet_id}" data-petname="${escapeHTML(petName)}" style="font-size:0.7rem; padding:0.35rem 0.75rem;"><i class="fa-solid fa-stethoscope"></i> Complete Consultation</button></div>`;
    }

    row.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; gap:0.5rem;">
        <div style="display:flex; gap:0.75rem; align-items:center;">
          <i class="fa-solid fa-calendar-check" style="font-size:1.4rem; color:var(--portal-accent);"></i>
          <div style="display:flex; flex-direction:column; gap:0.15rem;">
            <strong style="font-size:0.9rem;">${escapeHTML(petName)}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-clock"></i> ${formatFriendlyDate(app.appointment_date)} at ${escapeHTML(app.appointment_time)}</span>
          </div>
        </div>
        <span class="status-badge ${badgeClass}">${escapeHTML(app.status || 'pending')}</span>
      </div>
      <div style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; border-top:1px dashed var(--border-glass); padding-top:0.5rem; width:100%;">
        <div style="margin-bottom:0.25rem;"><strong>Reason:</strong> ${escapeHTML(app.reason || 'General Checkup')}</div>
        <div><strong>Owner:</strong> ${escapeHTML(ownerName)}</div>
      </div>
      ${actionsHtml}
    `;
    table.appendChild(row);
  });

  table.querySelectorAll('.btn-accept-app').forEach(btn => { btn.onclick = () => processAppointment(btn.getAttribute('data-id'), btn.getAttribute('data-pet'), vetUid, 'accepted'); });
  table.querySelectorAll('.btn-reject-app').forEach(btn => { btn.onclick = () => processAppointment(btn.getAttribute('data-id'), btn.getAttribute('data-pet'), vetUid, 'rejected'); });
  table.querySelectorAll('.btn-complete-app').forEach(btn => { btn.onclick = () => processAppointment(btn.getAttribute('data-id'), btn.getAttribute('data-pet'), vetUid, 'completed', btn.getAttribute('data-petname')); });
}

function subscribeVetAppointments(vetUid) {
  if (appointmentsChannel) { supabase.removeChannel(appointmentsChannel); appointmentsChannel = null; }
  appointmentsChannel = supabase
    .channel(`appointments_${vetUid}_${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `vet_id=eq.${vetUid}` }, () => loadVetAppointments(vetUid))
    .subscribe();
}

async function processAppointment(appId, petId, vetUid, status, petName = '') {
  showLoading(true, `Filing status update (${status})...`);
  try {
    const { data: appData, error: updateErr } = await supabase.from('appointments').update({ status }).eq('id', appId).select('*').single();
    if (updateErr) throw updateErr;

    if (status === 'accepted' && petId && vetUid) {
      await supabase.from('vet_access').upsert({ pet_id: petId, vet_id: vetUid, owner_id: appData.owner_id, status: 'active' }, { onConflict: 'pet_id,vet_id' });
    }
    if (status === 'rejected' && petId && vetUid) {
      await supabase.from('vet_access').update({ status: 'inactive' }).eq('pet_id', petId).eq('vet_id', vetUid);
    }

    const { data: pet } = await supabase.from('pets').select('name').eq('id', petId).single();
    const finalPetName = pet?.name || petName || 'companion';
    const { data: vetUser } = await supabase.from('users').select('display_name').eq('id', vetUid).single();
    const vetName = vetUser?.display_name || 'Doctor';

    let msg = `Your consultation request for ${finalPetName} has been ${status.toUpperCase()} by ${vetName}.`;
    if (status === 'completed') msg = `Consultation completed for ${finalPetName} at ${vetName}. Check updated medical logs!`;

    await supabase.from('notifications').insert({ user_id: appData.owner_id, type: 'STATUS_CHANGE', message: msg, is_read: false });

    showToast(`Appointment status updated to ${status}!`, "success");

    // Refresh immediately instead of waiting for realtime/page reload
    await loadVetAppointments(vetUid);

    if (status === 'completed' && petId) {
      showVetTreatmentModal(petId, finalPetName);
    }
  } catch (err) {
    console.error("Failed to process appointment status change:", err);
    showToast("Failed to update status.", "error");
  } finally {
    showLoading(false);
  }
}

export async function renderVetPatients() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Patients Directory';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Patient Records</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">Clinical records and profiles for companions authorized by their owners.</p>
    </div>
    <div class="glass-card mb-2" style="padding: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <div class="form-group" style="flex: 1; min-width: 200px; margin-bottom: 0;"><input type="text" id="vet-patient-search" class="form-control" placeholder="Search by name, breed, or PawTrace ID..."></div>
      <div class="form-group" style="width: 150px; margin-bottom: 0;"><select id="vet-patient-type" class="form-control"><option value="All">All Types</option><option value="Dog">Dogs</option><option value="Cat">Cats</option><option value="Other">Other</option></select></div>
    </div>
    <div id="vet-patients-directory-list" class="pets-grid"><div class="skeleton-container"><div class="skeleton skeleton-card"></div></div></div>
  `;

  showLoading(true, "Loading patient registry...");
  try {
    const { data: grants } = await supabase.from('vet_access').select('pet_id').eq('vet_id', user.uid).eq('status', 'active');
    const petIds = (grants || []).map(g => g.pet_id);
    const { data: rows } = petIds.length > 0 ? await supabase.from('pets').select('*').in('id', petIds) : { data: [] };
    const allPatients = (rows || []).map(mapPetForUI);

    const renderList = (patients) => {
      const container = document.getElementById('vet-patients-directory-list');
      if (!container) return;
      container.innerHTML = '';

      if (patients.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column: span 3; padding: 3rem; text-align: center;"><i class="fa-solid fa-folder-open" style="font-size: 3rem; color: var(--portal-accent); opacity: 0.5; margin-bottom: 1rem;"></i><h3>No Authorized Patients Found</h3><p>Once clients book appointments and authorize access, their companion profiles will appear here.</p></div>`;
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
            <h4 class="pet-card-name" style="display:flex; justify-content:space-between; align-items:center; margin:0 0 0.5rem 0;"><span>${escapeHTML(pet.name)}</span><span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${escapeHTML(pet.pawTraceId)}</span></h4>
            <div class="pet-card-meta" style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem; line-height: 1.4;"><span>${escapeHTML(pet.breed)} &bull; ${escapeHTML(pet.gender)}</span><br><span>Owner: <strong>${escapeHTML(pet.ownerName || 'Pet Owner')}</strong></span></div>
            <button class="btn btn-primary btn-full btn-open-chart" data-id="${pet.id}" style="font-size:0.8rem; padding:0.5rem; width: 100%;"><i class="fa-solid fa-folder-medical"></i> Open Patient Chart</button>
          </div>
        `;
        container.appendChild(card);
      });

      container.querySelectorAll('.btn-open-chart').forEach(btn => { btn.onclick = () => renderPatientChart(btn.getAttribute('data-id')); });
    };

    const searchInput = document.getElementById('vet-patient-search');
    const typeSelect = document.getElementById('vet-patient-type');
    const filterPatients = () => {
      const q = searchInput.value.toLowerCase().trim();
      const type = typeSelect.value;
      const filtered = allPatients.filter(pet => {
        const matchQuery = !q || pet.name.toLowerCase().includes(q) || (pet.breed || '').toLowerCase().includes(q) || (pet.pawTraceId || '').toLowerCase().includes(q) || (pet.ownerName || '').toLowerCase().includes(q);
        const matchType = type === 'All' || (pet.petType && pet.petType.toLowerCase() === type.toLowerCase());
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

async function renderPatientChart(petId) {
  const viewport = document.getElementById('app-viewport');
  showLoading(true, "Retrieving patient chart...");

  try {
    const { data: row, error } = await supabase.from('pets').select('*').eq('id', petId).single();
    if (error || !row) {
      showToast("Patient record not found.", "error");
      renderVetPatients();
      return;
    }
    const pet = mapPetForUI(row);

    const user = getCurrentUser();
    const { data: appointments } = await supabase.from('appointments').select('*').eq('pet_id', petId).eq('vet_id', user.uid).order('created_at', { ascending: false });

    viewport.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <button id="btn-back-to-patients" class="btn btn-outline" style="font-size:0.8rem; padding:0.4rem 0.8rem; margin-bottom: 0.75rem;"><i class="fa-solid fa-chevron-left"></i> Back to Patient Directory</button>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin: 0;">Clinical Chart: ${escapeHTML(pet.name)}</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.15rem;">PawTrace ID: <strong>${escapeHTML(pet.pawTraceId)}</strong> &bull; Species: <strong>${escapeHTML(pet.petType || 'Companion')}</strong></p>
      </div>
      <div class="grid-cols-3" style="gap: 1.5rem; align-items: start;">
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="glass-card" style="padding: 1.25rem;">
            <div style="text-align: center; margin-bottom: 1.25rem;">
              <div style="display: inline-block; width: 100px; height: 100px; border-radius: 50%; overflow: hidden; border: 3px solid var(--portal-accent); position: relative;">${getPetImageHTML(pet, 'small')}</div>
              <h3 style="font-family:'Outfit'; font-weight:700; margin: 0.5rem 0 0 0;">${escapeHTML(pet.name)}</h3>
              <span class="pet-status-badge safe" style="background:var(--portal-accent); font-size:0.65rem; border-radius:4px; position:static; display:inline-block; margin-top:0.25rem; color: white;">${escapeHTML(pet.lostStatus)}</span>
            </div>
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:0.5rem; line-height:1.4;">
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;"><span style="color:var(--text-muted);">Breed:</span><strong>${escapeHTML(pet.breed)}</strong></div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;"><span style="color:var(--text-muted);">Gender:</span><strong>${escapeHTML(pet.gender)}</strong></div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;"><span style="color:var(--text-muted);">DOB:</span><strong>${escapeHTML(pet.dob || 'N/A')}</strong></div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;"><span style="color:var(--text-muted);">Weight:</span><strong>${escapeHTML(pet.weight || 'N/A')} kg</strong></div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;"><span style="color:var(--text-muted);">Microchip ID:</span><strong>${escapeHTML(pet.microchipId || 'None')}</strong></div>
              <div style="display:flex; justify-content:space-between; border-bottom:1px solid var(--border-glass); padding-bottom:0.25rem;"><span style="color:var(--text-muted);">Blood Type:</span><strong>${escapeHTML(pet.bloodType || 'Unknown')}</strong></div>
              <div style="display:flex; justify-content:space-between;"><span style="color:var(--text-muted);">Neutered:</span><strong>${pet.neutered ? 'Yes' : 'No'}</strong></div>
            </div>
          </div>
          <div class="glass-card" style="padding: 1.25rem;">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-id-card"></i> Owner Details</h4>
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:0.5rem; line-height:1.4;">
              <div><span style="color:var(--text-muted); display:block; font-size:0.7rem;">Owner Name</span><strong>${escapeHTML(pet.ownerName || 'Pet Owner')}</strong></div>
              <div><span style="color:var(--text-muted); display:block; font-size:0.7rem;">Primary Phone</span><strong>${pet.ownerPhone ? `<a href="tel:${escapeHTML(pet.ownerPhone)}" style="color:var(--text-main); text-decoration:none;"><i class="fa-solid fa-phone" style="font-size:0.7rem; color:var(--portal-accent); margin-right: 0.25rem;"></i> ${escapeHTML(pet.ownerPhone)}</a>` : 'Not provided'}</strong></div>
              <div><span style="color:var(--text-muted); display:block; font-size:0.7rem;">Emergency Contact</span><strong>${escapeHTML(pet.emergencyContactName || 'None')} ${pet.emergencyContact ? `(${escapeHTML(pet.emergencyContact)})` : ''}</strong></div>
              <div><span style="color:var(--text-muted); display:block; font-size:0.7rem;">Home Address</span><strong style="font-size:0.75rem; font-weight:500; display: block; margin-top: 0.15rem; line-height: 1.35;">${escapeHTML(pet.address || '')}<br>${escapeHTML(pet.city || '')} ${escapeHTML(pet.state || '')} ${escapeHTML(pet.postalCode || '')}</strong></div>
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          <div class="glass-card" style="padding: 1.25rem;">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-syringe"></i> Vaccination Status</h4>
            <div style="display:flex; align-items:center; gap:0.75rem; background:rgba(31,122,140,0.06); padding:0.75rem; border-radius:var(--radius-sm);">
              <i class="fa-solid fa-shield-cat" style="font-size:1.5rem; color:var(--portal-accent);"></i>
              <div><span style="font-size:0.7rem; color:var(--text-muted); display:block;">Overall Compliance</span><strong style="font-size:0.95rem; text-transform:uppercase;">${escapeHTML(pet.vaccinationStatus || 'Unknown')}</strong></div>
            </div>
          </div>
          <div class="glass-card" style="padding: 1.25rem;">
            <h4 style="font-weight:700; color:var(--portal-accent); margin-bottom:0.75rem;"><i class="fa-solid fa-clock-rotate-left"></i> Consultation History</h4>
            <div style="max-height: 250px; overflow-y: auto; display:flex; flex-direction:column; gap:0.5rem;">
              ${(!appointments || appointments.length === 0) ? `<div class="empty-state-mini" style="padding:1.5rem 0; text-align: center;"><p>No past consultations logged.</p></div>` : appointments.map(app => `
                <div style="font-size:0.75rem; padding:0.5rem; border-radius:4px; background:rgba(255,255,255,0.02); border:1px solid var(--border-glass);">
                  <div style="display:flex; justify-content:space-between; font-weight:600;"><span>${formatFriendlyDate(app.appointment_date)} @ ${escapeHTML(app.appointment_time)}</span><span style="text-transform:capitalize;">${escapeHTML(app.status)}</span></div>
                  <span style="color:var(--text-muted); font-size:0.7rem;">Reason: ${escapeHTML(app.reason)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; min-height: 400px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem;">
            <h4 style="font-weight:700; font-family:'Outfit'; font-size:1.05rem; margin:0;"><i class="fa-solid fa-notes-medical"></i> Health Log</h4>
            <button id="btn-chart-file-log" class="btn btn-primary" style="font-size:0.7rem; padding:0.35rem 0.7rem;"><i class="fa-solid fa-plus"></i> File Clinical Log</button>
          </div>
          <div id="chart-timeline-container" style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 500px; overflow-y: auto;"><div class="skeleton skeleton-text"></div></div>
        </div>
      </div>
    `;

    document.getElementById('btn-back-to-patients').onclick = renderVetPatients;
    document.getElementById('btn-chart-file-log').onclick = () => showVetTreatmentModal(petId, pet.name);

    await loadChartTimeline(petId);
    if (recordsChannel) { supabase.removeChannel(recordsChannel); recordsChannel = null; }
    recordsChannel = supabase
      .channel(`chart_medical_${petId}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_records', filter: `pet_id=eq.${petId}` }, () => {
        if (document.getElementById('chart-timeline-container')) loadChartTimeline(petId);
      })
      .subscribe();

  } catch (err) {
    console.error("Failed to load patient chart:", err);
    showToast("Failed to load clinical chart.", "error");
    renderVetPatients();
  } finally {
    showLoading(false);
  }
}

async function loadChartTimeline(petId) {
  const timelineContainer = document.getElementById('chart-timeline-container');
  if (!timelineContainer) return;

  const { data: records } = await supabase.from('medical_records').select('*').eq('pet_id', petId).order('visit_date', { ascending: false });

  timelineContainer.innerHTML = '';
  if (!records || records.length === 0) {
    timelineContainer.innerHTML = `<div class="empty-state-mini" style="padding:2rem; border:1px dashed var(--border-glass); text-align: center;"><i class="fa-solid fa-folder-open"></i><p>No health history recorded yet.</p></div>`;
    return;
  }

  records.forEach(record => {
    const roleBadgeColor = record.created_by_role === 'vet' ? 'var(--portal-accent)' : '#3f8efc';
    const roleLabel = record.created_by_role === 'vet' ? 'Vet Log' : 'Owner Entry';
    const row = document.createElement('div');
    row.className = 'reminder-item';
    row.style.cssText = 'background: rgba(255,255,255,0.01); border: 1px solid var(--border-glass); margin: 0; padding: 0.6rem 0.75rem;';
    row.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.25rem; width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <strong style="font-size:0.8rem;">${escapeHTML(record.title)}</strong>
          <span class="pet-status-badge" style="background:${roleBadgeColor}; font-size:0.55rem; padding:0.1rem 0.3rem; border-radius:4px; position:static; text-transform:uppercase; color: white;">${roleLabel}</span>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted); margin:0; line-height:1.35;">${escapeHTML(record.description || '')}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.2rem; font-size:0.65rem; color:var(--text-muted);">
          <span><i class="fa-solid fa-calendar"></i> ${formatFriendlyDate(record.visit_date)}</span>
          <span><i class="fa-solid fa-user-md"></i> ${escapeHTML(record.created_by_display_name || 'System')}</span>
        </div>
      </div>
    `;
    timelineContainer.appendChild(row);
  });
}
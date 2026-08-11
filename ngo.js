// ==========================================================================
// NGO / RESCUE ORGANIZATION PORTAL MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate, uploadToStorage } from './utils.js';

let activeNgoTab = 'dashboard';

export async function renderNGO() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'NGO Portal';

  const user = getCurrentUser();
  if (!user) return;

  showLoading(true, "Verifying rescue organization credentials...");
  try {
    const { data: userData } = await supabase.from('users').select('*').eq('id', user.uid).single();

    if (!userData || userData.role !== 'ngo') {
      viewport.innerHTML = `
        <div class="auth-wrapper" style="min-height: calc(100vh - 70px); padding:0;">
          <div class="glass-card" style="text-align:center; max-width:480px; padding:2rem;">
            <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
            <h2>NGO Verification Required</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height: 1.4;">Your account does not have authorization to access the rescue organization portal.</p>
            <a href="#/dashboard" class="btn btn-primary mt-2">Go to Main Dashboard</a>
          </div>
        </div>
      `;
      return;
    }

    const ngoDetails = userData.ngo_details || {};
    const orgName = ngoDetails.orgName || userData.display_name || 'Rescue Organization';

    viewport.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Rescue Command Center</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">${orgName} ${ngoDetails.approved ? '<span style="color:var(--accent-green); font-weight:600;"><i class="fa-solid fa-circle-check"></i> Approved</span>' : '<span style="color:var(--accent-yellow); font-weight:600;"><i class="fa-solid fa-clock"></i> Pending Approval</span>'}</p>
      </div>
      <div class="detail-tabs mb-2" id="ngo-tabs" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        <span class="tab-link active" data-tab="dashboard" style="cursor:pointer;">Dashboard</span>
        <span class="tab-link" data-tab="census" style="cursor:pointer;">Animal Census</span>
        <span class="tab-link" data-tab="fosters" style="cursor:pointer;">Fosters</span>
        <span class="tab-link" data-tab="volunteers" style="cursor:pointer;">Volunteers</span>
        <span class="tab-link" data-tab="applications" style="cursor:pointer;">Adoption Applications</span>
        <span class="tab-link" data-tab="strays" style="cursor:pointer;">Stray Reports</span>
        <span class="tab-link" data-tab="profile" style="cursor:pointer;">Org Profile</span>
      </div>
      <div id="ngo-workspace"></div>
    `;

    const tabEls = document.querySelectorAll('#ngo-tabs .tab-link');
    tabEls.forEach(el => {
      el.onclick = () => {
        tabEls.forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        activeNgoTab = el.getAttribute('data-tab');
        switchNgoTab(activeNgoTab, user.uid, userData);
      };
    });

    switchNgoTab(activeNgoTab, user.uid, userData);

  } catch (err) {
    console.error("NGO Portal Error:", err);
    viewport.innerHTML = `<div class="empty-state"><p>Failed to initialize NGO portal.</p></div>`;
  } finally {
    showLoading(false);
  }
}

function switchNgoTab(tab, orgId, userData) {
  const container = document.getElementById('ngo-workspace');
  if (!container) return;
  if (tab === 'dashboard') renderNgoDashboard(container, orgId);
  else if (tab === 'census') renderAnimalCensus(container, orgId);
  else if (tab === 'fosters') renderFosters(container, orgId);
  else if (tab === 'volunteers') renderVolunteers(container, orgId);
  else if (tab === 'applications') renderAdoptionApplications(container, orgId);
  else if (tab === 'strays') renderStrayReports(container, orgId);
  else if (tab === 'profile') renderOrgProfile(container, orgId, userData);
}

/* ===================== DASHBOARD ===================== */

async function renderNgoDashboard(container, orgId) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const { data: animals } = await supabase.from('rescued_animals').select('*').eq('org_id', orgId);
    const { data: apps } = await supabase.from('adoption_applications').select('*').eq('org_id', orgId);
    const { data: strays } = await supabase.from('stray_reports').select('*').eq('status', 'reported');
    const { data: fosters } = await supabase.from('ngo_fosters').select('*').eq('org_id', orgId);

    const total = (animals || []).length;
    const sheltered = (animals || []).filter(a => a.intake_status === 'SHELTERED').length;
    const fostered = (animals || []).filter(a => a.intake_status === 'FOSTERED').length;
    const medical = (animals || []).filter(a => a.intake_status === 'MEDICAL_REHAB').length;
    const adopted = (animals || []).filter(a => a.status === 'adopted').length;
    const pendingApps = (apps || []).filter(a => a.status === 'PENDING').length;

    container.innerHTML = `
      <div class="metric-grid mb-3">
        <div class="glass-card metric-card"><div class="metric-icon teal"><i class="fa-solid fa-paw"></i></div><div class="metric-details"><span class="metric-value">${total}</span><span class="metric-label">Total Animals</span></div></div>
        <div class="glass-card metric-card"><div class="metric-icon terracotta"><i class="fa-solid fa-house-chimney"></i></div><div class="metric-details"><span class="metric-value">${sheltered}</span><span class="metric-label">Sheltered</span></div></div>
        <div class="glass-card metric-card"><div class="metric-icon yellow"><i class="fa-solid fa-heart-circle-plus"></i></div><div class="metric-details"><span class="metric-value">${fostered}</span><span class="metric-label">In Foster Care</span></div></div>
        <div class="glass-card metric-card"><div class="metric-icon blue"><i class="fa-solid fa-briefcase-medical"></i></div><div class="metric-details"><span class="metric-value">${medical}</span><span class="metric-label">Medical Rehab</span></div></div>
      </div>
      <div class="grid-cols-2">
        <div class="glass-card">
          <h3 style="font-weight:700; margin-bottom:1rem;">Quick Actions</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
            <button class="btn btn-outline" id="ngo-quick-intake" style="text-align:left; padding:1.25rem;"><i class="fa-solid fa-plus" style="font-size:1.5rem; color:var(--terracotta); display:block; margin-bottom:0.5rem;"></i><strong>Log Intake</strong></button>
            <button class="btn btn-outline" id="ngo-quick-apps" style="text-align:left; padding:1.25rem;"><i class="fa-solid fa-folder-heart" style="font-size:1.5rem; color:var(--teal); display:block; margin-bottom:0.5rem;"></i><strong>${pendingApps} Pending Applications</strong></button>
          </div>
        </div>
        <div class="glass-card">
          <h3 style="font-weight:700; margin-bottom:1rem;">Overview</h3>
          <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:0.5rem;">
            <div style="display:flex; justify-content:space-between;"><span>Successfully Adopted</span><strong>${adopted}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Active Foster Homes</span><strong>${(fosters || []).length}</strong></div>
            <div style="display:flex; justify-content:space-between;"><span>Unresolved Stray Reports</span><strong style="color:var(--accent-red);">${(strays || []).length}</strong></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ngo-quick-intake').onclick = () => showIntakeModal(orgId);
    document.getElementById('ngo-quick-apps').onclick = () => {
      document.querySelector('#ngo-tabs [data-tab="applications"]').click();
    };
  } catch (err) {
    console.error("NGO dashboard error:", err);
    container.innerHTML = `<p>Failed to load dashboard.</p>`;
  }
}

/* ===================== ANIMAL CENSUS ===================== */

async function renderAnimalCensus(container, orgId) {
  container.innerHTML = `
    <div class="flex-between mb-2">
      <h3 style="font-weight:700;">Animal Census</h3>
      <button id="btn-new-intake" class="btn btn-primary"><i class="fa-solid fa-plus"></i> Log New Intake</button>
    </div>
    <div id="census-list" class="pets-grid"><div class="skeleton skeleton-card"></div></div>
  `;
  document.getElementById('btn-new-intake').onclick = () => showIntakeModal(orgId, () => renderAnimalCensus(container, orgId));
  await loadCensusList(orgId, container);
}

async function loadCensusList(orgId, container) {
  const grid = document.getElementById('census-list');
  const { data: animals, error } = await supabase.from('rescued_animals').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
  if (error) { grid.innerHTML = `<p>Failed to load animal records.</p>`; return; }

  if (!animals || animals.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class="fa-solid fa-paw"></i><h3>No animals registered yet</h3></div>`;
    return;
  }

  grid.innerHTML = '';
  animals.forEach(a => {
    const card = document.createElement('div');
    card.className = 'glass-card pet-card';
    const badgeColor = a.intake_status === 'SHELTERED' ? '#3f8efc' : a.intake_status === 'FOSTERED' ? 'var(--accent-yellow)' : a.intake_status === 'MEDICAL_REHAB' ? 'var(--accent-red)' : a.intake_status === 'ADOPTED' ? 'var(--accent-green)' : '#7f8c8d';
    card.innerHTML = `
      <div class="pet-image-container" style="height:150px; background:#e5e7eb; display:flex; align-items:center; justify-content:center;">
        ${a.photo_url ? `<img src="${a.photo_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fa-solid fa-paw fa-2x" style="color:var(--text-muted);"></i>`}
        <span class="pet-status-badge" style="background:${badgeColor}; text-transform:uppercase; font-size:0.6rem;">${a.intake_status}</span>
      </div>
      <div class="pet-card-content">
        <h4 class="pet-card-name">${a.pet_name}</h4>
        <div class="pet-card-meta" style="font-size:0.75rem; color:var(--text-muted);"><span>${a.species || ''} &bull; ${a.breed || 'Unknown'}</span></div>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
          <button class="btn btn-outline btn-manage-animal" data-id="${a.id}" style="flex:1; font-size:0.75rem; padding:0.4rem;">Manage</button>
          ${a.status === 'available' ? `<span class="pet-status-badge safe" style="position:static; font-size:0.6rem;">ON BOARD</span>` : `<button class="btn btn-secondary btn-publish-animal" data-id="${a.id}" style="flex:1; font-size:0.75rem; padding:0.4rem;">Publish</button>`}
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  grid.querySelectorAll('.btn-manage-animal').forEach(btn => {
    btn.onclick = () => showAnimalCaseModal(animals.find(a => a.id === btn.getAttribute('data-id')), orgId, () => loadCensusList(orgId, container));
  });
  grid.querySelectorAll('.btn-publish-animal').forEach(btn => {
    btn.onclick = async () => {
      showLoading(true, "Publishing to adoption board...");
      try {
        await supabase.from('rescued_animals').update({ status: 'available' }).eq('id', btn.getAttribute('data-id'));
        showToast("Animal published to public adoption board.", "success");
        loadCensusList(orgId, container);
      } catch (err) { showToast("Failed to publish.", "error"); }
      finally { showLoading(false); }
    };
  });
}

function showIntakeModal(orgId, onDone) {
  showModal({
    title: "Log New Animal Intake",
    bodyHtml: `
      <form id="intake-form" style="display:flex; flex-direction:column; gap:0.85rem; max-height:450px; overflow-y:auto;">
        <div class="form-row">
          <div class="form-group"><label>Name *</label><input type="text" id="in-name" class="form-control" required></div>
          <div class="form-group"><label>Species *</label><select id="in-species" class="form-control"><option>Dog</option><option>Cat</option><option>Bird</option><option>Rabbit</option><option>Other</option></select></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Breed</label><input type="text" id="in-breed" class="form-control"></div>
          <div class="form-group"><label>Age</label><input type="text" id="in-age" class="form-control" placeholder="e.g. 2 years"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Gender</label><select id="in-gender" class="form-control"><option>Male</option><option>Female</option><option>Unknown</option></select></div>
          <div class="form-group"><label>Size</label><select id="in-size" class="form-control"><option>Small</option><option>Medium</option><option>Large</option></select></div>
        </div>
        <div class="form-group"><label>Shelter Location</label><input type="text" id="in-location" class="form-control"></div>
        <div class="form-group"><label>Description</label><textarea id="in-desc" class="form-control" rows="2"></textarea></div>
        <div class="form-group"><label>Photo</label><input type="file" id="in-photo" accept="image/*" class="form-control"></div>
        <div style="display:flex; gap:1rem; flex-wrap:wrap;">
          <label style="font-size:0.8rem;"><input type="checkbox" id="in-vaccinated"> Vaccinated</label>
          <label style="font-size:0.8rem;"><input type="checkbox" id="in-special"> Special Needs</label>
          <label style="font-size:0.8rem;"><input type="checkbox" id="in-children"> Good with Children</label>
          <label style="font-size:0.8rem;"><input type="checkbox" id="in-pets"> Good with Pets</label>
        </div>
      </form>
    `,
    confirmText: "Log Intake",
    onConfirm: async () => {
      const form = document.getElementById('intake-form');
      if (!form.checkValidity()) { form.reportValidity(); return true; }

      const user = getCurrentUser();
      showLoading(true, "Registering intake...");
      try {
        let photoUrl = '';
        const fileInput = document.getElementById('in-photo');
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const err = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
          if (err) { showToast(err, "warning"); return true; }
          photoUrl = await uploadToStorage('pet-photos', user.uid, `rescue_${Date.now()}.${file.type.split('/')[1]}`, file);
        }

        const { data: orgUser } = await supabase.from('users').select('display_name, ngo_details').eq('id', orgId).single();

        await supabase.from('rescued_animals').insert({
          org_id: orgId,
          org_name: orgUser?.ngo_details?.orgName || orgUser?.display_name || 'Rescue Org',
          pet_name: document.getElementById('in-name').value.trim(),
          species: document.getElementById('in-species').value,
          breed: document.getElementById('in-breed').value.trim(),
          age: document.getElementById('in-age').value.trim(),
          gender: document.getElementById('in-gender').value,
          size: document.getElementById('in-size').value,
          shelter_location: document.getElementById('in-location').value.trim(),
          description: document.getElementById('in-desc').value.trim(),
          photo_url: photoUrl,
          vaccinated: document.getElementById('in-vaccinated').checked,
          special_needs: document.getElementById('in-special').checked,
          good_with_children: document.getElementById('in-children').checked,
          good_with_pets: document.getElementById('in-pets').checked,
          intake_status: 'SHELTERED',
          status: 'pending'
        });

        showToast("Animal intake logged successfully.", "success");
        closeModal();
        if (onDone) onDone();
        return false;
      } catch (err) {
        console.error(err);
        showToast("Failed to log intake.", "error");
        return true;
      } finally { showLoading(false); }
    }
  });
}

function showAnimalCaseModal(animal, orgId, onDone) {
  showModal({
    title: `Case File: ${animal.pet_name}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:1rem; max-height:500px; overflow-y:auto;">
        <div class="form-group">
          <label>Intake Status</label>
          <select id="case-status" class="form-control">
            <option value="SHELTERED" ${animal.intake_status === 'SHELTERED' ? 'selected' : ''}>Sheltered</option>
            <option value="FOSTERED" ${animal.intake_status === 'FOSTERED' ? 'selected' : ''}>Fostered</option>
            <option value="MEDICAL_REHAB" ${animal.intake_status === 'MEDICAL_REHAB' ? 'selected' : ''}>Medical Rehab</option>
            <option value="REUNITED" ${animal.intake_status === 'REUNITED' ? 'selected' : ''}>Reunited with Owner</option>
          </select>
        </div>
        <button id="btn-save-case-status" class="btn btn-secondary" style="font-size:0.8rem;">Update Status</button>

        <hr class="divider">
        <h4 style="font-weight:700; font-size:0.9rem;">Medical Log</h4>
        <form id="med-log-form" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          <input type="text" id="case-med-category" class="form-control" placeholder="Category" style="flex:1; min-width:100px;">
          <input type="text" id="case-med-notes" class="form-control" placeholder="Notes" style="flex:2; min-width:150px;">
          <button type="submit" class="btn btn-primary" style="font-size:0.75rem;">Add</button>
        </form>
        <div id="case-med-logs" style="display:flex; flex-direction:column; gap:0.5rem; font-size:0.8rem;"></div>
      </div>
    `,
    confirmText: "Close",
    onConfirm: () => { closeModal(); if (onDone) onDone(); return false; }
  });

  document.getElementById('btn-save-case-status').onclick = async () => {
    const status = document.getElementById('case-status').value;
    showLoading(true, "Updating status...");
    try {
      await supabase.from('rescued_animals').update({ intake_status: status }).eq('id', animal.id);
      showToast("Case status updated.", "success");
    } catch (err) { showToast("Failed to update.", "error"); }
    finally { showLoading(false); }
  };

  const loadMedLogs = async () => {
    const { data: logs } = await supabase.from('ngo_medical_logs').select('*').eq('animal_id', animal.id).order('created_at', { ascending: false });
    const box = document.getElementById('case-med-logs');
    if (!box) return;
    box.innerHTML = (!logs || logs.length === 0) ? '<p style="color:var(--text-muted);">No medical logs yet.</p>' :
      logs.map(l => `<div style="border-bottom:1px solid var(--border-glass); padding-bottom:0.35rem;"><strong>${l.category}</strong>: ${l.notes} <span style="color:var(--text-muted); font-size:0.7rem;">(${formatFriendlyDate(l.created_at)})</span></div>`).join('');
  };
  loadMedLogs();

  document.getElementById('med-log-form').onsubmit = async (e) => {
    e.preventDefault();
    const category = document.getElementById('case-med-category').value.trim();
    const notes = document.getElementById('case-med-notes').value.trim();
    if (!category || !notes) return;
    try {
      await supabase.from('ngo_medical_logs').insert({ animal_id: animal.id, category, notes });
      document.getElementById('case-med-category').value = '';
      document.getElementById('case-med-notes').value = '';
      loadMedLogs();
    } catch (err) { showToast("Failed to add log.", "error"); }
  };
}

/* ===================== FOSTERS ===================== */

async function renderFosters(container, orgId) {
  container.innerHTML = `
    <div class="grid-split">
      <div>
        <h3 style="font-weight:700; margin-bottom:1rem;">Registered Foster Homes</h3>
        <div id="fosters-list" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="skeleton skeleton-text"></div></div>
      </div>
      <div class="glass-card" style="padding:1.25rem;">
        <h4 style="font-weight:700; margin-bottom:0.75rem;">Add Foster Home</h4>
        <form id="foster-form" style="display:flex; flex-direction:column; gap:0.6rem;">
          <input type="text" id="f-name" class="form-control" placeholder="Foster Name *" required style="font-size:0.8rem;">
          <input type="tel" id="f-phone" class="form-control" placeholder="Phone" style="font-size:0.8rem;">
          <input type="email" id="f-email" class="form-control" placeholder="Email" style="font-size:0.8rem;">
          <input type="text" id="f-address" class="form-control" placeholder="Address" style="font-size:0.8rem;">
          <input type="number" id="f-capacity" class="form-control" placeholder="Max Capacity" value="1" min="1" style="font-size:0.8rem;">
          <button type="submit" class="btn btn-primary" style="font-size:0.8rem;">Add Foster</button>
        </form>
      </div>
    </div>
  `;

  const load = async () => {
    const list = document.getElementById('fosters-list');
    const { data: fosters } = await supabase.from('ngo_fosters').select('*').eq('org_id', orgId);
    if (!fosters || fosters.length === 0) { list.innerHTML = '<div class="empty-state-mini"><p>No fosters registered.</p></div>'; return; }
    list.innerHTML = fosters.map(f => `
      <div class="glass-card" style="padding:0.85rem;">
        <div style="display:flex; justify-content:space-between;">
          <strong>${f.name}</strong>
          <span class="pet-status-badge safe" style="position:static; font-size:0.6rem; background:${f.availability_status === 'AVAILABLE' ? 'var(--accent-green)' : 'var(--accent-yellow)'};">${f.availability_status}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">${f.phone || ''} ${f.email ? '&bull; ' + f.email : ''}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">Capacity: ${(f.current_placements || []).length}/${f.max_capacity}</div>
      </div>
    `).join('');
  };
  load();

  document.getElementById('foster-form').onsubmit = async (e) => {
    e.preventDefault();
    showLoading(true, "Adding foster...");
    try {
      await supabase.from('ngo_fosters').insert({
        org_id: orgId,
        name: document.getElementById('f-name').value.trim(),
        phone: document.getElementById('f-phone').value.trim(),
        email: document.getElementById('f-email').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        max_capacity: parseInt(document.getElementById('f-capacity').value) || 1
      });
      showToast("Foster home added.", "success");
      e.target.reset();
      load();
    } catch (err) { showToast("Failed to add foster.", "error"); }
    finally { showLoading(false); }
  };
}

/* ===================== VOLUNTEERS ===================== */

async function renderVolunteers(container, orgId) {
  container.innerHTML = `
    <div class="grid-split">
      <div>
        <h3 style="font-weight:700; margin-bottom:1rem;">Registered Volunteers</h3>
        <div id="volunteers-list" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="skeleton skeleton-text"></div></div>
      </div>
      <div class="glass-card" style="padding:1.25rem;">
        <h4 style="font-weight:700; margin-bottom:0.75rem;">Add Volunteer</h4>
        <form id="volunteer-form" style="display:flex; flex-direction:column; gap:0.6rem;">
          <input type="text" id="v-name" class="form-control" placeholder="Volunteer Name *" required style="font-size:0.8rem;">
          <input type="tel" id="v-phone" class="form-control" placeholder="Phone" style="font-size:0.8rem;">
          <input type="text" id="v-skills" class="form-control" placeholder="Skills (comma separated)" style="font-size:0.8rem;">
          <input type="text" id="v-schedule" class="form-control" placeholder="Availability (e.g. Weekends)" style="font-size:0.8rem;">
          <button type="submit" class="btn btn-primary" style="font-size:0.8rem;">Add Volunteer</button>
        </form>
      </div>
    </div>
  `;

  const load = async () => {
    const list = document.getElementById('volunteers-list');
    const { data: vols } = await supabase.from('ngo_volunteers').select('*').eq('org_id', orgId);
    if (!vols || vols.length === 0) { list.innerHTML = '<div class="empty-state-mini"><p>No volunteers registered.</p></div>'; return; }
    list.innerHTML = vols.map(v => `
      <div class="glass-card" style="padding:0.85rem;">
        <strong>${v.name}</strong>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">${v.phone || ''}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">Skills: ${(v.skills || []).join(', ') || 'N/A'} &bull; ${v.availability_schedule || ''}</div>
      </div>
    `).join('');
  };
  load();

  document.getElementById('volunteer-form').onsubmit = async (e) => {
    e.preventDefault();
    showLoading(true, "Adding volunteer...");
    try {
      await supabase.from('ngo_volunteers').insert({
        org_id: orgId,
        name: document.getElementById('v-name').value.trim(),
        phone: document.getElementById('v-phone').value.trim(),
        skills: document.getElementById('v-skills').value.trim().split(',').map(s => s.trim()).filter(Boolean),
        availability_schedule: document.getElementById('v-schedule').value.trim()
      });
      showToast("Volunteer added.", "success");
      e.target.reset();
      load();
    } catch (err) { showToast("Failed to add volunteer.", "error"); }
    finally { showLoading(false); }
  };
}

/* ===================== ADOPTION APPLICATIONS ===================== */

async function renderAdoptionApplications(container, orgId) {
  container.innerHTML = `<h3 style="font-weight:700; margin-bottom:1rem;">Adoption Applications</h3><div id="apps-list" style="display:flex; flex-direction:column; gap:1rem;"><div class="skeleton skeleton-text"></div></div>`;

  const { data: apps, error } = await supabase.from('adoption_applications').select('*, rescued_animals(pet_name)').eq('org_id', orgId).order('created_at', { ascending: false });
  const list = document.getElementById('apps-list');
  if (error || !apps || apps.length === 0) { list.innerHTML = '<div class="empty-state-mini"><p>No applications received yet.</p></div>'; return; }

  list.innerHTML = apps.map(app => {
    const badgeColor = app.status === 'PENDING' ? 'var(--accent-yellow)' : app.status === 'APPROVED' ? 'var(--accent-green)' : app.status === 'COMPLETED' ? '#2a9d8f' : 'var(--accent-red)';
    const actions = app.status === 'PENDING' ? `
      <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
        <button class="btn btn-primary btn-approve-app" data-id="${app.id}" style="font-size:0.75rem;">Approve</button>
        <button class="btn btn-danger btn-reject-app" data-id="${app.id}" style="font-size:0.75rem;">Reject</button>
      </div>` : '';
    return `
      <div class="glass-card" style="padding:1.25rem;">
        <div class="flex-between">
          <strong style="color:var(--teal);">${app.rescued_animals?.pet_name || 'Animal'}</strong>
          <span class="pet-status-badge safe" style="position:static; font-size:0.65rem; background:${badgeColor};">${app.status}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.5rem; line-height:1.4;">
          <div><strong>Applicant:</strong> ${app.applicant_name} (${app.applicant_phone})</div>
          <div><strong>City:</strong> ${app.applicant_city} &bull; <strong>Housing:</strong> ${app.housing_type}</div>
          <div><strong>Reason:</strong> ${app.reason}</div>
        </div>
        ${actions}
      </div>
    `;
  }).join('');

  list.querySelectorAll('.btn-approve-app').forEach(btn => {
    btn.onclick = async () => {
      showLoading(true, "Approving application...");
      try {
        const appId = btn.getAttribute('data-id');
        const app = apps.find(a => a.id === appId);
        await supabase.from('adoption_applications').update({ status: 'APPROVED' }).eq('id', appId);
        await supabase.from('notifications').insert({ user_id: app.applicant_uid, type: 'STATUS_CHANGE', message: `Your adoption application for ${app.rescued_animals?.pet_name} was APPROVED! Please confirm in your Applications tab.`, is_read: false });
        showToast("Application approved.", "success");
        renderAdoptionApplications(container, orgId);
      } catch (err) { showToast("Failed to approve.", "error"); }
      finally { showLoading(false); }
    };
  });
  list.querySelectorAll('.btn-reject-app').forEach(btn => {
    btn.onclick = async () => {
      showLoading(true, "Rejecting application...");
      try {
        const appId = btn.getAttribute('data-id');
        const app = apps.find(a => a.id === appId);
        await supabase.from('adoption_applications').update({ status: 'REJECTED' }).eq('id', appId);
        await supabase.from('notifications').insert({ user_id: app.applicant_uid, type: 'STATUS_CHANGE', message: `Your adoption application for ${app.rescued_animals?.pet_name} was not approved this time.`, is_read: false });
        showToast("Application rejected.", "info");
        renderAdoptionApplications(container, orgId);
      } catch (err) { showToast("Failed to reject.", "error"); }
      finally { showLoading(false); }
    };
  });
}

/* ===================== STRAY REPORTS ===================== */

async function renderStrayReports(container, orgId) {
  container.innerHTML = `<h3 style="font-weight:700; margin-bottom:1rem;">Stray Animal Reports</h3><div id="strays-list" style="display:flex; flex-direction:column; gap:1rem;"><div class="skeleton skeleton-text"></div></div>`;

  const { data: reports, error } = await supabase.from('stray_reports').select('*').order('created_at', { ascending: false });
  const list = document.getElementById('strays-list');
  if (error || !reports || reports.length === 0) { list.innerHTML = '<div class="empty-state-mini"><p>No stray reports filed.</p></div>'; return; }

  const { data: vols } = await supabase.from('ngo_volunteers').select('*').eq('org_id', orgId);

  list.innerHTML = reports.map(r => `
    <div class="glass-card" style="padding:1.25rem;">
      <div class="flex-between">
        <strong>${r.reporter_name || 'Anonymous Reporter'}</strong>
        <span class="pet-status-badge ${r.status === 'reported' ? 'lost' : 'safe'}" style="position:static; font-size:0.65rem;">${r.status.toUpperCase()}</span>
      </div>
      <p style="font-size:0.8rem; color:var(--text-muted); margin:0.5rem 0;">${r.description || ''}</p>
      <div style="font-size:0.75rem; color:var(--text-muted);">Contact: ${r.reporter_contact || 'N/A'} &bull; Urgency: ${r.urgency}</div>
      ${r.status === 'reported' ? `
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem; align-items:center;">
          <select class="form-control assign-vol-select" data-id="${r.id}" style="font-size:0.75rem; flex:1;">
            <option value="">Assign volunteer...</option>
            ${(vols || []).map(v => `<option value="${v.id}|${v.name}">${v.name}</option>`).join('')}
          </select>
          <button class="btn btn-primary btn-assign-vol" data-id="${r.id}" style="font-size:0.75rem;">Assign</button>
        </div>
      ` : `<div style="font-size:0.75rem; margin-top:0.5rem; color:var(--teal);">Assigned to: ${r.assigned_volunteer_name || 'N/A'}</div>`}
    </div>
  `).join('');

  list.querySelectorAll('.btn-assign-vol').forEach(btn => {
    btn.onclick = async () => {
      const reportId = btn.getAttribute('data-id');
      const select = document.querySelector(`.assign-vol-select[data-id="${reportId}"]`);
      const val = select.value;
      if (!val) { showToast("Select a volunteer first.", "warning"); return; }
      const [volId, volName] = val.split('|');
      showLoading(true, "Assigning volunteer...");
      try {
        await supabase.from('stray_reports').update({ status: 'assigned', assigned_volunteer_id: volId, assigned_volunteer_name: volName }).eq('id', reportId);
        showToast("Volunteer assigned.", "success");
        renderStrayReports(container, orgId);
      } catch (err) { showToast("Failed to assign.", "error"); }
      finally { showLoading(false); }
    };
  });
}

/* ===================== ORG PROFILE ===================== */

async function renderOrgProfile(container, orgId, userData) {
  const details = userData.ngo_details || {};
  container.innerHTML = `
    <div class="glass-card" style="max-width:600px;">
      <h3 style="font-weight:700; margin-bottom:1rem;">Organization Profile</h3>
      <form id="org-profile-form" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div class="form-group"><label>Organization Name *</label><input type="text" id="org-name" class="form-control" value="${details.orgName || userData.display_name || ''}" required></div>
        <div class="form-group"><label>Registration ID</label><input type="text" id="org-reg" class="form-control" value="${details.registrationId || ''}"></div>
        <div class="form-group"><label>Location / City</label><input type="text" id="org-location" class="form-control" value="${details.location || ''}"></div>
        <button type="submit" class="btn btn-primary">Save Profile</button>
      </form>
    </div>
  `;
  document.getElementById('org-profile-form').onsubmit = async (e) => {
    e.preventDefault();
    showLoading(true, "Saving profile...");
    try {
      const orgName = document.getElementById('org-name').value.trim();
      await supabase.from('users').update({
        display_name: orgName,
        ngo_details: { ...details, orgName, registrationId: document.getElementById('org-reg').value.trim(), location: document.getElementById('org-location').value.trim() }
      }).eq('id', orgId);
      showToast("Profile updated.", "success");
    } catch (err) { showToast("Failed to save profile.", "error"); }
    finally { showLoading(false); }
  };
}
// adoptions-client.js — Supabase version
import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, getPetImageHTML, formatFriendlyDate, escapeHTML } from './utils.js';

let activeSubTab = 'browse';

export async function renderAdoptionCenter() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Adoption Center';
  const user = getCurrentUser();

  viewport.innerHTML = `
    <div class="glass-card mb-2" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.08) 0%, rgba(219, 93, 57, 0.05) 100%); padding: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:800; font-size:2rem; background: linear-gradient(135deg, var(--teal) 0%, var(--terracotta) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Find Your Companion</h2>
          <p style="color:var(--text-muted); font-size:0.95rem; margin-top:0.35rem; max-width:600px;">Browse rescued animals, track applications, and welcome a new companion to their forever home.</p>
        </div>
        <div style="font-size:3.5rem; color:var(--teal); opacity:0.25; padding-right:1rem;"><i class="fa-solid fa-heart-pulse"></i></div>
      </div>
    </div>
    <div class="glass-card mb-2" style="padding:0.4rem; display:flex; gap:0.5rem; background:rgba(255,255,255,0.2); flex-wrap:wrap;">
      <button class="sub-tab-btn active" data-subtab="browse" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); cursor:pointer;"><i class="fa-solid fa-compass"></i> Browse Animals</button>
      <button class="sub-tab-btn" data-subtab="matcher" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); cursor:pointer;"><i class="fa-solid fa-wand-magic-sparkles"></i> Find My Match</button>
      <button class="sub-tab-btn" data-subtab="wishlist" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); cursor:pointer;"><i class="fa-solid fa-heart"></i> Favorites Wishlist</button>
      <button class="sub-tab-btn" data-subtab="applications" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); cursor:pointer;"><i class="fa-solid fa-folder-heart"></i> My Applications</button>
    </div>
    <div id="adoptions-workspace"></div>
  `;

  const subBtns = viewport.querySelectorAll('.sub-tab-btn');
  subBtns.forEach(btn => {
    btn.onclick = () => {
      subBtns.forEach(b => { b.classList.remove('active'); b.style.background = 'none'; b.style.color = 'var(--text-muted)'; });
      btn.classList.add('active'); btn.style.background = 'var(--teal)'; btn.style.color = 'white';
      activeSubTab = btn.getAttribute('data-subtab');
      switchSubTab(activeSubTab, user);
    };
  });
  const initialActive = viewport.querySelector(`.sub-tab-btn[data-subtab="${activeSubTab}"]`);
  if (initialActive) { initialActive.classList.add('active'); initialActive.style.background = 'var(--teal)'; initialActive.style.color = 'white'; }
  switchSubTab(activeSubTab, user);
}

function switchSubTab(subTabName, user) {
  const container = document.getElementById('adoptions-workspace');
  if (!container) return;
  if (subTabName === 'browse') renderBrowseAnimals(container, user);
  else if (subTabName === 'wishlist') renderSavedWishlist(container, user);
  else if (subTabName === 'applications') {
    if (!user) renderAdoptionLoginPrompt(container, "Track Adoption Applications");
    else renderMyApplications(container, user);
  } else if (subTabName === 'matcher') renderAdoptionMatcher(container, user);
}

function renderAdoptionLoginPrompt(container, titleText) {
  container.innerHTML = `
    <div class="glass-card" style="text-align:center; padding:3rem 1.5rem; margin-top:1rem;">
      <i class="fa-solid fa-user-lock" style="font-size:2.5rem; color:var(--terracotta); margin-bottom:1rem; opacity:0.8;"></i>
      <h3 style="font-family:'Outfit'; font-weight:700;">Account Authentication Required</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); max-width:440px; margin:0.5rem auto 1.5rem auto; line-height:1.4;">In order to ${escapeHTML(titleText.toLowerCase())}, save favorite companions across sessions, or submit adoption questionnaires, you must log in.</p>
      <div style="display:flex; justify-content:center; gap:0.5rem;"><a href="#/login" class="btn btn-primary">Log In</a><a href="#/signup" class="btn btn-outline">Create Account</a></div>
    </div>
  `;
}

async function renderBrowseAnimals(container, user) {
  container.innerHTML = `
    <div class="glass-card mb-2" style="padding:1.25rem; background:rgba(255,255,255,0.15);">
      <h4 style="font-family:'Outfit'; font-weight:700; margin-bottom:0.75rem; font-size:0.95rem;"><i class="fa-solid fa-filter"></i> Search Filters</h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem;">
        <div style="grid-column: span 2; position:relative;">
          <input type="text" id="filter-search" class="form-control" placeholder="Search breed, location, behavior..." style="font-size:0.8rem; padding-left:2rem;">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.8rem;"></i>
        </div>
        <div><select id="filter-species" class="form-control" style="font-size:0.8rem;"><option value="ALL">All Species</option><option value="Dog">Dog</option><option value="Cat">Cat</option><option value="Bird">Bird</option><option value="Rabbit">Rabbit</option><option value="Other">Other</option></select></div>
        <div><select id="filter-gender" class="form-control" style="font-size:0.8rem;"><option value="ALL">All Genders</option><option value="Male">Male</option><option value="Female">Female</option></select></div>
        <div><select id="filter-size" class="form-control" style="font-size:0.8rem;"><option value="ALL">All Sizes</option><option value="Small">Small</option><option value="Medium">Medium</option><option value="Large">Large</option></select></div>
        <div style="grid-column: span 2; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-top:0.25rem;">
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer;"><input type="checkbox" id="chk-vaccinated"> Vaccinated Only</label>
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer;"><input type="checkbox" id="chk-special"> Special Needs Only</label>
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer;"><input type="checkbox" id="chk-children"> Good with Children</label>
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer;"><input type="checkbox" id="chk-pets"> Good with Pets</label>
        </div>
      </div>
    </div>
    <div id="client-adoptions-grid" class="pets-grid"><div class="skeleton-container" style="grid-column: span 3;"><div class="skeleton skeleton-card"></div></div></div>
  `;

  const els = ['filter-search','filter-species','filter-gender','filter-size','chk-vaccinated','chk-special','chk-children','chk-pets'].map(id => document.getElementById(id));
  const onFilterChange = () => loadAdoptableListings(user, els[0].value.toLowerCase().trim(), els[1].value, els[2].value, els[3].value, els[4].checked, els[5].checked, els[6].checked, els[7].checked);
  els.forEach(el => { el.oninput = onFilterChange; el.onchange = onFilterChange; });
  loadAdoptableListings(user);
}

async function loadAdoptableListings(user, search = '', species = 'ALL', gender = 'ALL', size = 'ALL', isVaccinated = false, isSpecial = false, isChildren = false, isPets = false) {
  const grid = document.getElementById('client-adoptions-grid');
  if (!grid) return;

  try {
    const { data: rows, error } = await supabase.from('rescued_animals').select('*').eq('status', 'available');
    if (error) throw error;
    grid.innerHTML = '';

    let items = (rows || []).map(a => ({
      id: a.id, petName: a.pet_name, type: a.species, breed: a.breed, age: a.age, gender: a.gender, size: a.size,
      description: a.description, photo: a.photo_url, vaccinated: a.vaccinated, specialNeeds: a.special_needs,
      goodWithChildren: a.good_with_children, goodWithPets: a.good_with_pets, orgId: a.org_id, orgName: 'Rescue Org'
    }));

    items = items.filter(item => {
      const matchSearch = item.petName.toLowerCase().includes(search) || (item.breed || '').toLowerCase().includes(search) || (item.description || '').toLowerCase().includes(search);
      const matchSpecies = species === 'ALL' || (item.type || '').toLowerCase() === species.toLowerCase();
      const matchGender = gender === 'ALL' || item.gender === gender;
      const matchSize = size === 'ALL' || item.size === size;
      const matchVacc = !isVaccinated || item.vaccinated === true;
      const matchSpec = !isSpecial || item.specialNeeds === true;
      const matchChild = !isChildren || item.goodWithChildren === true;
      const matchPet = !isPets || item.goodWithPets === true;
      return matchSearch && matchSpecies && matchGender && matchSize && matchVacc && matchSpec && matchChild && matchPet;
    });

    if (items.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: span 3; padding: 4rem 2rem;"><i class="fa-solid fa-shield-heart" style="font-size:3rem; opacity:0.3;"></i><p>No companions looking for adoption homes match your filters.</p></div>`;
      return;
    }

    const favs = await getSavedFavorites(user);

    // FIX (XSS): animal.petName / breed / age were inserted raw into
    // multiple cards throughout this file — all escaped now.
    items.forEach(animal => {
      const isFav = favs.includes(animal.id);
      const card = document.createElement('div');
      card.className = 'glass-card pet-card magnetic-card';
      card.innerHTML = `
        <div class="pet-image-container" style="position: relative; height:160px;">
          ${getPetImageHTML(animal, 'small')}
          <button class="btn-favorite" data-id="${escapeHTML(animal.id)}" style="position:absolute; top:10px; right:10px; border:none; background:rgba(255,255,255,0.75); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:${isFav ? 'var(--accent-red)' : 'var(--text-muted)'};"><i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart"></i></button>
          <span class="pet-status-badge safe" style="background:var(--teal)">ADOPTABLE</span>
        </div>
        <div class="pet-card-content" style="padding:1rem;">
          <h4 class="pet-card-name" style="font-family:'Outfit'; font-weight:700; margin-bottom:0.25rem;">${escapeHTML(animal.petName)}</h4>
          <div class="pet-card-meta" style="flex-direction:column; gap:0.25rem; font-size:0.75rem; color:var(--text-muted); border-bottom:1px solid rgba(0,0,0,0.03); padding-bottom:0.5rem; margin-bottom:0.5rem;">
            <span><strong>Breed:</strong> ${escapeHTML(animal.breed)}</span><span><strong>Age:</strong> ${escapeHTML(animal.age)}</span>
          </div>
          <button class="btn btn-primary btn-full btn-view-adoption-profile" data-id="${escapeHTML(animal.id)}"><i class="fa-solid fa-file-invoice"></i> View Profile</button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll('.btn-favorite').forEach(btn => {
      btn.onclick = async (e) => { e.stopPropagation(); await toggleFavoriteAnimal(btn.getAttribute('data-id'), user); loadAdoptableListings(user, search, species, gender, size, isVaccinated, isSpecial, isChildren, isPets); };
    });
    grid.querySelectorAll('.btn-view-adoption-profile').forEach(btn => {
      btn.onclick = () => { const animal = items.find(i => i.id === btn.getAttribute('data-id')); showAdoptionProfileModal(animal, user); };
    });
  } catch (err) {
    console.error("Listing retrieval failure:", err);
    grid.innerHTML = `<p>Failed to load adoptable companion board.</p>`;
  }
}

function showAdoptionProfileModal(animal, user) {
  showModal({
    title: `Adoption Profile: ${escapeHTML(animal.petName)}`,
    bodyHtml: `
      <div class="grid-split" style="max-height:480px; overflow-y:auto;">
        <div>
          <div class="pet-image-container mb-2" style="height:150px; border-radius:var(--radius-md); overflow:hidden;">${getPetImageHTML(animal, 'small')}</div>
          <h4 style="font-family:'Outfit'; font-weight:700; font-size:1.05rem; margin-bottom:0.5rem;">Bio Attributes</h4>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem;">
            <span><strong>Species:</strong> ${escapeHTML(animal.type || 'Companion')}</span><span><strong>Breed:</strong> ${escapeHTML(animal.breed)}</span>
            <span><strong>Age:</strong> ${escapeHTML(animal.age)}</span><span><strong>Gender:</strong> ${escapeHTML(animal.gender)}</span><span><strong>Size:</strong> ${escapeHTML(animal.size || 'Medium')}</span>
          </div>
        </div>
        <div>
          <h4 style="font-family:'Outfit'; font-weight:700; font-size:1.05rem; margin-bottom:0.4rem;">Personality & Background</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:1.5rem;">${escapeHTML(animal.description || 'This animal has no descriptive logs registered.')}</p>
          <button id="btn-apply-adopt-modal" class="btn btn-primary btn-full"><i class="fa-solid fa-file-invoice"></i> Submit Adoption Application</button>
        </div>
      </div>
    `,
    confirmText: "Close Profile",
    onConfirm: () => { closeModal(); return false; }
  });

  document.getElementById('btn-apply-adopt-modal').onclick = () => {
    if (!user) { closeModal(); renderAdoptionLoginPrompt(document.getElementById('adoptions-workspace'), "Submit Adoption Applications"); }
    else showApplicationFormModal(animal, user);
  };
}

function showApplicationFormModal(animal, user) {
  showModal({
    title: `Apply to Adopt: ${escapeHTML(animal.petName)}`,
    bodyHtml: `
      <form id="adoption-submit-form" style="display:flex; flex-direction:column; gap:0.85rem; max-height:450px; overflow-y:auto;">
        <div class="form-row">
          <div class="form-group"><label>Applicant Full Name *</label><input type="text" id="app-form-name" class="form-control" required value="${escapeHTML(user.displayName || '')}"></div>
          <div class="form-group"><label>Contact Phone *</label><input type="tel" id="app-form-phone" class="form-control" required></div>
        </div>
        <div class="form-group"><label>City / Location *</label><input type="text" id="app-form-city" class="form-control" required></div>
        <div class="form-group"><label>Housing Type *</label><select id="app-form-housing" class="form-control" required><option value="House">House (Fenced Yard)</option><option value="Apartment">Apartment</option><option value="Other">Other</option></select></div>
        <div class="form-group"><label>Existing Pets *</label><input type="text" id="app-form-existing" class="form-control" required placeholder="E.g. None"></div>
        <div class="form-group"><label>Previous Experience *</label><textarea id="app-form-exp" class="form-control" rows="2" required></textarea></div>
        <div class="form-group"><label>Reason for Adoption *</label><textarea id="app-form-reason" class="form-control" rows="2" required></textarea></div>
      </form>
    `,
    confirmText: "Submit Application",
    onConfirm: async () => {
      const form = document.getElementById('adoption-submit-form');
      if (!form.checkValidity()) { form.reportValidity(); return true; }

      showLoading(true, "Submitting adoption application...");
      try {
        const { error } = await supabase.from('adoption_applications').insert({
          animal_id: animal.id,
          applicant_uid: user.uid,
          applicant_name: document.getElementById('app-form-name').value.trim(),
          applicant_phone: document.getElementById('app-form-phone').value.trim(),
          applicant_city: document.getElementById('app-form-city').value.trim(),
          housing_type: document.getElementById('app-form-housing').value,
          existing_pets: document.getElementById('app-form-existing').value.trim(),
          experience: document.getElementById('app-form-exp').value.trim(),
          reason: document.getElementById('app-form-reason').value.trim(),
          org_id: animal.orgId,
          status: 'PENDING'
        });
        if (error) throw error;

        await supabase.from('notifications').insert({
          user_id: animal.orgId, type: 'STATUS_CHANGE',
          message: `New adoption application submitted for ${animal.petName}.`, is_read: false
        });

        showToast("Application submitted successfully!", "success");
        closeModal();
        switchSubTab('applications', user);
        return false;
      } catch (err) {
        showToast(`Submission failed: ${err.message || err}`, "error");
        return true;
      } finally { showLoading(false); }
    }
  });
}

async function renderSavedWishlist(container, user) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const favs = await getSavedFavorites(user);
    if (favs.length === 0) {
      container.innerHTML = `<div class="glass-card" style="text-align:center; padding:3rem 1.5rem; margin-top:1rem;"><i class="fa-regular fa-heart" style="font-size:2.5rem; color:var(--text-muted); opacity:0.3;"></i><h3 style="font-family:'Outfit'; font-weight:700;">Your Wishlist is Empty</h3></div>`;
      return;
    }
    const { data: rows } = await supabase.from('rescued_animals').select('*').in('id', favs).eq('status', 'available');
    const items = (rows || []).map(a => ({ id: a.id, petName: a.pet_name, breed: a.breed, age: a.age, type: a.species, photo: a.photo_url }));

    if (items.length === 0) {
      container.innerHTML = `<div class="glass-card" style="text-align:center; padding:3rem 1.5rem;"><h3 style="font-family:'Outfit'; font-weight:700;">No Available Matches</h3></div>`;
      return;
    }
    container.innerHTML = `<div id="wishlist-grid" class="pets-grid"></div>`;
    const grid = document.getElementById('wishlist-grid');
    items.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'glass-card pet-card magnetic-card';
      card.innerHTML = `
        <div class="pet-image-container" style="position: relative; height:160px;">${getPetImageHTML(animal, 'small')}
          <button class="btn-remove-favorite" data-id="${escapeHTML(animal.id)}" style="position:absolute; top:10px; right:10px; border:none; background:rgba(255,255,255,0.75); width:32px; height:32px; border-radius:50%; color:var(--accent-red);"><i class="fa-solid fa-heart"></i></button>
        </div>
        <div class="pet-card-content" style="padding:1rem;"><h4 style="font-family:'Outfit'; font-weight:700;">${escapeHTML(animal.petName)}</h4>
          <button class="btn btn-primary btn-full btn-view-adoption-profile" data-id="${escapeHTML(animal.id)}">View Profile</button>
        </div>
      `;
      grid.appendChild(card);
    });
    grid.querySelectorAll('.btn-remove-favorite').forEach(btn => { btn.onclick = async (e) => { e.stopPropagation(); await toggleFavoriteAnimal(btn.getAttribute('data-id'), user); renderSavedWishlist(container, user); }; });
    grid.querySelectorAll('.btn-view-adoption-profile').forEach(btn => { btn.onclick = () => showAdoptionProfileModal(items.find(i => i.id === btn.getAttribute('data-id')), user); });
  } catch (err) { container.innerHTML = `<p>Failed to read wishlist.</p>`; }
}

async function renderMyApplications(container, user) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;
  try {
    const { data: apps, error } = await supabase.from('adoption_applications').select('*, rescued_animals(pet_name)').eq('applicant_uid', user.uid).order('created_at', { ascending: false });
    if (error) throw error;

    if (!apps || apps.length === 0) {
      container.innerHTML = `<div class="glass-card" style="text-align:center; padding:3rem 1.5rem;"><h3 style="font-family:'Outfit'; font-weight:700;">No Submissions Recorded</h3></div>`;
      return;
    }

    container.innerHTML = `<div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;">
      ${apps.map(app => {
        let badgeColor = 'var(--accent-yellow)', statusText = app.status;
        if (app.status === 'APPROVED') { badgeColor = 'var(--accent-green)'; statusText = 'APPROVED - PENDING CONFIRMATION'; }
        else if (app.status === 'COMPLETED') { badgeColor = '#2a9d8f'; statusText = 'ADOPTION COMPLETED'; }
        else if (app.status === 'REJECTED') { badgeColor = 'var(--accent-red)'; }
        const confirmBtn = app.status === 'APPROVED' ? `<div style="margin-top:1rem; display:flex; justify-content:flex-end;"><button class="btn btn-primary btn-confirm-adoption" data-id="${escapeHTML(app.id)}"><i class="fa-solid fa-circle-check"></i> Confirm Adoption</button></div>` : '';
        return `<div class="glass-card" style="padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.75rem;">
            <h4 style="font-family:'Outfit'; font-weight:700; color:var(--teal); margin:0;">${escapeHTML(app.rescued_animals?.pet_name || 'Companion')}</h4>
            <span class="pet-status-badge safe" style="background:${badgeColor}; position:static; font-size:0.65rem;">${escapeHTML(statusText)}</span>
          </div>
          <span style="font-size:0.7rem; color:var(--text-muted);">Filed: ${formatFriendlyDate(app.created_at)}</span>
          ${confirmBtn}
        </div>`;
      }).join('')}
    </div>`;

    container.querySelectorAll('.btn-confirm-adoption').forEach(btn => {
      btn.onclick = () => showConfirmTransferModal(apps.find(a => a.id === btn.getAttribute('data-id')), user);
    });
  } catch (err) { container.innerHTML = `<p>Failed to load applications.</p>`; }
}

function showConfirmTransferModal(app, user) {
  showModal({
    title: "Accept Ownership Companion",
    bodyHtml: `<div style="padding:0.5rem 0; font-size:0.85rem;"><p>Confirming finalizes adoption for <strong>${escapeHTML(app.rescued_animals?.pet_name || '')}</strong>: creates a live pet profile, transfers custody, closes the application.</p></div>`,
    confirmText: "Confirm & Accept Companion",
    onConfirm: async () => {
      showLoading(true, "Executing transfer...");
      try {
        const { data: animal, error: animalErr } = await supabase.from('rescued_animals').select('*').eq('id', app.animal_id).single();
        if (animalErr || !animal) { showToast("Rescued animal record missing.", "warning"); return true; }

        const { data: newPet, error: petErr } = await supabase.from('pets').insert({
          owner_id: user.uid, name: animal.pet_name, species: animal.species, breed: animal.breed,
          gender: animal.gender, photo_url: animal.photo_url, has_tag: !!animal.assigned_qr_tag_id,
          pawtrace_id: animal.pawtrace_id || animal.assigned_qr_tag_id || null, is_draft: false
        }).select('id').single();
        if (petErr) throw petErr;

        await supabase.from('rescued_animals').update({
          status: 'adopted', adopted_by_uid: user.uid, pet_profile_id: newPet.id
        }).eq('id', animal.id);

        await supabase.from('adoption_applications').update({
          status: 'COMPLETED', resolution_notes: `Adoption finalized. Pet ID: ${newPet.id}.`
        }).eq('id', app.id);

        await supabase.from('notifications').insert({ user_id: user.uid, type: 'STATUS_CHANGE', message: `Congratulations! Ownership transfer for ${animal.pet_name} is complete.`, is_read: false });
        await supabase.from('notifications').insert({ user_id: animal.org_id, type: 'STATUS_CHANGE', message: `Adopter confirmed ownership for ${animal.pet_name}.`, is_read: false });

        showToast(`Congratulations! ${animal.pet_name} is now your companion.`, "success");
        closeModal();
        window.location.hash = '#/pets';
        return false;
      } catch (err) {
        showToast(`Transfer failed: ${err.message || err}`, "error");
        return true;
      } finally { showLoading(false); }
    }
  });
}

async function getSavedFavorites(user) {
  if (!user) {
    const str = localStorage.getItem('pawtrace_anonymous_favorites');
    return str ? JSON.parse(str) : [];
  }
  const { data } = await supabase.from('users').select('adoption_favorites').eq('id', user.uid).single();
  return data?.adoption_favorites || [];
}

async function toggleFavoriteAnimal(animalId, user) {
  if (!user) {
    const str = localStorage.getItem('pawtrace_anonymous_favorites');
    let favs = str ? JSON.parse(str) : [];
    favs = favs.includes(animalId) ? favs.filter(id => id !== animalId) : [...favs, animalId];
    localStorage.setItem('pawtrace_anonymous_favorites', JSON.stringify(favs));
    showToast(favs.includes(animalId) ? "Added to favorites!" : "Removed from favorites.", "info");
    return;
  }
  showLoading(true, "Updating favorites...");
  try {
    const favs = await getSavedFavorites(user);
    const updated = favs.includes(animalId) ? favs.filter(id => id !== animalId) : [...favs, animalId];
    await supabase.from('users').update({ adoption_favorites: updated }).eq('id', user.uid);
    showToast(favs.includes(animalId) ? "Removed from favorites." : "Companion saved to favorites!", "success");
  } catch (err) { showToast("Failed to sync favorites.", "error"); }
  finally { showLoading(false); }
}

export async function renderAdoptionMatcher(container, user) {
  container.innerHTML = `
    <div class="glass-card" style="margin-bottom:1.5rem; margin-top:1rem;">
      <h3 style="font-family:'Outfit'; font-weight:700; color:var(--teal); margin-bottom:0.5rem;">Adoption Compatibility Matcher</h3>
      <div style="display:grid; grid-template-columns:1fr 2fr; gap:1.5rem;">
        <div class="glass-card" style="padding:1rem;">
          <form id="matcher-form" style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.75rem;">
            <div><label>Living Environment</label><select id="match-home" class="form-control"><option value="Apartment">Apartment</option><option value="Independent House">House</option></select></div>
            <label><input type="checkbox" id="match-yard"> Has Fenced Yard</label>
            <div><label>Daily Alone Hours</label><input type="number" id="match-hours" class="form-control" value="4" min="0" max="24"></div>
            <label><input type="checkbox" id="match-kids" checked> Has Children</label>
            <label><input type="checkbox" id="match-pets"> Has Other Pets</label>
            <div><label>Experience</label><select id="match-exp" class="form-control"><option value="First-time">First-time</option><option value="Experienced">Experienced</option></select></div>
            <button type="submit" class="btn" style="background:var(--teal); color:white; border:none; border-radius:var(--radius-sm); padding:6px;">Update Match Score</button>
          </form>
        </div>
        <div><div id="matcher-loading" class="hidden text-center"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--teal);"></i></div><div id="matcher-results" style="display:flex; flex-direction:column; gap:1rem;"></div></div>
      </div>
    </div>
  `;
  document.getElementById('matcher-form').onsubmit = (e) => { e.preventDefault(); evaluateAdoptionMatching(user); };
  evaluateAdoptionMatching(user);
}

async function evaluateAdoptionMatching(user) {
  const resultsBox = document.getElementById('matcher-results');
  const loader = document.getElementById('matcher-loading');
  if (!resultsBox || !loader) return;
  resultsBox.innerHTML = '';
  loader.classList.remove('hidden');

  try {
    const adopter = {
      homeType: document.getElementById('match-home').value,
      hasYard: document.getElementById('match-yard').checked,
      workingHours: parseInt(document.getElementById('match-hours').value) || 0,
      hasChildren: document.getElementById('match-kids').checked,
      hasOtherPets: document.getElementById('match-pets').checked,
      experienceLevel: document.getElementById('match-exp').value
    };

    const { data: rows } = await supabase.from('rescued_animals').select('*').eq('status', 'available').limit(30);
    if (!rows || rows.length === 0) {
      loader.classList.add('hidden');
      resultsBox.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted);" class="text-center">No active adoptable listings found.</p>`;
      return;
    }

    const matches = rows.map(a => {
      const pet = { id: a.id, petName: a.pet_name, breed: a.breed, age: a.age, description: a.description, size: a.size, goodWithChildren: a.good_with_children, goodWithPets: a.good_with_pets, specialNeeds: a.special_needs, type: a.species, photo: a.photo_url };
      return { ...pet, match: runAdoptionCompatibilityScore(adopter, pet) };
    }).sort((a, b) => b.match.score - a.match.score);

    loader.classList.add('hidden');
    // FIX (XSS): petName / description escaped. warnings[] are always
    // fixed app-defined strings (never user input), but escaped anyway
    // for defense-in-depth.
    matches.slice(0, 3).forEach(pet => {
      let badgeColor = pet.match.score < 50 ? 'var(--accent-red)' : pet.match.score < 80 ? 'var(--accent-yellow)' : 'var(--accent-green)';
      resultsBox.innerHTML += `
        <div class="glass-card" style="padding:1rem; border-left:4px solid ${badgeColor};">
          <div class="flex-between"><strong style="font-family:'Outfit'; color:var(--teal);">${escapeHTML(pet.petName)}</strong><span style="font-weight:800; color:${badgeColor};">${pet.match.score}% Match</span></div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.4rem;">${escapeHTML(pet.description || '')}</p>
          ${pet.match.warnings.length > 0 ? `<div style="font-size:0.7rem; background:rgba(239,68,68,0.05); color:var(--accent-red); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); margin-top:0.5rem;">⚠️ ${escapeHTML(pet.match.warnings.join(' '))}</div>` : ''}
          <div style="margin-top:0.5rem; text-align:right;"><button class="btn btn-outline btn-view-adoption-profile-match" data-id="${escapeHTML(pet.id)}" style="font-size:0.7rem;">View Profile</button></div>
        </div>
      `;
    });
    resultsBox.querySelectorAll('.btn-view-adoption-profile-match').forEach(btn => {
      btn.onclick = () => showAdoptionProfileModal(matches.find(i => i.id === btn.getAttribute('data-id')), user);
    });
  } catch (err) { loader.classList.add('hidden'); console.warn("Matcher error:", err); }
}

function runAdoptionCompatibilityScore(adopter, pet) {
  let score = 100; const warnings = [];
  if (adopter.hasChildren && pet.goodWithChildren === false) { score -= 35; warnings.push("Not recommended for households with young children."); }
  if (adopter.hasOtherPets && pet.goodWithPets === false) { score -= 30; warnings.push("Requires sole companion environment."); }
  if (adopter.homeType === 'Apartment' && pet.size === 'Large' && !adopter.hasYard) score -= 20;
  if (pet.specialNeeds === true && adopter.experienceLevel === 'First-time') { score -= 25; warnings.push("Special medical needs require experienced owner."); }
  if (adopter.workingHours > 8) score -= 10;
  return { score: Math.max(score, 0), warnings };
}
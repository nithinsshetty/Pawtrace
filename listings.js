// listings.js — Supabase version
import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate, getPetImageHTML } from './utils.js';
import { Router } from './router.js';

// TODO: services.js not yet migrated — reconnect real showReportModal once it is.
function showReportModal(type, id, user) {
  showToast("Reporting is temporarily unavailable while this module is being upgraded.", "info");
}

export async function createPetListing(sellerUserId, listingData) {
  const { error } = await supabase.from('pet_listings').insert({
    seller_user_id: sellerUserId,
    pet_id: listingData.petId,
    name: listingData.name, breed: listingData.breed, age: listingData.age, gender: listingData.gender,
    price: listingData.price, description: listingData.description, photos: listingData.photos || [],
    status: 'available'
  });
  if (error) throw error;
}

export async function updatePetListingStatus(listingId, status) {
  const { error } = await supabase.from('pet_listings').update({ status, updated_at: new Date().toISOString() }).eq('id', listingId);
  if (error) throw error;
}

export async function getActivePetListings() {
  const { data, error } = await supabase.from('pet_listings').select('*').eq('status', 'available');
  if (error) return [];
  return data || [];
}

let activeListingTab = 'browse';

export async function renderMarketplace() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Pet Marketplace';
  const user = getCurrentUser();
  if (!user) {
    viewport.innerHTML = `<div class="auth-wrapper" style="min-height: calc(100vh - 120px);"><div class="glass-card text-center" style="max-width: 420px; padding: 2rem;"><i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--teal); margin-bottom: 1rem;"></i><h2>Authentication Required</h2><a href="#/login" class="btn btn-primary mt-2">Log In</a></div></div>`;
    return;
  }

  viewport.innerHTML = `
    <div class="glass-card mb-2" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.08) 0%, rgba(219, 93, 57, 0.05) 100%); padding: 1.5rem 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.8rem; color: var(--teal);">Marketplace & Rehoming Board</h2>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Find pets looking for a new family, or list a pet for rehoming safely within the community.</p>
    </div>
    <div class="detail-tabs mb-2" style="display: flex; gap: 0.5rem;">
      <a href="javascript:void(0)" class="tab-link active" id="tab-listings-browse">Browse Listings</a>
      <a href="javascript:void(0)" class="tab-link" id="tab-listings-create">List a Pet</a>
      <a href="javascript:void(0)" class="tab-link" id="tab-listings-my">My Rehoming Posts</a>
    </div>
    <div id="listings-workspace"></div>
  `;

  const tabs = [
    { el: document.getElementById('tab-listings-browse'), name: 'browse' },
    { el: document.getElementById('tab-listings-create'), name: 'create' },
    { el: document.getElementById('tab-listings-my'), name: 'my' }
  ];
  tabs.forEach(tab => {
    if (tab.el) tab.el.onclick = () => {
      tabs.forEach(t => t.el && t.el.classList.remove('active'));
      tab.el.classList.add('active');
      activeListingTab = tab.name;
      switchTab(activeListingTab, user);
    };
  });
  switchTab(activeListingTab, user);
}

function switchTab(tabName, user) {
  const container = document.getElementById('listings-workspace');
  if (!container) return;
  if (tabName === 'browse') renderBrowseListings(container, user);
  else if (tabName === 'create') renderCreateListingForm(container, user);
  else if (tabName === 'my') renderMyListings(container, user);
}

async function renderBrowseListings(container, user) {
  container.innerHTML = `<div id="listings-board-grid" class="pets-grid"><div class="skeleton skeleton-card"></div><div class="skeleton skeleton-card"></div></div>`;
  const board = document.getElementById('listings-board-grid');
  try {
    const listings = await getActivePetListings();
    if (listings.length === 0) {
      board.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><i class="fa-solid fa-store-slash"></i><h3>No active listings found</h3><p>Check back later or post a pet listing if you need support rehoming.</p></div>`;
      return;
    }

    board.innerHTML = '';
    for (const listing of listings) {
      const { data: seller } = await supabase.from('users').select('display_name, email').eq('id', listing.seller_user_id).single();
      const sellerData = seller || { display_name: "Seller", email: "" };

      let petName = listing.name || "Companion";
      let petBreed = listing.breed || "Unknown Breed";
      let petAge = listing.age || "N/A";
      let petGender = listing.gender || "Unknown";
      let imageHTML = `<div style="height:160px; background:#e5e7eb; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-md) var(--radius-md) 0 0; color:var(--text-muted);"><i class="fa-solid fa-paw fa-3x"></i></div>`;

      if (listing.pet_id) {
        const { data: pet } = await supabase.from('pets').select('*').eq('id', listing.pet_id).single();
        if (pet) {
          petName = pet.name; petBreed = pet.breed; petGender = pet.gender || "Unknown";
          if (pet.date_of_birth) {
            const years = Math.abs(new Date(Date.now() - new Date(pet.date_of_birth).getTime()).getUTCFullYear() - 1970);
            petAge = years > 0 ? `${years} years` : 'Infant';
          }
          imageHTML = `<div class="pet-image-container" style="position: relative; height: 160px; border-radius: var(--radius-md) var(--radius-md) 0 0; overflow:hidden;">${getPetImageHTML({ profileImage: pet.photo_url, name: pet.name }, 'large')}</div>`;
        }
      }
      if (listing.photos && listing.photos.length > 0) {
        imageHTML = `<div class="pet-image-container" style="position: relative; height: 160px; border-radius: var(--radius-md) var(--radius-md) 0 0; overflow:hidden;"><img src="${listing.photos[0]}" style="width:100%; height:100%; object-fit:cover;"></div>`;
      }

      const card = document.createElement('div');
      card.className = 'glass-card pet-card';
      card.innerHTML = `
        ${imageHTML}
        <div class="pet-card-content" style="display:flex; flex-direction:column; justify-content:space-between; flex:1;">
          <div>
            <h4 class="pet-card-name" style="font-size:1.2rem; font-weight:800; display:flex; justify-content:space-between; align-items:center; color: var(--teal);">
              <span>${petName}</span><span style="font-size:1rem; color:var(--terracotta);">$${listing.price}</span>
            </h4>
            <div class="pet-card-meta" style="flex-direction:column; gap:0.25rem; align-items:flex-start; margin-top:0.5rem; margin-bottom:0.75rem;">
              <span><strong>Breed:</strong> ${petBreed}</span>
              <span><strong>Gender/Age:</strong> ${petGender} &bull; ${petAge}</span>
              <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-top:0.4rem;">${listing.description || 'No description provided.'}</p>
            </div>
          </div>
          <div style="border-top:1px solid var(--border-glass); padding-top:0.75rem; margin-top:0.5rem;">
            <button class="btn btn-primary btn-full contact-seller-btn" style="font-size:0.8rem; padding:0.5rem;"><i class="fa-solid fa-envelope"></i> Contact Seller (${sellerData.display_name})</button>
            <button class="btn btn-danger btn-full report-listing-btn mt-1" style="font-size:0.75rem; padding:0.3rem 0.5rem; background:transparent; border:1px solid var(--accent-red); color:var(--accent-red);"><i class="fa-solid fa-triangle-exclamation"></i> Flag Post</button>
          </div>
        </div>
      `;

      card.querySelector('.contact-seller-btn').onclick = () => {
        showModal({
          title: `Contact Seller`,
          bodyHtml: `<div class="text-center" style="padding:1rem 0;"><i class="fa-solid fa-address-card fa-3x" style="color:var(--teal); margin-bottom:1rem;"></i><h3>${sellerData.display_name}</h3><p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem;">Email: <strong style="color:var(--text-main);">${sellerData.email}</strong></p></div>`,
          confirmText: "Close", onConfirm: () => { closeModal(); return false; }
        });
      };
      card.querySelector('.report-listing-btn').onclick = () => showReportModal('listing', listing.id, user);
      board.appendChild(card);
    }
  } catch (error) {
    console.error("Error fetching listings:", error);
    board.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><p>Failed to load marketplace listings.</p></div>`;
  }
}

export async function renderCreateListingForm(container, user, prefilledPetId = null) {
  container.innerHTML = '<div class="text-center" style="padding: 2rem;"><i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color: var(--teal);"></i></div>';
  try {
    const { data: pets } = await supabase.from('pets').select('*').eq('owner_id', user.uid);
    let petOptionsHTML = '<option value="">-- Standalone Listing (Not registered) --</option>';
    (pets || []).forEach(pet => {
      const isSelected = prefilledPetId === pet.id ? 'selected' : '';
      petOptionsHTML += `<option value="${pet.id}" ${isSelected}>${pet.name} (${pet.breed})</option>`;
    });

    container.innerHTML = `
      <div style="max-width: 600px; margin: 0 auto;">
        <div class="glass-card" style="padding: 1.5rem;">
          <h3 style="font-family:'Outfit'; font-weight:800; font-size:1.25rem; color: var(--teal); margin-bottom: 0.5rem;">Post Marketplace Rehoming Listing</h3>
          <form id="create-listing-form" style="display:flex; flex-direction:column; gap:1rem;">
            <div class="form-group"><label>Select Pet Companion Profile</label><select id="list-pet-id" class="form-control">${petOptionsHTML}</select></div>
            <div id="standalone-listing-fields">
              <div class="form-group"><label>Pet Name *</label><input type="text" id="list-name" class="form-control"></div>
              <div class="form-group"><label>Breed *</label><input type="text" id="list-breed" class="form-control"></div>
              <div class="form-row">
                <div class="form-group"><label>Age / Life Stage *</label><input type="text" id="list-age" class="form-control"></div>
                <div class="form-group"><label>Gender *</label><select id="list-gender" class="form-control"><option value="Male">Male</option><option value="Female">Female</option><option value="Unknown">Unknown</option></select></div>
              </div>
            </div>
            <div class="form-group"><label>Rehoming Fee ($ USD) *</label><input type="number" id="list-price" class="form-control" min="0" required></div>
            <div class="form-group"><label>Listing Photo URL (Optional)</label><input type="url" id="list-photo" class="form-control"></div>
            <div class="form-group"><label>Listing Description / Reason *</label><textarea id="list-desc" class="form-control" rows="4" required></textarea></div>
            <button type="submit" class="btn btn-primary btn-full mt-1"><i class="fa-solid fa-bullhorn"></i> Publish Listing</button>
          </form>
        </div>
      </div>
    `;

    const selectPet = document.getElementById('list-pet-id');
    const standaloneFields = document.getElementById('standalone-listing-fields');
    const toggleFields = () => {
      const required = !selectPet.value;
      standaloneFields.style.display = required ? 'block' : 'none';
      document.getElementById('list-name').required = required;
      document.getElementById('list-breed').required = required;
      document.getElementById('list-age').required = required;
    };
    selectPet.onchange = toggleFields;
    toggleFields();

    document.getElementById('create-listing-form').onsubmit = async (e) => {
      e.preventDefault();
      const petId = selectPet.value || null;
      const listingData = {
        petId, price: parseFloat(document.getElementById('list-price').value),
        description: document.getElementById('list-desc').value.trim(),
        photos: document.getElementById('list-photo').value.trim() ? [document.getElementById('list-photo').value.trim()] : []
      };
      if (!petId) {
        listingData.name = document.getElementById('list-name').value.trim();
        listingData.breed = document.getElementById('list-breed').value.trim();
        listingData.age = document.getElementById('list-age').value.trim();
        listingData.gender = document.getElementById('list-gender').value;
      }
      showLoading(true, "Publishing listing card...");
      try {
        await createPetListing(user.uid, listingData);
        showToast("Marketplace listing published successfully.", "success");
        activeListingTab = 'my';
        switchTab('my', user);
      } catch (err) {
        showToast("Failed to publish listing.", "error");
      } finally { showLoading(false); }
    };
  } catch (error) {
    container.innerHTML = `<p style="color:var(--accent-red);">Failed to render listing form.</p>`;
  }
}

async function renderMyListings(container, user) {
  container.innerHTML = `<h3 style="font-family:'Outfit'; font-weight:800; font-size:1.2rem; color: var(--teal); margin-bottom: 0.5rem;">Your Marketplace Posts</h3><div id="my-listings-list" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="skeleton skeleton-text"></div></div>`;
  const listEl = document.getElementById('my-listings-list');
  try {
    const { data: listings, error } = await supabase.from('pet_listings').select('*').eq('seller_user_id', user.uid);
    if (error) throw error;
    listEl.innerHTML = '';
    if (!listings || listings.length === 0) {
      listEl.innerHTML = `<div class="empty-state-mini"><p>No marketplace listings published by you.</p></div>`;
      return;
    }
    for (const listing of listings) {
      let name = listing.name || "Companion";
      if (listing.pet_id) {
        const { data: pet } = await supabase.from('pets').select('name').eq('id', listing.pet_id).single();
        if (pet) name = pet.name;
      }
      const div = document.createElement('div');
      div.className = 'glass-card';
      div.style.padding = '1rem';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
          <div><strong style="color:var(--teal);">${name}</strong> - Price: $${listing.price}
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Posted: ${formatFriendlyDate(listing.created_at)}</div>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <span class="pet-status-badge ${listing.status === 'available' ? 'safe' : 'lost'}">${listing.status.toUpperCase()}</span>
            ${listing.status === 'available' ? `<button class="btn btn-outline mark-sold-btn" data-id="${listing.id}" style="font-size:0.75rem; padding:0.4rem 0.8rem;">Mark Sold</button>` : ''}
          </div>
        </div>
      `;
      const soldBtn = div.querySelector('.mark-sold-btn');
      if (soldBtn) soldBtn.onclick = async () => {
        showLoading(true, "Updating status...");
        try { await updatePetListingStatus(listing.id, 'sold'); showToast("Listing marked as sold.", "success"); renderMyListings(container, user); }
        finally { showLoading(false); }
      };
      listEl.appendChild(div);
    }
  } catch (error) {
    listEl.innerHTML = `<p style="color:var(--accent-red); font-size:0.8rem;">Failed to fetch listings.</p>`;
  }
}

export async function renderCreateListing(params) {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'List a Pet';
  const user = getCurrentUser();
  if (!user) {
    viewport.innerHTML = `<div class="auth-wrapper" style="min-height: calc(100vh - 120px);"><div class="glass-card text-center" style="max-width: 420px; padding: 2rem;"><i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--teal); margin-bottom: 1rem;"></i><h2>Authentication Required</h2><a href="#/login" class="btn btn-primary mt-2">Log In</a></div></div>`;
    return;
  }
  viewport.innerHTML = `<div class="glass-card mb-2" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.08) 0%, rgba(219, 93, 57, 0.05) 100%); padding: 1.5rem 2rem;"><h2 style="font-family:'Outfit'; font-weight:800; font-size:1.8rem; color: var(--teal);">Marketplace Listing</h2></div><div id="listings-workspace"></div>`;
  await renderCreateListingForm(document.getElementById('listings-workspace'), user, params ? params.petId : null);
}
// ==========================================================================
// CLIENT-SIDE ADOPTION CENTER MODULE (Browse, Apply, Favorites, Confirm Transfer)
// ==========================================================================

import { db, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { 
  showToast, 
  showLoading, 
  showModal, 
  closeModal, 
  getPetImageHTML, 
  formatFriendlyDate 
} from './utils.js';

let activeSubTab = 'browse';

/**
 * Main render function for Adoption Center
 */
export async function renderAdoptionCenter() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Adoption Center';

  const user = getCurrentUser();

  viewport.innerHTML = `
    <!-- Header Hero Banner -->
    <div class="glass-card mb-2" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.08) 0%, rgba(219, 93, 57, 0.05) 100%); padding: 2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1.5rem;">
        <div>
          <h2 style="font-family:'Outfit'; font-weight:800; font-size:2rem; background: linear-gradient(135deg, var(--teal) 0%, var(--terracotta) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
            Find Your Companion
          </h2>
          <p style="color:var(--text-muted); font-size:0.95rem; margin-top:0.35rem; max-width:600px;">
            Browse rescued animals, track applications, and welcome a new companion to their forever home.
          </p>
        </div>
        <div style="font-size:3.5rem; color:var(--teal); opacity:0.25; padding-right:1rem;">
          <i class="fa-solid fa-heart-pulse"></i>
        </div>
      </div>
    </div>

    <!-- Sub Navigation pills -->
    <div class="glass-card mb-2" style="padding:0.4rem; display:flex; gap:0.5rem; background:rgba(255,255,255,0.2); flex-wrap:wrap;">
      <button class="sub-tab-btn active" data-subtab="browse" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-compass"></i> Browse Animals
      </button>
      <button class="sub-tab-btn" data-subtab="matcher" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Find My Match
      </button>
      <button class="sub-tab-btn" data-subtab="wishlist" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-heart"></i> Favorites Wishlist
      </button>
      <button class="sub-tab-btn" data-subtab="applications" style="flex:1; min-width:110px; padding:0.55rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-folder-heart"></i> My Applications
      </button>
    </div>

    <!-- Active Workspace -->
    <div id="adoptions-workspace"></div>
  `;

  // Bind Subtab controls
  const subBtns = viewport.querySelectorAll('.sub-tab-btn');
  subBtns.forEach(btn => {
    btn.onclick = () => {
      subBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'none';
        b.style.color = 'var(--text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--teal)';
      btn.style.color = 'white';

      activeSubTab = btn.getAttribute('data-subtab');
      switchSubTab(activeSubTab, user);
    };
  });

  // Apply active style
  const initialActive = viewport.querySelector(`.sub-tab-btn[data-subtab="${activeSubTab}"]`);
  if (initialActive) {
    initialActive.classList.add('active');
    initialActive.style.background = 'var(--teal)';
    initialActive.style.color = 'white';
  }

  switchSubTab(activeSubTab, user);
}

/**
 * Handle Switching client tabs
 */
function switchSubTab(subTabName, user) {
  const container = document.getElementById('adoptions-workspace');
  if (!container) return;

  if (subTabName === 'browse') {
    renderBrowseAnimals(container, user);
  } else if (subTabName === 'wishlist') {
    renderSavedWishlist(container, user);
  } else if (subTabName === 'applications') {
    if (!user) {
      renderAdoptionLoginPrompt(container, "Track Adoption Applications");
    } else {
      renderMyApplications(container, user);
    }
  } else if (subTabName === 'matcher') {
    renderAdoptionMatcher(container, user);
  }
}

/**
 * Helper to display auth redirection gates
 */
function renderAdoptionLoginPrompt(container, titleText) {
  container.innerHTML = `
    <div class="glass-card" style="text-align:center; padding:3rem 1.5rem; margin-top:1rem;">
      <i class="fa-solid fa-user-lock" style="font-size:2.5rem; color:var(--terracotta); margin-bottom:1rem; opacity:0.8;"></i>
      <h3 style="font-family:'Outfit'; font-weight:700;">Account Authentication Required</h3>
      <p style="font-size:0.85rem; color:var(--text-muted); max-width:440px; margin:0.5rem auto 1.5rem auto; line-height:1.4;">
        In order to ${titleText.toLowerCase()}, save favorite companions across sessions, or submit adoption questionnaires, you must log in.
      </p>
      <div style="display:flex; justify-content:center; gap:0.5rem;">
        <a href="#/login" class="btn btn-primary">Log In</a>
        <a href="#/signup" class="btn btn-outline">Create Account</a>
      </div>
    </div>
  `;
}

// ==========================================================================
// A. BROWSE ADOPTABLE ANIMALS WORKSPACE
// ==========================================================================
async function renderBrowseAnimals(container, user) {
  container.innerHTML = `
    <!-- Comprehensive Filters Grid -->
    <div class="glass-card mb-2" style="padding:1.25rem; background:rgba(255,255,255,0.15);">
      <h4 style="font-family:'Outfit'; font-weight:700; margin-bottom:0.75rem; font-size:0.95rem;">
        <i class="fa-solid fa-filter"></i> Search Filters
      </h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:0.75rem;">
        
        <!-- Search bar -->
        <div style="grid-column: span 2; position:relative;">
          <input type="text" id="filter-search" class="form-control" placeholder="Search breed, location, behavior..." style="font-size:0.8rem; padding-left:2rem;">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:0.75rem; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.8rem;"></i>
        </div>

        <!-- Species dropdown -->
        <div>
          <select id="filter-species" class="form-control" style="font-size:0.8rem;">
            <option value="ALL">All Species</option>
            <option value="Dog">Dog</option>
            <option value="Cat">Cat</option>
            <option value="Bird">Bird</option>
            <option value="Rabbit">Rabbit</option>
            <option value="Fish">Fish</option>
            <option value="Hamster">Hamster</option>
            <option value="Reptile">Reptile</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <!-- Gender -->
        <div>
          <select id="filter-gender" class="form-control" style="font-size:0.8rem;">
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Unknown">Unknown</option>
          </select>
        </div>

        <!-- Size -->
        <div>
          <select id="filter-size" class="form-control" style="font-size:0.8rem;">
            <option value="ALL">All Sizes</option>
            <option value="Small">Small</option>
            <option value="Medium">Medium</option>
            <option value="Large">Large</option>
          </select>
        </div>

        <!-- Age -->
        <div>
          <select id="filter-age" class="form-control" style="font-size:0.8rem;">
            <option value="ALL">All Ages</option>
            <option value="Kitten/Puppy">Puppy / Kitten</option>
            <option value="Young">Young</option>
            <option value="Adult">Adult</option>
            <option value="Senior">Senior</option>
          </select>
        </div>

        <!-- Health Checklist Filters -->
        <div style="grid-column: span 2; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center; margin-top:0.25rem;">
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer;">
            <input type="checkbox" id="chk-vaccinated"> Vaccinated Only
          </label>
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer; margin-left:0.5rem;">
            <input type="checkbox" id="chk-special"> Special Needs Only
          </label>
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer; margin-left:0.5rem;">
            <input type="checkbox" id="chk-children"> Good with Children
          </label>
          <label style="display:flex; align-items:center; gap:0.35rem; font-size:0.75rem; color:var(--text-muted); cursor:pointer; margin-left:0.5rem;">
            <input type="checkbox" id="chk-pets"> Good with Pets
          </label>
        </div>

      </div>
    </div>

    <!-- Active Listings Grid -->
    <div id="client-adoptions-grid" class="pets-grid">
      <div class="skeleton-container" style="grid-column: span 3;"><div class="skeleton skeleton-card"></div></div>
    </div>
  `;

  // Bind filter events
  const searchEl = document.getElementById('filter-search');
  const speciesEl = document.getElementById('filter-species');
  const genderEl = document.getElementById('filter-gender');
  const sizeEl = document.getElementById('filter-size');
  const ageEl = document.getElementById('filter-age');
  const chkVaccinated = document.getElementById('chk-vaccinated');
  const chkSpecial = document.getElementById('chk-special');
  const chkChildren = document.getElementById('chk-children');
  const chkPets = document.getElementById('chk-pets');

  const onFilterChange = () => {
    loadAdoptableListings(
      user,
      searchEl.value.toLowerCase().trim(),
      speciesEl.value,
      genderEl.value,
      sizeEl.value,
      ageEl.value,
      chkVaccinated.checked,
      chkSpecial.checked,
      chkChildren.checked,
      chkPets.checked
    );
  };

  searchEl.oninput = onFilterChange;
  speciesEl.onchange = onFilterChange;
  genderEl.onchange = onFilterChange;
  sizeEl.onchange = onFilterChange;
  ageEl.onchange = onFilterChange;
  chkVaccinated.onchange = onFilterChange;
  chkSpecial.onchange = onFilterChange;
  chkChildren.onchange = onFilterChange;
  chkPets.onchange = onFilterChange;

  // Initial Load
  loadAdoptableListings(user);
}

/**
 * Fetch and load adoptions list with filters
 */
async function loadAdoptableListings(user, search = '', species = 'ALL', gender = 'ALL', size = 'ALL', age = 'ALL', isVaccinated = false, isSpecial = false, isChildren = false, isPets = false) {
  const grid = document.getElementById('client-adoptions-grid');
  if (!grid) return;

  try {
    const adoptionsSnap = await db.collection('adoptions').where('status', '==', 'available').get();
    grid.innerHTML = '';

    let items = [];
    adoptionsSnap.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });

    // In-memory Filter constraints
    items = items.filter(item => {
      const matchSearch = item.petName.toLowerCase().includes(search) || 
                          (item.breed || '').toLowerCase().includes(search) ||
                          (item.description || '').toLowerCase().includes(search);
      const matchSpecies = species === 'ALL' || (item.type || '').toLowerCase() === species.toLowerCase();
      const matchGender = gender === 'ALL' || item.gender === gender;
      const matchSize = size === 'ALL' || item.size === size;
      const matchAge = age === 'ALL' || (item.ageRange || '').toLowerCase() === age.toLowerCase() || (item.age || '').toLowerCase().includes(age.toLowerCase());
      
      const matchVacc = !isVaccinated || item.vaccinated === true;
      const matchSpec = !isSpecial || item.specialNeeds === true;
      const matchChild = !isChildren || item.goodWithChildren === true;
      const matchPet = !isPets || item.goodWithPets === true;

      return matchSearch && matchSpecies && matchGender && matchSize && matchAge && matchVacc && matchSpec && matchChild && matchPet;
    });

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3; padding: 4rem 2rem;">
          <i class="fa-solid fa-shield-heart" style="font-size:3rem; opacity:0.3;"></i>
          <p>No companions looking for adoption homes match your filters.</p>
        </div>
      `;
      return;
    }

    // Load Favorites list
    const favs = await getSavedFavorites(user);

    items.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'glass-card pet-card magnetic-card';

      const isFav = favs.includes(animal.id);

      card.innerHTML = `
        <div class="pet-image-container" style="position: relative; height:160px;">
          ${getPetImageHTML(animal, 'small')}
          <button class="btn-favorite" data-id="${animal.id}" style="position:absolute; top:10px; right:10px; border:none; background:rgba(255,255,255,0.75); backdrop-filter:blur(4px); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:${isFav ? 'var(--accent-red)' : 'var(--text-muted)'}; transition:all 0.2s;">
            <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" style="font-size:1rem;"></i>
          </button>
          <span class="pet-status-badge safe" style="background:var(--teal)">ADOPTABLE</span>
        </div>
        <div class="pet-card-content" style="padding:1rem;">
          <h4 class="pet-card-name" style="font-family:'Outfit'; font-weight:700; margin-bottom:0.25rem;">${animal.petName}</h4>
          
          <div style="display:flex; gap:0.25rem; flex-wrap:wrap; margin-bottom:0.5rem;">
            <span style="font-size:0.6rem; padding:0.1rem 0.35rem; border-radius:var(--radius-sm); background:rgba(31,122,140,0.08); color:var(--teal); font-weight:600;">${animal.gender}</span>
            <span style="font-size:0.6rem; padding:0.1rem 0.35rem; border-radius:var(--radius-sm); background:rgba(217,93,57,0.08); color:var(--terracotta); font-weight:600;">${animal.size || 'Medium'}</span>
            ${animal.vaccinated ? `<span style="font-size:0.6rem; padding:0.1rem 0.35rem; border-radius:var(--radius-sm); background:rgba(82,183,136,0.08); color:var(--accent-green); font-weight:600;"><i class="fa-solid fa-shield-virus"></i> Vaccinated</span>` : ''}
            ${animal.specialNeeds ? `<span style="font-size:0.6rem; padding:0.1rem 0.35rem; border-radius:var(--radius-sm); background:rgba(230,57,70,0.08); color:var(--accent-red); font-weight:600;"><i class="fa-solid fa-kit-medical"></i> Special Needs</span>` : ''}
          </div>

          <div class="pet-card-meta" style="flex-direction:column; gap:0.25rem; font-size:0.75rem; color:var(--text-muted); border-bottom:1px solid rgba(0,0,0,0.03); padding-bottom:0.5rem; margin-bottom:0.5rem;">
            <span><strong>Breed:</strong> ${animal.breed}</span>
            <span><strong>Age:</strong> ${animal.age}</span>
            <span><strong>Org:</strong> ${animal.orgName}</span>
          </div>

          <button class="btn btn-primary btn-full btn-view-adoption-profile" data-id="${animal.id}">
            <i class="fa-solid fa-file-invoice"></i> View Profile
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Bind Favorite buttons
    grid.querySelectorAll('.btn-favorite').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        await toggleFavoriteAnimal(id, user);
        loadAdoptableListings(user, search, species, gender, size, age, isVaccinated, isSpecial, isChildren, isPets);
      };
    });

    // Bind Profile Viewer
    grid.querySelectorAll('.btn-view-adoption-profile').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const animal = items.find(i => i.id === id);
        showAdoptionProfileModal(animal, user);
      };
    });

  } catch (err) {
    console.error("Listing retrieval failure:", err);
    grid.innerHTML = `<p>Failed to load adoptable companion board.</p>`;
  }
}

/**
 * Detailed Profile Viewer Modal
 */
function showAdoptionProfileModal(animal, user) {
  showModal({
    title: `Adoption Profile: ${animal.petName}`,
    bodyHtml: `
      <div class="grid-split" style="max-height:480px; overflow-y:auto; padding-right:0.25rem;" id="adoptee-profile-modal">
        
        <!-- Left: Image & Quick Stats -->
        <div>
          <div class="pet-image-container mb-2" style="height:150px; border-radius:var(--radius-md); overflow:hidden;">
            ${getPetImageHTML(animal, 'small')}
          </div>
          
          <h4 style="font-family:'Outfit'; font-weight:700; font-size:1.05rem; margin-bottom:0.5rem;">Bio Attributes</h4>
          <div style="font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem; margin-bottom:0.75rem;">
            <span><strong>Species:</strong> ${animal.type || 'Companion'}</span>
            <span><strong>Breed:</strong> ${animal.breed}</span>
            <span><strong>Age:</strong> ${animal.age}</span>
            <span><strong>Gender:</strong> ${animal.gender}</span>
            <span><strong>Size:</strong> ${animal.size || 'Medium'}</span>
          </div>

          <div style="display:flex; flex-direction:column; gap:0.35rem; font-size:0.7rem;">
            <div style="display:flex; justify-content:space-between;">
              <span>Vaccination:</span>
              <span style="font-weight:600; color:${animal.vaccinated ? 'var(--accent-green)' : 'var(--text-muted)'};">
                ${animal.vaccinated ? '<i class="fa-solid fa-circle-check"></i> Vaccinated' : 'Unvaccinated'}
              </span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Special Needs:</span>
              <span style="font-weight:600; color:${animal.specialNeeds ? 'var(--accent-red)' : 'var(--text-muted)'};">
                ${animal.specialNeeds ? '<i class="fa-solid fa-circle-exclamation"></i> Yes' : 'None'}
              </span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Good with Children:</span>
              <span style="font-weight:600; color:${animal.goodWithChildren ? 'var(--accent-green)' : 'var(--text-muted)'};">
                ${animal.goodWithChildren ? '<i class="fa-solid fa-circle-check"></i> Yes' : 'Unknown'}
              </span>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <span>Good with Pets:</span>
              <span style="font-weight:600; color:${animal.goodWithPets ? 'var(--accent-green)' : 'var(--text-muted)'};">
                ${animal.goodWithPets ? '<i class="fa-solid fa-circle-check"></i> Yes' : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        <!-- Right: Description & NGO Metadata -->
        <div>
          <div class="glass-card mb-2" style="padding:0.75rem; background:rgba(31,122,140,0.05); border-color:rgba(31,122,140,0.15);">
            <h5 style="font-family:'Outfit'; font-weight:700; font-size:0.8rem; color:var(--teal); margin-bottom:0.15rem;">Managing Rescue Organization</h5>
            <p style="font-size:0.75rem; font-weight:600;">${animal.orgName}</p>
          </div>

          <h4 style="font-family:'Outfit'; font-weight:700; font-size:1.05rem; margin-bottom:0.4rem;">Personality & Background</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:1.5rem;">
            ${animal.description || 'This animal has no descriptive logs registered.'}
          </p>

          <button id="btn-apply-adopt-modal" class="btn btn-primary btn-full">
            <i class="fa-solid fa-file-invoice"></i> Submit Adoption Application
          </button>
        </div>

      </div>
    `,
    confirmText: "Close Profile",
    onConfirm: () => {
      closeModal();
      return false;
    }
  });

  document.getElementById('btn-apply-adopt-modal').onclick = () => {
    if (!user) {
      closeModal();
      const parentWorkspace = document.getElementById('adoptions-workspace');
      renderAdoptionLoginPrompt(parentWorkspace, "Submit Adoption Applications");
    } else {
      showApplicationFormModal(animal, user);
    }
  };

  const adView = document.getElementById('adoptee-profile-modal');
  if (adView) {
    adView.style.scrollbarWidth = 'thin';
    adView.style.scrollbarColor = 'var(--border-glass) transparent';
  }
}

/**
 * Dialog Form Modal to submit an adoption application
 */
function showApplicationFormModal(animal, user) {
  showModal({
    title: `Apply to Adopt: ${animal.petName}`,
    bodyHtml: `
      <form id="adoption-submit-form" style="display:flex; flex-direction:column; gap:0.85rem; max-height:450px; overflow-y:auto; padding-right:0.25rem;">
        
        <div class="form-row">
          <div class="form-group">
            <label for="app-form-name">Applicant Full Name *</label>
            <input type="text" id="app-form-name" class="form-control" required placeholder="E.g. John Doe" value="${user.displayName || ''}">
          </div>
          <div class="form-group">
            <label for="app-form-phone">Contact Phone *</label>
            <input type="tel" id="app-form-phone" class="form-control" required placeholder="E.g. +91 99002 99002">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="app-form-email">Email Address *</label>
            <input type="email" id="app-form-email" class="form-control" required placeholder="E.g. john@doe.com" value="${user.email || ''}" disabled>
          </div>
          <div class="form-group">
            <label for="app-form-city">City / Location *</label>
            <input type="text" id="app-form-city" class="form-control" required placeholder="E.g. Bengaluru">
          </div>
        </div>

        <div class="form-group">
          <label for="app-form-housing">Housing Type *</label>
          <select id="app-form-housing" class="form-control" required>
            <option value="House">House (with Fenced Yard)</option>
            <option value="Apartment">Apartment / Flat</option>
            <option value="Other">Other / Farm / Condo</option>
          </select>
        </div>

        <div class="form-group">
          <label for="app-form-existing">Existing Pets in Household *</label>
          <input type="text" id="app-form-existing" class="form-control" required placeholder="E.g. 1 senior Golden Retriever, or None.">
        </div>

        <div class="form-group">
          <label for="app-form-exp">Previous Pet Ownership Experience *</label>
          <textarea id="app-form-exp" class="form-control" rows="2" required placeholder="Briefly describe your history raising pets, training, or vet access..."></textarea>
        </div>

        <div class="form-group">
          <label for="app-form-reason">Reason for Adoption *</label>
          <textarea id="app-form-reason" class="form-control" rows="2" required placeholder="Why do you want to welcome this specific animal into your home?"></textarea>
        </div>

      </form>
    `,
    confirmText: "Submit Application",
    onConfirm: async () => {
      const form = document.getElementById('adoption-submit-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const applicantName = document.getElementById('app-form-name').value.trim();
      const applicantPhone = document.getElementById('app-form-phone').value.trim();
      const applicantCity = document.getElementById('app-form-city').value.trim();
      const housingType = document.getElementById('app-form-housing').value;
      const existingPets = document.getElementById('app-form-existing').value.trim();
      const experience = document.getElementById('app-form-exp').value.trim();
      const reason = document.getElementById('app-form-reason').value.trim();

      showLoading(true, "Submitting adoption application...");
      try {
        const batch = db.batch();

        const appRef = db.collection('adoption_applications').doc();
        const applicationId = appRef.id;

        const applicationData = {
          animalId: animal.id,
          animalName: animal.petName,
          applicantName,
          applicantPhone,
          applicantEmail: user.email,
          applicantCity,
          applicantUid: user.uid,
          housingType,
          existingPets,
          experience,
          reason,
          status: 'PENDING',
          homeCheckStatus: 'PENDING',
          orgId: animal.orgId,
          timestamp: fb.firestore.FieldValue.serverTimestamp(),
          ngoNotes: []
        };
        batch.set(appRef, applicationData);

        // Update animal timeline in custody
        const animalRef = db.collection('rescued_animals').doc(animal.id);
        const timelineEvent = {
          event: "Adoption Application Received",
          notes: `Adoption application submitted by candidate ${applicantName} (${applicantCity}). Status set to PENDING.`,
          timestamp: new Date(),
          actor: "System Audit"
        };
        batch.update(animalRef, {
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        // Notify NGO coordinator
        const notifRef = db.collection('users').doc(animal.orgId).collection('notifications').doc();
        batch.set(notifRef, {
          type: 'STATUS_CHANGE',
          message: `New adoption application submitted for ${animal.petName} by ${applicantName}.`,
          read: false,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        showToast("Application submitted successfully!", "success");
        closeModal();
        switchSubTab('applications', user);
        return false;
      } catch (err) {
        console.error("Submission failed:", err);
        showToast(`Adoption application submission failed: ${err.message || err}`, "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });

  const subForm = document.getElementById('adoption-submit-form');
  if (subForm) {
    subForm.style.scrollbarWidth = 'thin';
    subForm.style.scrollbarColor = 'var(--border-glass) transparent';
  }
}

// ==========================================================================
// B. FAVORITES WISHLIST WORKSPACE
// ==========================================================================
async function renderSavedWishlist(container, user) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    const favs = await getSavedFavorites(user);
    if (favs.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:3rem 1.5rem; margin-top:1rem;">
          <i class="fa-regular fa-heart" style="font-size:2.5rem; color:var(--text-muted); opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
          <h3 style="font-family:'Outfit'; font-weight:700;">Your Wishlist is Empty</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:320px; margin:0.25rem auto 0 auto; line-height:1.4;">
            Tap the heart icon on adoptable animal cards to build a favorites collection.
          </p>
        </div>
      `;
      return;
    }

    const items = [];
    const adoptionsSnap = await db.collection('adoptions').where('status', '==', 'available').get();
    adoptionsSnap.forEach(doc => {
      if (favs.includes(doc.id)) {
        items.push({ id: doc.id, ...doc.data() });
      }
    });

    if (items.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:3rem 1.5rem; margin-top:1rem;">
          <i class="fa-solid fa-shield-heart" style="font-size:2.5rem; color:var(--text-muted); opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
          <h3 style="font-family:'Outfit'; font-weight:700;">No Available Matches</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:320px; margin:0.25rem auto 0 auto; line-height:1.4;">
            Your favorited animals may have already been adopted or are no longer available.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div id="wishlist-grid" class="pets-grid"></div>
    `;
    const grid = document.getElementById('wishlist-grid');

    items.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'glass-card pet-card magnetic-card';
      card.innerHTML = `
        <div class="pet-image-container" style="position: relative; height:160px;">
          ${getPetImageHTML(animal, 'small')}
          <button class="btn-remove-favorite" data-id="${animal.id}" style="position:absolute; top:10px; right:10px; border:none; background:rgba(255,255,255,0.75); backdrop-filter:blur(4px); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--accent-red); transition:all 0.2s;">
            <i class="fa-solid fa-heart" style="font-size:1rem;"></i>
          </button>
        </div>
        <div class="pet-card-content" style="padding:1rem;">
          <h4 class="pet-card-name" style="font-family:'Outfit'; font-weight:700; margin-bottom:0.25rem;">${animal.petName}</h4>
          <div class="pet-card-meta" style="flex-direction:column; gap:0.25rem; font-size:0.75rem; color:var(--text-muted); border-bottom:1px solid rgba(0,0,0,0.03); padding-bottom:0.5rem; margin-bottom:0.5rem;">
            <span><strong>Breed:</strong> ${animal.breed}</span>
            <span><strong>Age:</strong> ${animal.age}</span>
          </div>
          <button class="btn btn-primary btn-full btn-view-adoption-profile" data-id="${animal.id}">
            <i class="fa-solid fa-file-invoice"></i> View Profile
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Bind remove favorite
    grid.querySelectorAll('.btn-remove-favorite').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        await toggleFavoriteAnimal(id, user);
        renderSavedWishlist(container, user);
      };
    });

    // Bind profile click
    grid.querySelectorAll('.btn-view-adoption-profile').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const animal = items.find(i => i.id === id);
        showAdoptionProfileModal(animal, user);
      };
    });

  } catch (err) {
    console.error("Wishlist render failure:", err);
    container.innerHTML = `<p>Failed to read wishlist parameters.</p>`;
  }
}

// ==========================================================================
// C. MY APPLICATIONS WORKSPACE (STATUS & ADOPTER CONFIRMATION)
// ==========================================================================
async function renderMyApplications(container, user) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    const appsSnap = await db.collection('adoption_applications')
      .where('applicantUid', '==', user.uid)
      .get();
      
    const applications = [];
    appsSnap.forEach(doc => {
      applications.push({ id: doc.id, ...doc.data() });
    });
    // Sort descending
    applications.sort((a, b) => {
      const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
      const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
      return dateB - dateA;
    });

    if (applications.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="text-align:center; padding:3rem 1.5rem; margin-top:1rem;">
          <i class="fa-solid fa-envelope-open-text" style="font-size:2.5rem; color:var(--text-muted); opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
          <h3 style="font-family:'Outfit'; font-weight:700;">No Submissions Recorded</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:320px; margin:0.25rem auto 0 auto; line-height:1.4;">
            Once you submit an adoption questionnaire for an adoptable pet, status progress cards will render here.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1rem;" id="owner-applications-list">
        ${applications.map(app => {
          let badgeColor = 'var(--accent-yellow)';
          let statusText = app.status;

          if (app.status === 'UNDER_REVIEW') {
            badgeColor = 'var(--teal)';
          } else if (app.status === 'HOME_CHECK_SCHEDULED') {
            badgeColor = '#9b5de5';
            statusText = `HOME CHECK SCHEDULED: ${app.homeCheckDate || 'TBD'}`;
          } else if (app.status === 'APPROVED') {
            badgeColor = 'var(--accent-green)';
            statusText = 'APPROVED - PENDING OWNER CONFIRMATION';
          } else if (app.status === 'COMPLETED') {
            badgeColor = '#2a9d8f';
            statusText = 'ADOPTION FINALIZED & COMPLETED';
          } else if (app.status === 'REJECTED') {
            badgeColor = 'var(--accent-red)';
          }

          let confirmActionBtn = '';
          if (app.status === 'APPROVED') {
            confirmActionBtn = `
              <div style="margin-top:1rem; padding-top:0.75rem; border-top:1px solid rgba(0,0,0,0.05); display:flex; justify-content:flex-end;">
                <button class="btn btn-primary btn-confirm-adoption" data-id="${app.id}">
                  <i class="fa-solid fa-circle-check"></i> Confirm Adoption & Accept Ownership
                </button>
              </div>
            `;
          }

          return `
            <div class="glass-card" style="padding:1.25rem;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem; flex-wrap:wrap; gap:0.5rem;">
                <div>
                  <h4 style="font-family:'Outfit'; font-weight:700; font-size:1.1rem; color:var(--teal); margin:0;">
                    Adoption Application for ${app.animalName}
                  </h4>
                  <span style="font-size:0.7rem; color:var(--text-muted);">Filed: ${formatFriendlyDate(app.timestamp)}</span>
                </div>
                <span class="pet-status-badge safe" style="background:${badgeColor}; position:static; font-size:0.65rem; text-transform:none;">
                  ${statusText}
                </span>
              </div>

              <!-- Application Progress Timeline -->
              <div style="font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem; padding-left:0.5rem; border-left:2px solid var(--border-input); margin-bottom:0.75rem;">
                <span><strong>Home Check Status:</strong> ${app.homeCheckStatus || 'PENDING'}</span>
                ${app.resolutionNotes ? `<span><strong>Resolution Notes:</strong> ${app.resolutionNotes}</span>` : ''}
              </div>

              <!-- NGO Review Notes Roster -->
              ${(app.ngoNotes && app.ngoNotes.length > 0) ? `
                <div style="margin-top:0.5rem; background:rgba(0,0,0,0.01); border:1px solid rgba(0,0,0,0.03); border-radius:var(--radius-sm); padding:0.6rem;">
                  <strong style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase;">NGO Review Comments:</strong>
                  <div style="display:flex; flex-direction:column; gap:0.35rem; margin-top:0.25rem;">
                    ${app.ngoNotes.map(n => `
                      <div style="font-size:0.7rem; line-height:1.2;">
                        <span style="color:var(--text-main); font-weight:600;">"${n.note}"</span> &bull; 
                        <span style="color:var(--text-muted); font-size:0.65rem;">By ${n.author} (${formatFriendlyDate(n.date)})</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${confirmActionBtn}
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind Confirm Adoption buttons
    container.querySelectorAll('.btn-confirm-adoption').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const app = applications.find(a => a.id === id);
        showConfirmTransferModal(app, user);
      };
    });

  } catch (err) {
    console.error("My applications fetching failed:", err);
    container.innerHTML = `<p>Failed to load applications dashboard.</p>`;
  }
}

/**
 * Modal dialogue to perform Adopter Confirmation Ownership Transfer
 */
function showConfirmTransferModal(app, user) {
  showModal({
    title: "Accept Ownership Companion",
    bodyHtml: `
      <div style="padding:0.5rem 0; font-size:0.85rem; line-height:1.45; display:flex; flex-direction:column; gap:0.75rem;">
        <p>
          You are finalizing the adoption for <strong>${app.animalName}</strong>. 
        </p>
        <p style="font-weight:600; color:var(--teal);">
          By confirming, you authorize PawTrace to execute the final Ownership Transfer transaction:
        </p>
        <div style="background:rgba(82,183,136,0.08); border:1px solid rgba(82,183,136,0.15); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.75rem;">
          <ul style="padding-left:1.25rem; display:flex; flex-direction:column; gap:0.3rem;">
            <li>Creates a live, active companion profile for <strong>${app.animalName}</strong> in your Pet Owner portal.</li>
            <li>Links any pre-assigned smart tags to your dashboard account instantly.</li>
            <li>Moves the NGO's custody record status permanently to <strong>ADOPTED</strong> for archive audits.</li>
            <li>Closes this adoption application log as <strong>COMPLETED</strong>.</li>
          </ul>
        </div>
        <p style="font-size:0.75rem; color:var(--text-muted);">
          This completes the formal adoption workflow. Welcome your new companion!
        </p>
      </div>
    `,
    confirmText: "Confirm & Accept Companion",
    onConfirm: async () => {
      showLoading(true, "Executing transaction blocks...");
      try {
        // Fetch rescued animal log details
        const animalDoc = await db.collection('rescued_animals').doc(app.animalId).get();
        if (!animalDoc.exists) {
          showToast("Rescued animal database file missing.", "warning");
          return;
        }
        const animal = animalDoc.data();

        const batch = db.batch();

        // 1. Create live companion document under /pets
        const newPetRef = db.collection('pets').doc();
        const newPetId = newPetRef.id;

        const newPetData = {
          ownerId: user.uid,
          name: animal.name,
          petType: animal.type || 'Dog',
          breed: animal.breed || 'Rescue Mix',
          gender: animal.gender || 'Unknown',
          age: animal.age || '1 Year',
          profileImage: animal.photo || '',
          rescuedAnimalId: animalDoc.id,
          sharedWithVets: [],
          privacySettings: 'private',
          hasTag: animal.assignedQRTagId ? true : false,
          pawTraceId: animal.pawTraceId || animal.assignedQRTagId || '',
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        };
        batch.set(newPetRef, newPetData);

        // 2. Mark rescued animal custody as ADOPTED and link new profile
        const timelineEvent = {
          event: "Adoption Completed",
          notes: `Ownership formally confirmed and accepted by adopter: ${app.applicantName}. Companion profile provisioned under ID: ${newPetId}. Case archived.`,
          timestamp: new Date(),
          actor: app.applicantName
        };

        batch.update(db.collection('rescued_animals').doc(animalDoc.id), {
          intakeStatus: 'ADOPTED',
          adoptedByUid: user.uid,
          petProfileId: newPetId,
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        // 3. Mark Application status as COMPLETED and save audit duration
        const appTimeDuration = Date.now() - (app.timestamp.toDate ? app.timestamp.toDate().getTime() : app.timestamp);
        batch.update(db.collection('adoption_applications').doc(app.id), {
          status: 'COMPLETED',
          completionTimeMs: appTimeDuration,
          resolutionNotes: `Adoption finalized. Companion ID: ${newPetId} generated.`,
          resolutionDate: new Date().toISOString()
        });

        // 4. Delete the public board adoptions listing card (releasing it from catalog)
        batch.delete(db.collection('adoptions').doc(animalDoc.id));

        // 5. Notification to Owner
        batch.set(db.collection('users').doc(user.uid).collection('notifications').doc(), {
          type: 'STATUS_CHANGE',
          message: `Congratulations! Ownership transfer for ${animal.name} is complete. They are now listed under your companions.`,
          read: false,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        // 6. Notification to NGO
        batch.set(db.collection('users').doc(animal.orgId).collection('notifications').doc(), {
          type: 'STATUS_CHANGE',
          message: `Adopter ${app.applicantName} has confirmed ownership for ${animal.name}. Application completed.`,
          read: false,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        showToast(`Congratulations! ${animal.name} is now your companion.`, "success");
        closeModal();
        
        // Redirect to pets companion page
        window.location.hash = '#/pets';
        return false;
      } catch (err) {
        console.error("Ownership transfer error:", err);
        showToast(`Finalizing ownership transfer failed: ${err.message || err}`, "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}


// ==========================================================================
// D. HELPER METHODS: FAVORITES & LOCALSTORAGE SYNC
// ==========================================================================

/**
 * Retrieve saved wishlist IDs
 */
async function getSavedFavorites(user) {
  if (!user) {
    const anonFavsStr = localStorage.getItem('pawtrace_anonymous_favorites');
    return anonFavsStr ? JSON.parse(anonFavsStr) : [];
  }

  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return data.adoptionFavorites || [];
    }
  } catch (err) {
    console.warn("Favs query failed:", err);
  }
  return [];
}

/**
 * Toggle favorite status
 */
async function toggleFavoriteAnimal(animalId, user) {
  if (!user) {
    // Guest favorites stored in LocalStorage
    const anonFavsStr = localStorage.getItem('pawtrace_anonymous_favorites');
    let anonFavs = anonFavsStr ? JSON.parse(anonFavsStr) : [];

    if (anonFavs.includes(animalId)) {
      anonFavs = anonFavs.filter(id => id !== animalId);
      showToast("Removed from favorites wishlist.", "info");
    } else {
      anonFavs.push(animalId);
      showToast("Added to favorites! Log in to sync across devices.", "success");
    }
    localStorage.setItem('pawtrace_anonymous_favorites', JSON.stringify(anonFavs));
    return;
  }

  showLoading(true, "Updating favorites...");
  try {
    const userRef = db.collection('users').doc(user.uid);
    const favs = await getSavedFavorites(user);

    if (favs.includes(animalId)) {
      await userRef.update({
        adoptionFavorites: fb.firestore.FieldValue.arrayRemove(animalId)
      });
      showToast("Removed from favorites wishlist.", "info");
    } else {
      await userRef.update({
        adoptionFavorites: fb.firestore.FieldValue.arrayUnion(animalId)
      });
      showToast("Companion saved to favorites!", "success");
    }
  } catch (err) {
    showToast("Failed to sync favorites.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * ==========================================================================
 * D. ADOPTION COMPATIBILITY MATCHER (Relocated & Customized)
 * ==========================================================================
 */
export async function renderAdoptionMatcher(container, user) {
  container.innerHTML = `
    <div class="glass-card" style="margin-bottom:1.5rem; margin-top:1rem;">
      <h3 style="font-family:'Outfit'; font-weight:700; color:var(--teal); margin-bottom:0.5rem;">Adoption Compatibility Matcher</h3>
      <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.25rem;">
        Fill out your profile lifestyle settings below. The matching engine evaluates compatibility scores against current adoptable companion profiles.
      </p>

      <div style="display:grid; grid-template-columns:1fr 2fr; gap:1.5rem;">
        
        <!-- Adopter Form Column -->
        <div class="glass-card" style="padding:1rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01); height: fit-content;">
          <form id="matcher-form" style="display:flex; flex-direction:column; gap:0.8rem; font-size:0.75rem;">
            
            <div>
              <label style="font-weight:600; display:block; margin-bottom:0.25rem;">Living Environment</label>
              <select id="match-home" class="form-control">
                <option value="Apartment">Apartment</option>
                <option value="Independent House">Independent House</option>
                <option value="Farm">Farm</option>
              </select>
            </div>

            <div style="display:flex; gap:1rem;">
              <label><input type="checkbox" id="match-yard" style="margin-right:0.3rem;">Has Fenced Yard</label>
            </div>

            <div>
              <label style="font-weight:600; display:block; margin-bottom:0.25rem;">Adopter Activity Level</label>
              <select id="match-activity" class="form-control">
                <option value="Low">Low (Quiet walks)</option>
                <option value="Medium" selected>Medium (Standard walks + play)</option>
                <option value="High">High (Jogging / active parks)</option>
              </select>
            </div>

            <div>
              <label style="font-weight:600; display:block; margin-bottom:0.25rem;">Daily Alone Hours</label>
              <input type="number" id="match-hours" class="form-control" value="4" min="0" max="24">
            </div>

            <div style="display:flex; flex-direction:column; gap:0.4rem;">
              <label><input type="checkbox" id="match-kids" style="margin-right:0.3rem;" checked>Has Children (&lt; 12 yrs)</label>
              <label><input type="checkbox" id="match-pets" style="margin-right:0.3rem;">Has Other Pets</label>
            </div>

            <div>
              <label style="font-weight:600; display:block; margin-bottom:0.25rem;">Pet Ownership Experience</label>
              <select id="match-exp" class="form-control">
                <option value="First-time">First-time Owner</option>
                <option value="Experienced">Experienced</option>
              </select>
            </div>

            <button type="submit" class="btn btn-full" style="background:var(--teal); font-size:0.75rem; margin-top:0.5rem; padding:6px 12px; color:white; border:none; border-radius:var(--radius-sm); cursor:pointer;">Update Match Score</button>
          </form>
        </div>

        <!-- Matches Output Column -->
        <div>
          <div id="matcher-loading" class="hidden text-center" style="padding: 2rem 0;">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color:var(--teal);"></i>
          </div>
          <div id="matcher-results" style="display:flex; flex-direction:column; gap:1rem;">
            <!-- Match Cards Populated Here -->
          </div>
        </div>

      </div>
    </div>
  `;

  const form = document.getElementById('matcher-form');
  form.onsubmit = (e) => {
    e.preventDefault();
    evaluateAdoptionMatching(user);
  };

  // Run initial match evaluation
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
      activityLevel: document.getElementById('match-activity').value,
      workingHours: parseInt(document.getElementById('match-hours').value) || 0,
      hasChildren: document.getElementById('match-kids').checked,
      hasOtherPets: document.getElementById('match-pets').checked,
      experienceLevel: document.getElementById('match-exp').value
    };

    // Query active available adoption listings
    const snap = await db.collection('adoptions').where('status', '==', 'available').limit(30).get();
    
    if (snap.empty) {
      loader.classList.add('hidden');
      resultsBox.innerHTML = `
        <p style="font-size:0.8rem; color:var(--text-muted);" class="text-center">No active adoptable listings found. Run sandbox data seeder to test.</p>
      `;
      return;
    }

    const matches = [];
    snap.forEach(doc => {
      const pet = doc.data();
      const calculation = runAdoptionCompatibilityScore(adopter, pet);
      matches.push({ id: doc.id, ...pet, match: calculation });
    });

    // Sort matches by compatibility score descending
    matches.sort((a, b) => b.match.score - a.match.score);

    loader.classList.add('hidden');

    matches.slice(0, 3).forEach(pet => {
      let badgeColor = 'var(--accent-green)';
      if (pet.match.score < 50) badgeColor = 'var(--accent-red)';
      else if (pet.match.score < 80) badgeColor = 'var(--accent-yellow)';

      resultsBox.innerHTML += `
        <div class="glass-card" style="padding:1rem; border-left:4px solid ${badgeColor}; display:flex; flex-direction:column; gap:0.6rem;">
          
          <div class="flex-between">
            <div>
              <strong style="font-size:1rem; font-family:'Outfit'; color:var(--teal);">${pet.petName}</strong>
              <span style="font-size:0.75rem; color:var(--text-muted); margin-left:0.5rem;">${pet.breed} • ${pet.age}</span>
            </div>
            <span style="font-size:1.1rem; font-weight:800; font-family:'Outfit'; color:${badgeColor};">${pet.match.score}% Match</span>
          </div>

          <p style="font-size:0.75rem; line-height:1.4; color:var(--text-muted);">${pet.description || ''}</p>

          <!-- Factors checklist -->
          <div style="font-size:0.7rem; border-top:1px dashed var(--border-glass); padding-top:0.5rem; display:flex; flex-direction:column; gap:0.25rem;">
            ${pet.match.factors.map(f => `
              <div class="flex-between">
                <span>• ${f.detail}</span>
                <strong style="color:${f.val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size:0.65rem;">
                  ${f.val >= 0 ? '+' : ''}${f.val} pts
                </strong>
              </div>
            `).join('')}
          </div>

          ${pet.match.warnings.length > 0 ? `
            <div style="font-size:0.7rem; background:rgba(239,68,68,0.05); color:var(--accent-red); padding:0.4rem 0.6rem; border-radius:var(--radius-sm); font-weight:700;">
              ⚠️ WARNING: ${pet.match.warnings.join(' ')}
            </div>
          ` : ''}

          <div style="margin-top:0.5rem; display:flex; justify-content:flex-end;">
            <button class="btn btn-outline btn-view-adoption-profile-match" data-id="${pet.id}" style="font-size:0.7rem; padding:4px 8px;">
              View Profile Details
            </button>
          </div>
        </div>
      `;
    });

    // View Profile buttons in Match list
    resultsBox.querySelectorAll('.btn-view-adoption-profile-match').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const animal = matches.find(i => i.id === id);
        showAdoptionProfileModal(animal, user);
      };
    });

    resultsBox.innerHTML += `
      <div style="background:var(--bg-app); border:1px solid var(--border-glass); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.7rem; line-height:1.4; margin-top:0.5rem;">
        <strong style="color:var(--teal); display:block; font-size:0.75rem; margin-bottom:0.25rem;"><i class="fa-solid fa-circle-info"></i> EXPLAINABILITY STATEMENT</strong>
        <div>• <strong>Methodology:</strong> Multi-Attribute Utility (MAUT) compatibility weighting calculations matching home constraints to shelter logs.</div>
        <div>• <strong>Confidence:</strong> Medium (subject to adopter self-reporting).</div>
        <div>• <strong>Note:</strong> A high match score is an reference indicator and does not replace a physical verification process.</div>
      </div>
    `;

  } catch (err) {
    loader.classList.add('hidden');
    console.warn("Matcher calculation error:", err);
  }
}

function runAdoptionCompatibilityScore(adopter, pet) {
  let score = 100;
  const factors = [];
  const warnings = [];

  // 1. Social checking: Kids safety
  if (adopter.hasChildren && pet.goodWithChildren === false) {
    score -= 35;
    warnings.push("Not recommended for households with young children.");
    factors.push({ detail: "Safety warning (Kids in household)", val: -35 });
  } else {
    factors.push({ detail: "Child friendly checks passed", val: 10 });
  }

  // 2. Social checking: Other pets compatibility
  if (adopter.hasOtherPets && pet.goodWithPets === false) {
    score -= 30;
    warnings.push("Requires sole companion environment.");
    factors.push({ detail: "Pet socialization restrictions", val: -30 });
  } else {
    factors.push({ detail: "Other pets socialization passed", val: 10 });
  }

  // 3. Apartment check (Large animals penalized in apartment without yard)
  if (adopter.homeType === 'Apartment' && pet.size === 'Large' && !adopter.hasYard) {
    score -= 20;
    factors.push({ detail: "Large pet size is not suited for apartment", val: -20 });
  } else {
    factors.push({ detail: "Space constraints check passed", val: 10 });
  }

  // 4. Special needs matching
  if (pet.specialNeeds === true) {
    if (adopter.experienceLevel === 'First-time') {
      score -= 25;
      warnings.push("Special medical needs require experienced owner.");
      factors.push({ detail: "Special medical needs clash", val: -25 });
    } else {
      factors.push({ detail: "Experienced owner matching medical needs", val: 15 });
    }
  }

  // 5. Working schedule checks
  if (adopter.workingHours > 8) {
    score -= 10;
    factors.push({ detail: "Work hour schedule conflict (pet alone time)", val: -10 });
  }

  return {
    score: Math.max(score, 0),
    factors,
    warnings
  };
}


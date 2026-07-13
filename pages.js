// ==========================================================================
// SPA PAGES RENDERER (Authentication views & Platform-wide indexes)
// ==========================================================================

import { signIn, signUp, getCurrentUser, updateUserProfile, ADMIN_EMAILS } from './auth.js';
import { db, isFirebaseConfigured } from './firebase-config.js';
import { showToast, showLoading, formatFriendlyDate, getPetImageHTML } from './utils.js';
import { Router } from './router.js';

/**
 * Render Split-Screen Login Page
 */
export function renderLogin() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Welcome Back';

  viewport.innerHTML = `
    <div class="auth-split-container">
      <!-- Art/Illustration Side -->
      <div class="auth-art-side">
        <div class="ambient-blob blob-1" style="opacity:0.3;"></div>
        <div class="auth-art-content">
          <a href="#/portfolio" style="text-decoration: none; color: inherit; display: inline-block; transition: transform 0.2s ease; cursor: pointer;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <div class="auth-logo" style="font-size: 4rem;">🐾</div>
            <h2 class="auth-art-title">PawTrace</h2>
          </a>
          <p class="auth-art-subtitle" style="margin-top: 1rem;">
            Keep your beloved companions safe with smart QR recovery tags, centralized medical records, and verified veterinary coordination.
          </p>
        </div>

        <!-- Floating paws decoration -->
        <i class="fa-solid fa-paw floating-paw" style="top:15%; left:20%; animation-delay: 0s;"></i>
        <i class="fa-solid fa-paw floating-paw" style="top:45%; left:80%; animation-delay: 3s;"></i>
        <i class="fa-solid fa-paw floating-paw" style="top:75%; left:30%; animation-delay: 6s;"></i>
      </div>

      <!-- Form Side -->
      <div class="auth-form-side">
        <div class="glass-card auth-card magnetic-card" style="box-shadow: var(--shadow-lg);">
          <div class="auth-header">
            <h2 class="auth-title">Sign In</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Access your dashboard details</p>
          </div>
          
          <form id="login-form">
            <div class="form-group">
              <label for="login-email">Email Address</label>
              <input type="email" id="login-email" class="form-control" placeholder="alex@example.com" required autocomplete="username">
            </div>
            
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" class="form-control" placeholder="••••••••" required autocomplete="current-password">
            </div>
            
            <button type="submit" class="btn btn-primary btn-full">
              <i class="fa-solid fa-arrow-right-to-bracket"></i> Sign In
            </button>
          </form>
          
          <div class="auth-footer">
            Don't have an account? <a href="#/signup" class="text-link">Create one</a>
          </div>

          <div class="portal-entry-links" style="margin-top: 1.5rem; border-top: 1px solid var(--border-glass); padding-top:1.25rem; text-align: center;">
            <a href="#/admin/login" class="text-link" style="font-size:0.8rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:0.35rem;">
              <i class="fa-solid fa-shield-halved"></i> Staff Console / Admin Access
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind submit event
  const form = document.getElementById('login-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    
    try {
      await signIn(email, password);
      
      const user = getCurrentUser();
      if (user) {
        let targetRoute = '/dashboard';
        const role = user.role;
        if (role === 'vet') {
          targetRoute = '/vet-portal';
        } else if (role === 'ngo') {
          targetRoute = '/ngo';
        } else if (role === 'admin' || ADMIN_EMAILS.includes(user.email)) {
          targetRoute = '/admin';
        }
        Router.navigate(targetRoute);
      } else {
        Router.navigate('/dashboard');
      }
    } catch (err) {
      // Handled in auth.js
    }
  };
}

/**
 * Render Split-Screen Signup and Onboarding Page
 */
export function renderSignup() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Create Profile';

  viewport.innerHTML = `
    <div class="auth-split-container">
      <!-- Art Side -->
      <div class="auth-art-side">
        <div class="ambient-blob blob-2" style="opacity:0.3;"></div>
        <div class="auth-art-content">
          <div class="auth-logo" style="font-size: 4rem;">🐾</div>
          <h2 class="auth-art-title">Join Ecosystem</h2>
          <p class="auth-art-subtitle">
            Secure digital collar identifiers, active scanning notification GPS logs, and instant sharing permissions for sitters and clinics.
          </p>
        </div>
        <i class="fa-solid fa-paw floating-paw" style="top:25%; left:15%; animation-delay: 1s;"></i>
        <i class="fa-solid fa-paw floating-paw" style="top:55%; left:70%; animation-delay: 4s;"></i>
        <i class="fa-solid fa-paw floating-paw" style="top:80%; left:25%; animation-delay: 7s;"></i>
      </div>

      <!-- Form Side -->
      <div class="auth-form-side">
        <div class="glass-card auth-card magnetic-card" style="box-shadow: var(--shadow-lg);">
          <div class="auth-header">
            <h2 class="auth-title">Sign Up</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Create your secure profile credentials</p>
          </div>

          <form id="signup-form">
            <div class="form-group">
              <label for="signup-name">Your Full Name</label>
              <input type="text" id="signup-name" class="form-control" placeholder="Alex Mercer" required autocomplete="name">
            </div>
            
            <div class="form-group">
              <label for="signup-email">Email Address</label>
              <input type="email" id="signup-email" class="form-control" placeholder="alex@example.com" required autocomplete="username">
            </div>

            <div class="form-group">
              <label>Select Your Platform Role</label>
              <div class="role-selection">
                <div class="role-card selected" data-role="owner">
                  <i class="fa-solid fa-user-large"></i>
                  <span class="role-card-title">Pet Owner</span>
                </div>
                <div class="role-card" data-role="vet">
                  <i class="fa-solid fa-user-doctor"></i>
                  <span class="role-card-title">Veterinarian</span>
                </div>
                <div class="role-card" data-role="ngo">
                  <i class="fa-solid fa-house-chimney-medical"></i>
                  <span class="role-card-title">NGO Rescue</span>
                </div>
              </div>
            </div>

            <!-- Veterinarian Fields -->
            <div id="signup-vet-fields" class="form-group hidden">
              <label for="signup-license">Veterinary License Number</label>
              <input type="text" id="signup-license" class="form-control" placeholder="VET-123456">
            </div>

            <!-- NGO Fields -->
            <div id="signup-ngo-fields" class="form-group hidden">
              <label for="signup-reg">NGO Accreditation ID</label>
              <input type="text" id="signup-reg" class="form-control" placeholder="NGO-987654">
            </div>
            
            <div class="form-group">
              <label for="signup-password">Password (min 6 chars)</label>
              <input type="password" id="signup-password" class="form-control" placeholder="••••••••" required autocomplete="new-password">
            </div>
            
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="signup-confirm">Confirm Password</label>
              <input type="password" id="signup-confirm" class="form-control" placeholder="••••••••" required autocomplete="new-password">
            </div>
            
            <button type="submit" class="btn btn-secondary btn-full">
              <i class="fa-solid fa-user-plus"></i> Create Account
            </button>
          </form>
          
          <div class="auth-footer">
            Already have an account? <a href="#/login" class="text-link">Sign in</a>
          </div>
        </div>
      </div>
    </div>
  `;

  let selectedRole = 'owner';
  const roleCards = viewport.querySelectorAll('.role-card');
  const vetFields = viewport.querySelector('#signup-vet-fields');
  const ngoFields = viewport.querySelector('#signup-ngo-fields');
  const licenseInput = viewport.querySelector('#signup-license');
  const regInput = viewport.querySelector('#signup-reg');

  roleCards.forEach(card => {
    card.onclick = () => {
      roleCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedRole = card.getAttribute('data-role');

      if (selectedRole === 'vet') {
        vetFields.classList.remove('hidden');
        licenseInput.required = true;
        ngoFields.classList.add('hidden');
        regInput.required = false;
      } else if (selectedRole === 'ngo') {
        ngoFields.classList.remove('hidden');
        regInput.required = true;
        vetFields.classList.add('hidden');
        licenseInput.required = false;
      } else {
        vetFields.classList.add('hidden');
        ngoFields.classList.add('hidden');
        licenseInput.required = false;
        regInput.required = false;
      }
    };
  });

  // Bind submit event
  const form = document.getElementById('signup-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;

    if (password !== confirmPassword) {
      showToast("Passwords do not match.", "warning");
      return;
    }

    try {
      await signUp(email, password, name, { role: selectedRole });
      
      let targetRoute = '/dashboard';
      if (selectedRole === 'vet') {
        targetRoute = '/vet-portal';
      } else if (selectedRole === 'ngo') {
        targetRoute = '/ngo';
      }
      Router.navigate(targetRoute);
    } catch (err) {
      // Handled in auth.js
    }
  };
}

/**
 * Render Owner Dashboard
 */
export async function renderDashboard() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Dashboard';

  const user = getCurrentUser();
  if (!user) return;

  // Render base shell with skeleton load indicators
  viewport.innerHTML = `
    <div class="dashboard-grid">
      <div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; margin-bottom: 1.5rem;">
          Welcome back, ${user.displayName || user.email.split('@')[0]}!
        </h2>
        
        <!-- Metrics Bar -->
        <div class="metric-grid">
          <div class="glass-card metric-card">
            <div class="metric-icon teal"><i class="fa-solid fa-paw"></i></div>
            <div class="metric-details">
              <span id="metric-total-pets" class="metric-value">...</span>
              <span class="metric-label">Registered Pets</span>
            </div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-icon terracotta"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="metric-details">
              <span id="metric-safe-pets" class="metric-value">...</span>
              <span class="metric-label">Safe & Tracked</span>
            </div>
          </div>
          <div class="glass-card metric-card">
            <div class="metric-icon yellow"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="metric-details">
              <span id="metric-lost-pets" class="metric-value">...</span>
              <span class="metric-label">Lost Reports</span>
            </div>
          </div>
        </div>

        <!-- Main Pet Summary Cards -->
        <div class="flex-between mb-2">
          <h3 style="font-weight: 700;">Your Companions</h3>
          <a href="#/pets" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
            Manage Pets <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>
        <div id="dashboard-pets-container" class="pets-grid">
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>

      <!-- Sidebar widgets -->
      <div>
        <h3 style="font-weight: 700; margin-bottom: 1.5rem;">Active Tracking Map</h3>
        <div class="glass-card mb-2" style="padding: 1.25rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem; color: var(--terracotta);">
            Lost & Found Direct
          </h4>
          <p style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; margin-bottom: 1rem;">
            If your pet goes missing, mark them as LOST. Anyone who scans their QR tag will instantly share their location coordinates.
          </p>
          <a href="#/lost-pets" class="btn btn-secondary btn-full" style="font-size: 0.85rem; padding: 0.6rem;">
            <i class="fa-solid fa-bullhorn"></i> View Public Missing Board
          </a>
        </div>

        <h3 style="font-weight: 700; margin-top: 2rem; margin-bottom: 1rem;">Recent Scan Locations</h3>
        <div id="dashboard-scans-list" class="glass-card" style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="empty-state-mini">
            <i class="fa-solid fa-map-location-dot"></i>
            <p>No recent scans logged.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Fetch Firestore Stats if configured
  if (!db) {
    // Unconfigured offline mockup
    document.getElementById('metric-total-pets').textContent = '0';
    document.getElementById('metric-safe-pets').textContent = '0';
    document.getElementById('metric-lost-pets').textContent = '0';
    document.getElementById('dashboard-pets-container').innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-paw"></i>
        <p>Your database is not configured. Register Firebase credentials to start tracking pets.</p>
      </div>
    `;
    return;
  }

  showLoading(true, "Syncing dashboard data...");
  try {
    const petSnapshot = await db.collection('pets').where('ownerId', '==', user.uid).get();
    
    let total = petSnapshot.size;
    let lost = 0;
    let safe = 0;

    const petsListContainer = document.getElementById('dashboard-pets-container');
    petsListContainer.innerHTML = '';

    if (petSnapshot.empty) {
      document.getElementById('metric-total-pets').textContent = '0';
      document.getElementById('metric-safe-pets').textContent = '0';
      document.getElementById('metric-lost-pets').textContent = '0';
      petsListContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-shield-heart"></i>
          <h3>No companions registered</h3>
          <p>Create a secure profile with dynamic QR recovery codes for your pet.</p>
          <a href="#/pets" class="btn btn-primary mt-1"><i class="fa-solid fa-plus"></i> Add First Pet</a>
        </div>
      `;
    } else {
      petSnapshot.forEach((doc) => {
        const pet = doc.data();
        pet.id = doc.id;
        
        if (pet.lostStatus === 'LOST') {
          lost++;
        } else {
          safe++;
        }

        const card = document.createElement('div');
        card.className = 'glass-card pet-card';
        card.innerHTML = `
          <div class="pet-image-container" style="position: relative;">
            ${getPetImageHTML(pet, 'small')}
            <span class="pet-status-badge ${pet.lostStatus === 'LOST' ? 'lost' : 'safe'}">
              ${pet.lostStatus || 'SAFE'}
            </span>
          </div>
          <div class="pet-card-content">
            <h4 class="pet-card-name">${pet.name}</h4>
            <div class="pet-card-meta">
              <span><i class="fa-solid fa-dna"></i> ${pet.breed || 'Unknown'}</span>
              <span>•</span>
              <span><i class="fa-solid fa-cake-candles"></i> ${pet.age || 'N/A'}</span>
            </div>
            <div class="pet-card-actions">
              <a href="#/pet/${pet.id}" class="btn btn-secondary btn-full" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
                <i class="fa-solid fa-folder-open"></i> Open Profile
              </a>
            </div>
          </div>
        `;
        petsListContainer.appendChild(card);
      });

      document.getElementById('metric-total-pets').textContent = total;
      document.getElementById('metric-safe-pets').textContent = safe;
      document.getElementById('metric-lost-pets').textContent = lost;
    }

    // Load recent scan logs across all pets belonging to owner
    const scansList = document.getElementById('dashboard-scans-list');
    
    // Fetch notifications representing scans
    const notifySnapshot = await db.collection('users').doc(user.uid).collection('notifications')
      .where('type', '==', 'QR_SCAN')
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();
      
    if (!notifySnapshot.empty) {
      scansList.innerHTML = '';
      notifySnapshot.forEach((doc) => {
        const data = doc.data();
        const scanItem = document.createElement('div');
        scanItem.className = 'geo-panel';
        scanItem.style.padding = '0.75rem';
        scanItem.style.fontSize = '0.8rem';
        scanItem.innerHTML = `
          <div style="font-weight: 700; color: var(--terracotta); display: flex; align-items: center; justify-content: space-between;">
            <span><i class="fa-solid fa-location-dot"></i> Scan Logged</span>
            <span style="font-size: 0.65rem; color: var(--text-muted);">${formatFriendlyDate(data.timestamp)}</span>
          </div>
          <p style="margin: 0.25rem 0;">${data.message}</p>
          ${data.mapsLink ? `
            <a href="${data.mapsLink}" target="_blank" class="btn btn-outline" style="font-size: 0.7rem; padding: 0.35rem 0.75rem; width: fit-content; margin-top: 0.25rem;">
              <i class="fa-solid fa-map-location-dot"></i> Maps Directions
            </a>
          ` : ''}
        `;
        scansList.appendChild(scanItem);
      });
    }

  } catch (error) {
    console.error("Dashboard Sync Error:", error);
    showToast("Failed to fetch current pet metrics.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Render Profile Management Page
 */
export function renderProfile() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Account Profile';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div class="glass-card" style="max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="width: 100px; height: 100px; border-radius: var(--radius-full); overflow: hidden; margin: 0 auto 1rem; border: 3px solid var(--teal);">
          <img src="${user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid}" style="width:100%; height:100%; object-fit: cover;" alt="Avatar">
        </div>
        <h2 style="font-weight: 700;">${user.displayName || 'PawTrace User'}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">${user.email}</p>
      </div>

      <form id="profile-edit-form">
        <div class="form-group">
          <label for="profile-name">Display Name</label>
          <input type="text" id="profile-name" class="form-control" value="${user.displayName || ''}" placeholder="Full Name" required autocomplete="name">
        </div>
        
        <div class="form-group">
          <label for="profile-email">Email Address (Read-only)</label>
          <input type="email" id="profile-email" class="form-control" value="${user.email}" readonly disabled autocomplete="username">
        </div>

        <button type="submit" class="btn btn-primary btn-full mt-2">
          <i class="fa-solid fa-floppy-disk"></i> Save Changes
        </button>
      </form>
    </div>
  `;

  // Bind submit event
  const form = document.getElementById('profile-edit-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    try {
      await updateUserProfile(name);
      // Force Sidebar rename refresh
      const sidebarName = document.getElementById('sidebar-user-name');
      if (sidebarName) sidebarName.textContent = name;
    } catch (err) {
      // Handled inside auth.js
    }
  };
}

/**
 * Render Settings Page
 */
export function renderSettings() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Platform Settings';

  viewport.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem;">
      
      <!-- Core Theme Config Card -->
      <div class="glass-card">
        <h3 style="font-weight: 700; margin-bottom: 1rem;"><i class="fa-solid fa-palette" style="color: var(--teal);"></i> Appearance Settings</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Configure how PawTrace looks on your browser layout.</p>
        <div class="flex-between" style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
          <div>
            <strong>Dark Color Scheme</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Reduce strain in low-light environments.</p>
          </div>
          <button id="settings-theme-toggle" class="btn btn-outline">
            Toggle Theme
          </button>
        </div>
      </div>

      <!-- Developer Database Diagnostic Card -->
      <div class="glass-card">
        <h3 style="font-weight: 700; margin-bottom: 1rem;"><i class="fa-solid fa-database" style="color: var(--terracotta);"></i> Database Connection Diagnostic</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Verify Firebase v8 API connections parameters.</p>
        <div id="connection-status-box" style="padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
          <!-- Loading or evaluation -->
          Fetching status...
        </div>
      </div>
      
    </div>
  `;

  // Bind settings theme toggle
  const themeBtn = document.getElementById('settings-theme-toggle');
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.getElementById('theme-toggle').click();
    };
  }

  // Populate connection check status
  const statusBox = document.getElementById('connection-status-box');
  if (isFirebaseConfigured) {
    statusBox.style.background = 'rgba(82, 183, 136, 0.08)';
    statusBox.style.borderColor = 'var(--accent-green)';
    statusBox.innerHTML = `
      <div style="display:flex; gap:0.5rem; align-items:center; color: var(--accent-green);">
        <i class="fa-solid fa-circle-check"></i> <strong>Firebase Configured</strong>
      </div>
      <p style="font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4;">
        Core Firestore services, Authentication and Storage buckets are connected to your cloud instance.
      </p>
    `;
  } else {
    statusBox.style.background = 'rgba(244, 208, 104, 0.08)';
    statusBox.style.borderColor = 'var(--accent-yellow)';
    statusBox.innerHTML = `
      <div style="display:flex; gap:0.5rem; align-items:center; color: #c99a00;">
        <i class="fa-solid fa-triangle-exclamation"></i> <strong>Firebase Not Configured</strong>
      </div>
      <p style="font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4;">
        Running on fallback mode. Please configure <code>firebase-config.js</code> with actual API keys to allow data storage operations.
      </p>
    `;
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
  `;

  const board = document.getElementById('lost-pets-board');

  if (!db) {
    board.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-database"></i>
        <p>Database config missing. Unable to fetch missing pets list.</p>
      </div>
    `;
    return;
  }

  showLoading(true, "Loading missing pet alerts...");
  try {
    // Query platform-wide index of pets marked as 'LOST'
    const snapshot = await db.collection('pets').where('lostStatus', '==', 'LOST').get();
    board.innerHTML = '';

    if (snapshot.empty) {
      board.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-circle-check" style="color: var(--accent-green);"></i>
          <h3>No missing pet reports!</h3>
          <p>All pets are safely tracked with their owners.</p>
        </div>
      `;
      return;
    }

    snapshot.forEach((doc) => {
      const pet = doc.data();
      pet.id = doc.id;

      const card = document.createElement('div');
      card.className = 'glass-card pet-card';
      card.innerHTML = `
        <div class="pet-image-container" style="position: relative;">
          ${getPetImageHTML(pet, 'small')}
          <span class="pet-status-badge lost">MISSING</span>
        </div>
        <div class="pet-card-content">
          <h4 class="pet-card-name">${pet.name}</h4>
          <div class="pet-card-meta" style="flex-direction: column; gap: 0.25rem;">
            <span><strong>Breed:</strong> ${pet.breed || 'Unknown'}</span>
            <span><strong>Last seen DOB/Age:</strong> ${pet.age || 'N/A'}</span>
            <span style="color: var(--accent-red); margin-top: 0.25rem;">
              <i class="fa-solid fa-circle-exclamation"></i> Emergency Contact: ${pet.emergencyContact || 'N/A'}
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

  } catch (error) {
    console.error("Error loading lost board:", error);
    showToast("Failed to fetch lost pets index.", "error");
    board.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-xmark" style="color: var(--accent-red);"></i>
        <p>Error loading records. Please verify Firestore rules configuration.</p>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

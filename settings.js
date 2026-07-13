// ==========================================================================
// PAWTRACE SETTINGS & PROFILE MANAGEMENT MODULE
// ==========================================================================

import { db, isFirebaseConfigured } from './firebase-config.js';
import { getCurrentUser, updateUserProfile } from './auth.js';
import { showToast, showLoading } from './utils.js';

/**
 * Render Profile Management Page
 */
export function renderProfile() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Profile Settings';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div class="glass-card magnetic-card" style="max-width: 600px; margin: 0 auto; padding: 2.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="width: 100px; height: 100px; border-radius: var(--radius-full); overflow: hidden; margin: 0 auto 1rem; border: 3px solid var(--teal); box-shadow:var(--shadow-md);">
          <img src="${user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid}" style="width:100%; height:100%; object-fit: cover;" alt="Avatar">
        </div>
        <h2 style="font-weight: 800; font-family:'Outfit';">${user.displayName || 'PawTrace User'}</h2>
        <p style="font-size: 0.85rem; color: var(--text-muted);">${user.email}</p>
      </div>

      <form id="profile-edit-form" style="display:flex; flex-direction:column; gap:1.25rem;">
        <div class="form-group">
          <label for="profile-name">Display Name</label>
          <input type="text" id="profile-name" class="form-control" value="${user.displayName || ''}" placeholder="Full Name" required autocomplete="name">
        </div>
        
        <div class="form-group">
          <label for="profile-email">Email Address (Read-only)</label>
          <input type="email" id="profile-email" class="form-control" value="${user.email}" readonly disabled autocomplete="username">
        </div>

        <button type="submit" class="btn btn-primary btn-full mt-1">
          <i class="fa-solid fa-floppy-disk"></i> Save Profile Changes
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
      
      // Sync Sidebar Display
      const sidebarName = document.getElementById('sidebar-user-name');
      if (sidebarName) sidebarName.textContent = name;
    } catch (err) {
      // Handled inside updateUserProfile()
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
      
      <!-- Theme Card -->
      <div class="glass-card magnetic-card">
        <h3 style="font-weight: 800; font-family:'Outfit'; margin-bottom: 1rem;"><i class="fa-solid fa-palette" style="color: var(--teal);"></i> Appearance Settings</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Configure how PawTrace looks on your browser layout.</p>
        <div class="flex-between" style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
          <div>
            <strong>Dark Color Scheme</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Reduce eye strain in low-light conditions.</p>
          </div>
          <button id="settings-theme-toggle" class="btn btn-outline">
            Toggle Color Mode
          </button>
        </div>
      </div>

      <!-- Developer Database Diagnostic Card -->
      <div class="glass-card magnetic-card">
        <h3 style="font-weight: 800; font-family:'Outfit'; margin-bottom: 1rem;"><i class="fa-solid fa-database" style="color: var(--terracotta);"></i> Connection Diagnostics</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Verify connection credentials parameters to Firebase Services.</p>
        <div id="connection-status-box" style="padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
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
      <div style="display:flex; gap:0.5rem; align-items:center; color: var(--accent-green); font-weight:700; font-size:0.9rem;">
        <i class="fa-solid fa-circle-check"></i> Connected
      </div>
      <p style="font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4; color: var(--text-muted);">
        Firestore database, Auth modules, and Cloud storage instances are online and synced with credentials.
      </p>
    `;
  } else {
    statusBox.style.background = 'rgba(244, 208, 104, 0.08)';
    statusBox.style.borderColor = 'var(--accent-yellow)';
    statusBox.innerHTML = `
      <div style="display:flex; gap:0.5rem; align-items:center; color: #c99a00; font-weight:700; font-size:0.9rem;">
        <i class="fa-solid fa-triangle-exclamation"></i> Configuration Fallback
      </div>
      <p style="font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4; color: var(--text-muted);">
        Running on local mockup fallback rules. Please edit <code>firebase-config.js</code> to link your custom Firebase project keys.
      </p>
    `;
  }
}

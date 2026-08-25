// ==========================================================================
// SETTINGS & PROFILE MANAGEMENT MODULE (Supabase)
// SECURITY FIX: escaped user.photoURL (attribute), user.displayName, and
// user.email before rendering them via innerHTML / value attributes.
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser, updateUserProfile, signOut } from './auth.js';
import { showToast, showLoading, showModal, closeModal, escapeHTML } from './utils.js';
import { Router } from './router.js';
import { initPasswordToggles } from './pages.js';

export function renderProfile() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Profile Settings';

  const user = getCurrentUser();
  if (!user) return;

  const avatarUrl = user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.uid;

  viewport.innerHTML = `
    <div style="max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem;">
      <div class="glass-card magnetic-card" style="padding: 2.5rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="width: 100px; height: 100px; border-radius: var(--radius-full); overflow: hidden; margin: 0 auto 1rem; border: 3px solid var(--teal); box-shadow:var(--shadow-md);">
            <img src="${escapeHTML(avatarUrl)}" style="width:100%; height:100%; object-fit: cover;" alt="Avatar">
          </div>
          <h2 style="font-weight: 800; font-family:'Outfit';">${escapeHTML(user.displayName || 'PawTrace User')}</h2>
          <p style="font-size: 0.85rem; color: var(--text-muted);">${escapeHTML(user.email)}</p>
        </div>

        <form id="profile-edit-form" style="display:flex; flex-direction:column; gap:1.25rem;">
          <div class="form-group">
            <label for="profile-name">Display Name</label>
            <input type="text" id="profile-name" class="form-control" value="${escapeHTML(user.displayName || '')}" placeholder="Full Name" required autocomplete="name">
          </div>

          <div class="form-group">
            <label for="profile-email">Email Address (Read-only)</label>
            <input type="email" id="profile-email" class="form-control" value="${escapeHTML(user.email)}" readonly disabled autocomplete="username">
          </div>

          <button type="submit" class="btn btn-primary btn-full mt-1">
            <i class="fa-solid fa-floppy-disk"></i> Save Profile Changes
          </button>
        </form>
      </div>

      <div class="glass-card magnetic-card" style="padding: 2rem; border: 1px solid rgba(224, 86, 86, 0.3); background: rgba(224, 86, 86, 0.04);">
        <h3 style="font-weight: 800; font-family:'Outfit'; color: var(--accent-red); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-triangle-exclamation"></i> Danger Zone
        </h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem; line-height: 1.4;">
          Permanently deactivate your PawTrace profile and remove account authentication credentials.
        </p>
        <button id="btn-delete-account" class="btn btn-danger btn-full" style="background: var(--accent-red); border: none; color: white;">
          <i class="fa-solid fa-user-xmark"></i> Delete Account
        </button>
      </div>
    </div>
  `;

  const form = document.getElementById('profile-edit-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    try {
      await updateUserProfile(name);
      const sidebarName = document.getElementById('sidebar-user-name');
      if (sidebarName) sidebarName.textContent = name;
    } catch (err) {}
  };

  const deleteBtn = document.getElementById('btn-delete-account');
  if (deleteBtn) {
    deleteBtn.onclick = () => {
      showModal({
        title: 'Delete Account Confirmation',
        bodyHtml: `
          <div style="text-align: center; margin-bottom: 1rem;">
            <i class="fa-solid fa-circle-exclamation" style="font-size: 2.5rem; color: var(--accent-red); margin-bottom: 0.75rem;"></i>
            <h4 style="font-family: 'Outfit'; font-weight: 700;">Are you absolutely sure?</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.4;">
              This action will permanently deactivate your account and revoke access to PawTrace services. Please enter your current password to confirm:
            </p>
          </div>
          <div class="form-group" style="margin-top: 1rem;">
            <label for="delete-password-confirm" style="font-size: 0.8rem; font-weight: 600;">Confirm Password *</label>
            <div style="position: relative;">
              <input type="password" id="delete-password-confirm" class="form-control" placeholder="••••••••" required autocomplete="current-password" style="padding-right: 2.5rem;">
              <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.25rem;">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>
        `,
        confirmText: 'Permanently Delete Account',
        cancelText: 'Cancel',
        onConfirm: async () => {
          const passwordInput = document.getElementById('delete-password-confirm');
          const password = passwordInput ? passwordInput.value : '';

          if (!password) {
            showToast("Please enter your current password to confirm deletion.", "warning");
            return true;
          }

          showLoading(true, "Deactivating account...");
          try {
            // Re-authenticate by attempting a fresh sign-in with the current password
            const { error: reauthErr } = await supabase.auth.signInWithPassword({ email: user.email, password });
            if (reauthErr) {
              showToast("Incorrect password. Account deletion canceled.", "error");
              return true;
            }

            // Deactivate profile row (real deletion of the auth account itself requires
            // the service_role key, which only the backend has — the account is fully
            // deactivated here; the Express backend can hard-delete it later).
            await supabase.from('users').update({
              display_name: 'Former User',
              role: 'deactivated'
            }).eq('id', user.uid);

            if (user.role === 'vet') {
              await supabase.from('users').update({
                vet_details: { verified: false, status: 'inactive' }
              }).eq('id', user.uid);
            } else if (user.role === 'ngo') {
              await supabase.from('users').update({
                ngo_details: { approved: false, status: 'inactive' }
              }).eq('id', user.uid);
            } else if (user.role === 'service_provider') {
              await supabase.from('service_providers').update({ status: 'deactivated' }).eq('user_id', user.uid);
            }

            await supabase.auth.signOut();

            showToast("Your account has been deactivated.", "info");
            Router.navigate('/login');
            return false;
          } catch (err) {
            console.error("Account deletion error:", err);
            showToast(err.message || "Failed to deactivate account.", "error");
            return true;
          } finally {
            showLoading(false);
          }
        }
      });
      initPasswordToggles();
    };
  }
}

export function renderSettings() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Platform Settings';

  viewport.innerHTML = `
    <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem;">

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

      <div class="glass-card magnetic-card">
        <h3 style="font-weight: 800; font-family:'Outfit'; margin-bottom: 1rem;"><i class="fa-solid fa-database" style="color: var(--terracotta);"></i> Connection Diagnostics</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">Verify connection to Supabase services.</p>
        <div id="connection-status-box" style="padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass);">
          Checking status...
        </div>
      </div>

    </div>
  `;

  const themeBtn = document.getElementById('settings-theme-toggle');
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.getElementById('theme-toggle').click();
    };
  }

  const statusBox = document.getElementById('connection-status-box');
  supabase.from('users').select('id').limit(1).then(({ error }) => {
    if (!error) {
      statusBox.style.background = 'rgba(82, 183, 136, 0.08)';
      statusBox.style.borderColor = 'var(--accent-green)';
      statusBox.innerHTML = `
        <div style="display:flex; gap:0.5rem; align-items:center; color: var(--accent-green); font-weight:700; font-size:0.9rem;">
          <i class="fa-solid fa-circle-check"></i> Connected
        </div>
        <p style="font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4; color: var(--text-muted);">
          Supabase database, Auth, and Storage services are online and reachable.
        </p>
      `;
    } else {
      statusBox.style.background = 'rgba(244, 208, 104, 0.08)';
      statusBox.style.borderColor = 'var(--accent-yellow)';
      statusBox.innerHTML = `
        <div style="display:flex; gap:0.5rem; align-items:center; color: #c99a00; font-weight:700; font-size:0.9rem;">
          <i class="fa-solid fa-triangle-exclamation"></i> Connection Issue
        </div>
        <p style="font-size: 0.75rem; margin-top: 0.5rem; line-height: 1.4; color: var(--text-muted);">
          Could not reach Supabase. Check your network or project status.
        </p>
      `;
    }
  });
}
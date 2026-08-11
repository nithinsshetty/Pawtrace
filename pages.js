// ==========================================================================
// SPA PAGES RENDERER (Authentication views)
// ==========================================================================
// NOTE: renderDashboard, renderProfile, renderSettings, renderLostPets were
// removed from this file — they were dead code, shadowed by dashboard.js,
// settings.js, and pets.js respectively (see app.js imports).

import { signIn, signUp, getCurrentUser, ADMIN_EMAILS } from './auth.js';
import { supabase } from './supabase-config.js';
import { showToast, showLoading } from './utils.js';
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
        <i class="fa-solid fa-paw floating-paw" style="top:15%; left:20%; animation-delay: 0s;"></i>
        <i class="fa-solid fa-paw floating-paw" style="top:45%; left:80%; animation-delay: 3s;"></i>
        <i class="fa-solid fa-paw floating-paw" style="top:75%; left:30%; animation-delay: 6s;"></i>
      </div>

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
              <div style="position: relative;">
                <input type="password" id="login-password" class="form-control" placeholder="••••••••" required autocomplete="current-password" style="padding-right: 2.5rem;">
                <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.25rem;">
                  <i class="fa-solid fa-eye"></i>
                </button>
              </div>
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

  initPasswordToggles(viewport);

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

      <div class="auth-form-side">
        <div class="glass-card auth-card magnetic-card" style="box-shadow: var(--shadow-lg);">
          <div class="auth-header">
            <h2 class="auth-title">Sign Up</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Create your secure profile credentials</p>
          </div>

          <form id="signup-form">
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
                <div class="role-card" data-role="service_provider">
                  <i class="fa-solid fa-handshake-angle"></i>
                  <span class="role-card-title">Service Partner</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="signup-name">Your Full Name</label>
              <input type="text" id="signup-name" class="form-control" placeholder="Alex Mercer" required autocomplete="name">
            </div>

            <div class="form-group">
              <label for="signup-email">Email Address</label>
              <input type="email" id="signup-email" class="form-control" placeholder="alex@example.com" required autocomplete="username">
            </div>

            <div id="signup-vet-fields" class="form-group hidden">
              <label for="signup-license">Veterinary License Number *</label>
              <input type="text" id="signup-license" class="form-control" placeholder="VET-123456">
            </div>

            <div id="signup-ngo-fields" class="form-group hidden">
              <label for="signup-reg">NGO Accreditation ID *</label>
              <input type="text" id="signup-reg" class="form-control" placeholder="NGO-987654">
            </div>

            <div id="signup-provider-fields" class="form-group hidden">
              <div class="form-row-pair">
                <div class="form-group">
                  <label for="signup-prov-type">Service Category *</label>
                  <select id="signup-prov-type" class="form-control">
                    <option value="walker">Dog Walker</option>
                    <option value="pet_sitter">Pet Sitter</option>
                    <option value="cab_driver">Pet Taxi Driver</option>
                    <option value="groomer">Groomer</option>
                    <option value="boarding">Boarding / Kennel</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="signup-prov-phone">Contact Phone *</label>
                  <input type="text" id="signup-prov-phone" class="form-control" placeholder="+1 (555) 019-2834">
                </div>
              </div>
              <div class="form-row-pair">
                <div class="form-group">
                  <label for="signup-prov-location">Service Area *</label>
                  <input type="text" id="signup-prov-location" class="form-control" placeholder="E.g., Bengaluru, Indiranagar">
                </div>
                <div class="form-group">
                  <label for="signup-prov-id">Verification ID Proof URL *</label>
                  <input type="url" id="signup-prov-id" class="form-control" placeholder="https://...">
                </div>
              </div>
            </div>

            <div class="form-row-pair" style="margin-bottom: 1.5rem;">
              <div class="form-group" style="margin-bottom: 0;">
                <label for="signup-password">Password (min 6 chars)</label>
                <div style="position: relative;">
                  <input type="password" id="signup-password" class="form-control" placeholder="••••••••" required autocomplete="new-password" style="padding-right: 2.5rem;">
                  <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.25rem;">
                    <i class="fa-solid fa-eye"></i>
                  </button>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label for="signup-confirm">Confirm Password</label>
                <div style="position: relative;">
                  <input type="password" id="signup-confirm" class="form-control" placeholder="••••••••" required autocomplete="new-password" style="padding-right: 2.5rem;">
                  <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.25rem;">
                    <i class="fa-solid fa-eye"></i>
                  </button>
                </div>
              </div>
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

  initPasswordToggles(viewport);

  let selectedRole = 'owner';
  const roleCards = viewport.querySelectorAll('.role-card');
  const vetFields = viewport.querySelector('#signup-vet-fields');
  const ngoFields = viewport.querySelector('#signup-ngo-fields');
  const providerFields = viewport.querySelector('#signup-provider-fields');
  const licenseInput = viewport.querySelector('#signup-license');
  const regInput = viewport.querySelector('#signup-reg');

  const provPhoneInput = viewport.querySelector('#signup-prov-phone');
  const provLocInput = viewport.querySelector('#signup-prov-location');
  const provIdInput = viewport.querySelector('#signup-prov-id');

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
        providerFields.classList.add('hidden');
        provPhoneInput.required = false;
        provLocInput.required = false;
        provIdInput.required = false;
      } else if (selectedRole === 'ngo') {
        ngoFields.classList.remove('hidden');
        regInput.required = true;
        vetFields.classList.add('hidden');
        licenseInput.required = false;
        providerFields.classList.add('hidden');
        provPhoneInput.required = false;
        provLocInput.required = false;
        provIdInput.required = false;
      } else if (selectedRole === 'service_provider') {
        providerFields.classList.remove('hidden');
        provPhoneInput.required = true;
        provLocInput.required = true;
        provIdInput.required = true;
        vetFields.classList.add('hidden');
        licenseInput.required = false;
        ngoFields.classList.add('hidden');
        regInput.required = false;
      } else {
        vetFields.classList.add('hidden');
        ngoFields.classList.add('hidden');
        providerFields.classList.add('hidden');
        licenseInput.required = false;
        regInput.required = false;
        provPhoneInput.required = false;
        provLocInput.required = false;
        provIdInput.required = false;
      }
    };
  });

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

    // Collect role-specific extra fields BEFORE calling signUp, since
    // these get written in a follow-up step once the user row exists.
    let licenseNumber = '';
    let regId = '';
    let providerType = '', providerPhone = '', providerLocation = '', providerIdProof = '';

    if (selectedRole === 'vet') {
      licenseNumber = document.getElementById('signup-license')?.value.trim() || '';
    } else if (selectedRole === 'ngo') {
      regId = document.getElementById('signup-reg')?.value.trim() || '';
    } else if (selectedRole === 'service_provider') {
      providerType = document.getElementById('signup-prov-type')?.value || '';
      providerPhone = document.getElementById('signup-prov-phone')?.value.trim() || '';
      providerLocation = document.getElementById('signup-prov-location')?.value.trim() || '';
      providerIdProof = document.getElementById('signup-prov-id')?.value.trim() || '';
    }

    try {
      const newUser = await signUp(email, password, name, { role: selectedRole });

      // Write role-specific details now that the user row exists
      // (handle_new_user trigger creates it during signUp above).
      if (selectedRole === 'vet' && licenseNumber) {
        await supabase
          .from('users')
          .update({ vet_details: { licenseNumber, verified: false } })
          .eq('id', newUser.uid);
      } else if (selectedRole === 'ngo' && regId) {
        await supabase
          .from('users')
          .update({ ngo_details: { registrationId: regId, approved: false } })
          .eq('id', newUser.uid);
      } else if (selectedRole === 'service_provider') {
        await supabase.from('service_providers').insert({
          user_id: newUser.uid,
          provider_type: providerType,
          phone: providerPhone,
          location: providerLocation,
          id_proof_url: providerIdProof,
          status: 'pending'
        });
      }

      let targetRoute = '/dashboard';
      if (selectedRole === 'vet') {
        targetRoute = '/vet-portal';
      } else if (selectedRole === 'ngo') {
        targetRoute = '/ngo';
      } else if (selectedRole === 'service_provider') {
        targetRoute = '/service-portal';
      }
      Router.navigate(targetRoute);
    } catch (err) {
      // Handled in auth.js
      console.error(err);
    }
  };
}

export function initPasswordToggles(container = document) {
  const btns = container.querySelectorAll('.password-toggle-btn');
  btns.forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      const parent = btn.parentElement;
      const input = parent ? parent.querySelector('input') : null;
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
      }
    };
  });
}
// ==========================================================================
// PAWTRACE ADMIN PORTAL MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import {
  showToast,
  showLoading,
  formatFriendlyDate,
  showModal,
  escapeHTML
} from './utils.js';
import { Router } from './router.js';
import { initPasswordToggles } from './pages.js';



/**
 * Checks if the current authenticated user has admin privileges
 */
export async function isAdmin() {
  const user = getCurrentUser();
  if (!user) return false;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.uid)
      .single();

    if (error) throw error;

    return data?.role === 'admin';
  } catch (err) {
    console.error("Admin verification error:", err);
    return false;
  }
}

/**
 * Render Admin Login Page
 */
export function renderAdminLogin() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Admin Console';

  viewport.innerHTML = `
    <div class="auth-wrapper" style="min-height: calc(100vh - 120px);">
      <div class="glass-card auth-card magnetic-card" style="max-width: 420px; padding: 2.5rem;">
        <div class="auth-header" style="text-align: center; margin-bottom: 2rem;">
          <div class="auth-logo" style="font-size: 3rem; margin-bottom: 0.5rem;">🔑</div>
          <h2 class="auth-title">Admin Login</h2>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">Authorized Personnel Only</p>
        </div>
        
        <form id="admin-login-form" style="display:flex; flex-direction:column; gap:1.25rem;">
          <div class="form-group">
            <label for="admin-email">Admin Email</label>
            <input type="email" id="admin-email" class="form-control" placeholder="admin@pawtrace.com" required autocomplete="username">
          </div>
          
          <div class="form-group">
            <label for="admin-password">Password</label>
            <div style="position: relative;">
              <input type="password" id="admin-password" class="form-control" placeholder="••••••••" required autocomplete="current-password" style="padding-right: 2.5rem;">
              <button type="button" class="password-toggle-btn" aria-label="Toggle password visibility" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 0.25rem;">
                <i class="fa-solid fa-eye"></i>
              </button>
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary btn-full mt-1" style="background: var(--terracotta);">
            <i class="fa-solid fa-lock-open"></i> Access Console
          </button>
        </form>
        
        <div class="auth-footer" style="margin-top: 1.5rem; text-align: center;">
          <a href="#/login" class="text-link"><i class="fa-solid fa-arrow-left"></i> Back to Main Site</a>
        </div>
      </div>
    </div>
  `;

  initPasswordToggles(viewport);

  const form = document.getElementById('admin-login-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!email || !password) {
      showToast("Please fill in all fields.", "error");
      return;
    }

    showLoading(true, "Authenticating Admin...");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const adminStatus = await isAdmin();

      if (!adminStatus) {
        await supabase.auth.signOut();
        throw new Error("This account does not have administrator privileges.");
      }

      showToast("Admin authenticated.", "success");
      Router.navigate('/admin');
      showToast("Admin authenticated.", "success");
      Router.navigate('/admin');
    } catch (error) {
      console.error("Admin Login Error:", error);
      showToast("Invalid admin credentials.", "error");
    } finally {
      showLoading(false);
    }
  };
}

/**
 * Render Admin Dashboard base template
 */
export async function renderAdminDashboard() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Admin Portal';

  const user = getCurrentUser();
  if (!user) return;

  const adminCheck = await isAdmin();
  if (!adminCheck) {
    viewport.innerHTML = `
      <div class="auth-wrapper" style="min-height: calc(100vh - 120px);">
        <div class="glass-card text-center" style="max-width: 480px; padding: 2.5rem;">
          <i class="fa-solid fa-ban" style="font-size: 3rem; color: var(--accent-red); margin-bottom: 1rem;"></i>
          <h2>Unauthorized Access</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; line-height: 1.5; margin-top: 0.5rem;">
            Your account does not have administrator privileges. Please log in with an authorized admin account.
          </p>
          <a href="#/dashboard" class="btn btn-primary mt-2">Return to Dashboard</a>
        </div>
      </div>
    `;
    return;
  }

  viewport.innerHTML = `
    <div id="admin-workspace-container" class="admin-workspace">
      <div class="skeleton-container">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-card" style="height: 300px;"></div>
      </div>
    </div>
  `;

  showTab('analytics');
}

/**
 * Dynamically render the specified admin tab content
 */
export async function showTab(tabId) {
  const container = document.getElementById('admin-workspace-container');
  if (!container) return;

  document.querySelectorAll('.sidebar-menu .menu-item').forEach(el => {
    if (el.getAttribute('data-tab') === tabId) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });

  showLoading(true, `Loading ${tabId} records...`);
  try {
    switch (tabId) {
      case 'analytics':
        await renderAnalyticsTab(container);
        break;
      case 'orders':
        await renderOrdersTab(container);
        break;
      case 'users':
        await renderUsersTab(container);
        break;
      case 'doctors':
        await renderDoctorsTab(container);
        break;
      case 'ngos':
        await renderNgosTab(container);
        break;
      case 'announcements':
        await renderAnnouncementsTab(container);
        break;
      case 'providers':
        await renderProvidersTab(container);
        break;
      case 'reports':
        await renderReportsTab(container);
        break;
      default:
        await renderAnalyticsTab(container);
    }
  } catch (error) {
    const currentUser = getCurrentUser();

    console.error(`[Admin Portal Diagnostics] Failed to load tab "${tabId}":`, {
      error: error.message,
      uid: currentUser ? currentUser.uid : "unauthenticated",
      email: currentUser ? currentUser.email : "unauthenticated",
      detectedRole: currentUser ? currentUser.role : "unknown",
      timestamp: new Date().toISOString()
    });

    container.innerHTML = `
      <div class="glass-card text-center" style="max-width: 550px; margin: 2rem auto; padding: 2.5rem; border: 1px solid rgba(217, 93, 57, 0.2); background: rgba(217, 93, 57, 0.02);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3.5rem; color: var(--terracotta); margin-bottom: 1.25rem;"></i>
        <h3 style="font-family:'Outfit'; font-weight:800; font-size:1.4rem; color: var(--text-main); margin-bottom: 0.5rem;">Access Denied or Query Failure</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem;">
          Supabase rejected the request due to missing or insufficient database permissions (RLS policy).
        </p>
        <div style="background: var(--bg-app); border: 1px solid var(--border-input); border-radius: var(--radius-sm); padding: 1.25rem; text-align: left; font-family: monospace; font-size: 0.75rem; color: var(--text-muted); word-break: break-all; display:flex; flex-direction:column; gap:0.4rem; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
          <div><strong style="color:var(--text-main);">Error Detail:</strong> ${error.message}</div>
          <div><strong style="color:var(--text-main);">Failed Tab:</strong> ${tabId}</div>
          <div><strong style="color:var(--text-main);">Auth UID:</strong> ${currentUser ? currentUser.uid : 'unauthenticated'}</div>
          <div><strong style="color:var(--text-main);">Auth Email:</strong> ${currentUser ? currentUser.email : 'unauthenticated'}</div>
        </div>
      </div>
    `;
  } finally {
    showLoading(false);
  }
}

/**
 * TABS RENDERING FUNCTIONS
 */

async function renderAnalyticsTab(container) {
  const { data: pets, error: petsErr } = await supabase.from('pets').select('*');
  if (petsErr) throw new Error(`Failed to read 'pets' table: ${petsErr.message}`);

  const { data: orders, error: ordersErr } = await supabase.from('orders').select('*');
  if (ordersErr) throw new Error(`Failed to read 'orders' table: ${ordersErr.message}`);

  const { data: users, error: usersErr } = await supabase.from('users').select('*');
  if (usersErr) throw new Error(`Failed to read 'users' table: ${usersErr.message}`);

  let totalPets = pets.length;
  let lostPets = 0;
  let taggedPets = 0;
  let petTypes = {};

  pets.forEach(pet => {
    if (pet.is_lost) lostPets++;
    if (pet.has_tag) taggedPets++;

    const type = pet.species || 'Other';
    petTypes[type] = (petTypes[type] || 0) + 1;
  });

  let totalOrders = orders.length;
  let pendingOrders = orders.filter(o => o.status === 'Pending').length;

  const totalUsers = users.length;
  const tagAdoptionRate = totalPets > 0 ? Math.round((taggedPets / totalPets) * 100) : 0;

  let typeDistributionHtml = '';
  const maxCount = Math.max(...Object.values(petTypes), 1);
  for (const [type, count] of Object.entries(petTypes)) {
    const pct = Math.round((count / maxCount) * 100);
    typeDistributionHtml += `
      <div style="margin-bottom: 1rem;">
        <div class="flex-between" style="font-size: 0.8rem; margin-bottom: 0.25rem;">
          <strong>${type}</strong>
          <span>${count} (${Math.round((count / totalPets) * 100)}%)</span>
        </div>
        <div class="progress-bar-container" style="background: rgba(0,0,0,0.05); height: 8px; border-radius: 4px;">
          <div class="progress-bar" style="background: var(--teal); width: ${pct}%; height: 100%; border-radius: 4px;"></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Admin Dashboard</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Overview of ecosystem usage metrics and registrations</p>
    </div>

    <div class="metric-grid mb-3">
      <div class="glass-card metric-card">
        <div class="metric-icon teal"><i class="fa-solid fa-paw"></i></div>
        <div class="metric-details">
          <span class="metric-value">${totalPets}</span>
          <span class="metric-label">Registered Pets</span>
        </div>
      </div>
      <div class="glass-card metric-card">
        <div class="metric-icon terracotta"><i class="fa-solid fa-qrcode"></i></div>
        <div class="metric-details">
          <span class="metric-value">${taggedPets}</span>
          <span class="metric-label">Active Smart Tags</span>
        </div>
      </div>
      <div class="glass-card metric-card">
        <div class="metric-icon yellow"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="metric-details">
          <span class="metric-value">${lostPets}</span>
          <span class="metric-label">Active Missing Reports</span>
        </div>
      </div>
      <div class="glass-card metric-card">
        <div class="metric-icon blue"><i class="fa-solid fa-cart-shopping"></i></div>
        <div class="metric-details">
          <span class="metric-value">${totalOrders}</span>
          <span class="metric-label">Total Tag Orders</span>
        </div>
      </div>
    </div>

    <div class="grid-cols-2">
      <div class="glass-card">
        <h3 style="font-family:'Outfit'; font-weight:700; margin-bottom: 1.5rem;">Ecosystem Distribution</h3>
        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; margin-bottom:0.25rem;">TAG ADOPTION RATE</span>
            <div class="flex-between" style="align-items:center; gap: 1rem;">
              <div class="progress-bar-container" style="background: rgba(0,0,0,0.05); height: 12px; border-radius: 6px; flex-grow:1;">
                <div class="progress-bar" style="background: var(--terracotta); width: ${tagAdoptionRate}%; height: 100%; border-radius: 6px;"></div>
              </div>
              <strong style="font-size: 1.1rem; color: var(--terracotta);">${tagAdoptionRate}%</strong>
            </div>
          </div>
          
          <hr class="divider">
          
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; margin-bottom:0.5rem;">PET CLASSIFICATIONS</span>
            ${typeDistributionHtml || '<p style="font-size:0.8rem; color:var(--text-muted);">No pets registered.</p>'}
          </div>
        </div>
      </div>

      <div class="glass-card" style="display:flex; flex-direction:column; justify-content:space-between;">
        <div>
          <h3 style="font-family:'Outfit'; font-weight:700; margin-bottom: 1rem;">Platform Control Actions</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; line-height:1.4; margin-bottom:1.5rem;">
            As an administrator, you have full write access to override order status and user registration checks.
          </p>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <button class="btn btn-outline" onclick="window.Admin.showTab('orders')" style="text-align:left; padding:1.25rem;">
            <i class="fa-solid fa-truck-ramp-box" style="font-size:1.5rem; color:var(--terracotta); margin-bottom:0.5rem; display:block;"></i>
            <strong>Fulfill Orders</strong>
            <span style="display:block; font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">${pendingOrders} pending tag shipments</span>
          </button>
          
          <button class="btn btn-outline" onclick="window.Admin.showTab('doctors')" style="text-align:left; padding:1.25rem;">
            <i class="fa-solid fa-user-check" style="font-size:1.5rem; color:var(--teal); margin-bottom:0.5rem; display:block;"></i>
            <strong>Verify Clinics</strong>
            <span style="display:block; font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">Manage clinic authorization</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function renderOrdersTab(container) {
  const { data: orders, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`Failed to read 'orders' table: ${error.message}`);

  let rowsHtml = '';
  if (!orders || orders.length === 0) {
    rowsHtml = `<tr><td colspan="6" class="text-center" style="padding:2rem; color:var(--text-muted);">No smart tag orders found.</td></tr>`;
  } else {
    orders.forEach(order => {
      let statusBadge = '';
      if (order.status === 'Pending') statusBadge = '<span class="pet-status-badge lost" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Pending</span>';
      else if (order.status === 'Confirmed') statusBadge = '<span class="pet-status-badge safe" style="background:#3f8efc; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Confirmed</span>';
      else if (order.status === 'Shipped') statusBadge = '<span class="pet-status-badge safe" style="background:#8338ec; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Shipped</span>';
      else if (order.status === 'Delivered') statusBadge = '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Delivered</span>';
      else if (order.status === 'Activated') statusBadge = '<span class="pet-status-badge safe" style="background:var(--teal); position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Activated</span>';

      let actionButtons = '';
      if (order.status === 'Pending') {
        actionButtons = `<button class="btn btn-primary btn-sm" onclick="window.Admin.updateOrderStatus('${order.id}', 'Confirmed')" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Confirm</button>`;
      } else if (order.status === 'Confirmed') {
        actionButtons = `<button class="btn btn-secondary btn-sm" onclick="window.Admin.updateOrderStatus('${order.id}', 'Shipped')" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#8338ec; border:none; color:white;">Ship</button>`;
      } else if (order.status === 'Shipped') {
        actionButtons = `<button class="btn btn-sm" onclick="window.Admin.updateOrderStatus('${order.id}', 'Delivered')" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Deliver</button>`;
      } else if (order.status === 'Delivered') {
        actionButtons = `<button class="btn btn-sm btn-primary" onclick="window.Admin.activatePetQR('${order.id}', '${order.pet_id}', '${order.owner_id}')" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Activate QR</button>`;
      } else if (order.status === 'Activated') {
        actionButtons = `
          <div style="display:flex; flex-direction:column; gap:0.25rem; align-items:flex-start;">
            <span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-circle-check"></i> Fulfilled</span>
            <button class="btn btn-outline btn-sm" onclick="window.Admin.printPetQR('${order.pet_id}', '${(order.pet_name || '').replace(/'/g, "\\'")}')" style="font-size:0.65rem; padding:0.25rem 0.5rem; display:inline-flex; align-items:center; gap:0.25rem;">
              <i class="fa-solid fa-print"></i> Print QR Tag
            </button>
          </div>
        `;
      } else {
        actionButtons = `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-circle-check"></i> Fulfilled</span>`;
      }

      rowsHtml += `
        <tr>
          <td><strong style="font-family:monospace; font-size:0.75rem;">${order.id.substr(0, 8)}</strong></td>
          <td>
            <strong>${escapeHTML(order.pet_name || '')}</strong><br>
            <span style="font-size:0.7rem; color:var(--text-muted);">
              ${escapeHTML(order.owner_name || '')}
            </span>
          </td>

          <td>
            <span style="font-size:0.75rem;">
              ${escapeHTML(order.address || '')}
            </span><br>

            <span style="font-size:0.7rem; color:var(--text-muted);">
              ${escapeHTML(order.owner_phone || '')}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td><div style="display:flex; gap:0.25rem;">${actionButtons}</div></td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Pendant Smart Tag Orders</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Manage order statuses and collar tag activation workflows</p>
    </div>

    <div class="glass-card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Recipient Pet</th>
            <th>Delivery Details</th>
            <th>Ordered At</th>
            <th>Status</th>
            <th>Fulfillment Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function renderUsersTab(container) {
  const { data: users, error } = await supabase.from('users').select('*');
  if (error) throw new Error(`Failed to read 'users' table: ${error.message}`);

  let rowsHtml = '';
  const currentAdmin = getCurrentUser();
  const currentAdminId = currentAdmin ? currentAdmin.uid : null;
  const isHeadAdmin = currentAdmin?.isHeadAdmin === true;

  users.forEach(user => {
    const role = (user.role || 'unknown').toLowerCase();

    let roleBadge = '';

    if (role === 'admin') {
      roleBadge =
        '<span class="pet-status-badge lost" style="background:#e63946; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Admin</span>';
    } else if (role === 'vet' || role === 'veterinarian') {
      roleBadge =
        '<span class="pet-status-badge safe" style="background:var(--teal); position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Vet</span>';
    } else if (role === 'ngo') {
      roleBadge =
        '<span class="pet-status-badge safe" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">NGO</span>';
    } else if (role === 'owner' || role === 'customer') {
      roleBadge =
        '<span class="pet-status-badge safe" style="background:#3f8efc; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Customer</span>';
    } else if (role === 'service_provider') {
      roleBadge =
        '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Provider</span>';
    } else {
      roleBadge =
        '<span class="pet-status-badge safe" style="background:#7f8c8d; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Unknown</span>';
    }

    const joined = user.created_at
      ? formatFriendlyDate(user.created_at)
      : 'N/A';

    let actionBtn = '';

    if (user.role !== 'admin') {
      if (isHeadAdmin) {
        actionBtn = `
          <button
            class="btn btn-outline btn-sm admin-make-btn"
            data-user-id="${escapeHTML(user.id || '')}"
            data-display-name="${escapeHTML(user.display_name || '')}"
            style="font-size:0.7rem; padding:0.35rem 0.5rem;">
            Make Admin
          </button>
        `;
      } else {
        actionBtn =
          '<span style="font-size:0.75rem; color:var(--text-muted);">-</span>';
      }
    } else if (user.id === currentAdminId) {
      actionBtn =
        '<span style="font-size:0.75rem; color:var(--text-muted);">Active Session</span>';
    } else {
      if (isHeadAdmin) {
        actionBtn = `
          <button
            class="btn btn-danger btn-sm admin-demote-btn"
            data-user-id="${escapeHTML(user.id || '')}"
            data-display-name="${escapeHTML(user.display_name || '')}"
            style="font-size:0.7rem; padding:0.35rem 0.5rem; background:#e63946; border:none; color:white;">
            Revoke Admin
          </button>
        `;
      } else {
        actionBtn =
          '<span style="font-size:0.75rem; color:var(--text-muted);">Admin Account</span>';
      }
    }

    const photoUrl =
      user.photo_url ||
      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id || '')}`;

    rowsHtml += `
      <tr class="user-row-item">
        <td>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <img
              src="${escapeHTML(photoUrl)}"
              alt="User profile"
              style="width:30px; height:30px; border-radius:50%; object-fit:cover;"
            >
            <div>
              <strong>${escapeHTML(user.display_name || 'Unnamed')}</strong><br>
              <span style="font-size:0.7rem; color:var(--text-muted);">
                ${escapeHTML(user.email || '')}
              </span>
            </div>
          </div>
        </td>

        <td>${roleBadge}</td>

        <td>
          <span style="font-size:0.75rem;">
            ${escapeHTML(joined)}
          </span>
        </td>

        <td>${actionBtn}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">
          Registered Users Directory
        </h2>

        <p style="color: var(--text-muted); font-size:0.9rem;">
          Inspect and manage platform users access privileges
        </p>
      </div>

      <div>
        <input
          type="text"
          id="admin-user-search"
          class="form-control"
          placeholder="Search by name or email..."
          style="width:260px; font-size:0.8rem; padding:0.5rem 1rem;"
        >
      </div>
    </div>

    <div class="glass-card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>User Info</th>
            <th>Role Badge</th>
            <th>Registered Date</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody id="admin-users-tbody">
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;

  // Secure event handlers — no user-controlled values inside inline JavaScript.
  container.querySelectorAll('.admin-make-btn').forEach(button => {
    button.addEventListener('click', () => {
      makeUserAdmin(
        button.dataset.userId,
        button.dataset.displayName
      );
    });
  });

  container.querySelectorAll('.admin-demote-btn').forEach(button => {
    button.addEventListener('click', () => {
      demoteAdmin(
        button.dataset.userId,
        button.dataset.displayName
      );
    });
  });

  const searchInput = document.getElementById('admin-user-search');
  const tbody = document.getElementById('admin-users-tbody');

  if (searchInput && tbody) {
    searchInput.oninput = () => {
      const query = searchInput.value.trim().toLowerCase();
      const rows = tbody.querySelectorAll('.user-row-item');

      rows.forEach(row => {
        row.style.display = row.textContent
          .toLowerCase()
          .includes(query)
          ? ''
          : 'none';
      });
    };
  }
}

async function renderDoctorsTab(container) {
  const { data: vets, error } = await supabase.from('users').select('*').eq('role', 'vet');
  if (error) throw new Error(`Failed to read users table (vet role filter): ${error.message}`);

  let rowsHtml = '';
  if (!vets || vets.length === 0) {
    rowsHtml = `<tr><td colspan="5" class="text-center" style="padding:2rem; color:var(--text-muted);">No registered veterinarian clinics found.</td></tr>`;
  } else {
    vets.forEach(vet => {
      const details = vet.vet_details || {};
      const isVerified = details.verified;
      const license = details.licenseNumber || 'N/A';
      const clinicName = details.clinicName || vet.display_name || 'Clinic';
      const specs = (details.specializations || []).join(', ') || 'General Medicine';

      let statusBadge = isVerified
        ? '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-circle-check"></i> Verified</span>'
        : '<span class="pet-status-badge lost" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-clock"></i> Pending Approval</span>';

      let actionButton = isVerified
        ? `<button class="btn btn-danger btn-sm" onclick="window.Admin.toggleDoctorVerification('${vet.id}', false)" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Revoke</button>`
        : `<button class="btn btn-primary btn-sm" onclick="window.Admin.toggleDoctorVerification('${vet.id}', true)" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Verify Clinic</button>`;

      rowsHtml += `
        <tr>
          <td>
            <strong>${escapeHTML(clinicName)}</strong><br>
            <span style="font-size:0.7rem; color:var(--text-muted);">
              ${escapeHTML(vet.email || '')}
            </span>
          </td>

          <td>
            <span style="font-family:monospace; font-weight:600; font-size:0.75rem;">
              ${escapeHTML(license)}
            </span>
          </td>

          <td>
            <span style="font-size:0.75rem;">
              ${escapeHTML(specs)}
            </span>
          </td>
          <td>${statusBadge}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Veterinary Clinics Verification</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Approve and review clinical medical license credentials</p>
    </div>

    <div class="glass-card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Clinic Name & Info</th>
            <th>License Number</th>
            <th>Specializations</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function renderNgosTab(container) {
  const { data: ngos, error } = await supabase.from('users').select('*').eq('role', 'ngo');
  if (error) throw new Error(`Failed to read users table (ngo role filter): ${error.message}`);

  let rowsHtml = '';
  if (!ngos || ngos.length === 0) {
    rowsHtml = `<tr><td colspan="5" class="text-center" style="padding:2rem; color:var(--text-muted);">No rescue organizations found.</td></tr>`;
  } else {
    ngos.forEach(ngo => {
      const details = ngo.ngo_details || {};
      const isApproved = details.approved;
      const regId = details.registrationId || 'N/A';
      const orgName = details.orgName || ngo.display_name || 'Organization';
      const location = details.location || 'Unknown';

      let statusBadge = isApproved
        ? '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-circle-check"></i> Approved</span>'
        : '<span class="pet-status-badge lost" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-clock"></i> Pending Approval</span>';

      let actionButton = isApproved
        ? `<button class="btn btn-danger btn-sm" onclick="window.Admin.toggleNgoApproval('${ngo.id}', false)" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Revoke</button>`
        : `<button class="btn btn-primary btn-sm" onclick="window.Admin.toggleNgoApproval('${ngo.id}', true)" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Approve NGO</button>`;

      rowsHtml += `
        <tr>
         <td>
          <strong>${escapeHTML(orgName)}</strong><br>
          <span style="font-size:0.7rem; color:var(--text-muted);">
            ${escapeHTML(ngo.email || '')}
          </span>
        </td>

        <td>
          <span style="font-family:monospace; font-weight:600; font-size:0.75rem;">
            ${escapeHTML(regId)}
          </span>
        </td>

        <td>
          <span style="font-size:0.75rem;">
            <i class="fa-solid fa-location-dot"></i>
            ${escapeHTML(location)}
          </span>
        </td>
          <td>${statusBadge}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    });
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">NGO Rescue Approvals</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Verify and authorize rescue organization case handlers</p>
    </div>

    <div class="glass-card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Organization Name</th>
            <th>Registration ID</th>
            <th>City Location</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function renderAnnouncementsTab(container) {
  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Ecosystem Announcements</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Dispatch notifications directly to every registered user dashboard</p>
    </div>

    <div class="glass-card" style="max-width: 600px;">
      <h3 style="font-family:'Outfit'; font-weight:700; margin-bottom: 1.25rem;">Broadcast Global Notification</h3>
      
      <form id="announcement-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-group">
          <label for="announce-title">Alert Title *</label>
          <input type="text" id="announce-title" class="form-control" placeholder="E.g. Scheduled Database Maintenance" required>
        </div>
        
        <div class="form-group">
          <label for="announce-message">Broadcast Message Body *</label>
          <textarea id="announce-message" class="form-control" rows="4" placeholder="Type notification details here..." required></textarea>
        </div>
        
        <button type="submit" class="btn btn-primary" style="background: var(--terracotta); border:none; margin-top:0.5rem;">
          <i class="fa-solid fa-bullhorn"></i> Dispatch Broadcast
        </button>
      </form>
    </div>
  `;

  const form = document.getElementById('announcement-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('announce-title').value.trim();
    const message = document.getElementById('announce-message').value.trim();

    await broadcastAnnouncement(title, message);
  };
}

/**
 * DATABASE OPERATIONS HELPER METHODS (EXPOSED ON GLOBAL namespace)
 */

export async function updateOrderStatus(orderId, newStatus) {
  showLoading(true, "Updating order status...");
  try {
    const timestampField =
      newStatus === 'Confirmed' ? 'confirmed_at' :
      newStatus === 'Shipped' ? 'shipped_at' : 'delivered_at';

    const { error: updateErr } = await supabase
      .from('orders')
      .update({ status: newStatus, [timestampField]: new Date().toISOString() })
      .eq('id', orderId);
    if (updateErr) throw updateErr;

    const { data: order, error: fetchErr } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (fetchErr) throw fetchErr;

    await supabase.from('notifications').insert({
      user_id: order.owner_id,
      type: 'STATUS_CHANGE',
      message: `Your smart tag order status is now: ${newStatus.toUpperCase()}.`,
      is_read: false
    });

    showToast(`Order status updated to ${newStatus}.`, "success");
    showTab('orders');
  } catch (err) {
    console.error("Error updating order status:", err);
    showToast("Failed to update order status.", "error");
  } finally {
    showLoading(false);
  }
}

export async function activatePetQR(orderId, petId, ownerId) {
  showLoading(true, "Activating Collar QR Code...");
  try {
    const { error: orderErr } = await supabase
      .from('orders')
      .update({ status: 'Activated', qr_activated: true, qr_activated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (orderErr) throw orderErr;

    const { error: petErr } = await supabase
      .from('pets')
      .update({ has_tag: true, tag_order_id: orderId, tag_activated_at: new Date().toISOString() })
      .eq('id', petId);
    if (petErr) throw petErr;

    const { data: pet, error: fetchErr } = await supabase.from('pets').select('name').eq('id', petId).single();
    if (fetchErr) throw fetchErr;

    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'STATUS_CHANGE',
      message: `🎉 Celebration Alert: Your PawTrace QR pendant for ${pet.name} is now LIVE! View your pet details to verify.`,
      is_read: false
    });

    showToast("Smart Tag activated successfully!", "success");
    showTab('orders');
  } catch (err) {
    console.error("Error activating QR:", err);
    showToast("Failed to activate QR pendant.", "error");
  } finally {
    showLoading(false);
  }
}
export async function makeUserAdmin(userId, displayName) {
  const currentAdmin = getCurrentUser();
  if (!currentAdmin || currentAdmin.isHeadAdmin !== true) {
    showToast("Permission Denied. Only the head administrator can grant admin access.", "error");
    return;
  }

  showLoading(true, "Granting admin role...");
  try {
    const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', userId);
    if (error) throw error;
    showToast(`Successfully granted Admin access to ${displayName}.`, "success");
    showTab('users');
  } catch (err) {
    showToast("Failed to grant admin access.", "error");
  } finally {
    showLoading(false);
  }
}

export async function demoteAdmin(userId, displayName) {
  const currentAdmin = getCurrentUser();
  if (!currentAdmin || currentAdmin.isHeadAdmin !== true) {
    showToast("Permission Denied. Only the head administrator can revoke admin access.", "error");
    return;
  }

  if (currentAdmin.uid === userId) {
    showToast("Self-demotion is prohibited. You cannot revoke your own administrator privileges.", "warning");
    return;
  }

  if (!confirm(`Are you sure you want to revoke Admin privileges from ${displayName}?`)) return;

  showLoading(true, "Revoking admin role...");
  try {
    const { error } = await supabase.from('users').update({ role: 'customer' }).eq('id', userId);
    if (error) throw error;
    showToast(`Successfully revoked Admin access from ${displayName}.`, "success");
    showTab('users');
  } catch (err) {
    showToast("Failed to revoke admin access.", "error");
  } finally {
    showLoading(false);
  }
}



export async function toggleDoctorVerification(vetId, verify) {
  showLoading(true, "Updating veterinarian verification status...");
  try {
    const { data: vet, error: fetchErr } = await supabase.from('users').select('vet_details').eq('id', vetId).single();
    if (fetchErr) throw fetchErr;

    const updatedDetails = { ...(vet.vet_details || {}), verified: verify };

    const { error: updateErr } = await supabase.from('users').update({ vet_details: updatedDetails }).eq('id', vetId);
    if (updateErr) throw updateErr;

    await supabase.from('notifications').insert({
      user_id: vetId,
      type: 'STATUS_CHANGE',
      message: verify
        ? "Congratulations! Your clinic license has been verified. Owners can now authorize patient access."
        : "Verification notice: Your clinic license verification status has been revoked.",
      is_read: false
    });

    showToast(verify ? "Doctor verified successfully." : "Verification status revoked.", "info");
    showTab('doctors');
  } catch (err) {
    showToast("Database update error.", "error");
  } finally {
    showLoading(false);
  }
}

export async function toggleNgoApproval(ngoId, approve) {
  showLoading(true, "Updating NGO approval status...");
  try {
    const { data: ngo, error: fetchErr } = await supabase.from('users').select('ngo_details').eq('id', ngoId).single();
    if (fetchErr) throw fetchErr;

    const updatedDetails = { ...(ngo.ngo_details || {}), approved: approve };

    const { error: updateErr } = await supabase.from('users').update({ ngo_details: updatedDetails }).eq('id', ngoId);
    if (updateErr) throw updateErr;

    await supabase.from('notifications').insert({
      user_id: ngoId,
      type: 'STATUS_CHANGE',
      message: approve
        ? "Congratulations! Your NGO registration status is APPROVED. Case tracking is active."
        : "Alert: Your NGO registration verification status has been suspended.",
      is_read: false
    });

    showToast(approve ? "NGO approved successfully." : "Approval status revoked.", "info");
    showTab('ngos');
  } catch (err) {
    showToast("Database update error.", "error");
  } finally {
    showLoading(false);
  }
}

async function broadcastAnnouncement(title, message) {
  showLoading(true, "Broadcasting global announcement...");
  try {
    const { data: users, error: usersErr } = await supabase.from('users').select('id');
    if (usersErr) throw usersErr;

    const notifRows = users.map(u => ({
      user_id: u.id,
      type: 'STATUS_CHANGE',
      message: `📢 ${title}: ${message}`,
      is_read: false
    }));

    // Insert in chunks of 400 to stay well under any request size limits
    for (let i = 0; i < notifRows.length; i += 400) {
      const chunk = notifRows.slice(i, i + 400);
      const { error: insertErr } = await supabase.from('notifications').insert(chunk);
      if (insertErr) throw insertErr;
    }

    showToast("Global announcement broadcasted successfully!", "success");
    document.getElementById('announce-title').value = '';
    document.getElementById('announce-message').value = '';
  } catch (err) {
    console.error("Announcement Broadcast Error:", err);
    showToast("Failed to broadcast announcement.", "error");
  } finally {
    showLoading(false);
  }
}

async function renderProvidersTab(container) {
  const { data: providers, error } = await supabase.from('service_providers').select('*');
  if (error) throw new Error(`Failed to read service_providers: ${error.message}`);

  let rowsHtml = '';
  if (!providers || providers.length === 0) {
    rowsHtml = `<tr><td colspan="6" class="text-center" style="padding:2rem; color:var(--text-muted);">No service providers registered.</td></tr>`;
  } else {
    for (const p of providers) {
      const { data: uData } = await supabase.from('users').select('display_name, email').eq('id', p.user_id).single();
      const userInfo = uData || { display_name: "Care Sitter", email: "N/A" };

      const statusBadge = p.status === 'approved'
        ? '<span class="pet-status-badge safe" style="position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-circle-check"></i> Approved</span>'
        : p.status === 'pending'
        ? '<span class="pet-status-badge pending" style="position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-clock"></i> Pending</span>'
        : '<span class="pet-status-badge lost" style="position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-ban"></i> Suspended</span>';

      const actionButton = p.status === 'approved'
        ? `<button class="btn btn-danger btn-sm" onclick="window.Admin.toggleProviderStatus('${p.user_id}', 'suspended')" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Suspend</button>`
        : `<button class="btn btn-primary btn-sm" onclick="window.Admin.toggleProviderStatus('${p.user_id}', 'approved')" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Approve</button>`;

      // FIX: the ID-proof link was missing its opening `<a` tag, which
      // rendered the href/target/rel attributes as broken floating text
      // instead of a real hyperlink.
      rowsHtml += `
        <tr>
          <td>
            <strong>${escapeHTML(userInfo.display_name || 'Care Sitter')}</strong><br>
            <span style="font-size:0.7rem; color:var(--text-muted);">
              ${escapeHTML(userInfo.email || 'N/A')}
            </span>
          </td>

          <td>
            <span style="font-weight:600; font-size:0.75rem; text-transform:uppercase;">
              ${escapeHTML(p.provider_type || '')}
            </span>
          </td>

          <td>
            <span style="font-size:0.75rem;">
              $${Number(p.rate || 0).toFixed(2)}/hr
            </span>
          </td>

          <td>
            <span style="font-size:0.75rem;">
              ${escapeHTML(p.location || '')}
            </span>
          </td>

          <td>
            ${
              p.id_proof_url
                ? `
                    href="${escapeHTML(p.id_proof_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-link"
                    style="font-size:0.75rem;">
                    <i class="fa-solid fa-file-contract"></i> View ID
                  </a>`
                : `
                  <span style="font-size:0.75rem; color:var(--text-muted);">
                    None
                  </span>
                `
            }
          </td>
          <td>${statusBadge}</td>
          <td>${actionButton}</td>
        </tr>
      `;
    }
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Independent Service Partners</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Approve independent dog walkers, sitters, taxis, and groomer credentials</p>
    </div>

    <div class="glass-card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Provider Name</th>
            <th>Category</th>
            <th>Base Rate</th>
            <th>Service Area</th>
            <th>ID Proof</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

async function renderReportsTab(container) {
  const { data: reports, error } = await supabase.from('reports').select('*');
  if (error) throw new Error(`Failed to read reports: ${error.message}`);

  let rowsHtml = '';
  if (!reports || reports.length === 0) {
    rowsHtml = `<tr><td colspan="7" class="text-center" style="padding:2rem; color:var(--text-muted);">No reports filed.</td></tr>`;
  } else {
    for (const r of reports) {
      const dateStr = r.created_at ? formatFriendlyDate(r.created_at) : 'N/A';

      const statusBadge = r.status === 'resolved'
        ? '<span class="pet-status-badge safe" style="position:static; display:inline-block; font-size:0.7rem;"><i class="fa-solid fa-circle-check"></i> Resolved</span>'
        : '<span class="pet-status-badge lost" style="position:static; display:inline-block; font-size:0.7rem;"><i class="fa-solid fa-clock"></i> Active</span>';

      let actionButtons = '';
      if (r.status !== 'resolved') {
        actionButtons = `
          <button class="btn btn-primary btn-sm" onclick="window.Admin.moderateReport('${r.id}', 'penalize')" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:var(--accent-red); border:none; color:white;">Penalize</button>
          <button class="btn btn-outline btn-sm mt-1" onclick="window.Admin.moderateReport('${r.id}', 'dismiss')" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Dismiss</button>
        `;
      } else {
        actionButtons = '<span style="font-size:0.75rem; color:var(--text-muted);">No action required</span>';
      }

      rowsHtml += `
        <tr>
        <td>
          <span style="font-size:0.75rem; font-family:monospace;">
            ${escapeHTML(r.id || '')}
          </span>
        </td>

        <td>
          <span style="font-size:0.75rem; font-weight:600; text-transform:uppercase;">
            ${escapeHTML(r.target_type || '')}
          </span>
          <br>
          <span style="font-size:0.65rem; color:var(--text-muted); font-family:monospace;">
            ${escapeHTML(r.target_id || '')}
          </span>
        </td>

        <td>
          <span style="font-size:0.75rem; font-family:monospace;">
            ${escapeHTML(r.reporter_user_id || '')}
          </span>
        </td>

        <td>
          <strong>${escapeHTML(r.reason || '')}</strong>
        </td>

        <td>
          <p style="font-size:0.75rem; color:var(--text-muted); max-width:200px; word-wrap:break-word; margin:0;">
            ${escapeHTML(r.details || '')}
          </p>
        </td>
          <td><span style="font-size:0.75rem;">${dateStr}</span></td>
          <td>${statusBadge}</td>
          <td><div style="display:flex; flex-direction:column; gap:0.25rem;">${actionButtons}</div></td>
        </tr>
      `;
    }
  }

  container.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Flagged Safety Reports</h2>
      <p style="color: var(--text-muted); font-size:0.9rem;">Moderate flagged listings, spam, scam reports, or provider misconduct</p>
    </div>

    <div class="glass-card" style="padding: 0; overflow-x: auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Report ID</th>
            <th>Target Info</th>
            <th>Reporter UID</th>
            <th>Reason</th>
            <th>Details</th>
            <th>Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

export async function toggleProviderStatus(providerId, status) {
  showLoading(true, "Updating provider status...");
  try {
    const { error } = await supabase.from('service_providers').update({ status }).eq('user_id', providerId);
    if (error) throw error;

    await supabase.from('notifications').insert({
      user_id: providerId,
      type: 'STATUS_CHANGE',
      message: status === 'approved'
        ? "Congratulations! Your independent service profile has been APPROVED."
        : "Alert: Your independent service profile listing has been suspended.",
      is_read: false
    });

    showToast(status === 'approved' ? "Provider listing approved successfully." : "Provider listing suspended.", "info");
    showTab('providers');
  } catch (err) {
    console.error("Provider status update error:", err);
    showToast("Database update error.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * FIX (#13): Report moderation now handles 'listing' target_type reports.
 */
export async function moderateReport(reportId, action) {
  showLoading(true, "Processing moderation response...");
  try {
    const { data: r, error: fetchErr } = await supabase.from('reports').select('*').eq('id', reportId).single();
    if (fetchErr) throw fetchErr;
    if (!r) {
      showToast("Report not found.", "warning");
      return;
    }

    if (action === 'penalize') {
      if (r.target_type === 'provider') {
        await supabase.from('service_providers').update({ status: 'suspended' }).eq('user_id', r.target_id);

        await supabase.from('notifications').insert({
          user_id: r.target_id,
          type: 'STATUS_CHANGE',
          message: "Alert: Your service profile has been suspended following community safety reports.",
          is_read: false
        });
      } else if (r.target_type === 'listing') {
        const { data: listing, error: listingFetchErr } = await supabase
          .from('pet_listings')
          .select('id, seller_user_id')
          .eq('id', r.target_id)
          .maybeSingle();

        if (listingFetchErr) {
          console.error("Failed to fetch listing for moderation:", listingFetchErr);
          showToast("Could not locate the reported listing. Report left unresolved.", "warning");
          return;
        }

        if (!listing) {
          showToast("Reported listing no longer exists. Marking report resolved.", "info");
        } else {
          const { error: listingUpdateErr } = await supabase
            .from('pet_listings')
            .update({ status: 'removed', updated_at: new Date().toISOString() })
            .eq('id', listing.id);
          if (listingUpdateErr) throw listingUpdateErr;

          if (listing.seller_user_id) {
            await supabase.from('notifications').insert({
              user_id: listing.seller_user_id,
              type: 'STATUS_CHANGE',
              message: "Alert: Your marketplace listing has been removed following community safety reports.",
              is_read: false
            });
          }
        }
      }
    }

    await supabase.from('reports').update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', reportId);

    showToast(action === 'penalize' ? "Moderation action applied. Report marked resolved." : "Report dismissed.", "success");
    showTab('reports');
  } catch (err) {
    console.error("Moderation report error:", err);
    showToast("Moderation database update error.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Renders Recovery QR code overlay and calls window.print()
 */
export function printPetQR(petId, petName) {
  const currentDomain = window.location.origin + window.location.pathname;
  const qrUrl = `${currentDomain}#/scan/${petId}`;

  showModal({
    title: "Print Smart Digital Collar ID",
    bodyHtml: `
      <div style="text-align:center; padding:1rem;">
        <h4 style="color:var(--teal); font-weight:700;">PawTrace Digital Collar Attachment</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin:0.5rem 0 1.5rem;">
          Attach this tag directly to your pet's collar harness.
        </p>
        <div style="background:#1f7a8c; padding:2rem; border-radius: var(--radius-md); display:inline-block; color:white;">
          <h3 style="font-family:'Outfit', sans-serif; font-weight:800; font-size:1.4rem; margin-bottom: 1rem;">🐾 PAWTRACE</h3>
          <div id="admin-qrcode-box" style="background:white; padding:1rem; border-radius:var(--radius-sm); display:inline-block;"></div>
          <p style="font-size: 0.8rem; margin-top: 0.5rem; font-weight:700;">
            ${escapeHTML(petName || '')}
          </p>
          <p style="font-size: 0.75rem; margin-top: 0.5rem; font-weight:600; letter-spacing:1px;">SCAN TO REPORT SCANNER GPS LOCATIONS</p>
        </div>
      </div>
    `,
    confirmText: "Print Design Layout",
    onConfirm: () => {
      window.print();
      return false;
    }
  });

  const setupQR = () => {
    const qrBox = document.getElementById('admin-qrcode-box');
    if (!qrBox) return;
    try {
      new QRCode(qrBox, {
        text: qrUrl,
        width: 160,
        height: 160,
        colorDark: "#1f7a8c",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    } catch (err) {
      console.error("Error generating QR code in Admin:", err);
      qrBox.innerHTML = `<p style="color:red; font-size:0.8rem;">QR Generation Failed</p>`;
    }
  };

  if (typeof QRCode === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = setupQR;
    document.head.appendChild(script);
  } else {
    setupQR();
  }
}

window.Admin = {
  showTab,
  updateOrderStatus,
  activatePetQR,
  makeUserAdmin,
  demoteAdmin,
  toggleDoctorVerification,
  toggleNgoApproval,
  toggleProviderStatus,
  moderateReport,
  printPetQR
};
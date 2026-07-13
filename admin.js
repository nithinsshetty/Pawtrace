// ==========================================================================
// PAWTRACE ADMIN PORTAL MODULE
// ==========================================================================

import { db, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, formatFriendlyDate } from './utils.js';
import { Router } from './router.js';

// Hardcoded admin email addresses for fallback verification
export const ADMIN_EMAILS = [
  'admin@pawtrace.com',
  'admin@example.com',
  'nithin@pawtrace.com',
  'nss@pawtrace.com',
  'nithinsshetty3@gmail.com'
];

/**
 * Checks if the current authenticated user has admin privileges
 */
export async function isAdmin() {
  const user = getCurrentUser();
  if (!user) return false;
  
  if (ADMIN_EMAILS.includes(user.email)) return true;
  
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    return userDoc.exists && userDoc.data().role === 'admin';
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
            <input type="password" id="admin-password" class="form-control" placeholder="••••••••" required autocomplete="current-password">
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

  const form = document.getElementById('admin-login-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    
    if (!ADMIN_EMAILS.includes(email)) {
      showToast("Access Denied: Email is not registered as an administrator.", "error");
      return;
    }

    showLoading(true, "Authenticating Admin...");
    try {
      await fb.auth().signInWithEmailAndPassword(email, password);
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

  // Render the admin workspace container
  viewport.innerHTML = `
    <div id="admin-workspace-container" class="admin-workspace">
      <!-- Dynamic tab content renders here -->
      <div class="skeleton-container">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-card" style="height: 300px;"></div>
      </div>
    </div>
  `;

  // Default to analytics tab on load
  showTab('analytics');
}

/**
 * Dynamically render the specified admin tab content
 * Called from either the dynamic sidebar actions or manually
 */
export async function showTab(tabId) {
  const container = document.getElementById('admin-workspace-container');
  if (!container) return;

  // Update active links in admin sidebar manually since they don't change router hash
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
      default:
        await renderAnalyticsTab(container);
    }
  } catch (error) {
    const currentUser = getCurrentUser();
    let detectedRole = "unknown";
    try {
      if (currentUser && db) {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        detectedRole = userDoc.exists ? userDoc.data().role : "no-profile";
      }
    } catch (e) {
      detectedRole = "fetch-failed";
    }

    console.error(`[Admin Portal Diagnostics] Failed to load tab "${tabId}":`, {
      error: error.message,
      errorCode: error.code || "N/A",
      uid: currentUser ? currentUser.uid : "unauthenticated",
      email: currentUser ? currentUser.email : "unauthenticated",
      detectedRole: detectedRole,
      timestamp: new Date().toISOString()
    });

    container.innerHTML = `
      <div class="glass-card text-center" style="max-width: 550px; margin: 2rem auto; padding: 2.5rem; border: 1px solid rgba(217, 93, 57, 0.2); background: rgba(217, 93, 57, 0.02);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 3.5rem; color: var(--terracotta); margin-bottom: 1.25rem;"></i>
        <h3 style="font-family:'Outfit'; font-weight:800; font-size:1.4rem; color: var(--text-main); margin-bottom: 0.5rem;">Access Denied or Query Failure</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem;">
          Firestore rejected the request due to missing or insufficient database permissions. This typically happens if your authenticated account is not assigned the "admin" role in the rules.
        </p>
        <div style="background: var(--bg-app); border: 1px solid var(--border-input); border-radius: var(--radius-sm); padding: 1.25rem; text-align: left; font-family: monospace; font-size: 0.75rem; color: var(--text-muted); word-break: break-all; display:flex; flex-direction:column; gap:0.4rem; box-shadow:inset 0 2px 4px rgba(0,0,0,0.02);">
          <div><strong style="color:var(--text-main);">Error Detail:</strong> ${error.message}</div>
          <div><strong style="color:var(--text-main);">Failed Tab:</strong> ${tabId}</div>
          <div><strong style="color:var(--text-main);">Auth UID:</strong> ${currentUser ? currentUser.uid : 'unauthenticated'}</div>
          <div><strong style="color:var(--text-main);">Auth Email:</strong> ${currentUser ? currentUser.email : 'unauthenticated'}</div>
          <div><strong style="color:var(--text-main);">Firestore Role:</strong> ${detectedRole}</div>
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
  let petsSnap, ordersSnap, usersSnap;
  
  try {
    petsSnap = await db.collection('pets').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'pets' collection:", err);
    throw new Error(`Failed to read 'pets' collection: ${err.message}`);
  }

  try {
    ordersSnap = await db.collection('orders').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'orders' collection:", err);
    throw new Error(`Failed to read 'orders' collection: ${err.message}`);
  }

  try {
    usersSnap = await db.collection('users').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'users' collection:", err);
    throw new Error(`Failed to read 'users' collection: ${err.message}`);
  }
  
  let totalPets = petsSnap.size;
  let lostPets = 0;
  let taggedPets = 0;
  let petTypes = {};

  petsSnap.forEach(doc => {
    const pet = doc.data();
    if (pet.lostStatus === 'LOST') lostPets++;
    if (pet.hasTag) taggedPets++;
    
    const type = pet.type || 'Other';
    petTypes[type] = (petTypes[type] || 0) + 1;
  });

  let totalOrders = ordersSnap.size;
  let pendingOrders = 0;
  ordersSnap.forEach(doc => {
    const order = doc.data();
    if (order.status === 'Pending') pendingOrders++;
  });

  const totalUsers = usersSnap.size;
  const tagAdoptionRate = totalPets > 0 ? Math.round((taggedPets / totalPets) * 100) : 0;

  // Build type distribution HTML
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

    <!-- Analytics Stat Cards -->
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
      <!-- Growth Analytics -->
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

      <!-- Quick Platform Actions -->
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
  let snapshot;
  try {
    snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'orders' collection:", err);
    throw new Error(`Failed to read 'orders' collection: ${err.message}`);
  }
  
  let rowsHtml = '';
  if (snapshot.empty) {
    rowsHtml = `<tr><td colspan="6" class="text-center" style="padding:2rem; color:var(--text-muted);">No smart tag orders found.</td></tr>`;
  } else {
    snapshot.forEach(doc => {
      const order = doc.data();
      order.id = doc.id;

      let statusBadge = '';
      if (order.status === 'Pending') statusBadge = '<span class="pet-status-badge lost" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Pending</span>';
      else if (order.status === 'Confirmed') statusBadge = '<span class="pet-status-badge safe" style="background:#3f8efc; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Confirmed</span>';
      else if (order.status === 'Shipped') statusBadge = '<span class="pet-status-badge safe" style="background:#8338ec; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Shipped</span>';
      else if (order.status === 'Delivered') statusBadge = '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Delivered</span>';
      else if (order.status === 'Activated') statusBadge = '<span class="pet-status-badge safe" style="background:var(--teal); position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Activated</span>';

      // Next Action buttons
      let actionButtons = '';
      if (order.status === 'Pending') {
        actionButtons = `<button class="btn btn-primary btn-sm" onclick="window.Admin.updateOrderStatus('${order.id}', 'Confirmed')" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Confirm</button>`;
      } else if (order.status === 'Confirmed') {
        actionButtons = `<button class="btn btn-secondary btn-sm" onclick="window.Admin.updateOrderStatus('${order.id}', 'Shipped')" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#8338ec; border:none; color:white;">Ship</button>`;
      } else if (order.status === 'Shipped') {
        actionButtons = `<button class="btn btn-sm" onclick="window.Admin.updateOrderStatus('${order.id}', 'Delivered')" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Deliver</button>`;
      } else if (order.status === 'Delivered') {
        actionButtons = `<button class="btn btn-sm btn-primary" onclick="window.Admin.activatePetQR('${order.id}', '${order.petId}', '${order.ownerId}')" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Activate QR</button>`;
      } else {
        actionButtons = `<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-circle-check"></i> Fulfilled</span>`;
      }

      rowsHtml += `
        <tr>
          <td><strong style="font-family:monospace; font-size:0.75rem;">${order.id.substr(0, 8)}</strong></td>
          <td><strong>${order.petName}</strong><br><span style="font-size:0.7rem; color:var(--text-muted);">${order.ownerName}</span></td>
          <td><span style="font-size:0.75rem;">${order.address}</span><br><span style="font-size:0.7rem; color:var(--text-muted);">${order.ownerPhone}</span></td>
          <td><span style="font-size:0.75rem;">${formatFriendlyDate(order.createdAt)}</span></td>
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
  let snapshot;
  try {
    snapshot = await db.collection('users').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'users' collection:", err);
    throw new Error(`Failed to read 'users' collection: ${err.message}`);
  }
  
  let rowsHtml = '';
  snapshot.forEach(doc => {
    const user = doc.data();
    user.id = doc.id;

    let role = (user.role || 'unknown').toLowerCase();
    let roleBadge = '';
    if (role === 'admin') {
      roleBadge = '<span class="pet-status-badge lost" style="background:#e63946; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Admin</span>';
    } else if (role === 'vet' || role === 'veterinarian') {
      roleBadge = '<span class="pet-status-badge safe" style="background:var(--teal); position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Vet</span>';
    } else if (role === 'ngo') {
      roleBadge = '<span class="pet-status-badge safe" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">NGO</span>';
    } else if (role === 'owner' || role === 'customer') {
      roleBadge = '<span class="pet-status-badge safe" style="background:#3f8efc; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Customer</span>';
    } else {
      roleBadge = '<span class="pet-status-badge safe" style="background:#7f8c8d; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;">Unknown</span>';
    }

    const joined = user.createdAt ? formatFriendlyDate(user.createdAt) : 'N/A';
    
    // Check if account can be promoted/managed
    let actionBtn = '';
    if (user.role !== 'admin') {
      actionBtn = `<button class="btn btn-outline btn-sm" onclick="window.Admin.makeUserAdmin('${user.id}', '${user.displayName}')" style="font-size:0.7rem; padding:0.35rem 0.5rem;">Make Admin</button>`;
    } else {
      actionBtn = `<span style="font-size:0.75rem; color:var(--text-muted);">Admin Account</span>`;
    }

    rowsHtml += `
      <tr class="user-row-item">
        <td>
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <img src="${user.photoURL || 'https://api.dicebear.com/7.x/bottts/svg?seed=' + user.id}" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">
            <div>
              <strong>${user.displayName || 'Unnamed'}</strong><br>
              <span style="font-size:0.7rem; color:var(--text-muted);">${user.email}</span>
            </div>
          </div>
        </td>
        <td>${roleBadge}</td>
        <td><span style="font-size:0.75rem;">${joined}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:flex-end;">
      <div>
        <h2 style="font-family:'Outfit'; font-weight:800; font-size:1.6rem;">Registered Users Directory</h2>
        <p style="color: var(--text-muted); font-size:0.9rem;">Inspect and manage platform users access privileges</p>
      </div>
      <div>
        <input type="text" id="admin-user-search" class="form-control" placeholder="Search by name or email..." style="width:260px; font-size:0.8rem; padding:0.5rem 1rem;">
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

  // Bind live row filtering search
  const searchInput = document.getElementById('admin-user-search');
  const tbody = document.getElementById('admin-users-tbody');
  searchInput.oninput = () => {
    const query = searchInput.value.trim().toLowerCase();
    const rows = tbody.querySelectorAll('.user-row-item');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      if (text.includes(query)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });
  };
}

async function renderDoctorsTab(container) {
  // Query all users where role == 'vet'
  let snapshot;
  try {
    snapshot = await db.collection('users').where('role', '==', 'vet').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'users' for vet roles:", err);
    throw new Error(`Failed to read users collection (vet role filter): ${err.message}`);
  }
  
  let rowsHtml = '';
  if (snapshot.empty) {
    rowsHtml = `<tr><td colspan="5" class="text-center" style="padding:2rem; color:var(--text-muted);">No registered veterinarian clinics found.</td></tr>`;
  } else {
    snapshot.forEach(doc => {
      const vet = doc.data();
      vet.id = doc.id;

      const isVerified = vet.vetDetails?.verified;
      const license = vet.vetDetails?.licenseNumber || 'N/A';
      const clinicName = vet.vetDetails?.clinicName || vet.displayName || 'Clinic';
      const specs = vet.vetDetails?.specializations?.join(', ') || 'General Medicine';

      let statusBadge = isVerified 
        ? '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-circle-check"></i> Verified</span>'
        : '<span class="pet-status-badge lost" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-clock"></i> Pending Approval</span>';

      let actionButton = isVerified
        ? `<button class="btn btn-danger btn-sm" onclick="window.Admin.toggleDoctorVerification('${vet.id}', false)" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Revoke</button>`
        : `<button class="btn btn-primary btn-sm" onclick="window.Admin.toggleDoctorVerification('${vet.id}', true)" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Verify Clinic</button>`;

      rowsHtml += `
        <tr>
          <td><strong>${clinicName}</strong><br><span style="font-size:0.7rem; color:var(--text-muted);">${vet.email}</span></td>
          <td><span style="font-family:monospace; font-weight:600; font-size:0.75rem;">${license}</span></td>
          <td><span style="font-size:0.75rem;">${specs}</span></td>
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
  // Query all users where role == 'ngo'
  let snapshot;
  try {
    snapshot = await db.collection('users').where('role', '==', 'ngo').get();
  } catch (err) {
    console.error("[Admin Portal Diagnostics] Failed to query 'users' for ngo roles:", err);
    throw new Error(`Failed to read users collection (ngo role filter): ${err.message}`);
  }
  
  let rowsHtml = '';
  if (snapshot.empty) {
    rowsHtml = `<tr><td colspan="5" class="text-center" style="padding:2rem; color:var(--text-muted);">No rescue organizations found.</td></tr>`;
  } else {
    snapshot.forEach(doc => {
      const ngo = doc.data();
      ngo.id = doc.id;

      const isApproved = ngo.ngoDetails?.approved;
      const regId = ngo.ngoDetails?.registrationId || 'N/A';
      const orgName = ngo.ngoDetails?.orgName || ngo.displayName || 'Organization';
      const location = ngo.ngoDetails?.location || 'Unknown';

      let statusBadge = isApproved 
        ? '<span class="pet-status-badge safe" style="background:#52b788; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-circle-check"></i> Approved</span>'
        : '<span class="pet-status-badge lost" style="background:#e09f3e; position:static; display:inline-block; font-size:0.7rem; text-transform:uppercase;"><i class="fa-solid fa-clock"></i> Pending Approval</span>';

      let actionButton = isApproved
        ? `<button class="btn btn-danger btn-sm" onclick="window.Admin.toggleNgoApproval('${ngo.id}', false)" style="font-size:0.7rem; padding:0.35rem 0.6rem;">Revoke</button>`
        : `<button class="btn btn-primary btn-sm" onclick="window.Admin.toggleNgoApproval('${ngo.id}', true)" style="font-size:0.7rem; padding:0.35rem 0.6rem; background:#52b788; border:none; color:white;">Approve NGO</button>`;

      rowsHtml += `
        <tr>
          <td><strong>${orgName}</strong><br><span style="font-size:0.7rem; color:var(--text-muted);">${ngo.email}</span></td>
          <td><span style="font-family:monospace; font-weight:600; font-size:0.75rem;">${regId}</span></td>
          <td><span style="font-size:0.75rem;"><i class="fa-solid fa-location-dot"></i> ${location}</span></td>
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
      newStatus === 'Confirmed' ? 'confirmedAt' :
      newStatus === 'Shipped' ? 'shippedAt' : 'deliveredAt';

    await db.collection('orders').doc(orderId).update({
      status: newStatus,
      [timestampField]: fb.firestore.FieldValue.serverTimestamp()
    });

    // Notify customer
    const orderDoc = await db.collection('orders').doc(orderId).get();
    const order = orderDoc.data();

    await db.collection('users').doc(order.ownerId).collection('notifications').add({
      type: 'STATUS_CHANGE',
      petId: order.petId,
      message: `Your smart tag order status is now: ${newStatus.toUpperCase()}.`,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
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
    // 1. Update order status to Activated
    await db.collection('orders').doc(orderId).update({
      status: 'Activated',
      qrActivated: true,
      qrActivatedAt: fb.firestore.FieldValue.serverTimestamp()
    });

    // 2. Set hasTag to true on the pet profile
    await db.collection('pets').doc(petId).update({
      hasTag: true,
      tagOrderId: orderId,
      tagActivatedAt: fb.firestore.FieldValue.serverTimestamp()
    });

    // 3. Notify owner
    const petDoc = await db.collection('pets').doc(petId).get();
    const petName = petDoc.data().name;

    await db.collection('users').doc(ownerId).collection('notifications').add({
      type: 'STATUS_CHANGE',
      petId: petId,
      message: `🎉 Celebration Alert: Your PawTrace QR pendant for ${petName} is now LIVE! View your pet details to verify.`,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
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
  showLoading(true, "Granting admin role...");
  try {
    await db.collection('users').doc(userId).update({
      role: 'admin'
    });
    showToast(`Successfully granted Admin access to ${displayName}.`, "success");
    showTab('users');
  } catch (err) {
    showToast("Failed to grant admin access.", "error");
  } finally {
    showLoading(false);
  }
}

export async function toggleDoctorVerification(vetId, verify) {
  showLoading(true, "Updating veterinarian verification status...");
  try {
    await db.collection('users').doc(vetId).update({
      'vetDetails.verified': verify
    });

    await db.collection('users').doc(vetId).collection('notifications').add({
      type: 'STATUS_CHANGE',
      message: verify 
        ? "Congratulations! Your clinic license has been verified. Owners can now authorize patient access."
        : "Verification notice: Your clinic license verification status has been revoked.",
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
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
    await db.collection('users').doc(ngoId).update({
      'ngoDetails.approved': approve
    });

    await db.collection('users').doc(ngoId).collection('notifications').add({
      type: 'STATUS_CHANGE',
      message: approve 
        ? "Congratulations! Your NGO registration status is APPROVED. Case tracking is active."
        : "Alert: Your NGO registration verification status has been suspended.",
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
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
    const usersSnap = await db.collection('users').get();
    
    // Break into batches of 450 (Firestore limit is 500 writes per batch)
    let batch = db.batch();
    let count = 0;
    
    for (const doc of usersSnap.docs) {
      const user = doc.data();
      const notifRef = db.collection('users').doc(user.uid).collection('notifications').doc();
      
      batch.set(notifRef, {
        type: 'STATUS_CHANGE',
        message: `📢 ${title}: ${message}`,
        timestamp: fb.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      
      count++;
      if (count === 400) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
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

// Bind to window context so that inline HTML onclick event actions can execute properly
window.Admin = {
  showTab,
  updateOrderStatus,
  activatePetQR,
  makeUserAdmin,
  toggleDoctorVerification,
  toggleNgoApproval
};

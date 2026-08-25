// ==========================================================================
// PAWTRACE APPLICATION ORCHESTRATOR & EVENT BINDINGS
// ==========================================================================

import { Router } from './router.js';
import { initAuth, subscribeToAuthChanges, signOut, getRouterAuthState, getCurrentUser } from './auth.js';
import { showToast, showLoading, formatFriendlyDate, escapeHTML } from './utils.js';
import { supabase } from './supabase-config.js';

// Route Rendering Modules
import { renderLogin, renderSignup } from './pages.js';
import { renderDashboard } from './dashboard.js';
import { renderPets, renderPetDetail, renderLostPets, renderPetRegisterWizard } from './pets.js';
import { renderScanPage } from './scan.js';
import { renderMedical } from './medical.js';
import { renderReminders } from './reminders.js';
import { renderJournal } from './journal.js';
import { renderCaregiver } from './caregiver.js';
import { renderVets } from './vets.js';
import { renderVetPortal, renderVetPatients } from './vet-portal.js';
import { renderNGO } from './ngo.js';
import { renderCommunity } from './community.js';
import { renderAI } from './ai.js';
import { renderProfile, renderSettings } from './settings.js';
import { renderAdminDashboard, renderAdminLogin } from './admin.js';
import { renderOrders } from './orders.js';
import { renderAdoptionCenter } from './adoptions-client.js';
import { renderServices } from './services.js';
import { renderServicePortal } from './service-portal.js';
import { renderMarketplace, renderCreateListing } from './listings.js';


// Real-time notifications unsubscribe reference (Supabase Realtime channel)
let notificationChannel = null;

// App Build Version tracking
const BUILD_VERSION = '2.1.0';

// Initialize app configuration
document.addEventListener('DOMContentLoaded', () => {
  console.log(`🐾 PawTrace PWA: Running Build Version ${BUILD_VERSION}`);
  setupGlobalDOMEvents();
  setupRoutes();
  Router.setAuthCheck(getRouterAuthState);
  initializeTheme(); // calls Router.init()

  // Register Service Worker for PWA compliance
  if ('serviceWorker' in navigator) {
    let refreshing = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('PawTrace PWA: Controller updated. Reloading page for latest assets...');
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('PawTrace PWA: Service Worker registered', reg.scope);
        reg.update();

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('PawTrace PWA: New update downloaded. Force activating...');
                showToast("New updates downloaded! Refreshing...", "info");
              }
            });
          }
        });
      })
      .catch(err => console.warn('PawTrace PWA: Service Worker registration failed', err));
  }

  // Listen to Auth State Changes
  subscribeToAuthChanges(handleAuthStateChange);

  // Start Auth flow
  initAuth();
});

/**
 * Register SPA hash path maps
 */
function setupRoutes() {
  Router.add('/login', renderLogin, false);
  Router.add('/signup', renderSignup, false);

  Router.add('/dashboard', renderDashboard, true);
  Router.add('/pets', renderPets, true);
  Router.add('/pet/register', renderPetRegisterWizard, true);
  Router.add('/pet/:id', renderPetDetail, true);
  Router.add('/pet/:id/edit', renderPetRegisterWizard, true);
  Router.add('/pet/:id/medical', renderMedical, true);
  Router.add('/pet/:id/reminders', renderReminders, true);
  Router.add('/pet/:id/journal', renderJournal, true);

  Router.add('/scan/:id', renderScanPage, false);
  Router.add('/caregiver/:token', renderCaregiver, false);
  Router.add('/lost-pets', renderLostPets, true);
  Router.add('/vets', renderVets, true);
  Router.add('/vet-portal', renderVetPortal, true);
  Router.add('/ngo', renderNGO, true);
  Router.add('/community', renderCommunity, true);
  Router.add('/ai', renderAI, true);
  Router.add('/profile', renderProfile, true);
  Router.add('/settings', renderSettings, true);
  Router.add('/admin/login', renderAdminLogin, false);
  Router.add('/admin', renderAdminDashboard, true);
  Router.add('/orders', renderOrders, true);
  Router.add('/adoption-center', renderAdoptionCenter, false);
  Router.add('/services', renderServices, true);
  Router.add('/service-portal', renderServicePortal, true);
  Router.add('/marketplace', renderMarketplace, true);
  Router.add('/marketplace/new', renderCreateListing, true);
  Router.add('/marketplace/new/:petId', renderCreateListing, true);

  // Vet Portal Sub-routes
  Router.add('/vet-portal/dashboard', renderVetPortal, true);
  Router.add('/vet-portal/patients', renderVetPatients, true);
  Router.add('/vet-portal/community', renderCommunity, true);
  Router.add('/vet-portal/settings', renderSettings, true);
  Router.add('/vet-portal/profile', renderProfile, true);
}

/**
 * Handle UI visibility and notification streams on Authentication changes.
 * NOTE: `user` here is the currentUser object built in auth.js, which already
 * includes `role` (loaded once at login) — no need to re-query the database.
 */
async function handleAuthStateChange(user, isReady) {
  if (!isReady) return;

  const sidebar = document.getElementById('app-sidebar');
  const navbar = document.getElementById('app-navbar');
  const mobileNav = document.getElementById('mobile-nav');
  const container = document.getElementById('app-container');

  if (user) {
    const role = user.role || 'customer';
    let roleText = "Pet Owner";
    if (role === 'vet') roleText = "Veterinarian";
    else if (role === 'ngo') roleText = "Rescue Organization";
    else if (role === 'admin') roleText = "Administrator";
    else if (role === 'service_provider') roleText = "Service Provider";

    await checkPortalGuards(user, window.location.hash);
    const portalContext = getPortalContext(window.location.hash, user, role);
    await updateSidebarForRole(portalContext, user, role);

    const hash = window.location.hash || '#/dashboard';
    const isFullWidthPage = ['#/login', '#/signup', '#/admin/login'].includes(hash) || hash.startsWith('#/scan/') || hash.startsWith('#/caregiver/');

    if (isFullWidthPage) {
      sidebar.classList.add('hidden');
      navbar.classList.add('hidden');
      mobileNav.classList.add('hidden');
      if (container) container.classList.add('logged-out');
    } else {
      sidebar.classList.remove('hidden');
      navbar.classList.remove('hidden');
      if (container) container.classList.remove('logged-out');

      if (window.innerWidth <= 768) {
        mobileNav.classList.remove('hidden');
      }
    }

    const sideName = document.getElementById('sidebar-user-name');
    const sideAvatar = document.getElementById('sidebar-user-avatar');
    const sideRole = document.getElementById('sidebar-user-role');

    if (sideName) sideName.textContent = user.displayName || user.email.split('@')[0];
    if (sideRole) sideRole.textContent = roleText;
    if (sideAvatar && user.photoURL) {
      sideAvatar.src = user.photoURL;
    }

    startNotificationListener(user.uid);
  } else {
    sidebar.classList.add('hidden');
    navbar.classList.add('hidden');
    mobileNav.classList.add('hidden');
    if (container) container.classList.add('logged-out');

    sessionStorage.removeItem('portal_context');

    stopNotificationListener();
  }
}

/**
 * Fetch current notifications and render into the dropdown panel
 */
async function fetchAndRenderNotifications(uid) {
  const listContainer = document.getElementById('notification-list');
  if (!listContainer) return;

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Notification fetch error:", error);
    return;
  }

  let unreadCount = 0;
  listContainer.innerHTML = '';

  if (!notifications || notifications.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state-mini">
        <i class="fa-solid fa-bell-slash"></i>
        <p>All caught up!</p>
      </div>
    `;
    updateNotificationBadge(0);
    return;
  }

  notifications.forEach((data) => {
    if (!data.is_read) unreadCount++;

    const item = document.createElement('div');
    item.className = `notification-item ${data.type === 'QR_SCAN' ? 'scan-alert' : ''}`;

    let title = "Alert";
    let icon = "fa-bell";

    if (data.type === 'QR_SCAN') {
      title = "QR Tag Scanned";
      icon = "fa-location-crosshairs";
    } else if (data.type === 'REMINDER') {
      title = "Reminder Due";
      icon = "fa-clock";
    } else if (data.type === 'STATUS_CHANGE') {
      title = "Status Update";
      icon = "fa-paw";
    }

    // FIX (XSS): data.maps_link validated as a real http(s) URL before use
    // in href — a stored notification is not guaranteed to be well-formed.
    let mapMarkup = '';
    const safeMapsLink = isSafeHttpUrl(data.maps_link) ? data.maps_link : '';
    if (safeMapsLink) {
      mapMarkup = `
        <a href="${escapeHTML(safeMapsLink)}" target="_blank" class="notification-map-link">
          <i class="fa-solid fa-map-location-dot"></i> View on Google Maps
        </a>
      `;
    }

    // FIX (XSS): data.message was previously inserted raw. This field is
    // built from many different insert call sites across the codebase
    // (vet-portal.js, ngo.js, adoptions-client.js, orders.js, admin.js
    // broadcasts, scan.js), several of which include user-controlled
    // values (pet names, admin broadcast text) without escaping at the
    // insert site. Escaping here at the render sink closes every one of
    // those paths at once, rather than requiring every insert call site
    // to remember to escape individually.
    item.innerHTML = `
      <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
        <i class="fa-solid ${icon}" style="margin-top: 0.2rem; color: var(--terracotta);"></i>
        <div>
          <strong style="display:block; font-size: 0.85rem;">${title}</strong>
          <p style="margin: 0.2rem 0; font-size: 0.8rem;">${escapeHTML(data.message)}</p>
          ${mapMarkup}
          <div class="notification-time">${formatFriendlyDate(data.created_at)}</div>
        </div>
      </div>
    `;
    listContainer.appendChild(item);
  });

  updateNotificationBadge(unreadCount);
}

/**
 * Set up Supabase Realtime subscription for this user's notifications.
 * Fetches current state immediately, then re-fetches on any change.
 */
function startNotificationListener(uid) {
  stopNotificationListener(); // safety clear

  fetchAndRenderNotifications(uid);

  notificationChannel = supabase
    .channel(`notifications:${uid}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const data = payload.new;
          showToast(data.message, data.type === 'QR_SCAN' ? 'warning' : 'info');
        }
        fetchAndRenderNotifications(uid);
      }
    )
    .subscribe();
}

function stopNotificationListener() {
  if (notificationChannel) {
    supabase.removeChannel(notificationChannel);
    notificationChannel = null;
  }
}

function updateNotificationBadge(count) {
  const badge = document.getElementById('notification-badge');
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

/**
 * Configure DOM Event Listeners for sidebars, bells, toggles, logout, drawer overlays
 */
function setupGlobalDOMEvents() {
  const menuBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');

  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.getElementById('app-container').appendChild(overlay);
  }

  if (menuBtn && sidebar) {
    menuBtn.onclick = () => {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    };

    overlay.onclick = () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    };
  }

  window.addEventListener('hashchange', async () => {
    const sidebar = document.getElementById('app-sidebar');
    const navbar = document.getElementById('app-navbar');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    const user = getCurrentUser();
    if (user) {
      await checkPortalGuards(user, window.location.hash);

      const role = user.role || 'customer';
      const portalContext = getPortalContext(window.location.hash, user, role);
      await updateSidebarForRole(portalContext, user, role);

      const hash = window.location.hash || '#/dashboard';
      const isFullWidthPage = ['#/login', '#/signup', '#/admin/login'].includes(hash) || hash.startsWith('#/scan/') || hash.startsWith('#/caregiver/');

      const mobileNav = document.getElementById('mobile-nav');
      const container = document.getElementById('app-container');

      if (isFullWidthPage) {
        sidebar.classList.add('hidden');
        navbar.classList.add('hidden');
        mobileNav.classList.add('hidden');
        if (container) container.classList.add('logged-out');
      } else {
        sidebar.classList.remove('hidden');
        navbar.classList.remove('hidden');
        if (container) container.classList.remove('logged-out');
        if (window.innerWidth <= 768) {
          mobileNav.classList.remove('hidden');
        } else {
          mobileNav.classList.add('hidden');
        }
      }
    }
  });

  const notifBtn = document.getElementById('notification-toggle');
  const notifPanel = document.getElementById('notification-panel');
  if (notifBtn && notifPanel) {
    notifBtn.onclick = (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('hidden');
    };

    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && e.target !== notifBtn) {
        notifPanel.classList.add('hidden');
      }
    });

    const clearBtn = document.getElementById('clear-notifications');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        const user = getCurrentUser();
        if (!user) return;

        try {
          const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', user.uid);

          if (error) throw error;
          showToast("Notifications cleared.", "info");
          fetchAndRenderNotifications(user.uid);
        } catch (error) {
          console.error("Error clearing notifications:", error);
          showToast("Failed to clear notifications.", "error");
        }
      };
    }
  }

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      signOut();
    };
  }

  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.onclick = () => {
      toggleTheme();
    };
  }

  window.onresize = () => {
    const mobileNav = document.getElementById('mobile-nav');
    const user = getCurrentUser();
    if (mobileNav && user) {
      if (window.innerWidth <= 768) {
        mobileNav.classList.remove('hidden');
      } else {
        mobileNav.classList.add('hidden');
      }
    }
  };
}

/**
 * Handle Theme Styling Switcher
 */
function initializeTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  const toggleIcon = document.querySelector('#theme-toggle i');

  if (currentTheme === 'dark') {
    document.body.classList.add('dark-theme');
    if (toggleIcon) {
      toggleIcon.className = 'fa-solid fa-sun';
    }
  } else {
    document.body.classList.remove('dark-theme');
    if (toggleIcon) {
      toggleIcon.className = 'fa-solid fa-moon';
    }
  }

  showLoading(false);
  Router.init();
}

function toggleTheme() {
  const toggleIcon = document.querySelector('#theme-toggle i');
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    localStorage.setItem('theme', 'light');
    if (toggleIcon) toggleIcon.className = 'fa-solid fa-moon';
    showToast("Switched to Light Theme", "info");
  } else {
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
    if (toggleIcon) toggleIcon.className = 'fa-solid fa-sun';
    showToast("Switched to Dark Theme", "info");
  }
}

/**
 * Resolve the current active portal based on routing URL hash
 */
export function getPageType(hash) {
  if (hash.startsWith('#/admin')) return 'admin';
  if (hash.startsWith('#/vet-portal')) return 'vet';
  if (hash.startsWith('#/ngo')) return 'ngo';
  if (hash.startsWith('#/service-portal')) return 'service_provider';
  return 'customer';
}

/**
 * Capture and cache active portal context dynamically, preserving shared routing pages
 */
export function getPortalContext(hash, user, role = 'customer') {
  if (!user) {
    sessionStorage.removeItem('portal_context');
    return 'customer';
  }

  if (hash.startsWith('#/admin')) {
    sessionStorage.setItem('portal_context', 'admin');
    return 'admin';
  }
  if (hash.startsWith('#/vet-portal')) {
    sessionStorage.setItem('portal_context', 'vet');
    return 'vet';
  }
  if (hash.startsWith('#/ngo')) {
    sessionStorage.setItem('portal_context', 'ngo');
    return 'ngo';
  }
  if (hash.startsWith('#/service-portal')) {
    sessionStorage.setItem('portal_context', 'service_provider');
    return 'service_provider';
  }
  if (hash === '#/dashboard' || hash.startsWith('#/pets') || hash.startsWith('#/orders') || hash.startsWith('#/pet/') || hash === '#/adoption-center') {
    sessionStorage.setItem('portal_context', 'customer');
    return 'customer';
  }

  const savedContext = sessionStorage.getItem('portal_context');
  if (savedContext) {
    return savedContext;
  }

  let context = 'customer';
  if (role === 'vet') context = 'vet';
  else if (role === 'ngo') context = 'ngo';
  else if (role === 'admin') context = 'admin';
  else if (role === 'service_provider') context = 'service_provider';

  sessionStorage.setItem('portal_context', context);
  return context;
}

/**
 * Portal guards checking and role-based redirects.
 * `user` already carries `.role` from auth.js — no database query needed here.
 */
export async function checkPortalGuards(user, hash) {
  if (!user) return;

  const role = user.role || 'customer';
  const pageType = getPageType(hash);

  if (hash === '#/login' || hash === '#/signup') {
    if (role === 'vet') Router.navigate('/vet-portal');
    else if (role === 'ngo') Router.navigate('/ngo');
    else if (role === 'service_provider') Router.navigate('/service-portal');
    else if (role === 'admin') Router.navigate('/admin');
    else Router.navigate('/dashboard');
    return;
  }

  if (role === 'vet' && (pageType === 'customer' || pageType === 'admin')) {
    if (hash !== '#/community' && hash !== '#/settings' && hash !== '#/profile' && hash !== '#/adoption-center') {
      console.warn("Portal Guard: Redirecting Vet to Clinical Board.");
      Router.navigate('/vet-portal');
    }
  }
  else if (role === 'ngo' && (pageType === 'customer' || pageType === 'admin')) {
    if (hash !== '#/community' && hash !== '#/settings' && hash !== '#/profile' && hash !== '#/lost-pets' && hash !== '#/adoption-center') {
      console.warn("Portal Guard: Redirecting NGO to Rescue Hub.");
      Router.navigate('/ngo');
    }
  }
  else if (role === 'service_provider' && (pageType === 'customer' || pageType === 'admin')) {
    if (hash !== '#/community' && hash !== '#/settings' && hash !== '#/profile' && hash !== '#/adoption-center') {
      console.warn("Portal Guard: Redirecting Service Provider to Service Portal.");
      Router.navigate('/service-portal');
    }
  }
  if (role === 'admin' && pageType !== 'admin') {
    if (hash !== '#/profile' && hash !== '#/settings') {
      console.warn("Portal Guard: Redirecting Admin to Admin Console.");
      Router.navigate('/admin');
    }
  }
  else if (role === 'owner' || role === 'customer' || !role) {
    if (pageType === 'admin' || pageType === 'vet' || pageType === 'ngo' || pageType === 'service_provider') {
      console.warn("Portal Guard: Redirecting Customer to Dashboard.");
      Router.navigate('/dashboard');
    }
  }
}

export async function updateSidebarForRole(portalContext, user, role = 'customer') {
  const sidebarMenu = document.querySelector('.sidebar-menu');
  if (!sidebarMenu) return;

  if (sidebarMenu.dataset.context === portalContext) {
    return;
  }

  sidebarMenu.dataset.context = portalContext;

  if (portalContext === 'admin') {
    sidebarMenu.innerHTML = `
      <a href="javascript:void(0);" class="menu-item" data-tab="analytics" onclick="window.Admin.showTab('analytics')">
        <i class="fa-solid fa-chart-line"></i>
        <span>Dashboard</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="orders" onclick="window.Admin.showTab('orders')">
        <i class="fa-solid fa-truck-ramp-box"></i>
        <span>Tag Orders</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="users" onclick="window.Admin.showTab('users')">
        <i class="fa-solid fa-users-gear"></i>
        <span>User Control</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="doctors" onclick="window.Admin.showTab('doctors')">
        <i class="fa-solid fa-user-doctor"></i>
        <span>Vet Verification</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="ngos" onclick="window.Admin.showTab('ngos')">
        <i class="fa-solid fa-handshake-angle"></i>
        <span>NGO Approval</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="announcements" onclick="window.Admin.showTab('announcements')">
        <i class="fa-solid fa-bullhorn"></i>
        <span>Broadcast</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="providers" onclick="window.Admin.showTab('providers')">
        <i class="fa-solid fa-user-check"></i>
        <span>Service Partners</span>
      </a>
      <a href="javascript:void(0);" class="menu-item" data-tab="reports" onclick="window.Admin.showTab('reports')">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <span>Flagged Reports</span>
      </a>
      <a href="#/dashboard" class="menu-item">
        <i class="fa-solid fa-arrow-left"></i>
        <span>Exit Portal</span>
      </a>
    `;
  } else if (portalContext === 'vet') {
    sidebarMenu.innerHTML = `
      <a href="#/vet-portal" class="menu-item" id="nav-vet-portal">
        <i class="fa-solid fa-briefcase-medical"></i>
        <span>Clinical Board</span>
      </a>
      <a href="#/vet-portal/patients" class="menu-item" id="nav-vet-patients">
        <i class="fa-solid fa-file-medical"></i>
        <span>Patient Records</span>
      </a>
      <a href="#/vet-portal/community" class="menu-item" id="nav-vet-community">
        <i class="fa-solid fa-users"></i>
        <span>Community</span>
      </a>
      <a href="#/vet-portal/profile" class="menu-item" id="nav-vet-profile"><i class="fa-solid fa-user-gear"></i><span>Account Profile</span></a>
      
    `;
  } else if (portalContext === 'ngo') {
    sidebarMenu.innerHTML = `
      <a href="#/ngo" class="menu-item" id="nav-ngo">
        <i class="fa-solid fa-handshake-angle"></i>
        <span>Command Center</span>
      </a>
      <a href="#/community" class="menu-item">
        <i class="fa-solid fa-users"></i>
        <span>Community</span>
      </a>
      <a href="#/profile" class="menu-item">
        <i class="fa-solid fa-user-gear"></i>
        <span>Profile Settings</span>
      </a>
    `;
  } else if (portalContext === 'service_provider') {
    sidebarMenu.innerHTML = `
      <a href="#/service-portal" class="menu-item" id="nav-service-portal">
        <i class="fa-solid fa-handshake-angle"></i>
        <span>Service Portal</span>
      </a>
      <a href="#/community" class="menu-item">
        <i class="fa-solid fa-users"></i>
        <span>Community Feed</span>
      </a>
      <a href="#/profile" class="menu-item">
        <i class="fa-solid fa-user-gear"></i>
        <span>Profile Settings</span>
      </a>
    `;
  } else {
    let portalBackLink = '';
    if (role === 'vet') {
      portalBackLink = `
        <a href="#/vet-portal" class="menu-item return-link return-link-vet">
          <i class="fa-solid fa-briefcase-medical"></i>
          <span>Return to Clinic</span>
        </a>
      `;
    } else if (role === 'ngo') {
      portalBackLink = `
        <a href="#/ngo" class="menu-item return-link return-link-ngo">
          <i class="fa-solid fa-handshake-angle"></i>
          <span>Return to Rescue</span>
        </a>
      `;
    } else if (role === 'admin') {
      portalBackLink = `
        <a href="#/admin" class="menu-item return-link return-link-admin">
          <i class="fa-solid fa-lock"></i>
          <span>Admin Console</span>
        </a>
      `;
    } else if (role === 'service_provider') {
      portalBackLink = `
        <a href="#/service-portal" class="menu-item return-link return-link-provider">
          <i class="fa-solid fa-handshake-angle"></i>
          <span>Service Portal</span>
        </a>
      `;
    }

    sidebarMenu.innerHTML = `
      <a href="#/dashboard" class="menu-item" id="nav-dashboard">
        <i class="fa-solid fa-chart-line"></i>
        <span>Dashboard</span>
      </a>
      <a href="#/pets" class="menu-item" id="nav-pets">
        <i class="fa-solid fa-paw"></i>
        <span>My Companions</span>
      </a>
      <a href="#/orders" class="menu-item" id="nav-orders">
        <i class="fa-solid fa-truck-fast"></i>
        <span>Smart Tag Orders</span>
      </a>
      <a href="#/lost-pets" class="menu-item" id="nav-lost-pets">
        <i class="fa-solid fa-location-dot"></i>
        <span>Lost & Found</span>
      </a>
      <a href="#/vets" class="menu-item" id="nav-vets">
        <i class="fa-solid fa-user-doctor"></i>
        <span>Find Care</span>
      </a>
      <a href="#/services" class="menu-item" id="nav-services">
        <i class="fa-solid fa-handshake-angle"></i>
        <span>Browse Services</span>
      </a>
      <a href="#/marketplace" class="menu-item" id="nav-marketplace">
        <i class="fa-solid fa-store"></i>
        <span>Pet Marketplace</span>
      </a>
      <a href="#/community" class="menu-item" id="nav-community">
        <i class="fa-solid fa-users"></i>
        <span>Community Feed</span>
      </a>
      <a href="#/ai" class="menu-item" id="nav-ai">
        <i class="fa-solid fa-robot"></i>
        <span>Predictive Analytics</span>
      </a>
      <a href="#/adoption-center" class="menu-item" id="nav-adoption-center">
        <i class="fa-solid fa-shield-heart"></i>
        <span>Adoption Center</span>
      </a>
      <a href="#/profile" class="menu-item" id="nav-profile">
        <i class="fa-solid fa-user-gear"></i>
        <span>Profile Settings</span>
      </a>
      ${portalBackLink}
    `;
  }

  Router.updateActiveNavLinks(window.location.hash || '#/dashboard');
}

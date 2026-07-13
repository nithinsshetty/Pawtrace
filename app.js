// ==========================================================================
// PAWTRACE APPLICATION ORCHESTRATOR & EVENT BINDINGS
// ==========================================================================

import { Router } from './router.js';
import { initAuth, subscribeToAuthChanges, signOut, getRouterAuthState, getCurrentUser } from './auth.js';
import { checkFirebaseSetup, showToast, showLoading, formatFriendlyDate } from './utils.js';
import { db } from './firebase-config.js';

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
import { renderAdminDashboard, renderAdminLogin, ADMIN_EMAILS } from './admin.js';
import { renderOrders } from './orders.js';
import { renderAdoptionCenter } from './adoptions-client.js';
import { renderPortfolio } from './portfolio.js';


// Real-time notifications unsubscribe listener
let notificationListener = null;

// App Build Version tracking
const BUILD_VERSION = '2.0.9';

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

    // Detect when a new service worker takes control and force refresh the page
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
        
        // Check for updates on load
        reg.update();

        // Listen for new service worker installs
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
  Router.add('/portfolio', renderPortfolio, false);


  // NGO Portal Sub-routes (unified command center under /ngo)

  // Vet Portal Sub-routes
  Router.add('/vet-portal/dashboard', renderVetPortal, true);
  Router.add('/vet-portal/patients', renderVetPatients, true);
  Router.add('/vet-portal/community', renderCommunity, true);
  Router.add('/vet-portal/settings', renderSettings, true);
  Router.add('/vet-portal/profile', renderProfile, true);
}

/**
 * Handle UI visibility and notification streams on Authentication changes
 */
async function handleAuthStateChange(user, isReady) {
  if (!isReady) return;

  const sidebar = document.getElementById('app-sidebar');
  const navbar = document.getElementById('app-navbar');
  const mobileNav = document.getElementById('mobile-nav');
  const container = document.getElementById('app-container');

  if (user) {
    // Retrieve full profile from Firestore to display role-aware indicators
    let roleText = "Pet Owner";
    let role = "customer";
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        role = userDoc.data().role;
        if (role === 'vet') roleText = "Veterinarian";
        else if (role === 'ngo') roleText = "Rescue Organization";
        else if (role === 'admin') roleText = "Administrator";
      }
    } catch (err) {
      console.warn("Error resolving user role details from Firestore:", err);
    }

    // Run portal guards and dynamically render active sidebar layout
    await checkPortalGuards(user, window.location.hash);
    const portalContext = getPortalContext(window.location.hash, user, role);
    await updateSidebarForRole(portalContext, user, role);

    const hash = window.location.hash || '#/dashboard';
    const isFullWidthPage = ['#/login', '#/signup', '#/admin/login', '#/portfolio'].includes(hash) || hash.startsWith('#/scan/') || hash.startsWith('#/caregiver/');

    if (isFullWidthPage) {
      sidebar.classList.add('hidden');
      navbar.classList.add('hidden');
      mobileNav.classList.add('hidden');
      if (container) container.classList.add('logged-out');
    } else {
      // User is authenticated, adjust shell UI visibility
      sidebar.classList.remove('hidden');
      navbar.classList.remove('hidden');
      if (container) container.classList.remove('logged-out');
      
      // Check if on mobile breakpoint for bottom nav bar
      if (window.innerWidth <= 768) {
        mobileNav.classList.remove('hidden');
      }
    }


    // Update Profile QuickCard in sidebar
    const sideName = document.getElementById('sidebar-user-name');
    const sideAvatar = document.getElementById('sidebar-user-avatar');
    const sideRole = document.getElementById('sidebar-user-role');
    
    if (sideName) sideName.textContent = user.displayName || user.email.split('@')[0];
    if (sideRole) sideRole.textContent = roleText;
    if (sideAvatar && user.photoURL) {
      sideAvatar.src = user.photoURL;
    }

    // Run verification setup check
    checkFirebaseSetup();

    // Start listening to notifications
    startNotificationListener(user.uid);
  } else {
    // User signed out, hide navigation shells
    sidebar.classList.add('hidden');
    navbar.classList.add('hidden');
    mobileNav.classList.add('hidden');
    if (container) container.classList.add('logged-out');
    
    // Clear portal context on logout
    sessionStorage.removeItem('portal_context');
    
    // Stop listening to notifications
    stopNotificationListener();
  }
}

/**
 * Set up real-time listener to users/{uid}/notifications in Firestore
 */
function startNotificationListener(uid) {
  if (!db) return;
  
  stopNotificationListener(); // safety clear

  try {
    notificationListener = db.collection('users').doc(uid).collection('notifications')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .onSnapshot((snapshot) => {
        let unreadCount = 0;
        const listContainer = document.getElementById('notification-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (snapshot.empty) {
          listContainer.innerHTML = `
            <div class="empty-state-mini">
              <i class="fa-solid fa-bell-slash"></i>
              <p>All caught up!</p>
            </div>
          `;
          updateNotificationBadge(0);
          return;
        }

        snapshot.forEach((doc) => {
          const data = doc.data();
          if (!data.read) unreadCount++;

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

          let mapMarkup = '';
          if (data.mapsLink) {
            mapMarkup = `
              <a href="${data.mapsLink}" target="_blank" class="notification-map-link">
                <i class="fa-solid fa-map-location-dot"></i> View on Google Maps
              </a>
            `;
          }

          item.innerHTML = `
            <div style="display: flex; gap: 0.5rem; align-items: flex-start;">
              <i class="fa-solid ${icon}" style="margin-top: 0.2rem; color: var(--terracotta);"></i>
              <div>
                <strong style="display:block; font-size: 0.85rem;">${title}</strong>
                <p style="margin: 0.2rem 0; font-size: 0.8rem;">${data.message}</p>
                ${mapMarkup}
                <div class="notification-time">${formatFriendlyDate(data.timestamp)}</div>
              </div>
            </div>
          `;
          listContainer.appendChild(item);

          // If this is a fresh doc during session, trigger a Toast popup
          if (!data.read && data.timestamp && (Date.now() - (data.timestamp.toDate ? data.timestamp.toDate().getTime() : data.timestamp)) < 15000) {
            showToast(data.message, data.type === 'QR_SCAN' ? 'warning' : 'info');
          }
        });

        updateNotificationBadge(unreadCount);
      }, (error) => {
        console.error("Notification listener error:", error);
      });
  } catch (error) {
    console.error("Failed to start notifications watcher:", error);
  }
}

function stopNotificationListener() {
  if (notificationListener) {
    notificationListener();
    notificationListener = null;
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
  // Sidebar Toggles for responsive layouts
  const menuBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  
  // Create Sidebar Mobile overlay if not existing
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

  // Watch for router route changes to close mobile side drawer automatically
  window.addEventListener('hashchange', async () => {
    const sidebar = document.getElementById('app-sidebar');
    const navbar = document.getElementById('app-navbar');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    const user = getCurrentUser();
    if (user) {
      await checkPortalGuards(user, window.location.hash);
      
      let role = 'customer';
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          role = userDoc.data().role;
        }
      } catch (err) {
        console.warn("Error resolving user role on hashchange:", err);
      }
      
      const portalContext = getPortalContext(window.location.hash, user, role);
      await updateSidebarForRole(portalContext, user, role);

      // Dynamically show/hide sidebar based on active page route for logged in users
      const hash = window.location.hash || '#/dashboard';
      const isFullWidthPage = ['#/login', '#/signup', '#/admin/login', '#/portfolio'].includes(hash) || hash.startsWith('#/scan/') || hash.startsWith('#/caregiver/');

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


  // Notification panel toggle dropdown
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

    // Clear notifications callback
    const clearBtn = document.getElementById('clear-notifications');
    if (clearBtn) {
      clearBtn.onclick = async () => {
        const user = getCurrentUser();
        if (!user || !db) return;
        
        try {
          const snapshot = await db.collection('users').doc(user.uid).collection('notifications').get();
          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
          showToast("Notifications cleared.", "info");
        } catch (error) {
          console.error("Error clearing notifications:", error);
          showToast("Failed to clear notifications.", "error");
        }
      };
    }
  }

  // Sign out button setup
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      signOut();
    };
  }

  // Dark Mode switcher
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.onclick = () => {
      toggleTheme();
    };
  }

  // Listen to mobile nav items resize checks
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
  
  // Hide fullscreen screen loader once DOM is parsed and configured
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

  // Explicit portal routes set/override the context
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
  if (hash === '#/dashboard' || hash.startsWith('#/pets') || hash.startsWith('#/orders') || hash.startsWith('#/pet/') || hash === '#/adoption-center') {
    sessionStorage.setItem('portal_context', 'customer');
    return 'customer';
  }

  // Shared sub-pages preserve the active context if existing, otherwise default to user role
  const savedContext = sessionStorage.getItem('portal_context');
  if (savedContext) {
    return savedContext;
  }

  // Default context fallback based on database role
  let context = 'customer';
  if (role === 'vet') context = 'vet';
  else if (role === 'ngo') context = 'ngo';
  else if (role === 'admin') context = 'admin';

  sessionStorage.setItem('portal_context', context);
  return context;
}

/**
 * Portal guards checking and role-based redirects
 */
export async function checkPortalGuards(user, hash) {
  if (!user || !db) return;
  
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) return;
    
    const role = userDoc.data().role;
    const pageType = getPageType(hash);

    // Redirect logged-in users from guest auth pages to their dashboards
    if (hash === '#/login' || hash === '#/signup') {
      if (role === 'vet') Router.navigate('/vet-portal');
      else if (role === 'ngo') Router.navigate('/ngo');
      else if (role === 'admin' || ADMIN_EMAILS.includes(user.email)) Router.navigate('/admin');
      else Router.navigate('/dashboard');
      return;
    }

    // Vet Portal Guards
    if (role === 'vet' && (pageType === 'customer' || pageType === 'admin')) {
      if (hash !== '#/community' && hash !== '#/settings' && hash !== '#/profile' && hash !== '#/adoption-center') {
        console.warn("Portal Guard: Redirecting Vet to Clinical Board.");
        Router.navigate('/vet-portal');
      }
    }
    // NGO Portal Guards
    else if (role === 'ngo' && (pageType === 'customer' || pageType === 'admin')) {
      if (hash !== '#/community' && hash !== '#/settings' && hash !== '#/profile' && hash !== '#/lost-pets' && hash !== '#/adoption-center') {
        console.warn("Portal Guard: Redirecting NGO to Rescue Hub.");
        Router.navigate('/ngo');
      }
    }
    // Admin Portal Guards
    else if ((role === 'admin' || ADMIN_EMAILS.includes(user.email)) && pageType !== 'admin') {
      if (hash !== '#/profile' && hash !== '#/settings') {
        console.warn("Portal Guard: Redirecting Admin to Admin Console.");
        Router.navigate('/admin');
      }
    }
    // Customer Portal Guards
    else if (role === 'owner' || role === 'customer' || !role) {
      if (pageType === 'admin' || pageType === 'vet' || pageType === 'ngo') {
        console.warn("Portal Guard: Redirecting Customer to Dashboard.");
        Router.navigate('/dashboard');
      }
    }
  } catch (e) {
    console.error("Portal guards evaluation failed:", e);
  }
}

export async function updateSidebarForRole(portalContext, user, role = 'customer') {
  const sidebarMenu = document.querySelector('.sidebar-menu');
  if (!sidebarMenu) return;

  // If the correct sidebar is already rendered, do not rebuild it.
  // This prevents resetting scroll state, active menu highlighting, and tab states.
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
        <i class="fa-solid fa-folder-medical"></i>
        <span>Patient Records</span>
      </a>
      <a href="#/vet-portal/community" class="menu-item" id="nav-vet-community">
        <i class="fa-solid fa-users"></i>
        <span>Community</span>
      </a>
      <a href="#/vet-portal/settings" class="menu-item" id="nav-vet-settings">
        <i class="fa-solid fa-sliders"></i>
        <span>Settings</span>
      </a>
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

  // Re-apply active highlighting after sidebar html is rendered/rebuilt
  Router.updateActiveNavLinks(window.location.hash || '#/dashboard');
}

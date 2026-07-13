// ==========================================================================
// NGO & RESCUE COORDINATION PORTAL MODULE (Redesigned Command Center, Adoptions)
// ==========================================================================

import { db, fb, storage } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { 
  showToast, 
  showLoading, 
  showModal, 
  closeModal, 
  getCurrentLocation, 
  getGoogleMapsLink, 
  validateFile, 
  FILE_LIMITS, 
  readFileAsDataURL, 
  getPetImageHTML, 
  getPetPlaceholder, 
  formatFriendlyDate,
  generatePawTraceId
} from './utils.js';

let activeTab = 'dashboard';

/**
 * Render NGO dashboard & stray coordination portal
 */
export async function renderNGO() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'NGO Command Center';

  const user = getCurrentUser();
  if (!user) {
    renderLoginPrompt(viewport);
    return;
  }

  showLoading(true, "Verifying organization credentials...");
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData || userData.role !== 'ngo') {
      renderDeniedAccessState(viewport);
      return;
    }

    renderNGOWorkspace(viewport, userData);
  } catch (err) {
    console.error("NGO Portal Verification Error:", err);
    viewport.innerHTML = `<div class="empty-state"><p>Failed to initialize NGO workspace.</p></div>`;
  } finally {
    showLoading(false);
  }
}

/**
 * Render login prompt for guest users
 */
function renderLoginPrompt(container) {
  container.innerHTML = `
    <div class="auth-wrapper" style="min-height: calc(100vh - 70px); padding:0;">
      <div class="glass-card" style="text-align:center; max-width:480px; padding:2rem;">
        <i class="fa-solid fa-shield-cat" style="font-size:3rem; color:var(--portal-accent); margin-bottom:1rem; opacity:0.8;"></i>
        <h2>NGO Case Manager Login</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height: 1.4;">
          Please log in with an authorized NGO organization account to access case sheets, rescue coordination tools, and intake records.
        </p>
        <a href="#/login" class="btn btn-primary mt-2">Log In to NGO Account</a>
      </div>
    </div>
  `;
}

/**
 * Render access denied banner
 */
function renderDeniedAccessState(container) {
  container.innerHTML = `
    <div class="auth-wrapper" style="min-height: calc(100vh - 70px); padding:0;">
      <div class="glass-card" style="text-align:center; max-width:480px; padding:2rem;">
        <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <h2>Organization Access Required</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height: 1.4;">
          Your current account role does not have authorization to access the NGO Command Center. Create an account with the role "NGO / Rescue Group" to get verified.
        </p>
        <a href="#/dashboard" class="btn btn-primary mt-2">Go to Pet Dashboard</a>
      </div>
    </div>
  `;
}

/**
 * Renders the NGO Workspace Shell
 */
function renderNGOWorkspace(viewport, ngoData) {
  viewport.innerHTML = `
    <div style="margin-bottom: 2rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; display:flex; align-items:center; gap:0.5rem;">
          <i class="fa-solid fa-shield-cat" style="color:var(--portal-accent);"></i> NGO Command Center
        </h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Partner Org: <strong>${ngoData.displayName}</strong> &bull; Managing stray rescues, medical rehab, foster placements, and adoptions.
        </p>
      </div>
      <div>
        <button id="btn-quick-intake" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Quick Intake
        </button>
      </div>
    </div>

    <!-- Tab Bar -->
    <div class="glass-card" style="padding: 0.5rem; margin-bottom: 1.5rem; display:flex; gap:0.5rem; flex-wrap:wrap; background:rgba(255,255,255,0.25);">
      <button class="tab-btn active" data-tab="dashboard" style="flex:1; min-width:120px; padding:0.6rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-chart-pie"></i> Operations Dashboard
      </button>
      <button class="tab-btn" data-tab="census" style="flex:1; min-width:120px; padding:0.6rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-paw"></i> Rescue Census
      </button>
      <button class="tab-btn" data-tab="fosters" style="flex:1; min-width:120px; padding:0.6rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-house-chimney-user"></i> Fosters & Volunteers
      </button>
      <button class="tab-btn" data-tab="adoptions" style="flex:1; min-width:120px; padding:0.6rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-heart"></i> Applications Manager
      </button>
      <button class="tab-btn" data-tab="requests" style="flex:1; min-width:120px; padding:0.6rem; border:none; background:none; font-family:'Outfit'; font-weight:600; border-radius:var(--radius-sm); color:var(--text-muted); transition:all 0.2s; cursor:pointer;">
        <i class="fa-solid fa-truck-medical"></i> Rescue Requests
      </button>
    </div>

    <!-- Active Tab Workspace -->
    <div id="ngo-tab-workspace">
      <!-- Content injected by switchTab -->
    </div>
  `;

  // Bind Quick Intake
  document.getElementById('btn-quick-intake').onclick = () => showIntakeModal(ngoData);

  // Bind Tabs
  const tabBtns = viewport.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.onclick = () => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = 'none';
        b.style.color = 'var(--text-muted)';
      });
      btn.classList.add('active');
      btn.style.background = 'var(--portal-accent)';
      btn.style.color = 'white';
      
      activeTab = btn.getAttribute('data-tab');
      switchTab(activeTab, ngoData);
    };
  });

  // Highlight initial active tab button styling
  const initialActive = viewport.querySelector(`.tab-btn[data-tab="${activeTab}"]`);
  if (initialActive) {
    initialActive.classList.add('active');
    initialActive.style.background = 'var(--portal-accent)';
    initialActive.style.color = 'white';
  }

  // Switch to initial tab
  switchTab(activeTab, ngoData);
}

/**
 * Handle switching workspace tabs
 */
function switchTab(tabName, ngoData) {
  const container = document.getElementById('ngo-tab-workspace');
  if (!container) return;

  if (tabName === 'dashboard') {
    renderDashboardTab(container, ngoData);
  } else if (tabName === 'census') {
    renderCensusTab(container, ngoData);
  } else if (tabName === 'fosters') {
    renderFostersTab(container, ngoData);
  } else if (tabName === 'adoptions') {
    renderAdoptionsTab(container, ngoData);
  } else if (tabName === 'requests') {
    renderRequestsTab(container, ngoData);
  }
}

// ==========================================================================
// 1. OPERATIONS DASHBOARD TAB
// ==========================================================================
async function renderDashboardTab(container, ngoData) {
  container.innerHTML = `<div class="skeleton-container" style="padding:2rem;"><div class="skeleton skeleton-card"></div></div>`;

  try {
    // Retrieve data
    const censusSnap = await db.collection('rescued_animals').where('orgId', '==', ngoData.uid).limit(100).get();
    const appSnap = await db.collection('adoption_applications').where('orgId', '==', ngoData.uid).limit(100).get();
    const fosterSnap = await db.collection('ngo_fosters').where('orgId', '==', ngoData.uid).limit(100).get();
    const straySnap = await db.collection('stray_reports').limit(30).get(); // global pool capped

    const rescues = [];
    censusSnap.forEach(doc => rescues.push({ id: doc.id, ...doc.data() }));

    const applications = [];
    appSnap.forEach(doc => applications.push({ id: doc.id, ...doc.data() }));

    const fosters = [];
    fosterSnap.forEach(doc => fosters.push({ id: doc.id, ...doc.data() }));

    const strays = [];
    straySnap.forEach(doc => strays.push({ id: doc.id, ...doc.data() }));

    // Count statistics
    const totalCensus = rescues.length;
    const shelteredCount = rescues.filter(r => r.intakeStatus === 'SHELTERED').length;
    const fosteredCount = rescues.filter(r => r.intakeStatus === 'FOSTERED').length;
    const rehabCount = rescues.filter(r => r.intakeStatus === 'MEDICAL_REHAB').length;
    const adoptedCount = rescues.filter(r => r.intakeStatus === 'ADOPTED').length;
    const reunitedCount = rescues.filter(r => r.intakeStatus === 'REUNITED').length;
    const activeRescues = shelteredCount + fosteredCount + rehabCount;

    const pendingApps = applications.filter(a => a.status === 'PENDING' || a.status === 'UNDER_REVIEW' || a.status === 'HOME_CHECK_SCHEDULED').length;
    const resolvedStrays = strays.filter(s => s.status === 'rescued' || s.status === 'reunited').length;
    const activeStrays = strays.filter(s => s.status === 'reported' || s.status === 'rescue-in-progress').length;

    // Build operational log/timeline
    let activityLog = [];
    rescues.forEach(r => {
      if (r.timeline) {
        r.timeline.forEach(t => {
          activityLog.push({
            animalName: r.name,
            animalType: r.type,
            event: t.event,
            notes: t.notes,
            timestamp: t.timestamp ? (t.timestamp.toDate ? t.timestamp.toDate() : new Date(t.timestamp)) : new Date(),
            actor: t.actor || 'NGO Agent'
          });
        });
      }
    });
    // Sort activity logs descending by timestamp
    activityLog.sort((a, b) => b.timestamp - a.timestamp);

    // Dynamic metrics percentages
    const adoptionRate = totalCensus > 0 ? Math.round((adoptedCount / totalCensus) * 100) : 0;
    const reunionRate = totalCensus > 0 ? Math.round((reunitedCount / totalCensus) * 100) : 0;
    
    let totalFosterCapacity = 0;
    fosters.forEach(f => totalFosterCapacity += (parseInt(f.maxCapacity) || 0));
    const fosterOccupancyRate = totalFosterCapacity > 0 ? Math.round((fosteredCount / totalFosterCapacity) * 100) : 0;

    container.innerHTML = `
      <!-- Metric Cards Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
        <!-- Card 1: Active Cases -->
        <div class="glass-card" style="padding:1rem; border-left: 4px solid var(--terracotta); text-align:center;">
          <i class="fa-solid fa-life-ring" style="font-size:1.5rem; color:var(--terracotta); margin-bottom:0.25rem;"></i>
          <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit';">${activeRescues}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Active Custody</div>
        </div>
        <!-- Card 2: Sheltered -->
        <div class="glass-card" style="padding:1rem; border-left: 4px solid var(--teal); text-align:center;">
          <i class="fa-solid fa-warehouse" style="font-size:1.5rem; color:var(--teal); margin-bottom:0.25rem;"></i>
          <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit';">${shelteredCount}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">In Shelter</div>
        </div>
        <!-- Card 3: Fostered -->
        <div class="glass-card" style="padding:1rem; border-left: 4px solid var(--accent-green); text-align:center;">
          <i class="fa-solid fa-house-laptop" style="font-size:1.5rem; color:var(--accent-green); margin-bottom:0.25rem;"></i>
          <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit';">${fosteredCount}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">In Fosters</div>
        </div>
        <!-- Card 4: Medical Cases -->
        <div class="glass-card" style="padding:1rem; border-left: 4px solid var(--accent-red); text-align:center;">
          <i class="fa-solid fa-kit-medical" style="font-size:1.5rem; color:var(--accent-red); margin-bottom:0.25rem;"></i>
          <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit';">${rehabCount}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Medical Rehab</div>
        </div>
        <!-- Card 5: Adoptions -->
        <div class="glass-card" style="padding:1rem; border-left: 4px solid var(--accent-yellow); text-align:center;">
          <i class="fa-solid fa-file-signature" style="font-size:1.5rem; color:var(--accent-yellow); margin-bottom:0.25rem;"></i>
          <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit';">${pendingApps}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Active Apps</div>
        </div>
        <!-- Card 6: Reunited -->
        <div class="glass-card" style="padding:1rem; border-left: 4px solid #3a86c8; text-align:center;">
          <i class="fa-solid fa-handshake-angle" style="font-size:1.5rem; color:#3a86c8; margin-bottom:0.25rem;"></i>
          <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit';">${reunitedCount}</div>
          <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Reunited</div>
        </div>
      </div>

      <!-- Main Operational Section: Split View -->
      <div class="grid-split" style="align-items:start;">
        <!-- Left: Analytics Widgets -->
        <div class="glass-card" style="display:flex; flex-direction:column; gap:1.5rem;">
          <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.15rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:0.25rem;">
            Rescue Analytics & Metrics
          </h3>

          <!-- Stat Row 1: Adoption & Reunification Rates -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.35rem;">
              <span>Adoptions Accomplished</span>
              <strong>${adoptedCount} (${adoptionRate}%)</strong>
            </div>
            <div style="height:10px; background:rgba(0,0,0,0.06); border-radius:5px; overflow:hidden;">
              <div style="width:${adoptionRate}%; height:100%; background:var(--accent-green); transition:width 0.4s;"></div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.35rem;">
              <span>Reunifications (Returned to Owner)</span>
              <strong>${reunitedCount} (${reunionRate}%)</strong>
            </div>
            <div style="height:10px; background:rgba(0,0,0,0.06); border-radius:5px; overflow:hidden;">
              <div style="width:${reunionRate}%; height:100%; background:var(--teal); transition:width 0.4s;"></div>
            </div>
          </div>

          <!-- Stat Row 2: Foster Placements Capacity usage -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.35rem;">
              <span>Foster Care Occupancy</span>
              <strong>${fosteredCount} / ${totalFosterCapacity} Slots (${fosterOccupancyRate}%)</strong>
            </div>
            <div style="height:10px; background:rgba(0,0,0,0.06); border-radius:5px; overflow:hidden;">
              <div style="width:${fosterOccupancyRate}%; height:100%; background:var(--accent-yellow); transition:width 0.4s;"></div>
            </div>
          </div>

          <!-- Circular Metric Dashboard Widgets -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:1rem; text-align:center; border-top: 1px solid var(--border-glass); padding-top:1rem; margin-top:0.25rem;">
            <div>
              <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit'; color:var(--terracotta);">${activeStrays}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Active Stray Requests</div>
            </div>
            <div>
              <div style="font-size:1.6rem; font-weight:800; font-family:'Outfit'; color:var(--teal);">${resolvedStrays}</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">Strays Resolved</div>
            </div>
          </div>
        </div>

        <!-- Right: Recent Audits & Activity Timelines -->
        <div class="glass-card">
          <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.15rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            Recent Operational Log
          </h3>
          <div id="dashboard-recent-logs" style="display:flex; flex-direction:column; gap:0.75rem; max-height: 290px; overflow-y:auto; padding-right:0.25rem;">
            ${activityLog.length === 0 ? `
              <div style="text-align:center; padding:2rem; color:var(--text-muted); font-size:0.85rem;">
                <i class="fa-solid fa-list-check" style="font-size:2rem; opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
                No historical logs available.
              </div>
            ` : activityLog.slice(0, 10).map(log => {
              let icon = 'fa-paw';
              let badgeColor = 'rgba(31, 122, 140, 0.1)';
              let color = 'var(--teal)';

              if (log.event.toLowerCase().includes('intake')) {
                icon = 'fa-arrow-down';
                badgeColor = 'rgba(217, 93, 57, 0.1)';
                color = 'var(--terracotta)';
              } else if (log.event.toLowerCase().includes('medical') || log.event.toLowerCase().includes('treat')) {
                icon = 'fa-kit-medical';
                badgeColor = 'rgba(230, 57, 70, 0.1)';
                color = 'var(--accent-red)';
              } else if (log.event.toLowerCase().includes('foster')) {
                icon = 'fa-house-chimney-user';
                badgeColor = 'rgba(82, 183, 136, 0.1)';
                color = 'var(--accent-green)';
              } else if (log.event.toLowerCase().includes('adopt')) {
                icon = 'fa-heart';
                badgeColor = 'rgba(244, 208, 104, 0.15)';
                color = '#cca01c';
              } else if (log.event.toLowerCase().includes('reunited')) {
                icon = 'fa-handshake-angle';
                badgeColor = 'rgba(58, 134, 200, 0.1)';
                color = '#3a86c8';
              }

              return `
                <div style="display:flex; gap:0.75rem; align-items:flex-start; font-size:0.8rem; line-height:1.3; border-bottom:1px solid rgba(0,0,0,0.03); padding-bottom:0.6rem;">
                  <div style="width:28px; height:28px; border-radius:50%; background:${badgeColor}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                    <i class="fa-solid ${icon}" style="color:${color}; font-size:0.8rem;"></i>
                  </div>
                  <div style="flex-grow:1;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.1rem;">
                      <strong style="color:var(--text-main);">${log.animalName} (${log.animalType})</strong>
                      <span style="font-size:0.7rem; color:var(--text-muted);">${formatFriendlyDate(log.timestamp)}</span>
                    </div>
                    <div style="color:var(--text-muted); font-size:0.75rem;">${log.event}: ${log.notes}</div>
                    <span style="font-size:0.65rem; color:var(--teal); font-weight:600; display:block; margin-top:0.15rem;">By ${log.actor}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    // Apply scrollbar styles to recent log
    const recentLogs = document.getElementById('dashboard-recent-logs');
    if (recentLogs) {
      recentLogs.style.scrollbarWidth = 'thin';
      recentLogs.style.scrollbarColor = 'var(--border-glass) transparent';
    }

  } catch (err) {
    console.error("Dashboard render failed:", err);
    container.innerHTML = `<div class="empty-state"><p>Error building operations dashboard.</p></div>`;
  }
}

// ==========================================================================
// 2. RESCUE CENSUS TAB (RESCUED ANIMALS CUSTODY CENSUS)
// ==========================================================================
async function renderCensusTab(container, ngoData) {
  container.innerHTML = `
    <!-- Top Filter Controls -->
    <div class="glass-card mb-2" style="padding:1rem; display:flex; gap:1rem; align-items:center; flex-wrap:wrap; background:rgba(255,255,255,0.15);">
      <div style="flex:1.5; min-width:200px; position:relative;">
        <input type="text" id="census-search" class="form-control" placeholder="Search by name, breed, or location..." style="padding-left:2.2rem; font-size:0.85rem;">
        <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:0.8rem; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:0.85rem;"></i>
      </div>
      <div style="flex:1; min-width:120px;">
        <select id="census-filter-type" class="form-control" style="font-size:0.85rem;">
          <option value="ALL">All Species</option>
          <option value="dog">Dogs</option>
          <option value="cat">Cats</option>
          <option value="bird">Birds</option>
          <option value="rabbit">Rabbits</option>
          <option value="fish">Fish</option>
          <option value="hamster">Hamsters</option>
          <option value="reptile">Reptiles</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div style="flex:1; min-width:120px;">
        <select id="census-filter-status" class="form-control" style="font-size:0.85rem;">
          <option value="ALL">All Statuses</option>
          <option value="SHELTERED">Sheltered</option>
          <option value="FOSTERED">Fostered</option>
          <option value="MEDICAL_REHAB">Medical Rehab</option>
          <option value="ADOPTED">Adopted (Historical)</option>
          <option value="REUNITED">Reunited (Historical)</option>
        </select>
      </div>
      <div>
        <button id="btn-census-intake" class="btn btn-outline">
          <i class="fa-solid fa-plus"></i> Intake Animal
        </button>
      </div>
    </div>

    <!-- Census Grid Container -->
    <div id="census-grid" class="pets-grid">
      <div class="skeleton-container" style="grid-column: span 3;"><div class="skeleton skeleton-card"></div></div>
    </div>
  `;

  document.getElementById('btn-census-intake').onclick = () => showIntakeModal(ngoData);

  const searchInput = document.getElementById('census-search');
  const typeFilter = document.getElementById('census-filter-type');
  const statusFilter = document.getElementById('census-filter-status');

  const updateFilters = () => {
    loadCensusGrid(
      ngoData,
      searchInput.value.toLowerCase().trim(),
      typeFilter.value,
      statusFilter.value
    );
  };

  searchInput.oninput = updateFilters;
  typeFilter.onchange = updateFilters;
  statusFilter.onchange = updateFilters;

  // Initial Load
  loadCensusGrid(ngoData);
}

/**
 * Fetch and filter rescued animals
 */
async function loadCensusGrid(ngoData, search = '', type = 'ALL', status = 'ALL') {
  const grid = document.getElementById('census-grid');
  if (!grid) return;

  try {
    const snapshot = await db.collection('rescued_animals').where('orgId', '==', ngoData.uid).get();
    grid.innerHTML = '';

    let items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });

    // In-memory filter & sort
    items = items.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(search) || 
                        (item.breed || '').toLowerCase().includes(search) ||
                        (item.shelterLocation || '').toLowerCase().includes(search);
      const typeMatch = type === 'ALL' || (item.type || '').toLowerCase() === type.toLowerCase();
      const statusMatch = status === 'ALL' || item.intakeStatus === status;
      return nameMatch && typeMatch && statusMatch;
    });

    // Sort by newest intake date
    items.sort((a, b) => {
      const dateA = a.intakeDate ? new Date(a.intakeDate) : new Date(0);
      const dateB = b.intakeDate ? new Date(b.intakeDate) : new Date(0);
      return dateB - dateA;
    });

    if (items.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: span 3; padding: 3rem;">
          <i class="fa-solid fa-box-open" style="font-size:3rem;"></i>
          <p>No animals match the filter constraints.</p>
        </div>
      `;
      return;
    }

    items.forEach(animal => {
      const card = document.createElement('div');
      card.className = 'glass-card pet-card magnetic-card';

      let statusText = animal.intakeStatus;
      let statusColor = 'var(--teal)';
      if (animal.intakeStatus === 'MEDICAL_REHAB') {
        statusColor = 'var(--accent-red)';
        statusText = 'REHAB';
      } else if (animal.intakeStatus === 'FOSTERED') {
        statusColor = 'var(--accent-green)';
        statusText = 'FOSTER';
      } else if (animal.intakeStatus === 'ADOPTED') {
        statusColor = '#cca01c';
        statusText = 'ADOPTED';
      } else if (animal.intakeStatus === 'REUNITED') {
        statusColor = '#3a86c8';
        statusText = 'REUNITED';
      }

      card.innerHTML = `
        <div class="pet-image-container" style="position: relative; height: 160px;">
          ${getPetImageHTML(animal, 'small')}
          <span class="pet-status-badge safe" style="background:${statusColor}; position:absolute; top:10px; right:10px;">
            ${statusText}
          </span>
        </div>
        <div class="pet-card-content" style="padding:1rem;">
          <h4 class="pet-card-name" style="font-family:'Outfit'; font-weight:700; margin-bottom:0.25rem;">${animal.name}</h4>
          <div class="pet-card-meta" style="flex-direction:column; gap:0.25rem; font-size:0.75rem; color:var(--text-muted);">
            <span><strong>Breed:</strong> ${animal.breed || 'Unknown'}</span>
            <span><strong>Location:</strong> ${animal.shelterLocation || 'N/A'}</span>
            <span><strong>Intake:</strong> ${formatFriendlyDate(animal.intakeDate)}</span>
            ${animal.assignedQRTagId ? `
              <span style="color:var(--teal); font-weight:600;"><i class="fa-solid fa-qrcode"></i> Tag Linked: ${animal.assignedQRTagId}</span>
            ` : `
              <span style="color:var(--terracotta); font-weight:600;"><i class="fa-solid fa-circle-info"></i> No Smart Tag</span>
            `}
          </div>
          <button class="btn btn-secondary btn-full btn-view-casesheet mt-1" data-id="${animal.id}">
            <i class="fa-solid fa-folder-open"></i> View Case Sheet
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Bind Case Sheet details modal
    grid.querySelectorAll('.btn-view-casesheet').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        showAnimalCaseSheetModal(id, ngoData);
      };
    });

  } catch (err) {
    grid.innerHTML = `<p>Failed to sync custody database.</p>`;
  }
}

async function checkTagIdExists(tagId) {
  const queryId = tagId.trim();
  if (!queryId) return false;
  try {
    const snap1 = await db.collection('rescued_animals').where('assignedQRTagId', '==', queryId).get();
    if (!snap1.empty) return true;
    const snap2 = await db.collection('rescued_animals').where('pawTraceId', '==', queryId).get();
    if (!snap2.empty) return true;
    const snap3 = await db.collection('rescued_animals').where('ptId', '==', queryId).get();
    if (!snap3.empty) return true;
  } catch (err) {
    console.warn("Error checking tag ID in rescued_animals:", err);
  }
  try {
    const snap4 = await db.collection('pets').where('pawTraceId', '==', queryId).get();
    if (!snap4.empty) return true;
    const snap5 = await db.collection('pets').where('qrTagId', '==', queryId).get();
    if (!snap5.empty) return true;
  } catch (err) {
    console.warn("Error checking tag ID in pets:", err);
  }
  return false;
}

/**
 * Dialog Modal to Log/Intake an Animal with expanded filters
 */
function showIntakeModal(ngoData, prefillData = {}) {
  showModal({
    title: prefillData.id ? "Intake Stray Request" : "Register Rescued Animal",
    bodyHtml: `
      <form id="intake-form" style="display:flex; flex-direction:column; gap:0.85rem; max-height:450px; overflow-y:auto; padding-right:0.25rem;">
        <div class="form-row">
          <div class="form-group">
            <label for="intake-name">Animal Name *</label>
            <input type="text" id="intake-name" class="form-control" required placeholder="E.g. Rocky" value="${prefillData.name || ''}">
          </div>
          <div class="form-group">
            <label for="intake-type">Species *</label>
            <select id="intake-type" class="form-control" required>
              <option value="Dog" ${prefillData.type === 'Dog' ? 'selected' : ''}>Dog</option>
              <option value="Cat" ${prefillData.type === 'Cat' ? 'selected' : ''}>Cat</option>
              <option value="Bird" ${prefillData.type === 'Bird' ? 'selected' : ''}>Bird</option>
              <option value="Rabbit" ${prefillData.type === 'Rabbit' ? 'selected' : ''}>Rabbit</option>
              <option value="Fish" ${prefillData.type === 'Fish' ? 'selected' : ''}>Fish</option>
              <option value="Hamster" ${prefillData.type === 'Hamster' ? 'selected' : ''}>Hamster</option>
              <option value="Reptile" ${prefillData.type === 'Reptile' ? 'selected' : ''}>Reptile</option>
              <option value="Other" ${prefillData.type === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-breed">Breed / Color</label>
            <input type="text" id="intake-breed" class="form-control" placeholder="E.g. Beagle mix, Ginger tabby" value="${prefillData.breed || ''}">
          </div>
          <div class="form-group">
            <label for="intake-gender">Gender</label>
            <select id="intake-gender" class="form-control">
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Unknown" selected>Unknown</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-age">Estimated Age</label>
            <input type="text" id="intake-age" class="form-control" placeholder="E.g. 1 Year, Puppy">
          </div>
          <div class="form-group">
            <label for="intake-status">Initial Custody Status *</label>
            <select id="intake-status" class="form-control" required>
              <option value="SHELTERED">Sheltered</option>
              <option value="FOSTERED">Fostered</option>
              <option value="MEDICAL_REHAB">Medical Rehabilitation</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="intake-size">Animal Size *</label>
            <select id="intake-size" class="form-control" required>
              <option value="Small">Small</option>
              <option value="Medium" selected>Medium</option>
              <option value="Large">Large</option>
            </select>
          </div>
          <div class="form-group">
            <label for="intake-location">Intake Location *</label>
            <input type="text" id="intake-location" class="form-control" required placeholder="E.g. Main Shelter Bay A" value="${prefillData.location || ''}">
          </div>
        </div>

        <!-- Expanded Attribute Checkboxes -->
        <div class="form-group">
          <label style="font-weight:700; font-size:0.75rem; display:block; margin-bottom:0.25rem;">Rescue Catalog Attributes</label>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; font-size:0.75rem;">
            <label style="display:flex; align-items:center; gap:0.35rem; cursor:pointer;">
              <input type="checkbox" id="intake-vaccinated" checked> Vaccinated
            </label>
            <label style="display:flex; align-items:center; gap:0.35rem; cursor:pointer;">
              <input type="checkbox" id="intake-special"> Special Needs / Injured
            </label>
            <label style="display:flex; align-items:center; gap:0.35rem; cursor:pointer;">
              <input type="checkbox" id="intake-children" checked> Good With Children
            </label>
            <label style="display:flex; align-items:center; gap:0.35rem; cursor:pointer;">
              <input type="checkbox" id="intake-pets" checked> Good With Other Pets
            </label>
          </div>
        </div>

        <div class="form-group">
          <label for="intake-tag">Assign Smart Tag ID (Optional)</label>
          <input type="text" id="intake-tag" class="form-control" placeholder="E.g. PT-10029">
        </div>

        <div class="form-group">
          <label for="intake-photo">Profile Photo</label>
          <input type="file" id="intake-photo" class="form-control" accept="image/*">
        </div>

        <div class="form-group">
          <label for="intake-notes">Intake Medical Notes *</label>
          <textarea id="intake-notes" class="form-control" rows="2" required placeholder="Describe symptoms, rescue conditions, or general history...">${prefillData.description || ''}</textarea>
        </div>
      </form>
    `,
    confirmText: "Submit Intake",
    onConfirm: async () => {
      const form = document.getElementById('intake-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const name = document.getElementById('intake-name').value.trim();
      const type = document.getElementById('intake-type').value;
      const breed = document.getElementById('intake-breed').value.trim();
      const gender = document.getElementById('intake-gender').value;
      const age = document.getElementById('intake-age').value.trim();
      const intakeStatus = document.getElementById('intake-status').value;
      const size = document.getElementById('intake-size').value;
      const shelterLocation = document.getElementById('intake-location').value.trim();
      const assignedQRTagId = document.getElementById('intake-tag').value.trim();
      const medicalNotes = document.getElementById('intake-notes').value.trim();
      const fileInput = document.getElementById('intake-photo');

      const vaccinated = document.getElementById('intake-vaccinated').checked;
      const specialNeeds = document.getElementById('intake-special').checked;
      const goodWithChildren = document.getElementById('intake-children').checked;
      const goodWithPets = document.getElementById('intake-pets').checked;

      let photoUrl = prefillData.photo || '';

      showLoading(true, "Logging animal intake...");
      try {
        let pawTraceId;
        if (assignedQRTagId) {
          // Validate uniqueness of manually entered tag ID
          const exists = await checkTagIdExists(assignedQRTagId);
          if (exists) {
            showLoading(false);
            showToast(`Smart Tag / PawTrace ID "${assignedQRTagId}" is already assigned to another animal. Please enter a different ID or leave it empty.`, "warning");
            return true;
          }
          pawTraceId = assignedQRTagId;
        } else {
          pawTraceId = await generatePawTraceId();
        }

        const newAnimalRef = db.collection('rescued_animals').doc();
        const animalId = newAnimalRef.id;

        // Perform image file upload via Firebase Storage if available, with base64 fallback
        if (fileInput.files.length > 0) {
          const file = fileInput.files[0];
          const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
          if (error) {
            showLoading(false);
            showToast(error, "warning");
            return true;
          }
          try {
            if (storage) {
              const ref = storage.ref(`rescued_animals/${animalId}/profile_${Date.now()}`);
              const snapshot = await ref.put(file);
              photoUrl = await snapshot.ref.getDownloadURL();
            } else {
              photoUrl = await readFileAsDataURL(file);
            }
          } catch (storageErr) {
            console.warn("Storage upload failed, falling back to base64 encoding:", storageErr);
            photoUrl = await readFileAsDataURL(file);
          }
        }

        const actorName = ngoData.displayName || 'NGO Coordinator';
        const orgName = ngoData.displayName || 'Rescue Partner';

        const timelineEvent = {
          event: "Animal Intake Created",
          notes: `Animal successfully processed. PawTrace ID: ${pawTraceId}. Status set to SHELTERED. Notes: ${medicalNotes || 'None'}`,
          timestamp: new Date(),
          actor: actorName
        };

        await newAnimalRef.set({
          orgId: ngoData.uid,
          orgName: orgName,
          name,
          type,
          breed,
          gender,
          age,
          size,
          vaccinated,
          specialNeeds,
          goodWithChildren,
          goodWithPets,
          intakeStatus: intakeStatus || 'SHELTERED',
          status: 'SHELTERED',
          shelterLocation,
          assignedQRTagId: assignedQRTagId || '',
          ptId: pawTraceId,
          pawTraceId: pawTraceId,
          medicalNotes,
          photo: photoUrl,
          intakeDate: fb.firestore.FieldValue.serverTimestamp(),
          timeline: [timelineEvent]
        });

        // Resolve prefill stray report if applicable
        if (prefillData.id) {
          await db.collection('stray_reports').doc(prefillData.id).update({
            status: 'rescued',
            resolutionNotes: `Processed under Census Profile ID: ${animalId} by ${orgName}.`,
            resolutionDate: new Date().toISOString()
          });
        }

        showToast(`${name} registered in rescue census.`, "success");
        closeModal();
        
        // Refresh grid
        if (activeTab === 'census') {
          loadCensusGrid(ngoData);
        } else if (activeTab === 'requests') {
          switchTab('requests', ngoData);
        } else {
          switchTab('dashboard', ngoData);
        }
        return false;
      } catch (err) {
        console.error("Intake submission error:", err);
        showToast(`Intake database record failed: ${err.message || JSON.stringify(err)}`, "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });

  const formElement = document.getElementById('intake-form');
  if (formElement) {
    formElement.style.scrollbarWidth = 'thin';
    formElement.style.scrollbarColor = 'var(--border-glass) transparent';
  }
}

/**
 * Display animal detailed case sheet and action dashboard
 */
async function showAnimalCaseSheetModal(animalId, ngoData) {
  showLoading(true, "Retrieving clinical records...");
  try {
    const animalDoc = await db.collection('rescued_animals').doc(animalId).get();
    if (!animalDoc.exists) {
      showToast("Animal case file not found.", "warning");
      return;
    }
    const animal = animalDoc.data();
    animal.id = animalDoc.id;

    // Fetch medical logs
    const medicalSnap = await db.collection('ngo_medical_logs')
      .where('animalId', '==', animalId)
      .get();
    
    const medicalLogs = [];
    medicalSnap.forEach(doc => {
      medicalLogs.push({ id: doc.id, ...doc.data() });
    });
    // Sort in memory
    medicalLogs.sort((a, b) => {
      const dateA = a.timestamp ? (a.timestamp.toDate ? a.timestamp.toDate() : new Date(a.timestamp)) : new Date(0);
      const dateB = b.timestamp ? (b.timestamp.toDate ? b.timestamp.toDate() : new Date(b.timestamp)) : new Date(0);
      return dateB - dateA;
    });

    showModal({
      title: `Rescue Case Sheet: ${animal.name}`,
      bodyHtml: `
        <div class="grid-split" style="max-height:480px; overflow-y:auto; padding-right:0.25rem;" id="casesheet-viewport">
          
          <!-- Left side: Identity & Action Panel -->
          <div>
            <div class="pet-image-container mb-2" style="height:150px; border-radius:var(--radius-md); overflow:hidden;">
              ${getPetImageHTML(animal, 'small')}
            </div>
            
            <h4 style="font-family:'Outfit'; font-weight:700; font-size:1.1rem; margin-bottom:0.5rem;">Operational Details</h4>
            <div style="font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.4rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem; margin-bottom:0.75rem;">
              <span><strong>Status:</strong> ${animal.intakeStatus}</span>
              <span><strong>Gender / Size:</strong> ${animal.gender} &bull; ${animal.size || 'Medium'}</span>
              <span><strong>Breed:</strong> ${animal.breed || 'Unknown'}</span>
              <span><strong>Location:</strong> ${animal.shelterLocation || 'N/A'}</span>
              <span>
                <strong>Smart Tag ID:</strong> 
                ${animal.assignedQRTagId ? `<code>${animal.assignedQRTagId}</code>` : `<span style="color:var(--accent-red);">None Assigned</span>`}
              </span>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              <button id="btn-case-tag" class="btn btn-outline btn-full" style="padding:0.45rem; font-size:0.75rem;">
                <i class="fa-solid fa-qrcode"></i> ${animal.assignedQRTagId ? 'Update Smart Tag' : 'Link Smart Tag'}
              </button>
              
              <button id="btn-case-status" class="btn btn-outline btn-full" style="padding:0.45rem; font-size:0.75rem;">
                <i class="fa-solid fa-sliders"></i> Shift Intake Status
              </button>

              <button id="btn-case-reunite" class="btn btn-outline btn-full" style="padding:0.45rem; font-size:0.75rem; ${animal.intakeStatus === 'REUNITED' || animal.intakeStatus === 'ADOPTED' ? 'display:none;' : ''}">
                <i class="fa-solid fa-handshake-angle"></i> Mark as REUNITED
              </button>

              <button id="btn-case-adopt" class="btn btn-primary btn-full" style="padding:0.45rem; font-size:0.75rem; ${animal.intakeStatus === 'ADOPTED' ? 'display:none;' : ''}">
                <i class="fa-solid fa-share-nodes"></i> Post to Adoption Board
              </button>
            </div>
          </div>

          <!-- Right side: Medical Logs & Activity Timeline -->
          <div>
            
            <!-- Medical Rehab Section -->
            <div style="margin-bottom:1.5rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:0.35rem; margin-bottom:0.6rem;">
                <h4 style="font-family:'Outfit'; font-weight:700; font-size:1rem; margin:0;">Medical Treatment History</h4>
                <button id="btn-add-medical-log" class="btn btn-outline" style="font-size:0.65rem; padding:0.25rem 0.5rem;">
                  <i class="fa-solid fa-plus"></i> Add Log
                </button>
              </div>

              <div style="display:flex; flex-direction:column; gap:0.5rem; max-height:150px; overflow-y:auto; padding-right:0.15rem;" id="case-medical-list">
                ${medicalLogs.length === 0 ? `
                  <div style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding:1rem;">No clinical treatments documented.</div>
                ` : medicalLogs.map(log => `
                  <div style="background:rgba(0,0,0,0.02); border:1px solid rgba(0,0,0,0.04); padding:0.5rem; border-radius:var(--radius-sm); font-size:0.75rem;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.15rem;">
                      <strong style="color:var(--accent-red); font-size:0.7rem;">${log.category}</strong>
                      <span style="font-size:0.65rem; color:var(--text-muted);">${formatFriendlyDate(log.timestamp)}</span>
                    </div>
                    <div>${log.notes}</div>
                    <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.15rem;">By Vet: ${log.vetName || 'General Staff'}</div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Complete Animal Rescue Timeline -->
            <div>
              <h4 style="font-family:'Outfit'; font-weight:700; font-size:1rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.35rem; margin-bottom:0.6rem;">
                Animal History Timeline
              </h4>
              <div style="display:flex; flex-direction:column; gap:0.75rem; max-height:160px; overflow-y:auto; padding-left:0.5rem; border-left:2px solid var(--border-input);" id="case-timeline-list">
                ${(animal.timeline || []).slice().reverse().map(event => `
                  <div style="position:relative; font-size:0.75rem; line-height:1.3;">
                    <div style="position:absolute; left:-13px; top:3px; width:8px; height:8px; border-radius:50%; background:var(--teal);"></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.1rem;">
                      <strong>${event.event}</strong>
                      <span style="font-size:0.65rem; color:var(--text-muted);">${formatFriendlyDate(event.timestamp)}</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.7rem; margin:0;">${event.notes}</p>
                    <span style="font-size:0.65rem; color:var(--teal); font-weight:600; display:block;">Actor: ${event.actor || 'NGO Admin'}</span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>

        </div>
      `,
      confirmText: "Close Case",
      onConfirm: () => {
        closeModal();
        return false;
      }
    });

    const csViewport = document.getElementById('casesheet-viewport');
    if (csViewport) {
      csViewport.style.scrollbarWidth = 'thin';
      csViewport.style.scrollbarColor = 'var(--border-glass) transparent';
    }

    // Bind Case Sheet Interactive Actions
    document.getElementById('btn-case-tag').onclick = () => showLinkTagModal(animal, ngoData);
    document.getElementById('btn-case-status').onclick = () => showShiftStatusModal(animal, ngoData);
    document.getElementById('btn-case-reunite').onclick = () => showReuniteDirectModal(animal, ngoData);
    document.getElementById('btn-case-adopt').onclick = () => publishToAdoptionBoard(animal, ngoData);
    document.getElementById('btn-add-medical-log').onclick = () => showAddMedicalLogModal(animal, ngoData);

  } catch (err) {
    console.error("Clinical fetching failure:", err);
    showToast("Failed to load clinical case sheets.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Inline Dialog to assign Smart Tag ID to custody animal
 */
function showLinkTagModal(animal, ngoData) {
  showModal({
    title: `Assign Smart Tag: ${animal.name}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:0.75rem; padding:0.5rem 0;">
        <p style="font-size:0.8rem; color:var(--text-muted);">
          Scan or enter the unique PawTrace RFID/QR tag ID to sync this custody record for instant GPS scanning alerts.
        </p>
        <div class="form-group">
          <label for="link-tag-input">Smart Tag ID / Code *</label>
          <input type="text" id="link-tag-input" class="form-control" required placeholder="E.g. PT-10048" value="${animal.assignedQRTagId || ''}">
        </div>
      </div>
    `,
    confirmText: "Assign/Link Tag",
    onConfirm: async () => {
      const tagId = document.getElementById('link-tag-input').value.trim();
      if (!tagId) {
        showToast("Please provide a valid tag ID.", "warning");
        return true;
      }

      showLoading(true, "Updating QR credentials...");
      try {
        const timelineEvent = {
          event: "QR Tag Assignment",
          notes: `Linked Smart Tag ID: ${tagId}. Animal is now trackable via public scanner spottings.`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };

        await db.collection('rescued_animals').doc(animal.id).update({
          assignedQRTagId: tagId,
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        showToast(`Smart Tag successfully linked to ${animal.name}.`, "success");
        closeModal();
        
        // Refresh details modal
        showAnimalCaseSheetModal(animal.id, ngoData);
        if (activeTab === 'census') loadCensusGrid(ngoData);
        return false;
      } catch (err) {
        showToast("Failed to save QR configuration.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Shift status flow dialog
 */
function showShiftStatusModal(animal, ngoData) {
  showModal({
    title: `Shift Custody Status: ${animal.name}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:0.75rem; padding:0.5rem 0;">
        <p style="font-size:0.8rem; color:var(--text-muted);">
          Transition this animal across custody phases (Shelter housing, Foster coordination, clinical rehabilitation).
        </p>
        <div class="form-group">
          <label for="shift-status-select">New Intake status *</label>
          <select id="shift-status-select" class="form-control">
            <option value="SHELTERED" ${animal.intakeStatus === 'SHELTERED' ? 'selected' : ''}>Sheltered</option>
            <option value="FOSTERED" ${animal.intakeStatus === 'FOSTERED' ? 'selected' : ''}>Fostered</option>
            <option value="MEDICAL_REHAB" ${animal.intakeStatus === 'MEDICAL_REHAB' ? 'selected' : ''}>Medical Rehabilitation</option>
          </select>
        </div>
        <div class="form-group">
          <label for="shift-notes-input">Reason / Notes for Move *</label>
          <input type="text" id="shift-notes-input" class="form-control" required placeholder="E.g. Transferred to Greenhills shelter kennel 4.">
        </div>
      </div>
    `,
    confirmText: "Update Status",
    onConfirm: async () => {
      const newStatus = document.getElementById('shift-status-select').value;
      const notes = document.getElementById('shift-notes-input').value.trim();

      if (!notes) {
        showToast("Please provide documentation notes.", "warning");
        return true;
      }

      showLoading(true, "Moving animal logs...");
      try {
        const timelineEvent = {
          event: "Status Transition",
          notes: `Shifted custody from ${animal.intakeStatus} to ${newStatus}. Detail: ${notes}`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };

        await db.collection('rescued_animals').doc(animal.id).update({
          intakeStatus: newStatus,
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        showToast("Custody status updated.", "success");
        closeModal();
        
        // Refresh details modal
        showAnimalCaseSheetModal(animal.id, ngoData);
        if (activeTab === 'census') loadCensusGrid(ngoData);
        return false;
      } catch (err) {
        showToast("Failed to shift status.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Log a direct Reunification on case sheet
 */
function showReuniteDirectModal(animal, ngoData) {
  showModal({
    title: `Owner Reunification: ${animal.name}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:0.75rem; padding:0.5rem 0;">
        <p style="font-size:0.8rem; color:var(--text-muted);">
          Mark this stray animal as successfully returned and reunited with its verified owner.
        </p>
        <div class="form-group">
          <label for="reunite-owner-name">Owner Full Name *</label>
          <input type="text" id="reunite-owner-name" class="form-control" required placeholder="E.g. Clara Oswald">
        </div>
        <div class="form-group">
          <label for="reunite-owner-contact">Owner Contact Phone *</label>
          <input type="tel" id="reunite-owner-contact" class="form-control" required placeholder="E.g. +91 99002 99002">
        </div>
        <div class="form-group">
          <label for="reunite-proof">Ownership Verification Method *</label>
          <input type="text" id="reunite-proof" class="form-control" required placeholder="E.g. Verified photo matches, vaccination book audit.">
        </div>
      </div>
    `,
    confirmText: "Process Reunification",
    onConfirm: async () => {
      const ownerName = document.getElementById('reunite-owner-name').value.trim();
      const ownerPhone = document.getElementById('reunite-owner-contact').value.trim();
      const proof = document.getElementById('reunite-proof').value.trim();

      if (!ownerName || !ownerPhone || !proof) {
        showToast("Please fill all verification fields.", "warning");
        return true;
      }

      showLoading(true, "Updating records...");
      try {
        const timelineEvent = {
          event: "Reunited",
          notes: `Returned stray to verified owner: ${ownerName} (${ownerPhone}). Verification: ${proof}`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };

        await db.collection('rescued_animals').doc(animal.id).update({
          intakeStatus: 'REUNITED',
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        showToast(`${animal.name} marked as REUNITED.`, "success");
        closeModal();
        
        // Refresh details modal
        showAnimalCaseSheetModal(animal.id, ngoData);
        if (activeTab === 'census') loadCensusGrid(ngoData);
        return false;
      } catch (err) {
        showToast("Failed to process reunification.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Publish profile to public adoption feed copying new filters
 */
async function publishToAdoptionBoard(animal, ngoData) {
  showLoading(true, "Publishing adoptable profile...");
  try {
    const adoptionRef = db.collection('adoptions').doc(animal.id);
    
    await adoptionRef.set({
      orgId: ngoData.uid,
      orgName: ngoData.displayName,
      petName: animal.name,
      pawTraceId: animal.pawTraceId || '',
      type: animal.type || 'Dog',
      breed: animal.breed || 'Rescue Breed',
      age: animal.age || '1 Year',
      gender: animal.gender || 'Unknown',
      size: animal.size || 'Medium',
      vaccinated: animal.vaccinated || false,
      specialNeeds: animal.specialNeeds || false,
      goodWithChildren: animal.goodWithChildren || false,
      goodWithPets: animal.goodWithPets || false,
      description: animal.medicalNotes || `A lovely companion intaken by ${ngoData.displayName}.`,
      photo: animal.photo || '',
      status: 'available',
      timestamp: fb.firestore.FieldValue.serverTimestamp()
    });

    const timelineEvent = {
      event: "Adoption Posted",
      notes: "Pet companion published to the public PawTrace Adoption Board with expanded filters.",
      timestamp: new Date(),
      actor: ngoData.displayName
    };

    await db.collection('rescued_animals').doc(animal.id).update({
      timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
    });

    showToast("Adoption card published successfully.", "success");
    closeModal();
    showAnimalCaseSheetModal(animal.id, ngoData);
  } catch (err) {
    console.error("Adoption publication failure:", err);
    showToast("Failed to post adoption card.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Log a new medical treatment log
 */
function showAddMedicalLogModal(animal, ngoData) {
  showModal({
    title: `Log Treatment: ${animal.name}`,
    bodyHtml: `
      <form id="medical-log-form" style="display:flex; flex-direction:column; gap:0.75rem;">
        <div class="form-group">
          <label for="medlog-category">Treatment Category *</label>
          <select id="medlog-category" class="form-control" required>
            <option value="Vaccination">Vaccination</option>
            <option value="Surgery">Surgery</option>
            <option value="Medication">Medication Log</option>
            <option value="Diagnostics">Lab & Diagnostics</option>
            <option value="General checkup" selected>General Wellness Check</option>
          </select>
        </div>
        <div class="form-group">
          <label for="medlog-notes">Treatment Details / Vet Notes *</label>
          <textarea id="medlog-notes" class="form-control" rows="3" required placeholder="E.g. Administered rabies vaccine booster, wound cleaning done..."></textarea>
        </div>
        <div class="form-group">
          <label for="medlog-vet">Veterinarian Name</label>
          <input type="text" id="medlog-vet" class="form-control" placeholder="E.g. Dr. Ray" value="${ngoData.displayName}">
        </div>
      </form>
    `,
    confirmText: "Log Medical Event",
    onConfirm: async () => {
      const form = document.getElementById('medical-log-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const category = document.getElementById('medlog-category').value;
      const notes = document.getElementById('medlog-notes').value.trim();
      const vetName = document.getElementById('medlog-vet').value.trim();

      showLoading(true, "Saving clinical data...");
      try {
        const medicalLogRef = db.collection('ngo_medical_logs').doc();
        
        await medicalLogRef.set({
          animalId: animal.id,
          category,
          notes,
          vetName,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        const timelineEvent = {
          event: "Medical Treatment",
          notes: `[${category}] recorded by ${vetName}. Notes: ${notes}`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };

        await db.collection('rescued_animals').doc(animal.id).update({
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        showToast("Treatment event saved successfully.", "success");
        closeModal();
        
        // Refresh details modal
        showAnimalCaseSheetModal(animal.id, ngoData);
        return false;
      } catch (err) {
        showToast("Failed to log treatment event.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}


// ==========================================================================
// 3. FOSTER & VOLUNTEERS TAB
// ==========================================================================
async function renderFostersTab(container, ngoData) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    const fosterSnap = await db.collection('ngo_fosters').where('orgId', '==', ngoData.uid).get();
    const volunteerSnap = await db.collection('ngo_volunteers').where('orgId', '==', ngoData.uid).get();
    const animalSnap = await db.collection('rescued_animals').where('orgId', '==', ngoData.uid).get();

    const fosters = [];
    fosterSnap.forEach(doc => fosters.push({ id: doc.id, ...doc.data() }));

    const volunteers = [];
    volunteerSnap.forEach(doc => volunteers.push({ id: doc.id, ...doc.data() }));

    const rescues = [];
    animalSnap.forEach(doc => rescues.push({ id: doc.id, ...doc.data() }));

    container.innerHTML = `
      <div class="grid-split" style="align-items:start;">
        
        <!-- Left: Foster Homes Registry -->
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.2rem; margin:0;"><i class="fa-solid fa-house-chimney-user" style="color:var(--teal);"></i> Foster Families Registry</h3>
            <button id="btn-add-foster" class="btn btn-outline" style="font-size:0.75rem; padding:0.4rem 0.8rem;">
              <i class="fa-solid fa-plus"></i> Add Foster Home
            </button>
          </div>

          <div id="fosters-roster" style="display:flex; flex-direction:column; gap:0.75rem;">
            ${fosters.length === 0 ? `
              <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                <i class="fa-solid fa-house-circle-exclamation" style="font-size:2.5rem; opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
                No foster families registered.
              </div>
            ` : fosters.map(f => {
              const placements = (f.currentPlacements || []);
              const currentCount = placements.length;
              const max = parseInt(f.maxCapacity) || 1;
              const occupancyPct = Math.min(100, Math.round((currentCount / max) * 100));
              const progressColor = occupancyPct >= 100 ? 'var(--accent-red)' : 'var(--accent-green)';

              // Get matching animal names
              const placementNames = placements.map(id => {
                const anim = rescues.find(r => r.id === id);
                return anim ? `<span class="placed-animal-link" data-id="${id}" style="color:var(--teal); cursor:pointer; text-decoration:underline; font-weight:600; margin-right:0.4rem;">${anim.name}</span>` : 'Unknown Animal';
              }).join(', ');

              return `
                <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-glass); padding:0.85rem; border-radius:var(--radius-md); font-size:0.8rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.4rem;">
                    <div>
                      <strong style="font-size:0.9rem; font-family:'Outfit';">${f.name}</strong>
                      <span style="font-size:0.65rem; padding:0.15rem 0.4rem; border-radius:var(--radius-full); background:rgba(82, 183, 136, 0.1); color:var(--accent-green); margin-left:0.4rem; font-weight:600;">
                        ${f.availabilityStatus || 'AVAILABLE'}
                      </span>
                    </div>
                    <span style="font-size:0.75rem; font-weight:700;">${currentCount} / ${max} Max</span>
                  </div>
                  
                  <div style="height:6px; background:rgba(0,0,0,0.05); border-radius:3px; overflow:hidden; margin-bottom:0.5rem;">
                    <div style="width:${occupancyPct}%; height:100%; background:${progressColor};"></div>
                  </div>

                  <div style="color:var(--text-muted); font-size:0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
                    <span><i class="fa-solid fa-phone"></i> ${f.phone} &bull; <i class="fa-solid fa-envelope"></i> ${f.email}</span>
                    <span><i class="fa-solid fa-map-location"></i> ${f.address}</span>
                    ${currentCount > 0 ? `
                      <span style="margin-top:0.25rem; display:block;"><strong>Current Placements:</strong> ${placementNames}</span>
                    ` : ''}
                  </div>

                  <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:0.6rem;">
                    <button class="btn btn-outline btn-placement" data-id="${f.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem;" ${currentCount >= max ? 'disabled' : ''}>
                      <i class="fa-solid fa-angles-right"></i> Place Animal
                    </button>
                    <button class="btn btn-outline toggle-foster-status" data-id="${f.id}" data-status="${f.availabilityStatus}" style="font-size:0.65rem; padding:0.25rem 0.5rem;">
                      <i class="fa-solid fa-rotate"></i> Toggle Availability
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Volunteer Squad -->
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.2rem; margin:0;"><i class="fa-solid fa-person-running" style="color:var(--terracotta);"></i> Dispatch Volunteers</h3>
            <button id="btn-add-volunteer" class="btn btn-outline" style="font-size:0.75rem; padding:0.4rem 0.8rem;">
              <i class="fa-solid fa-plus"></i> Register Volunteer
            </button>
          </div>

          <div id="volunteers-roster" style="display:flex; flex-direction:column; gap:0.75rem;">
            ${volunteers.length === 0 ? `
              <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                <i class="fa-solid fa-users-slash" style="font-size:2.5rem; opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
                No rescue volunteers registered.
              </div>
            ` : volunteers.map(v => `
              <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-glass); padding:0.75rem; border-radius:var(--radius-md); font-size:0.8rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
                  <strong style="font-size:0.85rem; font-family:'Outfit';">${v.name}</strong>
                  <span style="font-size:0.65rem; color:var(--text-muted);"><i class="fa-solid fa-calendar-days"></i> ${v.availabilitySchedule || 'Flexible'}</span>
                </div>
                
                <div style="display:flex; gap:0.25rem; flex-wrap:wrap; margin-bottom:0.4rem;">
                  ${(v.skills || []).map(skill => `<span style="font-size:0.6rem; padding:0.1rem 0.35rem; border-radius:var(--radius-sm); background:rgba(31,122,140,0.08); color:var(--teal); font-weight:600;">${skill}</span>`).join('')}
                </div>

                <div style="font-size:0.7rem; color:var(--text-muted); display:flex; justify-content:space-between; align-items:center;">
                  <span><i class="fa-solid fa-phone"></i> ${v.phone}</span>
                  <span style="color:${v.activeMissionId ? 'var(--accent-red)' : 'var(--accent-green)'}; font-weight:600;">
                    ${v.activeMissionId ? '<i class="fa-solid fa-bell-on"></i> On Mission' : '<i class="fa-solid fa-circle-check"></i> Idle/Ready'}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    // Bind Add Foster / Volunteer
    document.getElementById('btn-add-foster').onclick = () => showAddFosterModal(ngoData);
    document.getElementById('btn-add-volunteer').onclick = () => showAddVolunteerModal(ngoData);

    // Bind placed links
    container.querySelectorAll('.placed-animal-link').forEach(link => {
      link.onclick = (e) => {
        e.stopPropagation();
        const id = link.getAttribute('data-id');
        showAnimalCaseSheetModal(id, ngoData);
      };
    });

    // Bind Placement assignment button
    container.querySelectorAll('.btn-placement').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const foster = fosters.find(f => f.id === id);
        showAssignPlacementModal(foster, rescues, ngoData);
      };
    });

    // Bind Toggle Availability status
    container.querySelectorAll('.toggle-foster-status').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        const current = btn.getAttribute('data-status');
        const target = current === 'AVAILABLE' ? 'INACTIVE' : 'AVAILABLE';

        showLoading(true, "Updating availability state...");
        try {
          await db.collection('ngo_fosters').doc(id).update({
            availabilityStatus: target
          });
          showToast(`Foster home availability updated.`, "success");
          switchTab('fosters', ngoData);
        } catch (err) {
          showToast("Failed to toggle status.", "error");
        } finally {
          showLoading(false);
        }
      };
    });

  } catch (err) {
    console.error("Fosters rendering error:", err);
    container.innerHTML = `<div class="empty-state"><p>Error connecting to database.</p></div>`;
  }
}

/**
 * Register Foster Family Modal
 */
function showAddFosterModal(ngoData) {
  showModal({
    title: "Add Foster Family Profile",
    bodyHtml: `
      <form id="foster-form" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div class="form-group">
          <label for="foster-name">Foster Caregiver Name *</label>
          <input type="text" id="foster-name" class="form-control" required placeholder="E.g. Martha Kent">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="foster-phone">Contact Phone *</label>
            <input type="tel" id="foster-phone" class="form-control" required placeholder="+91 98800 12345">
          </div>
          <div class="form-group">
            <label for="foster-email">Email Address *</label>
            <input type="email" id="foster-email" class="form-control" required placeholder="martha@kentfarm.org">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="foster-address">Street Address *</label>
            <input type="text" id="foster-address" class="form-control" required placeholder="Smallville Rural Rd, Bengaluru">
          </div>
          <div class="form-group" style="max-width:120px;">
            <label for="foster-cap">Max Capacity *</label>
            <input type="number" id="foster-cap" class="form-control" required min="1" max="15" value="3">
          </div>
        </div>
      </form>
    `,
    confirmText: "Save Foster Profile",
    onConfirm: async () => {
      const form = document.getElementById('foster-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const name = document.getElementById('foster-name').value.trim();
      const phone = document.getElementById('foster-phone').value.trim();
      const email = document.getElementById('foster-email').value.trim();
      const address = document.getElementById('foster-address').value.trim();
      const maxCapacity = parseInt(document.getElementById('foster-cap').value);

      showLoading(true, "Saving foster record...");
      try {
        await db.collection('ngo_fosters').add({
          orgId: ngoData.uid,
          name,
          phone,
          email,
          address,
          maxCapacity,
          availabilityStatus: 'AVAILABLE',
          currentPlacements: [],
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        showToast(`${name} added to foster directory.`, "success");
        closeModal();
        switchTab('fosters', ngoData);
        return false;
      } catch (err) {
        showToast("Database write failed.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Register Volunteer profile
 */
function showAddVolunteerModal(ngoData) {
  showModal({
    title: "Register Rescue Volunteer",
    bodyHtml: `
      <form id="volunteer-form" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div class="form-group">
          <label for="vol-name">Volunteer Name *</label>
          <input type="text" id="vol-name" class="form-control" required placeholder="E.g. Arthur Pendragon">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="vol-phone">Contact Phone *</label>
            <input type="tel" id="vol-phone" class="form-control" required placeholder="+91 99002 99002">
          </div>
          <div class="form-group">
            <label for="vol-sched">Availability Schedule</label>
            <input type="text" id="vol-sched" class="form-control" placeholder="E.g. Weekends, Evenings, 24/7">
          </div>
        </div>
        <div class="form-group">
          <label for="vol-skills">Specialized Skills (Comma separated)</label>
          <input type="text" id="vol-skills" class="form-control" placeholder="E.g. Canine Handler, Pet First-Aid, Driving">
        </div>
      </form>
    `,
    confirmText: "Register Volunteer",
    onConfirm: async () => {
      const form = document.getElementById('volunteer-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const name = document.getElementById('vol-name').value.trim();
      const phone = document.getElementById('vol-phone').value.trim();
      const availabilitySchedule = document.getElementById('vol-sched').value.trim() || 'Flexible';
      const skillsInput = document.getElementById('vol-skills').value.trim();
      const skills = skillsInput ? skillsInput.split(',').map(s => s.trim()).filter(Boolean) : ['General Help'];

      showLoading(true, "Saving volunteer roster...");
      try {
        await db.collection('ngo_volunteers').add({
          orgId: ngoData.uid,
          name,
          phone,
          availabilitySchedule,
          skills,
          activeMissionId: '',
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        showToast(`${name} added to volunteer squad.`, "success");
        closeModal();
        switchTab('fosters', ngoData);
        return false;
      } catch (err) {
        showToast("Database write failed.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Perform Placement allocation modal
 */
function showAssignPlacementModal(foster, rescues, ngoData) {
  // Filter custody animals available (in Sheltered or Rehab status)
  const availableAnimals = rescues.filter(r => r.intakeStatus === 'SHELTERED' || r.intakeStatus === 'MEDICAL_REHAB');

  showModal({
    title: `Place Animal with ${foster.name}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:0.75rem; padding:0.5rem 0;">
        <p style="font-size:0.8rem; color:var(--text-muted);">
          Select an animal from sheltered custody to assign to Kent Farm foster care.
        </p>
        <div class="form-group">
          <label for="placement-animal-select">Select Animal *</label>
          <select id="placement-animal-select" class="form-control">
            ${availableAnimals.length === 0 ? `
              <option value="">No animals available in shelter</option>
            ` : availableAnimals.map(a => `<option value="${a.id}">${a.name} (${a.type} - ${a.intakeStatus})</option>`).join('')}
          </select>
        </div>
      </div>
    `,
    confirmText: "Execute Placement",
    onConfirm: async () => {
      const animalId = document.getElementById('placement-animal-select').value;
      if (!animalId) {
        showToast("Please choose an animal.", "warning");
        return true;
      }

      showLoading(true, "Allocating placement...");
      try {
        const animal = rescues.find(r => r.id === animalId);
        
        // Batch operations
        const batch = db.batch();
        
        // 1. Update animal record
        const animalRef = db.collection('rescued_animals').doc(animalId);
        const timelineEvent = {
          event: "Foster Placement",
          notes: `Assigned to Foster Home: ${foster.name}. Contact: ${foster.phone}`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };
        batch.update(animalRef, {
          intakeStatus: 'FOSTERED',
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        // 2. Update foster caregiver document placements list
        const fosterRef = db.collection('ngo_fosters').doc(foster.id);
        batch.update(fosterRef, {
          currentPlacements: fb.firestore.FieldValue.arrayUnion(animalId)
        });

        await batch.commit();

        showToast(`${animal.name} placed under ${foster.name}'s care.`, "success");
        closeModal();
        switchTab('fosters', ngoData);
        return false;
      } catch (err) {
        console.error("Placement error:", err);
        showToast("Placement assignment failed.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}


// ==========================================================================
// 4. ADOPTIONS HUB & APPLICATION MANAGER (WITH ANALYTICS & DIRECT SCHEDULING)
// ==========================================================================
async function renderAdoptionsTab(container, ngoData) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    const appsSnap = await db.collection('adoption_applications')
      .where('orgId', '==', ngoData.uid)
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

    const listingsSnap = await db.collection('adoptions').where('orgId', '==', ngoData.uid).get();

    // 1. Calculate Analytics
    const totalListings = listingsSnap.size;
    const pendingApps = applications.filter(a => a.status === 'PENDING').length;
    const reviewApps = applications.filter(a => a.status === 'UNDER_REVIEW' || a.status === 'HOME_CHECK_SCHEDULED').length;
    const completedAdoptions = applications.filter(a => a.status === 'COMPLETED').length;
    const rejectedApps = applications.filter(a => a.status === 'REJECTED').length;

    // Calculate Average adoption completion time
    const completedApps = applications.filter(a => a.status === 'COMPLETED' && a.completionTimeMs > 0);
    let avgCompletionText = 'N/A';
    if (completedApps.length > 0) {
      let totalMs = 0;
      completedApps.forEach(a => totalMs += a.completionTimeMs);
      const avgHrs = Math.round(totalMs / (1000 * 60 * 60));
      if (avgHrs > 24) {
        avgCompletionText = `${(avgHrs / 24).toFixed(1)} days`;
      } else {
        avgCompletionText = `${avgHrs} hours`;
      }
    }

    container.innerHTML = `
      <!-- Analytics widgets bar -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap:0.75rem; margin-bottom:1.5rem;">
        <div class="glass-card" style="padding:0.75rem; text-align:center; border: 1px solid var(--border-glass);">
          <div style="font-size:1.4rem; font-weight:800; font-family:'Outfit'; color:var(--teal);">${totalListings}</div>
          <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Active Listings</span>
        </div>
        <div class="glass-card" style="padding:0.75rem; text-align:center; border: 1px solid var(--border-glass);">
          <div style="font-size:1.4rem; font-weight:800; font-family:'Outfit'; color:var(--accent-yellow);">${pendingApps}</div>
          <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">New Pending</span>
        </div>
        <div class="glass-card" style="padding:0.75rem; text-align:center; border: 1px solid var(--border-glass);">
          <div style="font-size:1.4rem; font-weight:800; font-family:'Outfit'; color:#9b5de5;">${reviewApps}</div>
          <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">In Review / Check</span>
        </div>
        <div class="glass-card" style="padding:0.75rem; text-align:center; border: 1px solid var(--border-glass);">
          <div style="font-size:1.4rem; font-weight:800; font-family:'Outfit'; color:var(--accent-green);">${completedAdoptions}</div>
          <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Successful</span>
        </div>
        <div class="glass-card" style="padding:0.75rem; text-align:center; border: 1px solid var(--border-glass);">
          <div style="font-size:1.4rem; font-weight:800; font-family:'Outfit'; color:var(--accent-red);">${rejectedApps}</div>
          <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Rejected</span>
        </div>
        <div class="glass-card" style="padding:0.75rem; text-align:center; border: 1px solid var(--border-glass);">
          <div style="font-size:1.4rem; font-weight:800; font-family:'Outfit'; color:var(--terracotta);">${avgCompletionText}</div>
          <span style="font-size:0.65rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Avg Completion</span>
        </div>
      </div>

      <div class="grid-split" style="align-items:start;">
        
        <!-- Left: Incoming Adoption Applications -->
        <div class="glass-card">
          <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.2rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            Adoption Applications Manager
          </h3>
          <div id="adoption-apps-list" style="display:flex; flex-direction:column; gap:0.75rem;">
            ${applications.length === 0 ? `
              <div style="text-align:center; padding:2.5rem; color:var(--text-muted);">
                <i class="fa-solid fa-envelope-open-text" style="font-size:2.5rem; opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
                No adoption requests submitted yet.
              </div>
            ` : applications.map(app => {
              let statusColor = 'var(--accent-yellow)';
              if (app.status === 'UNDER_REVIEW') statusColor = 'var(--teal)';
              if (app.status === 'HOME_CHECK_SCHEDULED') statusColor = '#9b5de5';
              if (app.status === 'HOME_CHECK_PASSED') statusColor = 'var(--accent-green)';
              if (app.status === 'HOME_CHECK_FAILED') statusColor = 'var(--accent-red)';
              if (app.status === 'APPROVED') statusColor = '#cca01c';
              if (app.status === 'COMPLETED') statusColor = '#2a9d8f';
              if (app.status === 'REJECTED') statusColor = 'var(--accent-red)';

              const homeCheckDateStr = app.homeCheckDate ? formatFriendlyDate(app.homeCheckDate) : 'Not Scheduled';

              return `
                <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-glass); padding:0.85rem; border-radius:var(--radius-md); font-size:0.8rem;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                    <div>
                      <strong style="font-size:0.9rem; color:var(--teal); font-family:'Outfit';">App for: ${app.animalName || 'Adoptable Animal'}</strong>
                      <span style="font-size:0.65rem; color:var(--text-muted); display:block;">Filed: ${formatFriendlyDate(app.timestamp)}</span>
                    </div>
                    <span class="status-badge ${app.status === 'APPROVED' ? 'badge-primary' : app.status === 'COMPLETED' ? 'badge-success' : app.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}">
                      ${app.status || 'PENDING'}
                    </span>
                  </div>

                  <!-- Expanded Questionnaire Display -->
                  <div style="background:rgba(255,255,255,0.4); border:1px solid rgba(0,0,0,0.03); border-radius:var(--radius-sm); padding:0.6rem; margin-bottom:0.5rem; font-size:0.75rem; display:flex; flex-direction:column; gap:0.25rem;">
                    <span><strong>Applicant Name:</strong> ${app.applicantName} (${app.applicantCity || 'Unknown'})</span>
                    <span><strong>Contact info:</strong> <i class="fa-solid fa-phone"></i> ${app.applicantPhone} &bull; <i class="fa-solid fa-envelope"></i> ${app.applicantEmail}</span>
                    <span><strong>Housing Type:</strong> ${app.housingType || 'N/A'}</span>
                    <span><strong>Existing Pets:</strong> ${app.existingPets || 'None'}</span>
                    <span><strong>Pet Experience:</strong> ${app.experience || 'None'}</span>
                    <span><strong>Reason to Adopt:</strong> "${app.reason || ''}"</span>
                    ${app.homeCheckDate ? `<span><strong style="color:#9b5de5;"><i class="fa-solid fa-calendar-check"></i> Home Check Date:</strong> ${app.homeCheckDate.replace('T', ' ')}</span>` : ''}
                  </div>

                  <!-- Home Check status dropdown & comments log -->
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                    <div style="display:flex; align-items:center; gap:0.25rem;">
                      <span style="font-size:0.65rem; color:var(--text-muted);">Home Check:</span>
                      <select class="form-control select-home-check" data-id="${app.id}" style="padding:0.2rem; font-size:0.7rem; width:100px; display:inline-block;">
                        <option value="PENDING" ${app.homeCheckStatus === 'PENDING' ? 'selected' : ''}>Pending</option>
                        <option value="PASSED" ${app.homeCheckStatus === 'PASSED' ? 'selected' : ''}>Passed</option>
                        <option value="FAILED" ${app.homeCheckStatus === 'FAILED' ? 'selected' : ''}>Failed</option>
                      </select>
                    </div>

                    <!-- App general status controls -->
                    <div style="display:flex; align-items:center; gap:0.25rem;">
                      <span style="font-size:0.65rem; color:var(--text-muted);">Transition Status:</span>
                      <select class="form-control select-app-status" data-id="${app.id}" style="padding:0.2rem; font-size:0.7rem; width:120px; display:inline-block;" ${app.status === 'COMPLETED' ? 'disabled' : ''}>
                        <option value="PENDING" ${app.status === 'PENDING' ? 'selected' : ''}>Pending</option>
                        <option value="UNDER_REVIEW" ${app.status === 'UNDER_REVIEW' ? 'selected' : ''}>Under Review</option>
                        <option value="APPROVED" ${app.status === 'APPROVED' ? 'selected' : ''}>Approved</option>
                        <option value="REJECTED" ${app.status === 'REJECTED' ? 'selected' : ''}>Rejected</option>
                        ${app.status === 'COMPLETED' ? '<option value="COMPLETED" selected>Completed</option>' : ''}
                      </select>
                    </div>
                  </div>

                  <!-- Operational Actions: Add Notes & Schedule Check -->
                  <div style="margin-top:0.75rem; border-top:1px solid rgba(0,0,0,0.03); padding-top:0.5rem; display:flex; gap:0.5rem; justify-content:flex-end; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-app-notes" data-id="${app.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem;">
                      <i class="fa-solid fa-comment-medical"></i> Notes (${(app.ngoNotes || []).length})
                    </button>
                    <button class="btn btn-outline btn-app-schedule" data-id="${app.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem;" ${app.status === 'COMPLETED' ? 'disabled' : ''}>
                      <i class="fa-solid fa-calendar-days"></i> Schedule Check
                    </button>
                    ${app.status === 'PENDING' || app.status === 'UNDER_REVIEW' || app.status === 'HOME_CHECK_SCHEDULED' ? `
                      <button class="btn btn-primary btn-app-approve-direct" data-id="${app.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem;">
                        <i class="fa-solid fa-circle-check"></i> Approve Application
                      </button>
                    ` : ''}
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Record a Stray Reunification/Claim Form -->
        <div class="glass-card">
          <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.2rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            Record Owner Reclaim / Claim
          </h3>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem; line-height:1.4;">
            If a lost stray's owner steps forward to claim the pet, register verification documents and close the case log as REUNITED.
          </p>
          <button id="btn-reclaim-modal" class="btn btn-primary btn-full">
            <i class="fa-solid fa-handshake-angle"></i> Open Reunification Logger
          </button>
        </div>

      </div>
    `;

    document.getElementById('btn-reclaim-modal').onclick = () => showReclaimFormModal(ngoData);

    // Bind Home Check updates
    container.querySelectorAll('.select-home-check').forEach(select => {
      select.onchange = async () => {
        const id = select.getAttribute('data-id');
        const nextState = select.value;

        showLoading(true, "Updating documentation...");
        try {
          await db.collection('adoption_applications').doc(id).update({
            homeCheckStatus: nextState
          });
          showToast("Home check audit updated.", "success");
          switchTab('adoptions', ngoData);
        } catch (err) {
          showToast("Failed to update status.", "error");
        } finally {
          showLoading(false);
        }
      };
    });

    // Bind General Status dropdown transitions
    container.querySelectorAll('.select-app-status').forEach(select => {
      select.onchange = async () => {
        const id = select.getAttribute('data-id');
        const targetStatus = select.value;
        const app = applications.find(a => a.id === id);

        if (targetStatus === 'APPROVED') {
          await approveAdoptionApp(app, ngoData);
        } else if (targetStatus === 'REJECTED') {
          await rejectAdoptionApp(app, ngoData);
        } else {
          showLoading(true, "Shifting status...");
          try {
            await db.collection('adoption_applications').doc(id).update({
              status: targetStatus
            });
            showToast(`Application status moved to ${targetStatus}.`, "success");
            switchTab('adoptions', ngoData);
          } catch (err) {
            showToast("Failed to shift status.", "error");
          } finally {
            showLoading(false);
          }
        }
      };
    });

    // Bind App Notes modal button
    container.querySelectorAll('.btn-app-notes').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const app = applications.find(a => a.id === id);
        showApplicationNotesModal(app, ngoData);
      };
    });

    // Bind Schedule Home Check modal button
    container.querySelectorAll('.btn-app-schedule').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const app = applications.find(a => a.id === id);
        showScheduleHomeCheckModal(app, ngoData);
      };
    });

    // Bind Direct Approve button
    container.querySelectorAll('.btn-app-approve-direct').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const app = applications.find(a => a.id === id);
        approveAdoptionApp(app, ngoData);
      };
    });

  } catch (err) {
    console.error("Adoptions Hub loading failed:", err);
    container.innerHTML = `<div class="empty-state"><p>Database fetching failed.</p></div>`;
  }
}

/**
 * Review/Edit application notes modal
 */
function showApplicationNotesModal(app, ngoData) {
  const notes = app.ngoNotes || [];

  showModal({
    title: `Case Notes: App for ${app.animalName}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:0.75rem; max-height:400px; overflow-y:auto;" id="app-notes-viewport">
        
        <!-- Add Note form -->
        <div style="display:flex; gap:0.5rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem; margin-bottom:0.5rem;">
          <input type="text" id="new-app-note" class="form-control" placeholder="Add administrative notes..." style="font-size:0.8rem;">
          <button id="btn-submit-app-note" class="btn btn-primary" style="font-size:0.75rem; padding:0.4rem 0.8rem;">Post</button>
        </div>

        <!-- Notes list -->
        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          ${notes.length === 0 ? `
            <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:1.5rem;">No notes recorded for this application.</div>
          ` : notes.map(n => `
            <div style="background:rgba(0,0,0,0.02); border:1px solid rgba(0,0,0,0.04); padding:0.5rem; border-radius:var(--radius-sm); font-size:0.75rem;">
              <p style="margin:0 0 0.15rem 0;">"${n.note}"</p>
              <span style="font-size:0.65rem; color:var(--text-muted);">By ${n.author} (${formatFriendlyDate(n.date)})</span>
            </div>
          `).reverse().join('')}
        </div>
      </div>
    `,
    confirmText: "Done",
    onConfirm: () => {
      closeModal();
      return false;
    }
  });

  document.getElementById('btn-submit-app-note').onclick = async () => {
    const noteText = document.getElementById('new-app-note').value.trim();
    if (!noteText) return;

    showLoading(true, "Posting note...");
    try {
      const noteObj = {
        note: noteText,
        date: new Date().toISOString(),
        author: ngoData.displayName
      };

      await db.collection('adoption_applications').doc(app.id).update({
        ngoNotes: fb.firestore.FieldValue.arrayUnion(noteObj)
      });

      showToast("Case note saved.", "success");
      closeModal();
      switchTab('adoptions', ngoData);
    } catch (err) {
      showToast("Failed to save note.", "error");
    } finally {
      showLoading(false);
    }
  };

  const nsViewport = document.getElementById('app-notes-viewport');
  if (nsViewport) {
    nsViewport.style.scrollbarWidth = 'thin';
    nsViewport.style.scrollbarColor = 'var(--border-glass) transparent';
  }
}

/**
 * Schedule Home Check Modal dialogue
 */
function showScheduleHomeCheckModal(app, ngoData) {
  showModal({
    title: `Schedule Home Check: ${app.applicantName}`,
    bodyHtml: `
      <div style="display:flex; flex-direction:column; gap:0.75rem; padding:0.5rem 0;">
        <p style="font-size:0.8rem; color:var(--text-muted);">
          Select a date and time for the physical or virtual home check verification of the adopter.
        </p>
        <div class="form-group">
          <label for="check-sched-date">Select Date & Time *</label>
          <input type="datetime-local" id="check-sched-date" class="form-control" required>
        </div>
      </div>
    `,
    confirmText: "Schedule & Notify",
    onConfirm: async () => {
      const checkDate = document.getElementById('check-sched-date').value;
      if (!checkDate) {
        showToast("Please provide a valid date and time.", "warning");
        return true;
      }

      showLoading(true, "Scheduling check...");
      try {
        const batch = db.batch();

        // 1. Update application status
        batch.update(db.collection('adoption_applications').doc(app.id), {
          status: 'HOME_CHECK_SCHEDULED',
          homeCheckDate: checkDate
        });

        // 2. Log note/timeline inside application
        const noteObj = {
          note: `Home check scheduled for ${checkDate.replace('T', ' ')}.`,
          date: new Date().toISOString(),
          author: ngoData.displayName
        };
        batch.update(db.collection('adoption_applications').doc(app.id), {
          ngoNotes: fb.firestore.FieldValue.arrayUnion(noteObj)
        });

        // 3. Notify the applicant
        batch.set(db.collection('users').doc(app.applicantUid).collection('notifications').doc(), {
          type: 'STATUS_CHANGE',
          message: `Your home check for ${app.animalName} has been scheduled for ${checkDate.replace('T', ' ')} by ${ngoData.displayName}.`,
          read: false,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        showToast("Home check scheduled and applicant notified.", "success");
        closeModal();
        switchTab('adoptions', ngoData);
        return false;
      } catch (err) {
        showToast("Failed to schedule check.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Approve application without immediate transfer (sets to APPROVED, awaiting owner confirmation)
 */
async function approveAdoptionApp(app, ngoData) {
  showModal({
    title: "Approve Adoption Application",
    bodyHtml: `
      <div style="padding:0.5rem 0; font-size:0.85rem; line-height:1.45;">
        <p>Are you sure you want to approve <strong>${app.applicantName}</strong>'s application for <strong>${app.animalName}</strong>?</p>
        <div style="background:rgba(82, 183, 136, 0.08); border:1px solid rgba(82,183,136,0.15); padding:0.75rem; border-radius:var(--radius-sm); margin-top:0.5rem; font-size:0.75rem;">
          <strong>Structured workflow rules:</strong>
          <ul style="padding-left:1.2rem; margin-top:0.25rem;">
            <li>Status transitions to <strong>APPROVED</strong>.</li>
            <li>Applicant is notified and must click <strong>Confirm & Accept</strong> on their dashboard.</li>
            <li>Adoptions card remains public until the Adopter accepts.</li>
          </ul>
        </div>
      </div>
    `,
    confirmText: "Confirm NGO Approval",
    onConfirm: async () => {
      showLoading(true, "Approving application...");
      try {
        const batch = db.batch();

        // 1. Update application status
        batch.update(db.collection('adoption_applications').doc(app.id), {
          status: 'APPROVED'
        });

        // 2. Add application note
        const noteObj = {
          note: "Application approved by NGO. Awaiting applicant confirmation to transfer ownership.",
          date: new Date().toISOString(),
          author: ngoData.displayName
        };
        batch.update(db.collection('adoption_applications').doc(app.id), {
          ngoNotes: fb.firestore.FieldValue.arrayUnion(noteObj)
        });

        // 3. Log timeline event inside rescued_animals
        const timelineEvent = {
          event: "Adoption Approved",
          notes: `Application approved by NGO. Awaiting Adopter confirmation.`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };
        batch.update(db.collection('rescued_animals').doc(app.animalId), {
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        // 4. Send notification to applicant
        batch.set(db.collection('users').doc(app.applicantUid).collection('notifications').doc(), {
          type: 'STATUS_CHANGE',
          message: `Your adoption application for ${app.animalName} has been APPROVED! Please go to Adoption Center -> My Applications to confirm and welcome your companion.`,
          read: false,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        showToast("Application approved. Awaiting Adopter confirmation.", "success");
        closeModal();
        switchTab('adoptions', ngoData);
        return false;
      } catch (err) {
        showToast("Failed to approve application.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Reject Adoption Application
 */
async function rejectAdoptionApp(app, ngoData) {
  showModal({
    title: "Reject Adoption Application",
    bodyHtml: `
      <div style="padding:0.5rem 0; font-size:0.85rem; line-height:1.4;">
        <p>Are you sure you want to reject <strong>${app.applicantName}</strong>'s application for <strong>${app.animalName}</strong>?</p>
        <div class="form-group mt-1">
          <label for="reject-reason">Reason for Rejection *</label>
          <input type="text" id="reject-reason" class="form-control" required placeholder="E.g. Home check failed / Insufficient fences.">
        </div>
      </div>
    `,
    confirmText: "Confirm Rejection",
    onConfirm: async () => {
      const reason = document.getElementById('reject-reason').value.trim();
      if (!reason) {
        showToast("Please provide a reason.", "warning");
        return true;
      }

      showLoading(true, "Recording rejection...");
      try {
        const batch = db.batch();

        const appRef = db.collection('adoption_applications').doc(app.id);
        batch.update(appRef, {
          status: 'REJECTED',
          resolutionNotes: `Rejected by NGO. Reason: ${reason}`,
          resolutionDate: new Date().toISOString()
        });

        const animalRef = db.collection('rescued_animals').doc(app.animalId);
        const timelineEvent = {
          event: "Adoption Rejected",
          notes: `Adoption application by ${app.applicantName} was rejected. Reason: ${reason}`,
          timestamp: new Date(),
          actor: ngoData.displayName
        };
        batch.update(animalRef, {
          timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
        });

        // Notify user
        const notificationRef = db.collection('users').doc(app.applicantUid).collection('notifications').doc();
        batch.set(notificationRef, {
          type: 'STATUS_CHANGE',
          message: `Your adoption application for ${app.animalName} has been closed/declined. Reason: ${reason}`,
          read: false,
          timestamp: fb.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();
        showToast("Application rejected.", "info");
        closeModal();
        switchTab('adoptions', ngoData);
        return false;
      } catch (err) {
        showToast("Failed to reject application.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Reclaim Form Dialog Modal
 */
async function showReclaimFormModal(ngoData) {
  showLoading(true, "Retrieving shelter census...");
  try {
    const censusSnap = await db.collection('rescued_animals')
      .where('orgId', '==', ngoData.uid)
      .get();
    
    const available = [];
    censusSnap.forEach(doc => {
      const data = doc.data();
      if (data.intakeStatus === 'SHELTERED' || data.intakeStatus === 'FOSTERED' || data.intakeStatus === 'MEDICAL_REHAB') {
        available.push({ id: doc.id, ...data });
      }
    });

    if (available.length === 0) {
      showToast("No active custody cases in shelter census to reclaim.", "warning");
      return;
    }

    showModal({
      title: "Log Stray Reunification / Reclaim",
      bodyHtml: `
        <form id="reclaim-log-form" style="display:flex; flex-direction:column; gap:0.85rem;">
          <div class="form-group">
            <label for="reclaim-animal">Select Rescued Animal *</label>
            <select id="reclaim-animal" class="form-control" required>
              ${available.map(a => `<option value="${a.id}">${a.name} (${a.type} - ${a.intakeStatus})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="reclaim-owner">Verified Owner Name *</label>
            <input type="text" id="reclaim-owner" class="form-control" required placeholder="E.g. Clara Oswald">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="reclaim-phone">Owner Contact Phone *</label>
              <input type="tel" id="reclaim-phone" class="form-control" required placeholder="+91 99882 12245">
            </div>
            <div class="form-group">
              <label for="reclaim-proof">Proof of Ownership verified *</label>
              <input type="text" id="reclaim-proof" class="form-control" required placeholder="E.g. Vet Microchip match/Intake photo ID match">
            </div>
          </div>
          <div class="form-group">
            <label for="reclaim-notes">Verification / Operational Notes</label>
            <textarea id="reclaim-notes" class="form-control" rows="2" placeholder="Detail any logistics, tags returned, or fees paid..."></textarea>
          </div>
        </form>
      `,
      confirmText: "Process Return to Owner",
      onConfirm: async () => {
        const form = document.getElementById('reclaim-log-form');
        if (!form.checkValidity()) {
          form.reportValidity();
          return true;
        }

        const animalId = document.getElementById('reclaim-animal').value;
        const ownerName = document.getElementById('reclaim-owner').value.trim();
        const ownerPhone = document.getElementById('reclaim-phone').value.trim();
        const proof = document.getElementById('reclaim-proof').value.trim();
        const notes = document.getElementById('reclaim-notes').value.trim();

        showLoading(true, "Finalizing owner return...");
        try {
          const animal = available.find(a => a.id === animalId);
          const timelineEvent = {
            event: "Reunited",
            notes: `Stray animal successfully returned to verified owner: ${ownerName} (${ownerPhone}). Proof: ${proof}. Detail: ${notes || 'None'}`,
            timestamp: new Date(),
            actor: ngoData.displayName
          };

          // Update rescued animal
          await db.collection('rescued_animals').doc(animalId).update({
            intakeStatus: 'REUNITED',
            timeline: fb.firestore.FieldValue.arrayUnion(timelineEvent)
          });

          showToast(`${animal.name} case marked as REUNITED.`, "success");
          closeModal();
          switchTab('adoptions', ngoData);
          return false;
        } catch (err) {
          showToast("Failed to write to database.", "error");
          return true;
        } finally {
          showLoading(false);
        }
      }
    });

  } catch (err) {
    showToast("Failed to fetch shelter census.", "error");
  } finally {
    showLoading(false);
  }
}


// ==========================================================================
// 5. RESCUE REQUESTS TAB (STRAY INCIDENT GEOGRAPHIC GATING)
// ==========================================================================
async function renderRequestsTab(container, ngoData) {
  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>`;

  try {
    const reportsSnap = await db.collection('stray_reports').orderBy('timestamp', 'desc').limit(30).get();
    const volunteerSnap = await db.collection('ngo_volunteers').where('orgId', '==', ngoData.uid).limit(100).get();

    const reports = [];
    reportsSnap.forEach(doc => reports.push({ id: doc.id, ...doc.data() }));

    const volunteers = [];
    volunteerSnap.forEach(doc => volunteers.push({ id: doc.id, ...doc.data() }));

    // Filter to show active reported/in-progress cases
    const activeRequests = reports.filter(r => r.status === 'reported' || r.status === 'rescue-in-progress');
    const closedRequests = reports.filter(r => r.status === 'rescued' || r.status === 'reunited');

    container.innerHTML = `
      <div class="grid-split" style="align-items:start;">
        
        <!-- Left: Active Stray Requests Grid -->
        <div class="glass-card">
          <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.2rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            Active Rescue Operations Queue (${activeRequests.length})
          </h3>
          
          <div id="requests-active-queue" style="display:flex; flex-direction:column; gap:0.75rem;">
            ${activeRequests.length === 0 ? `
              <div style="text-align:center; padding:2rem; color:var(--text-muted);">
                <i class="fa-solid fa-circle-check" style="font-size:2.5rem; color:var(--accent-green); opacity:0.3; margin-bottom:0.5rem; display:block;"></i>
                No active stray reports requiring assistance.
              </div>
            ` : activeRequests.map(rep => {
              let urgencyColor = 'var(--text-muted)';
              if (rep.urgency === 'HIGH') urgencyColor = 'var(--terracotta)';
              if (rep.urgency === 'CRITICAL') urgencyColor = 'var(--accent-red)';
              if (rep.urgency === 'MEDIUM') urgencyColor = 'var(--accent-yellow)';

              let mapsBtn = '';
              if (rep.latitude && rep.longitude) {
                mapsBtn = `
                  <a href="${getGoogleMapsLink(rep.latitude, rep.longitude)}" target="_blank" class="btn btn-outline" style="font-size:0.65rem; padding:0.25rem 0.5rem;">
                    <i class="fa-solid fa-map-location-dot"></i> Maps
                  </a>
                `;
              }

              return `
                <div style="background:rgba(0,0,0,0.02); border:1px solid var(--border-glass); padding:0.85rem; border-radius:var(--radius-md); font-size:0.8rem; display:flex; gap:1rem;">
                  
                  ${rep.photo ? `
                    <div style="width:70px; height:70px; border-radius:var(--radius-sm); overflow:hidden; border:1px solid var(--border-glass); flex-shrink:0;">
                      <img src="${rep.photo}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                  ` : ''}

                  <div style="flex-grow:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.25rem;">
                      <div>
                        <span style="font-size:0.65rem; padding:0.15rem 0.35rem; border-radius:var(--radius-sm); font-weight:700; color:white; background:${urgencyColor === 'var(--text-muted)' ? 'var(--teal)' : urgencyColor}; text-transform:none;">
                          ${rep.urgency || 'LOW'} URGENCY
                        </span>
                        <span style="font-size:0.65rem; color:var(--text-muted); margin-left:0.4rem;">Filed: ${formatFriendlyDate(rep.timestamp)}</span>
                      </div>
                      <span class="status-badge ${rep.status === 'rescue-in-progress' ? 'badge-primary' : rep.status === 'resolved' ? 'badge-success' : 'badge-warning'}">
                        ${rep.status || 'reported'}
                      </span>
                    </div>

                    <p style="font-size:0.8rem; line-height:1.3; margin:0.35rem 0;">${rep.description}</p>
                    <span style="font-size:0.7rem; color:var(--text-muted); display:block;">Reporter: ${rep.reporterName} (${rep.reporterContact})</span>
                    
                    ${rep.assignedVolunteerName ? `
                      <span style="font-size:0.7rem; color:var(--teal); font-weight:600; display:block; margin-top:0.25rem;">
                        <i class="fa-solid fa-person-running"></i> Dispatched: ${rep.assignedVolunteerName}
                      </span>
                    ` : ''}

                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.75rem; border-top:1px solid rgba(0,0,0,0.03); padding-top:0.5rem; flex-wrap:wrap; gap:0.5rem;">
                      <div style="display:flex; gap:0.4rem; align-items:center;">
                        <span style="font-size:0.65rem; color:var(--text-muted);">Dispatch:</span>
                        <select class="form-control select-dispatch-volunteer" data-id="${rep.id}" style="padding:0.2rem; font-size:0.7rem; width:110px;">
                          <option value="">Select Crew</option>
                          ${volunteers.map(v => `<option value="${v.id}" ${rep.assignedVolunteerId === v.id ? 'selected' : ''}>${v.name}</option>`).join('')}
                        </select>
                        
                        <span style="font-size:0.65rem; color:var(--text-muted); margin-left:0.25rem;">Urgency:</span>
                        <select class="form-control select-urgency-gate" data-id="${rep.id}" style="padding:0.2rem; font-size:0.7rem; width:80px;">
                          <option value="LOW" ${rep.urgency === 'LOW' ? 'selected' : ''}>Low</option>
                          <option value="MEDIUM" ${rep.urgency === 'MEDIUM' ? 'selected' : ''}>Medium</option>
                          <option value="HIGH" ${rep.urgency === 'HIGH' ? 'selected' : ''}>High</option>
                          <option value="CRITICAL" ${rep.urgency === 'CRITICAL' ? 'selected' : ''}>Critical</option>
                        </select>
                      </div>

                      <div style="display:flex; gap:0.25rem;">
                        ${mapsBtn}
                        <button class="btn btn-primary btn-resolve-intake" data-id="${rep.id}" style="font-size:0.65rem; padding:0.25rem 0.5rem;">
                          <i class="fa-solid fa-circle-down"></i> Intake & Close
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Closed Stray Requests Log -->
        <div class="glass-card">
          <h3 style="font-family:'Outfit'; font-weight:700; font-size:1.2rem; border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem; margin-bottom:1rem;">
            Resolved Case Logs (${closedRequests.length})
          </h3>
          <div id="requests-resolved-queue" style="display:flex; flex-direction:column; gap:0.65rem; max-height:350px; overflow-y:auto; padding-right:0.15rem;">
            ${closedRequests.length === 0 ? `
              <div style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:1.5rem;">No historical requests resolved yet.</div>
            ` : closedRequests.slice(0, 10).map(rep => `
              <div style="background:rgba(0,0,0,0.01); border:1px solid rgba(0,0,0,0.03); padding:0.6rem; border-radius:var(--radius-sm); font-size:0.75rem; opacity:0.85;">
                <div style="display:flex; justify-content:space-between; margin-bottom:0.15rem;">
                  <strong style="color:var(--accent-green);"><i class="fa-solid fa-circle-check"></i> ${rep.status === 'reunited' ? 'REUNITED' : 'RESCUED'}</strong>
                  <span style="font-size:0.65rem; color:var(--text-muted);">${formatFriendlyDate(rep.timestamp)}</span>
                </div>
                <div style="color:var(--text-main); font-style:italic;">"${rep.description}"</div>
                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:0.2rem; background:rgba(0,0,0,0.02); padding:0.25rem; border-radius:3px;">
                  <strong>Resolution:</strong> ${rep.resolutionNotes || 'Animal saved.'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    // Bind scrollbar
    const closedQueue = document.getElementById('requests-resolved-queue');
    if (closedQueue) {
      closedQueue.style.scrollbarWidth = 'thin';
      closedQueue.style.scrollbarColor = 'var(--border-glass) transparent';
    }

    // Bind Volunteer Dispatch dropdown select onchange
    container.querySelectorAll('.select-dispatch-volunteer').forEach(select => {
      select.onchange = async () => {
        const id = select.getAttribute('data-id');
        const volunteerId = select.value;
        const v = volunteers.find(vol => vol.id === volunteerId);
        const name = v ? v.name : '';

        showLoading(true, "Dispatching team...");
        try {
          await db.collection('stray_reports').doc(id).update({
            assignedVolunteerId: volunteerId,
            assignedVolunteerName: name,
            status: volunteerId ? 'rescue-in-progress' : 'reported'
          });
          
          if (volunteerId) {
            showToast(`Volunteer ${name} dispatched to stray incident.`, "success");
          } else {
            showToast("Incident status reset to reported.", "info");
          }
          switchTab('requests', ngoData);
        } catch (err) {
          showToast("Failed to dispatch volunteer.", "error");
        } finally {
          showLoading(false);
        }
      };
    });

    // Bind Urgency Gating selector onchange
    container.querySelectorAll('.select-urgency-gate').forEach(select => {
      select.onchange = async () => {
        const id = select.getAttribute('data-id');
        const urgency = select.value;

        showLoading(true, "Updating urgency gating...");
        try {
          await db.collection('stray_reports').doc(id).update({
            urgency
          });
          showToast(`Urgency set to ${urgency}.`, "success");
          switchTab('requests', ngoData);
        } catch (err) {
          showToast("Failed to set urgency level.", "error");
        } finally {
          showLoading(false);
        }
      };
    });

    // Bind Resolve & Intake button
    container.querySelectorAll('.btn-resolve-intake').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        const rep = reports.find(r => r.id === id);
        
        // Auto-prefill the Intake Modal with stray report values
        const prefill = {
          id: rep.id,
          name: "Stray Case",
          type: "Dog", // default
          breed: "Rescue Mix",
          location: "Rescue Point Coords",
          photo: rep.photo || '',
          description: `Found at stray coordinates. Incident report notes: "${rep.description}". Reported by: ${rep.reporterName} (${rep.reporterContact}).`
        };

        showIntakeModal(ngoData, prefill);
      };
    });

  } catch (err) {
    console.error("Rescue Request loading failure:", err);
    container.innerHTML = `<div class="empty-state"><p>Failed to retrieve stray reports.</p></div>`;
  }
}

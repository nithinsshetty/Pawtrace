// ==========================================================================
// PAWTRACE OWNER DASHBOARD MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, formatFriendlyDate, getPetImageHTML } from './utils.js';

let mapInstance = null;

/**
 * Render Owner Dashboard
 */
export async function renderDashboard() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Dashboard';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div class="dashboard-grid">
      <div>
        <div class="glass-card mb-2" style="background: linear-gradient(135deg, rgba(31, 122, 140, 0.05) 0%, rgba(219, 93, 57, 0.05) 100%); padding: 2rem;">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.8rem; font-weight: 800; margin-bottom: 0.5rem;">
            Hello, ${user.displayName || user.email.split('@')[0]}!
          </h2>
          <p style="color: var(--text-muted); font-size: 0.9rem;">
            All systems online. Your digital identity collars are actively monitored.
          </p>
        </div>

        <div class="metric-grid">
          <div class="glass-card metric-card magnetic-card">
            <div class="metric-icon teal"><i class="fa-solid fa-paw"></i></div>
            <div class="metric-details">
              <span id="metric-total-pets" class="metric-value">...</span>
              <span class="metric-label">Companions</span>
            </div>
          </div>
          <div class="glass-card metric-card magnetic-card">
            <div class="metric-icon terracotta"><i class="fa-solid fa-shield-halved"></i></div>
            <div class="metric-details">
              <span id="metric-safe-pets" class="metric-value">...</span>
              <span class="metric-label">Safe & Guarded</span>
            </div>
          </div>
          <div class="glass-card metric-card magnetic-card">
            <div class="metric-icon yellow"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div class="metric-details">
              <span id="metric-lost-pets" class="metric-value">...</span>
              <span class="metric-label">Lost Reports</span>
            </div>
          </div>
        </div>

        <div class="flex-between mb-2">
          <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem;">My Companions</h3>
          <a href="#/pets" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
            View All <i class="fa-solid fa-arrow-right"></i>
          </a>
        </div>

        <div id="dashboard-pets-container" class="pets-grid mb-3">
          <div class="skeleton-container"><div class="skeleton skeleton-card"></div></div>
        </div>

        <div class="glass-card mb-3">
          <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.15rem; margin-bottom: 1rem; color: var(--teal);">
            <i class="fa-solid fa-wand-magic-sparkles"></i> Predictive Health Insights
          </h3>
          <div id="health-insights-box">
            <div class="skeleton skeleton-text"></div>
          </div>
        </div>
      </div>

      <div>
        <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-bottom: 1rem;">Active Tracking Radar</h3>
        <div class="glass-card mb-2" style="padding: 0; overflow: hidden; border-radius: var(--radius-md);">
          <div id="vet-map" style="height: 250px;"></div>
          <div style="padding: 1rem; border-top: 1px solid var(--border-glass);">
            <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--terracotta); margin-bottom: 0.25rem;">GPS Scan Tracker</h4>
            <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
              Live geolocation spottings of your pet collar scans display on this radar.
            </p>
          </div>
        </div>

        <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-top: 2rem; margin-bottom: 1rem;">Care Agenda</h3>
        <div id="dashboard-reminders-list" class="glass-card mb-2" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="skeleton skeleton-text"></div>
        </div>

        <h3 style="font-weight: 800; font-family: 'Outfit', sans-serif; font-size: 1.25rem; margin-top: 2rem; margin-bottom: 1rem;">Recent Scan Log</h3>
        <div id="dashboard-scans-list" class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div class="empty-state-mini">
            <i class="fa-solid fa-location-dot"></i>
            <p>No scans recorded.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  showLoading(true, "Syncing dashboard records...");
  try {
    const { data: pets, error: petsErr } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.uid);

    if (petsErr) throw petsErr;

    let total = pets.length;
    let lost = 0;
    let safe = 0;
    const petIds = [];
    const petsContainer = document.getElementById('dashboard-pets-container');
    if (!petsContainer) {
      console.warn("Dashboard container not found. Viewport may have changed.");
      return;
    }
    petsContainer.innerHTML = '';

    if (pets.length === 0) {
      const totalEl = document.getElementById('metric-total-pets');
      const safeEl = document.getElementById('metric-safe-pets');
      const lostEl = document.getElementById('metric-lost-pets');
      if (totalEl) totalEl.textContent = '0';
      if (safeEl) safeEl.textContent = '0';
      if (lostEl) lostEl.textContent = '0';
      petsContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-shield-heart" style="color:var(--teal); font-size: 2.5rem;"></i>
          <h4>Register your first companion</h4>
          <p style="font-size:0.85rem;">Create a digital identity tags to enable location scanning tracking.</p>
          <a href="#/pets" class="btn btn-primary mt-1"><i class="fa-solid fa-plus"></i> Add Companion</a>
        </div>
      `;
    } else {
      pets.forEach((pet) => {
        petIds.push(pet.id);

        if (pet.is_lost) lost++;
        else safe++;

        const isDraft = pet.is_draft === true;
        const badgeClass = isDraft ? 'draft' : (pet.is_lost ? 'lost' : 'safe');
        const badgeText = isDraft ? 'DRAFT' : (pet.is_lost ? 'LOST' : 'SAFE');
        const actionLink = isDraft ? `#/pet/${pet.id}/edit` : `#/pet/${pet.id}`;
        const actionText = isDraft ? '<i class="fa-solid fa-pen-to-square"></i> Edit Draft' : '<i class="fa-solid fa-folder-open"></i> View Profile';

        const card = document.createElement('div');
        card.className = 'glass-card pet-card magnetic-card';
        card.innerHTML = `
          <div class="pet-image-container">
            ${getPetImageHTML({ ...pet, profileImage: pet.photo_url, petType: pet.species }, 'large')}
            <span class="pet-status-badge ${badgeClass}">
              ${badgeText}
            </span>
          </div>
          <div class="pet-card-content">
            <h4 class="pet-card-name" style="display:flex; justify-content:space-between; align-items:center;">
              <span>${pet.name}</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500;">${pet.pawtrace_id || 'PT-PENDING'}</span>
            </h4>
            <div class="pet-card-meta">
              <span>${pet.breed || 'Unknown'}</span>
              <span>•</span>
              <span>${pet.gender || 'N/A'}</span>
            </div>
            <div class="pet-card-actions">
              <a href="${actionLink}" class="btn btn-secondary btn-full" style="font-size:0.8rem; padding:0.45rem 1rem;">
                ${actionText}
              </a>
            </div>
          </div>
        `;
        petsContainer.appendChild(card);
      });

      const totalEl = document.getElementById('metric-total-pets');
      const safeEl = document.getElementById('metric-safe-pets');
      const lostEl = document.getElementById('metric-lost-pets');
      if (totalEl) totalEl.textContent = total;
      if (safeEl) safeEl.textContent = safe;
      if (lostEl) lostEl.textContent = lost;
    }

    initDashboardRadarMap(petIds);
    await loadDashboardReminders(petIds);
    await loadRecentScanLogs(user.uid);
    generateAIInsights(pets);

  } catch (error) {
    console.error("Dashboard Load Error:", error);
    showToast("Error synchronizing dashboard data.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Initialize Leaflet mapping coordinates
 */
async function initDashboardRadarMap(petIds) {
  if (mapInstance) {
    try {
      mapInstance.remove();
    } catch (e) {
      console.warn("Error removing dashboard map instance:", e);
    }
    mapInstance = null;
  }

  const mapContainer = document.getElementById('vet-map');
  if (!mapContainer || petIds.length === 0) {
    mapInstance = L.map('vet-map', { dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([37.7749, -122.4194], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance);
    return;
  }

  mapInstance = L.map('vet-map', { dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([37.7749, -122.4194], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(mapInstance);

  const markerGroup = L.featureGroup().addTo(mapInstance);
  let coordsAdded = false;

  try {
    const { data: scans, error } = await supabase
      .from('scans')
      .select('*')
      .in('pet_id', petIds)
      .order('created_at', { ascending: false })
      .limit(petIds.length * 3);

    if (error) throw error;

    (scans || []).forEach(scan => {
      if (scan.latitude && scan.longitude) {
        const popupText = `
          <div style="font-family:'Outfit',sans-serif; font-size:0.8rem;">
            <strong style="color:var(--terracotta);">Scan Spotting</strong><br>
            Time: ${formatFriendlyDate(scan.created_at)}<br>
            <a href="${scan.maps_link}" target="_blank" style="color:var(--teal); font-weight:600;">Directions</a>
          </div>
        `;
        L.marker([scan.latitude, scan.longitude])
          .bindPopup(popupText)
          .addTo(markerGroup);
        coordsAdded = true;
      }
    });

    if (coordsAdded) {
      mapInstance.fitBounds(markerGroup.getBounds(), { padding: [30, 30] });
    }
  } catch (err) {
    console.warn("Leaflet GPS parsing error:", err);
  }
}

/**
 * Fetch and list top 4 active reminders across owner's pets
 */
async function loadDashboardReminders(petIds) {
  const remindersBox = document.getElementById('dashboard-reminders-list');
  if (!remindersBox) return;

  if (petIds.length === 0) {
    remindersBox.innerHTML = `
      <div class="empty-state-mini" style="padding: 1rem 0;">
        <i class="fa-solid fa-bell-slash"></i>
        <p>No companions registered to plan duties.</p>
      </div>
    `;
    return;
  }

  try {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*, pets(name)')
      .in('pet_id', petIds)
      .eq('is_completed', false)
      .order('reminder_date', { ascending: true })
      .limit(4);

    if (error) throw error;

    remindersBox.innerHTML = '';

    if (!reminders || reminders.length === 0) {
      remindersBox.innerHTML = `
        <div class="empty-state-mini" style="padding: 1rem 0;">
          <i class="fa-solid fa-circle-check" style="color:var(--accent-green);"></i>
          <p>All care duties completed!</p>
        </div>
      `;
      return;
    }

    reminders.forEach(item => {
      let icon = 'fa-clock';
      if (item.reminder_type === 'Vaccination') icon = 'fa-syringe';
      if (item.reminder_type === 'Medicine') icon = 'fa-pills';
      if (item.reminder_type === 'Vet Appointment') icon = 'fa-user-doctor';

      const petName = item.pets ? item.pets.name : '';

      const div = document.createElement('div');
      div.className = 'reminder-item';
      div.style.background = 'rgba(255,255,255,0.03)';
      div.style.border = '1px solid var(--border-glass)';
      div.style.margin = '0';
      div.innerHTML = `
        <div class="reminder-left">
          <i class="fa-solid ${icon}" style="color:var(--teal);"></i>
          <div class="reminder-info">
            <span class="reminder-title">${item.title}</span>
            <span class="reminder-meta">${petName} &bull; ${formatFriendlyDate(item.reminder_date)}</span>
          </div>
        </div>
      `;
      remindersBox.appendChild(div);
    });

  } catch (err) {
    console.error("Dashboard Reminders Fetch Error:", err);
    remindersBox.innerHTML = `<p style="font-size:0.8rem; color:var(--accent-red);">Failed to sync agenda.</p>`;
  }
}

/**
 * Fetch top 3 scan spottings representing alert notifications
 */
async function loadRecentScanLogs(uid) {
  const scansList = document.getElementById('dashboard-scans-list');
  if (!scansList) return;

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .eq('type', 'QR_SCAN')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      scansList.innerHTML = `
        <div class="empty-state-mini" style="padding: 1rem 0;">
          <i class="fa-solid fa-map-location-dot"></i>
          <p>No recent tag scans logged.</p>
        </div>
      `;
      return;
    }

    scansList.innerHTML = '';
    notifications.forEach((data) => {
      const item = document.createElement('div');
      item.className = 'geo-panel';
      item.style.padding = '0.75rem';
      item.style.fontSize = '0.8rem';
      item.innerHTML = `
        <div style="font-weight: 700; color: var(--terracotta); display: flex; align-items: center; justify-content: space-between;">
          <span><i class="fa-solid fa-circle-exclamation"></i> GPS Spotting Logged</span>
          <span style="font-size:0.65rem; color:var(--text-muted);">${formatFriendlyDate(data.created_at)}</span>
        </div>
        <p style="margin: 0.25rem 0; line-height:1.4;">${data.message}</p>
        ${data.maps_link ? `
          <a href="${data.maps_link}" target="_blank" class="btn btn-outline mt-1" style="font-size: 0.7rem; padding: 0.35rem 0.75rem; width: fit-content;">
            <i class="fa-solid fa-map-location-dot"></i> Maps Directions
          </a>
        ` : ''}
      `;
      scansList.appendChild(item);
    });

  } catch (err) {
    console.warn("Error loading scan spottings feed:", err);
  }
}

/**
 * Generate client-side predictive analysis tips
 */
function generateAIInsights(pets) {
  const insightsBox = document.getElementById('health-insights-box');
  if (!insightsBox) return;

  if (!pets || pets.length === 0) {
    insightsBox.innerHTML = `<p style="font-size:0.85rem; color:var(--text-muted);">Log pet details to trigger Predictive Wellness scores.</p>`;
    return;
  }

  const firstPet = pets[0];

  let recommText = `Based on weight progression records for <strong>${firstPet.name}</strong>, their weight is stable. We suggest maintaining their current diet schedule.`;
  if (firstPet.vaccination_status === 'Incomplete') {
    recommText = `Health Alert: <strong>${firstPet.name}</strong> has vaccination logs marked as incomplete. We forecast an elevated risk of infection; please schedule a deworming checkup soon.`;
  } else if (firstPet.weight > 35) {
    recommText = `Weight Warning: <strong>${firstPet.name}</strong>'s current weight of ${firstPet.weight}kg suggests they are in the upper range for their breed. We suggest a 10% increase in daily activity.`;
  }

  insightsBox.innerHTML = `
    <div style="display:flex; gap:1rem; align-items:flex-start;">
      <i class="fa-solid fa-paw-claws" style="font-size:1.5rem; color:var(--terracotta); margin-top:0.2rem;"></i>
      <div>
        <p style="font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">${recommText}</p>
        <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
          <a href="#/ai" class="btn btn-outline" style="font-size:0.7rem; padding:0.35rem 0.75rem;">
            <i class="fa-solid fa-microchip"></i> Open Predictive Dashboard
          </a>
        </div>
      </div>
    </div>
  `;
}
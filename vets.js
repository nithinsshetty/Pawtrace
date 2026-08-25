// ==========================================================================
// VETS FINDER & APPOINTMENTS SCHEDULER MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, getCurrentLocation, formatFriendlyDate, escapeHTML, sanitizePhoneForHref } from './utils.js';

let vetsMap = null;
let vetsMarkers = [];
let allLoadedVets = [];
let activeClinics = [];

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getOpenStatus(hoursStr) {
  if (!hoursStr) return { open: true, text: 'Hours unavailable' };
  if (hoursStr.toLowerCase().includes('24/7')) {
    return { open: true, text: 'Open 24/7' };
  }
  try {
    const parts = hoursStr.split('-');
    if (parts.length === 2) {
      const parseTime = (str) => {
        const cleaned = str.trim().toLowerCase();
        const isPM = cleaned.includes('pm');
        const isAM = cleaned.includes('am');
        let [hour, minute] = cleaned.replace(/am|pm/g, '').trim().split(':').map(Number);
        if (isPM && hour < 12) hour += 12;
        if (isAM && hour === 12) hour = 0;
        return hour * 60 + (minute || 0);
      };
      const startMinutes = parseTime(parts[0]);
      const endMinutes = parseTime(parts[1]);
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return { open: true, text: `Open (Closes at ${parts[1].trim()})` };
      } else {
        return { open: false, text: `Closed (Opens at ${parts[0].trim()})` };
      }
    }
  } catch (e) {}
  return { open: true, text: hoursStr };
}

/**
 * Fetch real verified vets (users with role='vet' and vet_details.verified=true)
 */
async function getRegisteredVets() {
  const { data: vets, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'vet')
    .limit(20);

  if (error || !vets) return [];

  return vets
    .filter(v => v.vet_details?.verified === true)
    .map(v => ({
      id: v.id,
      name: v.vet_details.clinicName || v.display_name || "Veterinarian Doctor",
      licenseNumber: v.vet_details.licenseNumber || "Verified",
      special: (v.vet_details.specializations || []).join(', ') || "General Pet Medicine",
      address: v.vet_details.address || "Bengaluru",
      city: v.vet_details.city || "Bengaluru",
      availability: v.vet_details.availability || "Mon-Sat 9:00 AM - 6:00 PM",
      phone: v.vet_details.phone || "N/A",
      emergency: v.vet_details.emergency || false,
      hours: v.vet_details.availability || "9:00 AM - 6:00 PM",
      lat: v.vet_details.lat || null,
      lng: v.vet_details.lng || null
    }));
}

export async function getNearbyClinics(lat, lng) {
  return await getRegisteredVets();
}

/**
 * Render Veterinary clinic finder page
 */
export async function renderVets() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Vets Finder';

  viewport.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; gap:1rem; flex-wrap:wrap;">
      <div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Find Care Clinics</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Locate verified veterinary hospitals, discover 24/7 emergency clinics, and book direct appointment checkups.
        </p>
      </div>
    </div>

    <div class="vets-layout-grid">

      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div id="location-alert-container"></div>

        <div class="glass-card" style="padding: 0; overflow: hidden; height:400px; border-radius: var(--radius-md);">
          <div id="vet-map-search" style="height:100%; width:100%;"></div>
        </div>

        <div class="glass-card" style="background: rgba(230, 57, 70, 0.05); border-color: rgba(230, 57, 70, 0.2); display:flex; gap:1rem; align-items:center;">
          <i class="fa-solid fa-truck-medical" style="font-size:2rem; color:var(--accent-red);"></i>
          <div>
            <strong style="color:var(--accent-red); font-size:0.9rem;">Need Urgent Assistance?</strong>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem; line-height:1.4;">
              Red markers on the radar map indicate clinics providing 24/7 trauma emergency care. Call immediately.
            </p>
          </div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:1.5rem;">

        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap: 0.5rem; flex-wrap: wrap;">
            <h3 id="vets-list-title" style="font-weight:700; font-family:'Outfit'; margin:0;">Veterinary Clinics</h3>
            <div id="vets-badge-container"></div>
          </div>

          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
            <div style="display:flex; gap:0.5rem;">
              <input type="text" id="vet-search-query" class="form-control" placeholder="Search by name, specialty..." style="font-size:0.8rem; padding:0.4rem 0.6rem;">
              <select id="vet-search-city" class="form-control" style="font-size:0.8rem; padding:0.4rem 0.6rem; width:130px;">
                <option value="">All Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>
          </div>

          <div id="nearby-vets-list" class="vet-list" style="display:flex; flex-direction:column; gap:0.75rem; max-height: 400px; overflow-y: auto; padding-right: 0.25rem;">
            <div class="loader-container">
              <div class="loader-spinner"></div>
              <p style="margin: 0; font-size: 0.85rem;">Locating nearby veterinary clinics...</p>
            </div>
          </div>
        </div>

        <div class="glass-card">
          <h3 style="font-weight:700; font-family:'Outfit'; margin-bottom:0.5rem;">Book Clinic Appointment</h3>
          <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem;">Secure consultation schedules</p>

          <form id="appointment-booker-form" style="display:flex; flex-direction:column; gap:0.75rem;">
            <div class="form-group">
              <label for="app-select-pet">Select Pet *</label>
              <select id="app-select-pet" class="form-control" required></select>
            </div>

            <div class="form-group">
              <label for="app-select-clinic">Select Clinic *</label>
              <select id="app-select-clinic" class="form-control" required>
                <option value="">Loading clinics...</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="app-date">Date *</label>
                <input type="date" id="app-date" class="form-control" required>
              </div>
              <div class="form-group">
                <label for="app-time">Time *</label>
                <input type="time" id="app-time" class="form-control" required>
              </div>
            </div>

            <div class="form-group">
              <label for="app-notes">Reason for Visit</label>
              <input type="text" id="app-notes" class="form-control" placeholder="Annual booster vaccine / Allergy check">
            </div>

            <button type="submit" class="btn btn-primary btn-full mt-1">
              <i class="fa-solid fa-calendar-check"></i> Book Consultation
            </button>
          </form>
        </div>

      </div>
    </div>
  `;
async function loadOwnerAppointments() {
  const user = getCurrentUser();
  const listEl = document.getElementById('nearby-vets-list').parentElement;
  const box = document.createElement('div');
  box.className = 'glass-card';
  box.style.marginTop = '1.5rem';
  box.innerHTML = `<h3 style="font-weight:700; margin-bottom:0.75rem;">My Appointments</h3><div id="owner-appointments-list"></div>`;
  listEl.parentElement.appendChild(box);

  const { data: apps } = await supabase.from('appointments').select('*').eq('owner_id', user.uid).order('created_at', { ascending: false });
  const container = document.getElementById('owner-appointments-list');
  if (!apps || apps.length === 0) { container.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted);">No appointments booked yet.</p>`; return; }
  // FIX (XSS): pet name, vet name, and status were inserted raw — escaped now.
  container.innerHTML = apps.map(a => `
    <div style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--border-glass); font-size:0.8rem;">
      <span>${escapeHTML(a.pets?.name || 'Pet')} — ${escapeHTML(a.vet_name || '')} on ${formatFriendlyDate(a.appointment_date)}</span>
      <strong style="text-transform:capitalize; color:${a.status==='accepted'?'var(--accent-green)':a.status==='rejected'?'var(--accent-red)':'var(--accent-yellow)'};">${escapeHTML(a.status)}</strong>
    </div>
  `).join('');
}
  if (vetsMap) {
    vetsMap.remove();
    vetsMap = null;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateInput = document.getElementById('app-date');
  dateInput.value = tomorrow.toISOString().split('T')[0];
  dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);

  await populateAppointmentPets();
  initializeRadarSearchMap();
  loadOwnerAppointments();

  const form = document.getElementById('appointment-booker-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await createAppointment();
  };
}

function renderVetsMapAndList(userLat, userLng) {
  const vetsListContainer = document.getElementById('nearby-vets-list');
  if (!vetsListContainer) return;
  vetsListContainer.innerHTML = '';

  vetsMarkers.forEach(item => vetsMap.removeLayer(item.marker));
  vetsMarkers = [];

  if (!activeClinics || activeClinics.length === 0) {
    vetsListContainer.innerHTML = `
      <div class="empty-container">
        <i class="fa-solid fa-circle-info" style="font-size:1.5rem; color:var(--text-muted);"></i>
        <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">No verified veterinary clinics found yet.</p>
      </div>
    `;
    const selectClinic = document.getElementById('app-select-clinic');
    if (selectClinic) selectClinic.innerHTML = `<option value="">No clinics available</option>`;
    return;
  }

  const selectClinic = document.getElementById('app-select-clinic');
  if (selectClinic) {
    // FIX (XSS): vet.name (from owner-controlled vet_details JSON) escaped
    // before insertion into <option>.
    selectClinic.innerHTML = activeClinics.map(v =>
      `<option value="${escapeHTML(v.id)}">${escapeHTML(v.name)} (${v.distance.toFixed(1)} km away)</option>`
    ).join('');
  }

  activeClinics.forEach(vet => {
    // FIX (XSS): all vet_details-derived fields (name, special, address,
    // availability, phone) escaped before insertion into map popups and
    // list cards; tel: hrefs now use sanitizePhoneForHref().
    const safeName = escapeHTML(vet.name);
    const safeSpecial = escapeHTML(vet.special);
    const safeAddress = escapeHTML(vet.address);
    const safeAvailability = escapeHTML(vet.availability);
    const safePhoneDisplay = escapeHTML(vet.phone);
    const safePhoneHref = sanitizePhoneForHref(vet.phone);

    const popupText = `
      <div style="font-family:'Outfit',sans-serif; font-size:0.8rem; line-height:1.4; padding:0.1rem;">
        <strong style="font-size:0.85rem;">${safeName}</strong><br>
        <span style="color:var(--text-muted);">${safeSpecial}</span><br>
        <span style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-solid fa-map-marker-alt"></i> ${safeAddress}</span><br>
        <strong>Hours:</strong> ${safeAvailability}<br>
        <strong>Phone:</strong> <a href="tel:${safePhoneHref}">${safePhoneDisplay}</a>
      </div>
    `;

    const markerColor = vet.emergency ? 'var(--accent-red)' : 'var(--teal)';
    const icon = L.divIcon({
      className: 'vet-radar-pin',
      html: `<div style="background:${markerColor}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.2);"></div>`
    });

    const marker = L.marker([vet.lat, vet.lng], { icon }).addTo(vetsMap).bindPopup(popupText);
    vetsMarkers.push({ id: vet.id, marker });

    marker.on('click', () => {
      const cardEl = document.getElementById(`vet-card-${vet.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        cardEl.classList.add('active-highlight-card');
        setTimeout(() => cardEl.classList.remove('active-highlight-card'), 2000);
      }
    });

    const card = document.createElement('div');
    card.id = `vet-card-${vet.id}`;
    card.className = 'glass-card vet-card';
    card.style.padding = '1rem';
    card.style.cursor = 'pointer';

    const isEmergencyHTML = vet.emergency
      ? `<span class="badge-overdue" style="font-size:0.55rem; padding:0.15rem 0.35rem; background:var(--accent-red); color:white; border-radius:4px; font-weight:700;">24/7 Emergency</span>`
      : '';
    const distanceHTML = `<span style="font-size:0.75rem; color:var(--teal); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;"><i class="fa-solid fa-location-arrow"></i> ${vet.distance.toFixed(1)} km away</span>`;

    const statusInfo = getOpenStatus(vet.availability);
    const statusHTML = statusInfo.open
      ? `<span style="font-size:0.7rem; color:var(--accent-green); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;"><span style="width:6px; height:6px; background:var(--accent-green); border-radius:50%; display:inline-block;"></span> ${escapeHTML(statusInfo.text)}</span>`
      : `<span style="font-size:0.7rem; color:var(--accent-red); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;"><span style="width:6px; height:6px; background:var(--accent-red); border-radius:50%; display:inline-block;"></span> ${escapeHTML(statusInfo.text)}</span>`;

    card.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:flex-start; gap:0.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.25rem;">
            <h4 style="font-size:0.95rem; font-weight:700; margin:0; line-height:1.2; color:var(--text-main); font-family:'Outfit';">
              ${safeName}
            </h4>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-top:0.15rem;">
              ${distanceHTML}
              ${isEmergencyHTML}
            </div>
          </div>
          <a href="tel:${safePhoneHref}" class="icon-btn" style="width:32px; height:32px; font-size:0.8rem; background:rgba(var(--teal-rgb), 0.08); border-color:transparent; color:var(--teal); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; flex-shrink:0;" title="Call Clinic" onclick="event.stopPropagation();">
            <i class="fa-solid fa-phone"></i>
          </a>
        </div>

        <div style="font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.25rem; line-height:1.4;">
          <span style="display:inline-flex; align-items:center; gap:0.35rem;"><i class="fa-solid fa-stethoscope" style="width:12px;"></i> ${safeSpecial}</span>
          <span style="display:inline-flex; align-items:center; gap:0.35rem;"><i class="fa-solid fa-map-marker-alt" style="width:12px;"></i> ${safeAddress}</span>
          <span style="display:inline-flex; align-items:center; gap:0.35rem;"><i class="fa-solid fa-clock" style="width:12px;"></i> ${statusHTML}</span>
        </div>

        <div style="margin-top:0.4rem; display:flex; gap:0.5rem; width:100%;">
          <a href="https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(userLat)},${encodeURIComponent(userLng)}&destination=${encodeURIComponent(vet.lat)},${encodeURIComponent(vet.lng)}" target="_blank" class="btn btn-secondary" style="font-size:0.7rem; padding:0.4rem 0.7rem; display:inline-flex; align-items:center; gap:0.35rem; text-decoration:none; flex:1; justify-content:center; border-radius:var(--radius-sm);" onclick="event.stopPropagation();">
            <i class="fa-solid fa-diamond-turn-right"></i> Directions
          </a>
          <button class="btn btn-primary btn-book-now" style="font-size:0.7rem; padding:0.4rem 0.7rem; flex:1; border-radius:var(--radius-sm);" onclick="event.stopPropagation();" data-id="${escapeHTML(vet.id)}">
            Book Consult
          </button>
        </div>
      </div>
    `;

    card.onclick = () => {
      vetsMap.setView([vet.lat, vet.lng], 14);
      marker.openPopup();
    };

    const bookBtn = card.querySelector('.btn-book-now');
    if (bookBtn) {
      bookBtn.onclick = (e) => {
        e.stopPropagation();
        const selectClinicEl = document.getElementById('app-select-clinic');
        if (selectClinicEl) {
          selectClinicEl.value = vet.id;
          selectClinicEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          selectClinicEl.style.borderColor = 'var(--teal)';
          setTimeout(() => { selectClinicEl.style.borderColor = ''; }, 1500);
        }
      };
    }

    vetsListContainer.appendChild(card);
  });
}

async function initializeRadarSearchMap() {
  let userLat = 12.9716;
  let userLng = 77.5946;
  let isApproximate = false;

  try {
    const position = await getCurrentLocation();
    userLat = position.latitude;
    userLng = position.longitude;
  } catch (err) {
    isApproximate = true;
    const alertContainer = document.getElementById('location-alert-container');
    if (alertContainer) {
      alertContainer.innerHTML = `
        <div class="warning-banner" style="margin-top: 0; margin-bottom: 1rem;">
          <i class="fa-solid fa-circle-exclamation" style="font-size:1.2rem; color:var(--terracotta);"></i>
          <div>
            <strong>Approximate results shown</strong>
            <p style="margin: 0.15rem 0 0 0; font-size: 0.75rem; color: var(--text-muted);">
              Location permissions were denied or unavailable. Displaying clinics centered on Bengaluru.
            </p>
          </div>
        </div>
      `;
    }
  }

  vetsMap = L.map('vet-map-search', { dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([userLat, userLng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(vetsMap);

  L.marker([userLat, userLng], {
    icon: L.divIcon({
      className: 'user-gps-pulse',
      html: `<div style="background:var(--teal); width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 0 4px var(--teal);"></div>`
    })
  }).addTo(vetsMap).bindPopup(isApproximate ? "Bengaluru Center (Approximate)" : "Your Location");

  try {
    allLoadedVets = await getNearbyClinics(userLat, userLng);

    allLoadedVets.forEach((vet, idx) => {
      if (!vet.lat || !vet.lng) {
        const offsetLat = 0.008 * ((idx % 3) - 1) + 0.002 * (idx % 2 === 0 ? 1 : -1);
        const offsetLng = 0.008 * (Math.floor(idx / 3) - 1) + 0.002 * (idx % 2 !== 0 ? 1 : -1);
        vet.lat = userLat + offsetLat;
        vet.lng = userLng + offsetLng;
      }
      vet.distance = calculateDistance(userLat, userLng, vet.lat, vet.lng);
    });

    allLoadedVets.sort((a, b) => a.distance - b.distance);
    activeClinics = [...allLoadedVets];
  } catch (err) {
    allLoadedVets = [];
    activeClinics = [];
  }

  const queryInput = document.getElementById('vet-search-query');
  const citySelect = document.getElementById('vet-search-city');

  const runFilters = () => {
    const qVal = queryInput ? queryInput.value.toLowerCase().trim() : '';
    const cVal = citySelect ? citySelect.value.toLowerCase().trim() : '';

    activeClinics = allLoadedVets.filter(vet => {
      const matchQuery = !qVal || vet.name.toLowerCase().includes(qVal) || vet.special.toLowerCase().includes(qVal);
      const matchCity = !cVal || vet.city.toLowerCase().includes(cVal);
      return matchQuery && matchCity;
    });

    renderVetsMapAndList(userLat, userLng);
  };

  if (queryInput) queryInput.oninput = runFilters;
  if (citySelect) citySelect.onchange = runFilters;

  renderVetsMapAndList(userLat, userLng);
}

async function populateAppointmentPets() {
  const dropdown = document.getElementById('app-select-pet');
  if (!dropdown) return;

  const user = getCurrentUser();
  if (!user) return;

  try {
    const { data: pets, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', user.uid)
      .eq('is_draft', false);

    if (error) throw error;
    dropdown.innerHTML = '';

    if (!pets || pets.length === 0) {
      dropdown.innerHTML = `<option value="">Register a pet first</option>`;
      return;
    }

    // FIX (XSS): pet.name / pet.pawtrace_id escaped before insertion into <option>.
    pets.forEach(pet => {
      dropdown.innerHTML += `<option value="${escapeHTML(pet.id)}">${escapeHTML(pet.name)} (${escapeHTML(pet.pawtrace_id)})</option>`;
    });

  } catch (err) {
    console.warn("Error populating dropdown options:", err);
  }
}

async function createAppointment() {
  const selectPet = document.getElementById('app-select-pet');
  const selectClinic = document.getElementById('app-select-clinic');
  const appDate = document.getElementById('app-date').value;
  const appTime = document.getElementById('app-time').value;
  const notes = document.getElementById('app-notes').value.trim();

  const user = getCurrentUser();
  if (!user) return;

  if (!selectPet.value) {
    showToast("Please register a pet profile to book checkups.", "warning");
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (appDate < todayStr) {
    showToast("Appointment date cannot be in the past.", "warning");
    return;
  }

  showLoading(true, "Filing appointment request...");
  try {
    const { data: petData, error: petErr } = await supabase.from('pets').select('*').eq('id', selectPet.value).single();
    if (petErr || !petData) {
      showToast("Selected pet profile was not found.", "error");
      return;
    }
    if (petData.owner_id !== user.uid) {
      showToast("Access Denied: You do not own this pet profile.", "error");
      return;
    }

    const petName = petData.name;
    const matchedClinic = activeClinics.find(v => v.id === selectClinic.value);
    const clinicName = matchedClinic ? matchedClinic.name : "Hospital Clinic";

    const { error: vetAccessErr } = await supabase.from('vet_access').upsert({
      pet_id: selectPet.value,
      owner_id: user.uid,
      vet_id: selectClinic.value,
      status: 'active'
    }, { onConflict: 'pet_id,vet_id' });
    if (vetAccessErr) console.warn("Vet access grant warning:", vetAccessErr);

    const { error: apptErr } = await supabase.from('appointments').insert({
      owner_id: user.uid,
      pet_id: selectPet.value,
      vet_id: selectClinic.value,
      vet_name: clinicName,
      appointment_date: appDate,
      appointment_time: appTime,
      reason: notes || "General Consultation Checkup",
      status: 'pending'
    });
    if (apptErr) throw apptErr;

    await supabase.from('notifications').insert({
      user_id: user.uid,
      type: 'REMINDER',
      message: `Appointment requested for ${petName} at ${clinicName} on ${formatFriendlyDate(appDate)} at ${appTime}. Waiting for clinic acceptance.`,
      is_read: false
    });

    await supabase.from('notifications').insert({
      user_id: selectClinic.value,
      type: 'STATUS_CHANGE',
      message: `New appointment requested for ${petName} by owner ${user.displayName || 'User'} on ${formatFriendlyDate(appDate)} at ${appTime}.`,
      is_read: false
    });

    showToast(`Appointment request filed with ${clinicName}!`, "success");
    document.getElementById('app-notes').value = '';
  } catch (err) {
    console.error("Booking Error:", err);
    showToast("Failed to book appointment.", "error");
  } finally {
    showLoading(false);
  }
}
// ==========================================================================
// VETS FINDER & APPOINTMENTS SCHEDULER MODULE (Leaflet Map Integration)
// ==========================================================================

import { db, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, getCurrentLocation, formatFriendlyDate } from './utils.js';

let vetsMap = null;
let vetsMarkers = [];
let allLoadedVets = []; // Total database/mock veterinarians loaded
let activeClinics = []; // Filtered list of veterinarians currently rendered

const LIVE_API_CONFIGURED = false;

/**
 * Calculates geodesic distance between two coordinates using the Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates whether a clinic is open or closed based on current local time
 */
function getOpenStatus(hoursStr) {
  if (hoursStr.toLowerCase().includes('24/7') || hoursStr.toLowerCase().includes('open 24/7') || hoursStr.toLowerCase().includes('24/7 open')) {
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
  } catch (e) {
    console.error("Error parsing clinic hours:", e);
  }
  
  return { open: true, text: hoursStr };
}

/**
 * Fetch verified veterinarians from Firestore
 */
async function getRegisteredVets() {
  if (!db) return [];
  
  // Check sessionStorage cache first
  const cacheKey = 'pawtrace_vets_cache';
  const cacheTimeKey = 'pawtrace_vets_cache_time';
  const cacheExpiry = 10 * 60 * 1000; // 10 minutes

  try {
    const cachedData = sessionStorage.getItem(cacheKey);
    const cachedTime = sessionStorage.getItem(cacheTimeKey);
    const now = Date.now();

    if (cachedData && cachedTime && (now - parseInt(cachedTime) < cacheExpiry)) {
      console.log("Serving vet directory from sessionStorage cache.");
      return JSON.parse(cachedData);
    }
  } catch (e) {
    console.warn("Failed to read sessionStorage cache:", e);
  }

  const snapshot = await db.collection('vetProfiles').where('verified', '==', true).limit(12).get();
  const vets = [];
  snapshot.forEach(doc => {
    const data = doc.data();
    vets.push({
      id: doc.id,
      name: data.name || data.clinic || "Veterinarian Doctor",
      licenseNumber: data.licenseNumber || "Verified",
      special: (data.specialization && data.specialization.length > 0) ? data.specialization.join(', ') : "General Pet Medicine",
      address: data.address || "Bengaluru",
      city: data.city || "Bengaluru",
      availability: data.availability || "Mon-Sat 9:00 AM - 6:00 PM",
      phone: data.phone || "(080) 555-0100",
      emergency: data.emergency || false,
      hours: data.availability || "9:00 AM - 6:00 PM",
      lat: data.lat || null,
      lng: data.lng || null
    });
  });

  try {
    sessionStorage.setItem(cacheKey, JSON.stringify(vets));
    sessionStorage.setItem(cacheTimeKey, Date.now().toString());
  } catch (e) {
    console.warn("Failed to write to sessionStorage cache:", e);
  }

  return vets;
}

/**
 * Interface-agnostic data layer retriever (Future-Proofing helper)
 */
export async function getNearbyClinics(lat, lng) {
  if (LIVE_API_CONFIGURED) {
    // Under live api configurations, this would query Google Places or OpenStreetMap
    return await getRegisteredVets();
  } else {
    // Returns our verified PawTrace veterinarians from Firestore
    return await getRegisteredVets();
  }
}

/**
 * Seed sample verified veterinarians to database for development testing (Dev/Admin restricted)
 */
async function seedSampleVets() {
  showLoading(true, "Seeding verified veterinarian profiles...");
  try {
    const sampleVets = [
      {
        uid: 'vet_sample_1',
        name: 'Dr. Ramesh Kumar (Indiranagar Pet Hospital)',
        email: 'ramesh@clinic.com',
        clinic: 'Indiranagar Pet Hospital',
        licenseNumber: 'VET-IN-88219',
        specialization: ['Orthopedics', 'Canine Care', 'Vaccinations'],
        verified: true,
        city: 'Bengaluru',
        availability: '9:00 AM - 6:00 PM',
        phone: '(080) 555-0112',
        emergency: true,
        address: '12th Cross, Indiranagar, Bengaluru',
        lat: 12.9786,
        lng: 77.6406
      },
      {
        uid: 'vet_sample_2',
        name: 'Dr. Priya Sen (Koramangala Cat Clinic)',
        email: 'priya@catclinic.com',
        clinic: 'Koramangala Cat Clinic',
        licenseNumber: 'VET-IN-33291',
        specialization: ['Feline Medicine', 'Dentistry', 'General Surgery'],
        verified: true,
        city: 'Bengaluru',
        availability: '8:00 AM - 5:00 PM',
        phone: '(080) 555-0145',
        emergency: false,
        address: '4th Block, Koramangala, Bengaluru',
        lat: 12.9316,
        lng: 77.6226
      },
      {
        uid: 'vet_sample_3',
        name: 'Dr. Anil Mehta (Whitefield Trauma Center)',
        email: 'anil@trauma.com',
        clinic: 'Whitefield Trauma Center',
        licenseNumber: 'VET-IN-90981',
        specialization: ['Emergency Medicine', 'Trauma Care', 'Exotic Pets'],
        verified: true,
        city: 'Bengaluru',
        availability: '24/7 Open',
        phone: '(080) 555-0199',
        emergency: true,
        address: 'Whitefield Main Road, Bengaluru',
        lat: 12.9696,
        lng: 77.7496
      }
    ];

    for (const vet of sampleVets) {
      // 1. Write user doc
      await db.collection('users').doc(vet.uid).set({
        uid: vet.uid,
        email: vet.email,
        displayName: vet.name,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(vet.name)}`,
        role: 'vet',
        createdAt: fb.firestore.FieldValue.serverTimestamp(),
        vetDetails: {
          licenseNumber: vet.licenseNumber,
          clinicName: vet.clinic,
          specializations: vet.specialization,
          verified: true,
          city: vet.city,
          availability: vet.availability,
          phone: vet.phone,
          address: vet.address,
          lat: vet.lat,
          lng: vet.lng
        }
      });

      // 2. Write vetProfiles doc
      await db.collection('vetProfiles').doc(vet.uid).set({
        vetId: vet.uid,
        name: vet.name,
        email: vet.email,
        clinic: vet.clinic,
        licenseNumber: vet.licenseNumber,
        specialization: vet.specialization,
        verified: true,
        city: vet.city,
        availability: vet.availability,
        phone: vet.phone,
        address: vet.address,
        lat: vet.lat,
        lng: vet.lng,
        createdAt: fb.firestore.FieldValue.serverTimestamp()
      });
    }

    showToast("Sample verified veterinarians seeded successfully! Please perform a search to load them.", "success");
    // Trigger map update
    await initializeRadarSearchMap();
  } catch (err) {
    console.error("Seeding error:", err);
    showToast("Failed to seed sample vets.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Render Veterinary clinic finder page
 */
export async function renderVets() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Vets Finder';

  const user = getCurrentUser();
  
  // Environment check for seeding options (localhost or admin users)
  const isDevOrAdmin = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       (user && (user.email?.includes('admin') || user.email?.includes('nithin')));

  const seedButtonMarkup = isDevOrAdmin 
    ? `<button id="btn-seed-vets" class="btn btn-outline" style="font-size: 0.75rem; padding: 0.4rem 0.8rem; border-color: var(--teal); color: var(--teal);">
         <i class="fa-solid fa-database"></i> Seed Vets for Testing
       </button>`
    : '';

  viewport.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; gap:1rem; flex-wrap:wrap;">
      <div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Find Care Clinics</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem;">
          Locate verified veterinary hospitals, discover 24/7 emergency clinics, and book direct appointment checkups.
        </p>
      </div>
      ${seedButtonMarkup}
    </div>

    <!-- Layout Split (Responsive via .vets-layout-grid class) -->
    <div class="vets-layout-grid">
      
      <!-- Interactive Leaflet Map Box -->
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <!-- Approximate Location Notice Banner Container -->
        <div id="location-alert-container"></div>

        <div class="glass-card" style="padding: 0; overflow: hidden; height:400px; border-radius: var(--radius-md);">
          <div id="vet-map-search" style="height:100%; width:100%;"></div>
        </div>
        
        <!-- Emergency Clinics Banner -->
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

      <!-- Right column List & Booking -->
      <div style="display:flex; flex-direction:column; gap:1.5rem;">
        
        <!-- Nearby Vet List -->
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem; gap: 0.5rem; flex-wrap: wrap;">
            <h3 id="vets-list-title" style="font-weight:700; font-family:'Outfit'; margin:0;">Veterinary Clinics</h3>
            <div id="vets-badge-container"></div>
          </div>
          
          <!-- Search & Filter Options -->
          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1rem;">
            <div style="display:flex; gap:0.5rem;">
              <input type="text" id="vet-search-query" class="form-control" placeholder="Search by name, specialty..." style="font-size:0.8rem; padding:0.4rem 0.6rem;">
              <select id="vet-search-city" class="form-control" style="font-size:0.8rem; padding:0.4rem 0.6rem; width:130px;">
                <option value="">All Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
                <option value="San Francisco">San Francisco</option>
              </select>
            </div>
          </div>

          <!-- Demo explanation text -->
          <div id="vets-demo-notice" style="display:none; font-size:0.75rem; color:var(--text-muted); margin-bottom:1rem; padding: 0.6rem 0.8rem; background: rgba(31,122,140,0.05); border-radius: var(--radius-sm); border-left: 3px solid var(--teal); line-height:1.4;">
            Results shown are simulated sample data. Live maps search is not configured.
          </div>
          <div id="nearby-vets-list" class="vet-list" style="display:flex; flex-direction:column; gap:0.75rem; max-height: 400px; overflow-y: auto; padding-right: 0.25rem;">
            <!-- Locating loader initially -->
            <div class="loader-container">
              <div class="loader-spinner"></div>
              <p style="margin: 0; font-size: 0.85rem;">Locating nearby veterinary clinics...</p>
            </div>
          </div>
        </div>

        <!-- Appointment Booker Form -->
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

  // Bind Seeding Button
  const seedBtn = document.getElementById('btn-seed-vets');
  if (seedBtn) seedBtn.onclick = seedSampleVets;

  // Destroy previous Leaflet maps to prevent duplication binding
  if (vetsMap) {
    vetsMap.remove();
    vetsMap = null;
  }

  // Set default form date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('app-date').value = tomorrow.toISOString().split('T')[0];

  // Bind Form Dropdown options
  await populateAppointmentPets();

  // Draw Map & Locate Vets
  initializeRadarSearchMap();

  // Bind Appointment Form Submission
  const form = document.getElementById('appointment-booker-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await createAppointment();
  };
}

/**
 * Render list cards and markers from currently active dataset
 */
function renderVetsMapAndList(userLat, userLng, isApproximate) {
  const vetsListContainer = document.getElementById('nearby-vets-list');
  if (!vetsListContainer) return;
  vetsListContainer.innerHTML = '';

  // Clear previous markers
  vetsMarkers.forEach(item => vetsMap.removeLayer(item.marker));
  vetsMarkers = [];

  // Handle empty state
  if (!activeClinics || activeClinics.length === 0) {
    vetsListContainer.innerHTML = `
      <div class="empty-container">
        <i class="fa-solid fa-circle-info" style="font-size:1.5rem; color:var(--text-muted);"></i>
        <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">No veterinary clinics found in this area.</p>
      </div>
    `;
    const selectClinic = document.getElementById('app-select-clinic');
    if (selectClinic) {
      selectClinic.innerHTML = `<option value="">No clinics available</option>`;
    }
    return;
  }

  // Sync Dropdown select list
  const selectClinic = document.getElementById('app-select-clinic');
  if (selectClinic) {
    selectClinic.innerHTML = activeClinics.map(v => 
      `<option value="${v.id}">${v.name} (${v.distance.toFixed(1)} km away)</option>`
    ).join('');
  }

  // Draw cards and pins
  activeClinics.forEach(vet => {
    const popupText = `
      <div style="font-family:'Outfit',sans-serif; font-size:0.8rem; line-height:1.4; padding:0.1rem;">
        <strong style="font-size:0.85rem;">${vet.name}</strong><br>
        <span style="color:var(--text-muted);">${vet.special}</span><br>
        <span style="color:var(--text-muted); font-size:0.75rem;"><i class="fa-solid fa-map-marker-alt"></i> ${vet.address}</span><br>
        <strong>Hours:</strong> ${vet.availability}<br>
        <strong>Phone:</strong> <a href="tel:${vet.phone}">${vet.phone}</a>
      </div>
    `;

    const markerColor = vet.emergency ? 'var(--accent-red)' : 'var(--teal)';
    const icon = L.divIcon({
      className: 'vet-radar-pin',
      html: `<div style="background:${markerColor}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.2);"></div>`
    });

    const marker = L.marker([vet.lat, vet.lng], { icon })
      .addTo(vetsMap)
      .bindPopup(popupText);

    vetsMarkers.push({ id: vet.id, marker });

    // Marker Click ➔ Scroll Card & Highlight
    marker.on('click', () => {
      const cardEl = document.getElementById(`vet-card-${vet.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        cardEl.classList.add('active-highlight-card');
        setTimeout(() => {
          cardEl.classList.remove('active-highlight-card');
        }, 2000);
      }
    });

    // Create Card
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
      ? `<span style="font-size:0.7rem; color:var(--accent-green); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;"><span style="width:6px; height:6px; background:var(--accent-green); border-radius:50%; display:inline-block;"></span> ${statusInfo.text}</span>`
      : `<span style="font-size:0.7rem; color:var(--accent-red); font-weight:600; display:inline-flex; align-items:center; gap:0.25rem;"><span style="width:6px; height:6px; background:var(--accent-red); border-radius:50%; display:inline-block;"></span> ${statusInfo.text}</span>`;

    card.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:flex-start; gap:0.5rem;">
          <div style="display:flex; flex-direction:column; gap:0.25rem;">
            <h4 style="font-size:0.95rem; font-weight:700; margin:0; line-height:1.2; color:var(--text-main); font-family:'Outfit';">
              ${vet.name}
            </h4>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; margin-top:0.15rem;">
              ${distanceHTML}
              ${isEmergencyHTML}
            </div>
          </div>
          <a href="tel:${vet.phone}" class="icon-btn" style="width:32px; height:32px; font-size:0.8rem; background:rgba(var(--teal-rgb), 0.08); border-color:transparent; color:var(--teal); border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; flex-shrink:0;" title="Call Clinic" onclick="event.stopPropagation();">
            <i class="fa-solid fa-phone"></i>
          </a>
        </div>

        <div style="font-size:0.75rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.25rem; line-height:1.4;">
          <span style="display:inline-flex; align-items:center; gap:0.35rem;"><i class="fa-solid fa-stethoscope" style="width:12px;"></i> ${vet.special}</span>
          <span style="display:inline-flex; align-items:center; gap:0.35rem;"><i class="fa-solid fa-map-marker-alt" style="width:12px;"></i> ${vet.address}</span>
          <span style="display:inline-flex; align-items:center; gap:0.35rem;"><i class="fa-solid fa-clock" style="width:12px;"></i> ${statusHTML}</span>
        </div>

        <div style="margin-top:0.4rem; display:flex; gap:0.5rem; width:100%;">
          <a href="https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${vet.lat},${vet.lng}" target="_blank" class="btn btn-secondary" style="font-size:0.7rem; padding:0.4rem 0.7rem; display:inline-flex; align-items:center; gap:0.35rem; text-decoration:none; flex:1; justify-content:center; border-radius:var(--radius-sm);" onclick="event.stopPropagation();">
            <i class="fa-solid fa-diamond-turn-right"></i> Directions
          </a>
          <button class="btn btn-primary btn-book-now" style="font-size:0.7rem; padding:0.4rem 0.7rem; flex:1; border-radius:var(--radius-sm);" onclick="event.stopPropagation();" data-id="${vet.id}">
            Book Consult
          </button>
        </div>
      </div>
    `;

    // Card Click ➔ Map zoom/center & Open Popup
    card.onclick = () => {
      vetsMap.setView([vet.lat, vet.lng], 14);
      marker.openPopup();
    };

    // Card Booker Click handler
    const bookBtn = card.querySelector('.btn-book-now');
    if (bookBtn) {
      bookBtn.onclick = (e) => {
        e.stopPropagation();
        const selectClinicEl = document.getElementById('app-select-clinic');
        if (selectClinicEl) {
          selectClinicEl.value = vet.id;
          selectClinicEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          selectClinicEl.style.borderColor = 'var(--teal)';
          setTimeout(() => {
            selectClinicEl.style.borderColor = '';
          }, 1500);
        }
      };
    }

    vetsListContainer.appendChild(card);
  });
}

/**
 * Initialize Leaflet map and fetch clinics centered on user location or Bengaluru fallback
 */
async function initializeRadarSearchMap() {
  let userLat = 12.9716; // Bengaluru defaults
  let userLng = 77.5946;
  let isApproximate = false;

  try {
    const position = await getCurrentLocation();
    userLat = position.latitude;
    userLng = position.longitude;
    isApproximate = false;
  } catch (err) {
    console.warn("Using default Bengaluru coordinates for vet mapping search:", err.message);
    isApproximate = true;

    // Display orange warning alert banner for approximate fallback
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

  // Set up the Leaflet Map instance
  vetsMap = L.map('vet-map-search', { dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([userLat, userLng], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(vetsMap);

  // Add User Marker
  L.marker([userLat, userLng], {
    icon: L.divIcon({
      className: 'user-gps-pulse',
      html: `<div style="background:var(--teal); width:14px; height:14px; border-radius:50%; border:3px solid white; box-shadow:0 0 0 4px var(--teal);"></div>`
    })
  }).addTo(vetsMap).bindPopup(isApproximate ? "Bengaluru Center (Approximate)" : "Your Location");

  // Fetch location-aware clinics from data layer
  try {
    allLoadedVets = await getNearbyClinics(userLat, userLng);
    
    // Assign coordinates dynamically if missing (Bengaluru/GPS center relative offsets)
    allLoadedVets.forEach((vet, idx) => {
      if (!vet.lat || !vet.lng) {
        const offsetLat = 0.008 * ((idx % 3) - 1) + 0.002 * (idx % 2 === 0 ? 1 : -1);
        const offsetLng = 0.008 * (Math.floor(idx / 3) - 1) + 0.002 * (idx % 2 !== 0 ? 1 : -1);
        vet.lat = userLat + offsetLat;
        vet.lng = userLng + offsetLng;
      }
      vet.distance = calculateDistance(userLat, userLng, vet.lat, vet.lng);
    });

    // Sort nearest-to-farthest
    allLoadedVets.sort((a, b) => a.distance - b.distance);
    activeClinics = [...allLoadedVets];
  } catch (err) {
    console.error("Failed to fetch clinics:", err);
    allLoadedVets = [];
    activeClinics = [];
  }

  // Bind Search and Filter actions
  const queryInput = document.getElementById('vet-search-query');
  const citySelect = document.getElementById('vet-search-city');

  const runFilters = () => {
    const qVal = queryInput ? queryInput.value.toLowerCase().trim() : '';
    const cVal = citySelect ? citySelect.value.toLowerCase().trim() : '';

    activeClinics = allLoadedVets.filter(vet => {
      const matchQuery = !qVal || 
        vet.name.toLowerCase().includes(qVal) || 
        vet.special.toLowerCase().includes(qVal);
      const matchCity = !cVal || vet.city.toLowerCase().includes(cVal);
      return matchQuery && matchCity;
    });

    renderVetsMapAndList(userLat, userLng, isApproximate);
  };

  if (queryInput) queryInput.oninput = runFilters;
  if (citySelect) citySelect.onchange = runFilters;

  // Show "Demo Data" Badge if using mock-only database states (no key)
  if (!LIVE_API_CONFIGURED) {
    const badgeContainer = document.getElementById('vets-badge-container');
    if (badgeContainer) {
      badgeContainer.innerHTML = `<span class="demo-badge"><i class="fa-solid fa-flask"></i> Demo Data</span>`;
    }
    const demoNotice = document.getElementById('vets-demo-notice');
    if (demoNotice) {
      demoNotice.style.display = 'block';
    }
    const titleEl = document.getElementById('vets-list-title');
    if (titleEl) {
      titleEl.textContent = 'Sample Veterinary Clinics';
    }
  }

  // Render initial list
  renderVetsMapAndList(userLat, userLng, isApproximate);
}

/**
 * Fetch owner's pets to populate dropdown selection (filtering out drafts)
 */
async function populateAppointmentPets() {
  const dropdown = document.getElementById('app-select-pet');
  if (!dropdown) return;

  const user = getCurrentUser();
  if (!user || !db) return;

  try {
    const snapshot = await db.collection('pets').where('ownerId', '==', user.uid).get();
    dropdown.innerHTML = '';

    const activePets = [];
    snapshot.forEach(doc => {
      const pet = doc.data();
      if (!pet.isDraft) {
        activePets.push({ id: doc.id, ...pet });
      }
    });

    if (activePets.length === 0) {
      dropdown.innerHTML = `<option value="">Register a pet first</option>`;
      return;
    }

    activePets.forEach(pet => {
      dropdown.innerHTML += `<option value="${pet.id}">${pet.name} (${pet.pawTraceId})</option>`;
    });

  } catch (err) {
    console.warn("Error populating dropdown options:", err);
  }
}

/**
 * Save booked consultation appointment inside Firestore
 */
async function createAppointment() {
  const selectPet = document.getElementById('app-select-pet');
  const selectClinic = document.getElementById('app-select-clinic');
  const appDate = document.getElementById('app-date').value;
  const appTime = document.getElementById('app-time').value;
  const notes = document.getElementById('app-notes').value.trim();

  const user = getCurrentUser();
  if (!user || !db) return;

  if (!selectPet.value) {
    showToast("Please register a pet profile to book checkups.", "warning");
    return;
  }

  showLoading(true, "Filing appointment request...");
  try {
    // 1. Verify ownership locally as a double-check (Required validation rule)
    const petDoc = await db.collection('pets').doc(selectPet.value).get();
    if (!petDoc.exists) {
      showToast("Selected pet profile was not found.", "error");
      return;
    }
    const petData = petDoc.data();
    if (petData.ownerId !== user.uid) {
      showToast("Access Denied: You do not own this pet profile.", "error");
      return;
    }

    const petName = petData.name;
    const matchedClinic = activeClinics.find(v => v.id === selectClinic.value);
    const clinicName = matchedClinic ? matchedClinic.name : "Hospital Clinic";

    // 1. Authorize veterinarian access by adding vetId to sharedWithVets array
    const sharedVets = petData.sharedWithVets || [];
    if (!sharedVets.includes(selectClinic.value)) {
      sharedVets.push(selectClinic.value);
      await db.collection('pets').doc(selectPet.value).update({
        sharedWithVets: sharedVets
      });
    }

    // Structured metadata for future notification parsing
    const appointmentData = {
      ownerId: user.uid,
      ownerName: user.displayName || "Pet Owner",
      petId: selectPet.value,
      petName: petName,
      vetId: selectClinic.value,
      vetName: clinicName,
      appointmentDate: appDate,
      date: appDate,
      time: appTime,
      reason: notes || "General Consultation Checkup",
      status: 'pending',
      createdAt: fb.firestore.FieldValue.serverTimestamp()
    };

    // Save under global appointments collection
    await db.collection('appointments').add(appointmentData);
    
    // Log owner notification
    await db.collection('users').doc(user.uid).collection('notifications').add({
      type: 'REMINDER',
      petId: selectPet.value,
      message: `Appointment requested for ${petName} at ${clinicName} on ${formatFriendlyDate(appDate)} at ${appTime}. Waiting for clinic acceptance.`,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
    });

    // Also send notification to the veterinarian directly if they have an active user account
    await db.collection('users').doc(selectClinic.value).collection('notifications').add({
      type: 'STATUS_CHANGE',
      petId: selectPet.value,
      message: `New appointment requested for ${petName} by owner ${user.displayName || 'User'} on ${formatFriendlyDate(appDate)} at ${appTime}.`,
      timestamp: fb.firestore.FieldValue.serverTimestamp(),
      read: false
    }).catch(e => console.warn("Vet notification log skipped: no active account structure yet.", e));

    showToast(`Appointment request filed with ${clinicName}!`, "success");
    document.getElementById('app-notes').value = '';
  } catch (err) {
    console.error("Booking Error:", err);
    showToast("Failed to book appointment. Check permission rules.", "error");
  } finally {
    showLoading(false);
  }
}

// ==========================================================================
// PUBLIC RECOVERY SCAN MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentLocation, getGoogleMapsLink, showToast, showLoading, formatFriendlyDate, getPetImageHTML } from './utils.js';

/**
 * Renders the public scanning route page
 * E.g. #/scan/:id
 */
export async function renderScanPage(params) {
  const petId = params.id;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Smart Recovery Tag';

  showLoading(true, "Resolving PawTrace identity...");
  try {
    const { data: rawPet, error } = await supabase.from('pets').select('*').eq('id', petId).single();

    if (error || !rawPet) {
      viewport.innerHTML = `
        <div class="auth-wrapper">
          <div class="glass-card" style="text-align:center;">
            <i class="fa-solid fa-circle-question" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
            <h2>Identity Not Registered</h2>
            <p>This QR code does not match any registered PawTrace profile.</p>
            <a href="#/login" class="btn btn-primary mt-2">Go to Homepage</a>
          </div>
        </div>
      `;
      return;
    }

    if (!rawPet.has_tag) {
      viewport.innerHTML = `
        <div class="auth-wrapper">
          <div class="glass-card text-center" style="max-width: 450px;">
            <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--terracotta); margin-bottom:1rem;"></i>
            <h2>Smart Tag Inactive</h2>
            <p style="color:var(--text-muted); font-size:0.9rem; line-height: 1.4;">
              This PawTrace tag has not been activated yet. The owner needs to complete activation via their profile dashboard.
            </p>
            <a href="#/login" class="btn btn-secondary mt-2">Go to Homepage</a>
          </div>
        </div>
      `;
      return;
    }

    const isLost = rawPet.is_lost === true;

    const privacy = rawPet.privacy && Object.keys(rawPet.privacy).length > 0 ? rawPet.privacy : {
      ownerName: true,
      phoneNumber: true,
      emergencyContact: true,
      address: true,
      medicalInfo: true,
      vaccinationStatus: true,
      breed: true,
      microchipId: true
    };

    const safePet = {
      id: rawPet.id,
      name: rawPet.name,
      petType: rawPet.species,
      breed: (isLost || privacy.breed !== false) ? rawPet.breed : null,
      gender: rawPet.gender,
      profileImage: rawPet.photo_url,
      pawTraceId: rawPet.pawtrace_id,
      lostStatus: isLost ? 'LOST' : 'SAFE',
      ownerId: rawPet.owner_id,
      microchipId: (isLost || privacy.microchipId !== false) ? rawPet.microchip_id : null,

      ownerName: (isLost || privacy.ownerName !== false) ? (rawPet.owner_name || "Ecosystem Owner") : null,
      ownerPhone: (isLost || privacy.phoneNumber !== false) ? (rawPet.recovery_contact || rawPet.owner_phone || rawPet.emergency_contact) : null,
      emergencyContact: (isLost || privacy.emergencyContact !== false) ? rawPet.emergency_contact : null,
      address: (isLost || privacy.address !== false) ? (rawPet.address ? `${rawPet.address}${rawPet.city ? ', ' + rawPet.city : ''}${rawPet.state ? ', ' + rawPet.state : ''}` : null) : null,
      medicalNotes: (isLost || privacy.medicalInfo !== false) ? (rawPet.medical_notes || rawPet.allergies || rawPet.conditions) : null,
      vaccinationStatus: (isLost || privacy.vaccinationStatus !== false) ? rawPet.vaccination_status : null,

      recoveryContact: rawPet.recovery_contact || rawPet.owner_phone || rawPet.emergency_contact,
      recoveryInstructions: rawPet.recovery_instructions,
      rewardAmount: rawPet.reward_amount
    };

    viewport.innerHTML = `
      <div class="auth-wrapper" style="min-height: calc(100vh - 70px); padding: 1rem 0;">
        <div class="glass-card" style="width:100%; max-width:550px; padding:2rem; margin:1rem;">

          ${isLost ? `
            <div class="glass-card" style="background: rgba(230, 57, 70, 0.1); border-color: var(--accent-red); padding:1rem; text-align:center; margin-bottom:1.5rem;">
              <h3 style="color:var(--accent-red); font-weight:800; font-family:'Outfit', sans-serif; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                <i class="fa-solid fa-triangle-exclamation fa-beat-fade"></i> ATTENTION: MISSING PET
              </h3>
              <p style="font-size:0.8rem; color: var(--text-main); margin-top:0.25rem;">
                This companion profile is reported missing. Please share your location to guide the owner.
              </p>
            </div>

            ${safePet.rewardAmount ? `
              <div class="glass-card" style="background: rgba(244, 208, 104, 0.15); border-color: var(--accent-yellow); padding:1rem; text-align:center; margin-bottom:1.5rem; border-radius: var(--radius-sm);">
                <span style="color:#9e7500; font-weight:800; font-size:1.1rem; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                  <i class="fa-solid fa-gift fa-bounce"></i> REWARD OFFERED: ${safePet.rewardAmount}
                </span>
              </div>
            ` : ''}
          ` : `
            <div class="glass-card" style="background: rgba(82, 183, 136, 0.1); border-color: var(--accent-green); padding:0.75rem; text-align:center; margin-bottom:1.5rem;">
              <h4 style="color:var(--accent-green); font-weight:700;"><i class="fa-solid fa-shield-heart"></i> PawTrace Secured Tag</h4>
            </div>
          `}

          <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:1rem;">
            <div style="width:120px; height:120px; border-radius: var(--radius-md); overflow:hidden; border: 3px solid ${isLost ? 'var(--accent-red)' : 'var(--teal)'}; position: relative;">
              ${getPetImageHTML(safePet, 'large')}
            </div>

            <div>
              <h2 style="font-family:'Outfit', sans-serif; font-size:1.8rem; font-weight:800; margin-bottom:0.25rem;">
                ${safePet.name}
              </h2>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                Breed: <strong>${safePet.breed || 'Hidden/Unknown'}</strong> &bull; Gender: <strong>${safePet.gender || 'Unknown'}</strong>
              </p>
              ${safePet.microchipId ? `
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
                  Microchip ID: <strong>${safePet.microchipId}</strong>
                </p>
              ` : ''}
            </div>
          </div>

          <hr class="divider" style="margin: 1.5rem 0;">

          <div style="display:flex; flex-direction:column; gap:1.25rem;">

            ${isLost ? `
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">RECOVERY CONTACT NUMBER</span>
                <a href="tel:${safePet.recoveryContact || safePet.ownerPhone}" class="btn btn-primary btn-full" style="margin-top:0.35rem; padding:0.6rem 0.85rem; background:var(--teal); border:none; display: flex; flex-direction: column; gap: 0.15rem; align-items: center; justify-content: center; height: auto;">
                  <span style="font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-phone-flip fa-shake"></i> Call Recovery Contact</span>
                  <span style="font-size: 1.05rem; font-weight: 800;">${safePet.recoveryContact || safePet.ownerPhone}</span>
                </a>
              </div>

              ${safePet.recoveryInstructions ? `
                <div class="glass-card" style="padding:1rem; background:rgba(31, 122, 140, 0.04); border-color: rgba(31, 122, 140, 0.2);">
                  <strong style="color:var(--teal); font-size:0.85rem; display:block; margin-bottom:0.25rem;">
                    <i class="fa-solid fa-hand-holding-heart"></i> Recovery Instructions
                  </strong>
                  <p style="font-size:0.8rem; line-height:1.4;">${safePet.recoveryInstructions}</p>
                </div>
              ` : ''}

              ${safePet.ownerName ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">OWNER NAME</span>
                  <strong style="font-size:0.9rem;">${safePet.ownerName}</strong>
                </div>
              ` : ''}

              ${safePet.address ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">LAST KNOWN ADDRESS / AREA</span>
                  <strong style="font-size:0.9rem;">${safePet.address}</strong>
                </div>
              ` : ''}

            ` : (safePet.ownerPhone || safePet.emergencyContact) ? `
              <div>
                <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">PRIMARY EMERGENCY PHONE</span>
                <a href="tel:${safePet.ownerPhone || safePet.emergencyContact}" class="btn btn-secondary btn-full" style="margin-top:0.35rem; padding:0.6rem 0.85rem; display: flex; flex-direction: column; gap: 0.15rem; align-items: center; justify-content: center; height: auto;">
                  <span style="font-size: 0.8rem; font-weight: 500; display: inline-flex; align-items: center; gap: 0.35rem;"><i class="fa-solid fa-phone-flip"></i> Call Owner</span>
                  <span style="font-size: 1rem; font-weight: 800;">${safePet.ownerPhone || safePet.emergencyContact}</span>
                </a>
              </div>

              ${safePet.ownerName ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">OWNER NAME</span>
                  <strong style="font-size:0.9rem;">${safePet.ownerName}</strong>
                </div>
              ` : ''}

              ${safePet.address ? `
                <div>
                  <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">HOME ADDRESS</span>
                  <strong style="font-size:0.9rem;">${safePet.address}</strong>
                </div>
              ` : ''}
            ` : `
              <div style="text-align:center; padding:1rem; background:rgba(0,0,0,0.02); border-radius:var(--radius-sm); border:1px dashed var(--border-glass);">
                <p style="font-size:0.85rem; color:var(--text-muted);">
                  This companion's details are marked private by owner. Contact details will become visible if the owner updates the status to LOST.
                </p>
              </div>
            `}

            ${safePet.medicalNotes ? `
              <div class="glass-card" style="padding:1rem; background:rgba(217, 93, 57, 0.04); border-color: rgba(217, 93, 57, 0.2);">
                <strong style="color:var(--terracotta); font-size:0.85rem; display:block; margin-bottom:0.25rem;">
                  <i class="fa-solid fa-circle-info"></i> Critical Health Directives
                </strong>
                <p style="font-size:0.8rem; line-height:1.4;">${safePet.medicalNotes}</p>
              </div>
            ` : ''}

            <div id="gps-status-panel" class="geo-panel" style="margin-top:0.5rem; text-align:center;">
              <i class="fa-solid fa-location-arrow fa-pulse" style="color:var(--terracotta); font-size:1.5rem; margin-bottom:0.5rem;"></i>
              <strong>Attempting to locate tag GPS...</strong>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.2rem;">
                Please allow browser geolocation prompts to send location updates to owner.
              </p>
            </div>

          </div>

          <div style="text-align:center; margin-top:2rem; font-size:0.75rem; color:var(--text-muted);">
            PawTrace Recovery ID: ${safePet.pawTraceId || 'PT-N/A'} &bull; Secured Platform
          </div>

        </div>
      </div>
    `;

    attemptAutomaticScanLogging(safePet);

  } catch (error) {
    console.error("Scan Resolving Error:", error);
    viewport.innerHTML = `
      <div class="auth-wrapper">
        <div class="glass-card" style="text-align:center; max-width: 450px;">
          <i class="fa-solid fa-lock" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
          <h2>Identity Access Restricted</h2>
          <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height: 1.4;">
            This companion profile is marked private or could not be loaded. Contact details will become visible if the owner updates the status to LOST.
          </p>
          <a href="#/login" class="btn btn-primary mt-2">Go to Homepage</a>
        </div>
      </div>
    `;
    showToast("Failed to retrieve profile record.", "warning");
  } finally {
    showLoading(false);
  }
}

/**
 * Capture scanner geolocation and save logs to Supabase
 */
async function attemptAutomaticScanLogging(pet) {
  const panel = document.getElementById('gps-status-panel');
  if (!panel) return;

  const sessionKey = `scan_limit_${pet.id}`;
  const lastScanTime = sessionStorage.getItem(sessionKey);
  const now = Date.now();

  if (lastScanTime && (now - parseInt(lastScanTime)) < 5 * 60 * 1000) {
    console.log("Scan rate-limited. Notification skipped.");
    panel.style.background = 'rgba(82, 183, 136, 0.08)';
    panel.style.borderColor = 'var(--accent-green)';
    panel.innerHTML = `
      <i class="fa-solid fa-circle-check" style="color:var(--accent-green); font-size:1.5rem; margin-bottom:0.5rem;"></i>
      <strong style="color:var(--accent-green);">Coordinates Logged Recently</strong>
      <p style="font-size:0.75rem; margin-top:0.2rem;">
        Your location coordinates were already sent to ${pet.name}'s owner recently.
      </p>
    `;
    return;
  }

  sessionStorage.setItem(sessionKey, now.toString());

  try {
    const position = await getCurrentLocation();
    const lat = position.latitude;
    const lng = position.longitude;
    const mapsLink = getGoogleMapsLink(lat, lng);

    await saveScanAndNotify(pet, lat, lng, mapsLink);

    panel.style.background = 'rgba(82, 183, 136, 0.08)';
    panel.style.borderColor = 'var(--accent-green)';
    panel.innerHTML = `
      <i class="fa-solid fa-circle-check" style="color:var(--accent-green); font-size:1.5rem; margin-bottom:0.5rem;"></i>
      <strong style="color:var(--accent-green);">GPS Coordinates Logged!</strong>
      <p style="font-size:0.75rem; margin-top:0.2rem;">
        Your coordinate location has been securely forwarded to ${pet.name}'s owner. Thank you for your assistance.
      </p>
    `;
    showToast("GPS location successfully forwarded.", "success");

  } catch (err) {
    console.warn("Scan Location Failure:", err.message);

    await saveScanAndNotify(pet, null, null, null);

    panel.style.background = 'rgba(230, 57, 70, 0.05)';
    panel.style.borderColor = 'rgba(230, 57, 70, 0.15)';
    panel.innerHTML = `
      <i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-red); font-size:1.5rem; margin-bottom:0.5rem;"></i>
      <strong style="color:var(--accent-red);">Location Permission Denied</strong>
      <p style="font-size:0.75rem; margin-top:0.2rem; line-height: 1.3;">
        Scan alert sent, but could not capture coordinate details. If you have the pet, please contact the owner via phone above.
      </p>
      <button id="btn-retry-gps" class="btn btn-outline" style="font-size: 0.7rem; padding:0.35rem 0.75rem; margin-top: 0.5rem; width:fit-content;">
        <i class="fa-solid fa-location-crosshairs"></i> Retry Location
      </button>
    `;

    const retryBtn = document.getElementById('btn-retry-gps');
    if (retryBtn) {
      retryBtn.onclick = () => {
        sessionStorage.removeItem(sessionKey);
        panel.innerHTML = `
          <i class="fa-solid fa-location-arrow fa-pulse" style="color:var(--terracotta); font-size:1.5rem; margin-bottom:0.5rem;"></i>
          <strong>Retrying location capture...</strong>
        `;
        attemptAutomaticScanLogging(pet);
      };
    }
  }
}

/**
 * Save scan record + owner notification to Supabase
 */
async function saveScanAndNotify(pet, lat, lng, mapsLink) {
  try {
    const { error: scanErr } = await supabase.from('scans').insert({
      pet_id: pet.id,
      latitude: lat,
      longitude: lng,
      maps_link: mapsLink
    });
    if (scanErr) console.error("Failed to save scan record:", scanErr);

    const message = lat
      ? `QR code for ${pet.name} was scanned! Location coordinates recorded: Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}.`
      : `QR code for ${pet.name} was scanned, but location permission was denied.`;

    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: pet.ownerId,
      type: 'QR_SCAN',
      message: message,
      maps_link: mapsLink,
      is_read: false
    });
    if (notifErr) console.error("Failed to save scan notification:", notifErr);

  } catch (err) {
    console.error("Failed to log scan:", err);
  }
}
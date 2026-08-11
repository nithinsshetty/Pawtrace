// ==========================================================================
// PAWTRACE UTILITIES & GLOBAL CONTROLLER INTERFACES
// ==========================================================================
import { supabase } from './supabase-config.js';
/**
 * Toast notification controller
 * @param {string} message - The message text
 * @param {'success'|'error'|'info'|'warning'} type - Style theme
 * @param {number} duration - Milliseconds to show toast
 */
export function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  // Icon configuration
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Animate slide in (CSS handled), schedule exit
  setTimeout(() => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, duration);
}

/**
 * Global loader overlay toggler
 * @param {boolean} show - True to display spinner
 * @param {string} text - Loading status label text
 */
export function showLoading(show, text = 'Fetching PawTrace...') {
  const loader = document.getElementById('global-loading');
  if (!loader) return;

  const textEl = loader.querySelector('.loading-text');
  if (textEl && text) {
    textEl.textContent = text;
  }

  if (show) {
    loader.classList.remove('hidden');
    loader.style.opacity = '1';
  } else {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 300); // match CSS fade transition duration
  }
}

/**
 * Global dynamic modal controller
 * @param {object} params
 * @param {string} params.title - Header title
 * @param {string} params.bodyHtml - Injected body content markup
 * @param {string} [params.confirmText] - Label for primary button
 * @param {string} [params.cancelText] - Label for cancellation button
 * @param {function} [params.onConfirm] - Callback resolving on confirm. Must return boolean or promise to stay open.
 * @param {function} [params.onCancel] - Callback resolving on cancel.
 */
export function showModal({ title, bodyHtml, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm = null, onCancel = null }) {
  const modal = document.getElementById('global-modal');
  if (!modal) return;

  const titleEl = document.getElementById('modal-title');
  const bodyEl = document.getElementById('modal-body');
  const footerEl = document.getElementById('modal-footer');

  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;

  // Clear previous footer buttons
  footerEl.innerHTML = '';

  if (onConfirm || onCancel) {
    footerEl.classList.remove('hidden');
    
    if (onCancel) {
      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-outline';
      cancelBtn.textContent = cancelText;
      cancelBtn.onclick = () => {
        onCancel();
        closeModal();
      };
      footerEl.appendChild(cancelBtn);
    }
    
    if (onConfirm) {
      const confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn btn-primary';
      confirmBtn.textContent = confirmText;
      confirmBtn.onclick = async () => {
        confirmBtn.disabled = true;
        const originalText = confirmBtn.textContent;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
        try {
          const keepOpen = await onConfirm(bodyEl);
          if (!keepOpen) {
            closeModal();
          }
        } catch (err) {
          showToast(err.message || 'Action failed', 'error');
        } finally {
          confirmBtn.disabled = false;
          confirmBtn.textContent = originalText;
        }
      };
      footerEl.appendChild(confirmBtn);
    }
  } else {
    footerEl.classList.add('hidden');
  }

  // Bind close buttons
  const closeBtn = document.getElementById('modal-close');
  closeBtn.onclick = () => {
    if (onCancel) onCancel();
    closeModal();
  };

  // Show modal
  modal.classList.add('active');
  modal.classList.remove('hidden');
}

/**
 * Closes the global active modal
 */
export function closeModal() {
  const modal = document.getElementById('global-modal');
  if (!modal) return;
  modal.classList.remove('active');
  setTimeout(() => {
    modal.classList.add('hidden');
  }, 200);
}

/**
 * Capture browser geolocation coords
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, timestamp: number}>}
 */
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        let msg = "Failed to capture location coordinates.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Location permissions were denied by browser. Please allow location to send alerts.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Location position unavailable.";
        } else if (error.code === error.TIMEOUT) {
          msg = "Location request timed out.";
        }
        reject(new Error(msg));
      },
      options
    );
  });
}

/**
 * Generate Google Maps location URL
 */
export function getGoogleMapsLink(latitude, longitude) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * File validation helpers
 */
export const FILE_LIMITS = {
  IMAGE_MAX_SIZE: 3 * 1024 * 1024, // 3MB
  IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MEDICAL_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  MEDICAL_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
};

/**
 * Validate selected upload file type & size
 * @param {File} file 
 * @param {string[]} allowedTypes 
 * @param {number} maxSize 
 */
export function validateFile(file, allowedTypes, maxSize) {
  if (!file) return "No file selected.";
  if (!allowedTypes.includes(file.type)) {
    return `Invalid file format (${file.type}). Allowed formats: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`;
  }
  if (file.size > maxSize) {
    return `File is too large. Maximum size allowed is ${(maxSize / (1024 * 1024)).toFixed(0)}MB.`;
  }
  return null;
}

/**
 * Read browser File object to base64 Data URL (useful as local storage backup)
 * @param {File} file 
 * @returns {Promise<string>}
 */
export function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Format timestamp to friendly readable string
 */
export function formatFriendlyDate(dateInput) {
  if (!dateInput) return "N/A";
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

/**
 * Calculate age from DOB
 */
export function calculateAge(dobString) {
  if (!dobString) return "";
  const dob = new Date(dobString);
  const diffMs = Date.now() - dob.getTime();
  if (diffMs < 0) return "Newborn/Future Date";
  const ageDate = new Date(diffMs);
  const years = Math.abs(ageDate.getUTCFullYear() - 1970);
  
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''}`;
  }
  
  const months = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.4375));
  if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''}`;
  }
  
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return `${days} day${days > 1 ? 's' : ''}`;
}

/**
 * Helper to display warning check if database cannot connect
 */

/**
 * Upload a file to Supabase Storage. Path must start with the user's own
 * UID as the first folder segment (required by storage RLS policies).
 * Returns a public URL for public buckets, or a long-lived signed URL for private ones.
 */
export async function uploadToStorage(bucket, userId, subPath, file) {
  const filePath = `${userId}/${subPath}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  if (bucket === 'medical-attachments') {
    // Private bucket — generate a signed URL valid for 10 years (effectively permanent for this app's purposes)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365 * 10);
    if (error) throw error;
    return data.signedUrl;
  } else {
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }
}
/**
 * Get pet placeholder configuration (emoji/initial and gradient) based on pet type and name.
 */
export function getPetPlaceholder(petType, petName = '') {
  const type = (petType || '').toLowerCase().trim();
  const firstLetter = (petName || '').trim().charAt(0).toUpperCase();
  
  let emoji = firstLetter || '🐾';
  let background = 'linear-gradient(135deg, #14B8A6 0%, #0F766E 100%)';
  
  if (type === 'dog') {
    emoji = '🐶';
    background = 'linear-gradient(135deg, #FB923C 0%, #F97316 100%)';
  } else if (type === 'cat') {
    emoji = '🐱';
    background = 'linear-gradient(135deg, #F472B6 0%, #EC4899 100%)';
  } else if (type === 'bird') {
    emoji = '🐦';
    background = 'linear-gradient(135deg, #60A5FA 0%, #2563EB 100%)';
  } else if (type === 'rabbit') {
    emoji = '🐰';
    background = 'linear-gradient(135deg, #A78BFA 0%, #7C3AED 100%)';
  } else if (type === 'fish') {
    emoji = '🐠';
  } else if (type === 'hamster') {
    emoji = '🐹';
  } else if (type === 'reptile') {
    emoji = '🦎';
  }
  
  return { emoji, background };
}

/**
 * Returns complete responsive HTML string containing the pet img with onerror fallback and placeholder markup.
 */
export function getPetImageHTML(pet, sizeClass = '') {
  if (!pet) return '';
  const name = pet.name || pet.petName || '';
  const petType = pet.petType || pet.type || '';
  const placeholder = getPetPlaceholder(petType, name);
  const imgUrl = pet.profileImage || pet.photo || '';
  
  return `
    <img src="${imgUrl}" alt="${name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="display: ${imgUrl ? 'block' : 'none'}; width:100%; height:100%; object-fit:cover;">
    <div class="pet-placeholder-card ${sizeClass}" style="background: ${placeholder.background}; display: ${imgUrl ? 'none' : 'flex'};">
      <span class="pet-placeholder-emoji">${placeholder.emoji}</span>
      ${sizeClass === 'large' || sizeClass === '' ? `<span class="pet-placeholder-name">${name}</span>` : ''}
    </div>
  `;
}

/**
 * Generates a globally unique PawTrace ID checking both pets and rescued_animals collections.
 * Handles permission-restricted queries gracefully.
 * @returns {Promise<string>}
 */


export async function generatePawTraceId() {
  const { supabase } = await import('./supabase-config.js');
  while (true) {
    const traceId = 'PT-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const { data, error } = await supabase.from('pets').select('id').eq('pawtrace_id', traceId).maybeSingle();
    if (error) {
      console.warn("Error checking PawTrace ID uniqueness, assuming unique:", error);
      return traceId;
    }
    if (!data) return traceId;
  }
}
// ==========================================================================
// GROWTH JOURNAL & WEIGHT TRACKING MODULE (Supabase, Chart.js integration)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, validateFile, FILE_LIMITS, readFileAsDataURL, formatFriendlyDate, getPetImageHTML, uploadToStorage, escapeHTML, safeUrlOrEmpty } from './utils.js';
import { Router } from './router.js';

let weightChartInstance = null;

/**
 * Renders the pet journal timeline and weight tracking graph tab
 */
export async function renderJournal(params) {
  const petId = params.id;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Growth Journal';

  showLoading(true, "Fetching journal records...");
  try {
    const { data: pet, error } = await supabase.from('pets').select('*').eq('id', petId).single();
    if (error || !pet) {
      showToast("Pet profile not found.", "error");
      Router.navigate('/pets');
      return;
    }

    const user = getCurrentUser();
    if (pet.owner_id !== user.uid) {
      showToast("Access Denied.", "error");
      Router.navigate('/pets');
      return;
    }

    const petForImage = { name: pet.name, petType: pet.species, profileImage: pet.photo_url };

    viewport.innerHTML = `
      <div class="glass-card detail-header">
        <div class="detail-avatar">
          ${getPetImageHTML(petForImage, 'small')}
        </div>
        <div class="detail-info">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
            <span>${escapeHTML(pet.name)}</span>
            <span class="pet-status-badge ${pet.is_lost ? 'lost' : 'safe'}">
              ${pet.is_lost ? 'LOST' : 'SAFE'}
            </span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            <i class="fa-solid fa-dna"></i> ${escapeHTML(pet.breed)} &nbsp;|&nbsp;
            <i class="fa-solid fa-scale-balanced"></i> ${escapeHTML(pet.weight)} kg &nbsp;|&nbsp;
            <i class="fa-solid fa-id-card"></i> ${escapeHTML(pet.pawtrace_id)}
          </p>
        </div>
        <div class="detail-actions">
          <a href="#/pet/${pet.id}" class="btn btn-outline" style="font-size:0.85rem;">
            <i class="fa-solid fa-chevron-left"></i> Back to Profile
          </a>
        </div>
      </div>

      <div class="detail-tabs">
        <a href="#/pet/${pet.id}" class="tab-link" id="tab-profile">Profile Info</a>
        <a href="#/pet/${pet.id}/medical" class="tab-link" id="tab-medical">Medical Log</a>
        <a href="#/pet/${pet.id}/reminders" class="tab-link" id="tab-reminders">Reminders</a>
        <a href="#/pet/${pet.id}/journal" class="tab-link active" id="tab-journal">Growth Journal</a>
      </div>

      <div style="display:flex; flex-direction:column; gap:2rem;">

        <div class="glass-card">
          <h3 style="font-weight:700; margin-bottom: 1rem;"><i class="fa-solid fa-chart-line" style="color:var(--teal);"></i> Weight Progression Curve</h3>
          <div style="position:relative; height:250px; width:100%;">
            <canvas id="weight-trend-chart"></canvas>
          </div>
        </div>

        <div class="grid-cols-3">

          <div class="glass-card" style="grid-column: span 2;">
            <div class="flex-between mb-2">
              <h3 style="font-weight:700;">Journal Timeline</h3>
              <button id="btn-add-journal-entry" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">
                <i class="fa-solid fa-plus"></i> Add Log Entry
              </button>
            </div>

            <div id="journal-timeline-container" class="timeline">
            </div>
          </div>

          <div>
            <div class="glass-card" style="position: sticky; top: 90px; text-align:center;">
              <h4 style="font-weight:700; color:var(--terracotta); margin-bottom:0.5rem;"><i class="fa-solid fa-camera"></i> Journal Memories</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); line-height:1.4;">
                Attach photos of milestones and track weight stats simultaneously. Weight changes update the trend curve.
              </p>
            </div>
          </div>

        </div>

      </div>
    `;

    document.getElementById('btn-add-journal-entry').onclick = () => showAddJournalModal(petId);

    await loadJournalEntries(petId);

  } catch (error) {
    console.error("Journal page initialization failure:", error);
    showToast("Failed to initialize growth journal.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Loads list of journal entries and draws the weight progression chart
 */
async function loadJournalEntries(petId) {
  const container = document.getElementById('journal-timeline-container');
  if (!container) return;

  container.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-text"></div></div>`;

  try {
    const { data: entries, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('pet_id', petId)
      .order('entry_date', { ascending: true });

    if (error) throw error;

    container.innerHTML = '';

    const labels = [];
    const weights = [];

    (entries || []).forEach((data) => {
      labels.push(formatFriendlyDate(data.entry_date));
      weights.push(data.weight || null);
    });

    drawWeightChart(labels, weights);

    if (!entries || entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state-mini">
          <i class="fa-solid fa-note-sticky"></i>
          <p>No journal entries logged. Click "Add Log Entry" to record weights and photos.</p>
        </div>
      `;
      return;
    }

    const displayEntries = [...entries].reverse();

    displayEntries.forEach((record) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      // FIX (XSS): validate photo_url as a real http(s) URL before using
      // it in an <img src> — previously inserted raw.
      let imgMarkup = '';
      const safePhotoUrl = safeUrlOrEmpty(record.photo_url);
      if (safePhotoUrl) {
        imgMarkup = `
          <div style="max-width:300px; max-height:200px; border-radius: var(--radius-sm); overflow:hidden; margin:0.75rem 0; border:1px solid var(--border-glass);">
            <img src="${escapeHTML(safePhotoUrl)}" style="width:100%; height:100%; object-fit:cover;" alt="Milestone photo">
          </div>
        `;
      }

      let weightBadge = '';
      if (record.weight) {
        // FIX (XSS): weight is numeric in the DB, but escape defensively
        // in case it's ever a stray string value.
        weightBadge = `
          <span class="pet-status-badge safe" style="background: var(--teal); font-size: 0.65rem; text-transform:none;">
            Weight: ${escapeHTML(String(record.weight))} kg
          </span>
        `;
      }

            item.innerHTML = `
        <div class="timeline-dot" style="background:var(--terracotta);"></div>
        <div class="glass-card timeline-content">
          <div class="flex-between">
            <span class="timeline-date" style="color:var(--terracotta);">${formatFriendlyDate(record.entry_date)}</span>
            <div style="display:flex; gap:0.5rem; align-items:center;">
              ${weightBadge}
              <button class="icon-btn btn-delete-journal" data-id="${escapeHTML(record.id)}" style="width:28px; height:28px; background:transparent; border:none; color:var(--text-muted);">
                <i class="fa-solid fa-trash" style="font-size:0.8rem;"></i>
              </button>
            </div>
          </div>
          ${imgMarkup}
          <p class="timeline-body mt-1" style="font-size:0.9rem;">${escapeHTML(record.notes || 'Notes')}</p>
        </div>
      `;
      
      container.appendChild(item);
    });

    container.querySelectorAll('.btn-delete-journal').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        confirmDeleteJournalEntry(petId, id);
      };
    });

  } catch (error) {
    console.error("Journal loading error:", error);
    showToast("Failed to fetch journal timeline details.", "error");
  }
}

/**
 * Configure Chart.js logic
 */
function drawWeightChart(labels, data) {
  const canvas = document.getElementById('weight-trend-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  if (weightChartInstance) {
    weightChartInstance.destroy();
  }

  const filteredLabels = [];
  const filteredData = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i] !== null && data[i] !== undefined) {
      filteredLabels.push(labels[i]);
      filteredData.push(data[i]);
    }
  }

  if (filteredData.length === 0) {
    ctx.font = '14px Outfit, Inter, sans-serif';
    ctx.fillStyle = 'var(--text-muted)';
    ctx.textAlign = 'center';
    ctx.fillText("Log weight measurements to populate chart trends.", canvas.width / 2 || 150, canvas.height / 2 || 120);
    return;
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(31, 122, 140, 0.2)');
  gradient.addColorStop(1, 'rgba(31, 122, 140, 0.0)');

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: filteredLabels,
      datasets: [{
        label: 'Weight (kg)',
        data: filteredData,
        borderColor: '#1f7a8c',
        backgroundColor: gradient,
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: '#d95d39',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'var(--text-muted)' }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'var(--text-muted)' }
        }
      }
    }
  });
}

/**
 * Display modal form dialog to save journal timeline item
 */
function showAddJournalModal(petId) {
  showModal({
    title: "Add Journal Entry",
    bodyHtml: `
      <form id="journal-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-row">
          <div class="form-group">
            <label for="jour-date">Date of Entry *</label>
            <input type="date" id="jour-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="form-group">
            <label for="jour-weight">Weight (kg - Optional)</label>
            <input type="number" step="0.05" id="jour-weight" class="form-control" placeholder="E.g. 5.2" min="0.1" max="150">
          </div>
        </div>

        <div class="form-group">
          <label for="jour-photo">Milestone Photo</label>
          <input type="file" id="jour-photo" class="form-control" accept="image/*">
          <small style="color:var(--text-muted); font-size:0.75rem;">Max image size 3MB. JPG, PNG, WEBP.</small>
        </div>

        <div class="form-group">
          <label for="jour-notes">Journal Notes / Observations *</label>
          <textarea id="jour-notes" class="form-control" rows="4" placeholder="Describe achievements, behavioral patterns, or physical notes..." required></textarea>
        </div>
      </form>
    `,
    confirmText: "Publish Log",
    onConfirm: async () => {
      const form = document.getElementById('journal-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const date = document.getElementById('jour-date').value;
      const weightVal = document.getElementById('jour-weight').value;
      const weight = weightVal ? parseFloat(weightVal) : null;
      const notes = document.getElementById('jour-notes').value.trim();
      const photoInput = document.getElementById('jour-photo');

      const today = new Date().toISOString().split('T')[0];
      if (date > today) {
        showToast("Journal entry date cannot be in the future.", "warning");
        return true;
      }

      if (weightVal !== "") {
        if (weight < 0.1 || weight > 150.0) {
          showToast("Weight must be between 0.1 kg and 150.0 kg.", "warning");
          return true;
        }
      }

      let photoUrl = '';

      if (photoInput.files.length > 0) {
        const file = photoInput.files[0];
        const error = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
        if (error) {
          showToast(error, "warning");
          return true;
        }
        const user = getCurrentUser();
        photoUrl = await uploadToStorage('journal-photos', user.uid, `${petId}/${Date.now()}_${file.name}`, file);
      }

      try {
        const { error: insertErr } = await supabase.from('journal_entries').insert({
          pet_id: petId,
          entry_date: date,
          weight,
          notes,
          photo_url: photoUrl
        });
        if (insertErr) throw insertErr;

        if (weight) {
          const { error: updateErr } = await supabase
            .from('pets')
            .update({ weight, updated_at: new Date().toISOString() })
            .eq('id', petId);
          if (updateErr) throw updateErr;
        }

        showToast("Journal entry added successfully.", "success");
        closeModal();
        loadJournalEntries(petId);
        return false;
      } catch (err) {
        console.error("Journal save failure:", err);
        showToast("Failed to write journal log entry.", "error");
        return true;
      }
    }
  });
}

/**
 * Remove entry verification dialog
 */
function confirmDeleteJournalEntry(petId, entryId) {
  showModal({
    title: "Delete Journal Entry?",
    bodyHtml: `<p style="text-align:center; padding: 1rem 0;">Permanently remove this milestone memory log?</p>`,
    confirmText: "Yes, Delete",
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('journal_entries').delete().eq('id', entryId);
        if (error) throw error;
        showToast("Journal log removed.", "info");
        closeModal();
        loadJournalEntries(petId);
        return false;
      } catch (err) {
        console.error("Delete journal log error:", err);
        showToast("Failed to delete journal record.", "error");
        return true;
      }
    }
  });
}
// ==========================================================================
// TEMPORARY CAREGIVER ACCESS MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate, validateFile, FILE_LIMITS, readFileAsDataURL, getPetImageHTML, escapeHTML, isSafeHttpUrl } from './utils.js';
import { Router } from './router.js';

/**
 * Public Route Renderer: #/caregiver/:token
 */
export async function renderCaregiver(params) {
  const token = params.token;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Caregiver Portal';

  showLoading(true, "Authenticating caregiver token...");
  try {
    const { data: tokenRow, error } = await supabase
      .rpc('get_caregiver_token', { p_token_id: token })
      .single();

    // The RPC only returns a row when it's active and not expired,
    // so any failure here means invalid, expired, or revoked — indistinguishable by design.
    if (error || !tokenRow) {
      renderInvalidTokenState(viewport);
      return;
    }

    const tokenData = {
      id: tokenRow.id,
      petId: tokenRow.pet_id,
      ownerId: tokenRow.owner_id,
      active: tokenRow.active,
      expiresAt: tokenRow.expires_at,
      permissions: tokenRow.permissions,
      petDetails: tokenRow.pet_details,
      medicalRecords: tokenRow.medical_records || [],
      reminders: tokenRow.reminders || [],
      journalEntries: tokenRow.journal_entries || []
    };

    const expiresAt = new Date(tokenData.expiresAt);
    const pet = tokenData.petDetails || {};
    pet.id = tokenData.petId;

    viewport.innerHTML = `
      <div class="glass-card" style="background: rgba(var(--portal-accent-rgb), 0.08); border-color: var(--portal-accent); padding:1rem; margin-bottom:1.5rem; text-align:center;">
        <h4 style="color:var(--portal-accent); font-weight:700;"><i class="fa-solid fa-user-shield"></i> Caregiver Authorization Active</h4>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
          You have temporary authorization to access ${escapeHTML(pet.name)}'s records. Expires on: <strong>${expiresAt.toLocaleString()}</strong>
        </p>
      </div>

      <div class="glass-card detail-header">
        <div class="detail-avatar">
          ${getPetImageHTML(pet, 'small')}
        </div>
        <div class="detail-info">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight:800;">
            <span>${escapeHTML(pet.name)}</span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            Breed: <strong>${escapeHTML(pet.breed)}</strong> &nbsp;|&nbsp;
            Gender: <strong>${escapeHTML(pet.gender)}</strong> &nbsp;|&nbsp;
            Weight: <strong>${escapeHTML(pet.weight)} kg</strong>
          </p>
        </div>
      </div>

      <div class="detail-tabs" id="caregiver-tabs">
        <span class="tab-link active" id="cg-tab-med" style="cursor:pointer;">Medical Logs</span>
        <span class="tab-link" id="cg-tab-rem" style="cursor:pointer;">Reminders</span>
        <span class="tab-link" id="cg-tab-jour" style="cursor:pointer;">Growth Journal</span>
      </div>

      <div id="caregiver-workspace">
      </div>
    `;

    const cgWorkspace = document.getElementById('caregiver-workspace');
    const tabs = document.querySelectorAll('#caregiver-tabs .tab-link');

    const selectTab = (tabId, loadFn) => {
      tabs.forEach(t => t.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      loadFn(pet.id, tokenData, cgWorkspace);
    };

    document.getElementById('cg-tab-med').onclick = () => selectTab('cg-tab-med', loadCaregiverMedical);
    document.getElementById('cg-tab-rem').onclick = () => selectTab('cg-tab-rem', loadCaregiverReminders);
    document.getElementById('cg-tab-jour').onclick = () => selectTab('cg-tab-jour', loadCaregiverJournal);

    selectTab('cg-tab-med', loadCaregiverMedical);

  } catch (error) {
    console.error("Caregiver load error:", error);
    renderInvalidTokenState(viewport);
  } finally {
    showLoading(false);
  }
}

function renderInvalidTokenState(container) {
  container.innerHTML = `
    <div class="auth-wrapper">
      <div class="glass-card" style="text-align:center; max-width:450px;">
        <i class="fa-solid fa-ban" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <h2>Link Unavailable</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height:1.4;">
          This sharing link is invalid, has expired, or has been revoked by the owner. Please request a new link.
        </p>
        <a href="#/login" class="btn btn-primary mt-2">Return to PawTrace</a>
      </div>
    </div>
  `;
}

/* ==========================================================================
   CAREGIVER SUB-MODULE LOADERS
   ========================================================================== */

async function loadCaregiverMedical(petId, tokenData, container) {
  container.innerHTML = `<div class="glass-card"><div class="timeline" id="cg-med-timeline"></div></div>`;
  const timeline = document.getElementById('cg-med-timeline');

  const records = tokenData.medicalRecords || [];
  if (records.length === 0) {
    timeline.innerHTML = `<div class="empty-state-mini"><p>No medical records logged.</p></div>`;
    return;
  }

  records.forEach(record => {
    let attachmentMarkup = '';
    if (record.attachment_url && isSafeHttpUrl(record.attachment_url)) {
      attachmentMarkup = `
        <a href="${escapeHTML(record.attachment_url)}" target="_blank" rel="noopener noreferrer" class="timeline-attachment">
          <i class="fa-solid fa-file"></i> View Attachment
        </a>
      `;
    }
    const item = document.createElement('div');
    item.className = `timeline-item ${(record.record_type || '').toLowerCase()}`;
    item.innerHTML = `
      <div class="timeline-dot"></div>
      <div class="glass-card timeline-content" style="box-shadow:none; border-color:var(--border-glass);">
        <span class="timeline-date">${formatFriendlyDate(record.visit_date)}</span>
        <h4 class="timeline-title">${escapeHTML(record.title)}</h4>
        <p class="timeline-body">${escapeHTML(record.description || '')}</p>
        ${attachmentMarkup}
      </div>
    `;
    timeline.appendChild(item);
  });
}

async function loadCaregiverReminders(petId, tokenData, container) {
  container.innerHTML = `
    <div class="glass-card">
      <h3 style="font-weight:700; margin-bottom:1rem;">Tasks & Reminders</h3>
      <div id="cg-rem-list"></div>
    </div>
  `;
  const list = document.getElementById('cg-rem-list');
  const reminders = tokenData.reminders || [];

  if (reminders.length === 0) {
    list.innerHTML = `<div class="empty-state-mini"><p>No active reminders.</p></div>`;
    return;
  }

  reminders.forEach(reminder => {
    const id = reminder.id;
    const dueDateOnly = reminder.reminder_date ? reminder.reminder_date.split('T')[0] : '';
    const isOverdue = dueDateOnly < new Date().toISOString().split('T')[0] && !reminder.is_completed;

    const item = document.createElement('div');
    item.className = `reminder-item ${reminder.is_completed ? 'completed' : ''}`;

    const canToggle = tokenData.permissions.completeReminders;

    item.innerHTML = `
      <div class="reminder-left">
        <div class="reminder-checkbox ${reminder.is_completed ? 'checked' : ''} ${canToggle ? '' : 'disabled'}"
             data-id="${id}" data-status="${reminder.is_completed}" style="${canToggle ? '' : 'cursor:not-allowed; opacity:0.6;'}">
        </div>
        <div class="reminder-info">
          <span class="reminder-title">${escapeHTML(reminder.title)}</span>
          <span class="reminder-meta">${escapeHTML(reminder.reminder_type)} &bull; Due: ${formatFriendlyDate(dueDateOnly)}</span>
        </div>
      </div>
      ${isOverdue ? `<span class="badge-overdue">OVERDUE</span>` : ''}
    `;
    list.appendChild(item);
  });

  if (tokenData.permissions.completeReminders) {
    list.querySelectorAll('.reminder-checkbox').forEach(box => {
      box.onclick = async () => {
        const id = box.getAttribute('data-id');
        const status = box.getAttribute('data-status') === 'true';

        showLoading(true, "Updating reminder status...");
        try {
          const updatedReminders = reminders.map(rem => {
            if (rem.id === id) {
              return { ...rem, is_completed: !status };
            }
            return rem;
          });

          const { error } = await supabase
            .rpc('update_caregiver_token_data', {
              p_token_id: tokenData.id,
              p_reminders: updatedReminders
            });
          if (error) throw error;

          // Also sync the real reminder row directly, since the caregiver
          // may not have another chance to trigger a sync (no owner login).
          const { error: syncErr } = await supabase
            .from('reminders')
            .update({ is_completed: !status })
            .eq('id', id);
          if (syncErr) console.warn("Reminder sync warning:", syncErr);

          tokenData.reminders = updatedReminders;
          showToast("Reminder status updated.", "success");
          loadCaregiverReminders(petId, tokenData, container);
        } catch (err) {
          showToast("Failed to complete task.", "error");
        } finally {
          showLoading(false);
        }
      };
    });
  }
}

async function loadCaregiverJournal(petId, tokenData, container) {
  const canWrite = tokenData.permissions.writeJournal;

  container.innerHTML = `
    <div class="grid-split">
      <div class="glass-card">
        <div class="flex-between mb-2">
          <h3 style="font-weight:700;">Journal History</h3>
          ${canWrite ? `<button id="btn-cg-add-journal" class="btn btn-primary" style="font-size:0.8rem; padding:0.4rem 0.8rem;">Add Entry</button>` : ''}
        </div>
        <div class="timeline" id="cg-jour-timeline"></div>
      </div>
      <div>
        <div class="glass-card">
          <h4>Journal Notes</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-top:0.5rem;">
            ${canWrite ? 'You have permissions to log weight and milestones for this pet.' : 'You have view-only access to this pet journal.'}
          </p>
        </div>
      </div>
    </div>
  `;

  const timeline = document.getElementById('cg-jour-timeline');
  loadCaregiverJournalList(tokenData, timeline);

  if (canWrite) {
    document.getElementById('btn-cg-add-journal').onclick = () => showCaregiverJournalModal(petId, tokenData, timeline);
  }
}

function loadCaregiverJournalList(tokenData, timelineContainer) {
  const entries = tokenData.journalEntries || [];
  timelineContainer.innerHTML = '';

  if (entries.length === 0) {
    timelineContainer.innerHTML = `<div class="empty-state-mini"><p>No journal history found.</p></div>`;
    return;
  }

  entries.forEach(record => {
    let img = '';
    if (record.photo && isSafeHttpUrl(record.photo)) {
      img = `<img src="${escapeHTML(record.photo)}" style="max-width:200px; border-radius:var(--radius-sm); margin-top:0.5rem; display:block;">`;
    }
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-dot" style="background:var(--terracotta);"></div>
      <div class="glass-card timeline-content" style="box-shadow:none; border-color:var(--border-glass);">
        <span class="timeline-date">${formatFriendlyDate(record.date)}</span>
        <p class="timeline-body">${escapeHTML(record.notes)}</p>
        ${img}
      </div>
    `;
    timelineContainer.appendChild(item);
  });
}

function showCaregiverJournalModal(petId, tokenData, timelineContainer) {
  showModal({
    title: "Add Caregiver Journal Log",
    bodyHtml: `
      <form id="cg-journal-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-group">
          <label for="cg-jour-date">Date *</label>
          <input type="date" id="cg-jour-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-group">
          <label for="cg-jour-photo">Photo</label>
          <input type="file" id="cg-jour-photo" class="form-control" accept="image/*">
        </div>
        <div class="form-group">
          <label for="cg-jour-notes">Notes *</label>
          <textarea id="cg-jour-notes" class="form-control" rows="3" required></textarea>
        </div>
      </form>
    `,
    confirmText: "Submit Log",
    onConfirm: async () => {
      const form = document.getElementById('cg-journal-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const date = document.getElementById('cg-jour-date').value;
      const notes = document.getElementById('cg-jour-notes').value.trim();
      const photoInput = document.getElementById('cg-jour-photo');

      let photoUrl = '';
      if (photoInput.files.length > 0) {
        const file = photoInput.files[0];
        const fileErr = validateFile(file, FILE_LIMITS.IMAGE_TYPES, FILE_LIMITS.IMAGE_MAX_SIZE);
        if (fileErr) {
          showToast(fileErr, "warning");
          return true;
        }
        // Caregivers usually aren't logged in as anyone, so Storage RLS (which
        // requires an owner login) can't apply here — base64 fallback stays for this path.
        photoUrl = await readFileAsDataURL(file);
      }

      try {
        const newEntry = {
          id: `cg_${Date.now()}`,
          date,
          notes: `[Caregiver log] ${notes}`,
          photo: photoUrl,
          created_at: new Date().toISOString(),
          synced: false
        };

        const updatedJournal = [newEntry, ...(tokenData.journalEntries || [])];

        const { error } = await supabase
          .rpc('update_caregiver_token_data', {
            p_token_id: tokenData.id,
            p_journal_entries: updatedJournal
          });
        if (error) throw error;

        // Best-effort sync into the real journal_entries table right away
        const { error: syncErr } = await supabase.from('journal_entries').insert({
          pet_id: petId,
          entry_date: date,
          notes: newEntry.notes,
          photo_url: photoUrl
        });
        if (!syncErr) newEntry.synced = true;
        else console.warn("Journal sync warning:", syncErr);

        tokenData.journalEntries = updatedJournal;
        showToast("Journal entry added successfully.", "success");
        closeModal();
        loadCaregiverJournalList(tokenData, timelineContainer);
        return false;
      } catch (err) {
        showToast("Failed to save entry.", "error");
        return true;
      }
    }
  });
}

/* ==========================================================================
   CAREGIVER MANAGER FOR OWNERS (Rendered in Pet Details Profile Tab)
   ========================================================================== */

export async function renderCaregiverManager(petId, containerEl) {
  containerEl.innerHTML = `
    <h3 style="font-weight:700; margin-top:2.5rem; margin-bottom:1rem;">Caregiver Access Manager</h3>
    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.5rem;">
      Generate temporary sharing links to give pet sitters, friends, or vets access to medical, reminder, and journal logs.
    </p>

    <div class="grid-split">
      <div>
        <h4 style="font-weight:600; margin-bottom:0.75rem;">Active Sharing Keys</h4>
        <div id="caregiver-keys-list" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>

      <div class="glass-card" style="padding:1.25rem;">
        <h4 style="font-weight:700; margin-bottom:1rem; color:var(--portal-accent);">Create Caregiver Link</h4>
        <form id="cg-token-form" style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="form-group">
            <label for="cg-duration">Link Expiration</label>
            <select id="cg-duration" class="form-control">
              <option value="12">12 Hours</option>
              <option value="24" selected>24 Hours</option>
              <option value="72">3 Days</option>
              <option value="168">7 Days</option>
            </select>
          </div>
          <div class="form-group">
            <label>Granted Permissions</label>
            <label style="display:flex; align-items:center; gap:0.5rem; font-weight:normal; margin-top:0.25rem;">
              <input type="checkbox" id="cg-perm-rem" checked> Complete scheduled tasks
            </label>
            <label style="display:flex; align-items:center; gap:0.5rem; font-weight:normal; margin-top:0.25rem;">
              <input type="checkbox" id="cg-perm-jour" checked> Add journal entry notes
            </label>
          </div>
          <button type="submit" class="btn btn-secondary btn-full mt-1">
            <i class="fa-solid fa-key"></i> Generate Link
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('cg-token-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await generateCaregiverToken(petId, containerEl);
  };

  await loadActiveCaregiverTokens(petId);
}

async function loadActiveCaregiverTokens(petId) {
  const container = document.getElementById('caregiver-keys-list');
  if (!container) return;

  const user = getCurrentUser();
  if (!user) {
    container.innerHTML = `<div class="empty-state-mini" style="padding:1rem;"><p>Please log in to view sharing keys.</p></div>`;
    return;
  }

  try {
    const { data: tokens, error } = await supabase
      .from('caregiver_tokens')
      .select('*')
      .eq('pet_id', petId)
      .eq('owner_id', user.uid)
      .eq('active', true);

    if (error) throw error;

    container.innerHTML = '';
    let hasKeys = false;

    for (const tokenRow of (tokens || [])) {
      const expiresAt = new Date(tokenRow.expires_at);
      if (new Date() > expiresAt) continue;

      hasKeys = true;
      const shareUrl = `${window.location.origin}${window.location.pathname}#/caregiver/${tokenRow.id}`;

      const row = document.createElement('div');
      row.className = 'glass-card';
      row.style.padding = '0.75rem';
      row.style.boxShadow = 'none';
      row.style.borderColor = 'var(--border-glass)';
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <span style="font-size:0.7rem; color:var(--text-muted); display:block;">EXPIRY: ${expiresAt.toLocaleString()}</span>
            <div style="display:flex; gap:0.5rem; margin:0.35rem 0; font-size:0.75rem;">
              <span class="pet-status-badge safe" style="background:${tokenRow.permissions.completeReminders ? 'var(--portal-accent)' : 'var(--text-muted)'}; font-size:0.6rem; position:static; display:inline-block;">Tasks</span>
              <span class="pet-status-badge safe" style="background:${tokenRow.permissions.writeJournal ? 'var(--portal-accent)' : 'var(--text-muted)'}; font-size:0.6rem; position:static; display:inline-block;">Journal</span>
            </div>
            <input type="text" class="form-control" value="${shareUrl}" readonly style="padding:0.25rem 0.5rem; font-size:0.7rem; width:220px; background:var(--bg-app);">
          </div>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-outline btn-copy-link" data-url="${shareUrl}" style="padding:0.4rem;"><i class="fa-solid fa-copy"></i></button>
            <button class="btn btn-danger btn-revoke-link" data-id="${tokenRow.id}" style="padding:0.4rem;"><i class="fa-solid fa-ban"></i></button>
          </div>
        </div>
      `;
      container.appendChild(row);
    }

    if (!hasKeys) {
      container.innerHTML = `<div class="empty-state-mini" style="padding:1rem;"><p>No active caregiver keys created.</p></div>`;
    }

    container.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.onclick = () => {
        const url = btn.getAttribute('data-url');
        navigator.clipboard.writeText(url);
        showToast("Access link copied to clipboard!", "success");
      };
    });

    container.querySelectorAll('.btn-revoke-link').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        showLoading(true, "Revoking access key...");
        try {
          const { error } = await supabase
            .from('caregiver_tokens')
            .update({ active: false })
            .eq('id', id);
          if (error) throw error;
          showToast("Caregiver sharing key revoked.", "info");
          loadActiveCaregiverTokens(petId);
        } catch (err) {
          showToast("Failed to revoke key.", "error");
        } finally {
          showLoading(false);
        }
      };
    });

  } catch (err) {
    console.error("Error fetching keys list:", err);
  }
}

async function generateCaregiverToken(petId, parentContainer) {
  const durationSelect = document.getElementById('cg-duration');
  const hours = parseInt(durationSelect.value);
  const completeReminders = document.getElementById('cg-perm-rem').checked;
  const writeJournal = document.getElementById('cg-perm-jour').checked;

  const user = getCurrentUser();
  if (!user) return;

  const expiresDate = new Date();
  expiresDate.setHours(expiresDate.getHours() + hours);

  showLoading(true, "Creating sharing token...");
  try {
    const { data: pet, error: petErr } = await supabase.from('pets').select('*').eq('id', petId).single();
    if (petErr || !pet) {
      showToast("Pet details not found.", "error");
      return;
    }

    const { data: medicalRecords } = await supabase
      .from('medical_records')
      .select('*')
      .eq('pet_id', petId)
      .order('visit_date', { ascending: false });

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('pet_id', petId)
      .order('reminder_date', { ascending: true });

    const { data: journalEntries } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('pet_id', petId)
      .order('entry_date', { ascending: false });

    const { error: insertErr } = await supabase.from('caregiver_tokens').insert({
      pet_id: petId,
      owner_id: user.uid,
      active: true,
      expires_at: expiresDate.toISOString(),
      permissions: {
        read: true,
        completeReminders,
        writeJournal
      },
      pet_details: {
        name: pet.name,
        breed: pet.breed,
        gender: pet.gender,
        weight: pet.weight,
        profileImage: pet.photo_url || ''
      },
      medical_records: medicalRecords || [],
      reminders: reminders || [],
      journal_entries: (journalEntries || []).map(j => ({ ...j, date: j.entry_date, photo: j.photo_url, synced: true }))
    });
    if (insertErr) throw insertErr;

    showToast("Temporary access token configured successfully.", "success");

    document.getElementById('cg-perm-rem').checked = true;
    document.getElementById('cg-perm-jour').checked = true;

    await loadActiveCaregiverTokens(petId);
  } catch (err) {
    console.error("Token creation error:", err);
    showToast("Failed to generate caregiver token.", "error");
  } finally {
    showLoading(false);
  }
}
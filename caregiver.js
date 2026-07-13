// ==========================================================================
// TEMPORARY CAREGIVER ACCESS MODULE
// ==========================================================================

import { db, fb, auth } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate, validateFile, FILE_LIMITS, readFileAsDataURL, getPetImageHTML } from './utils.js';
import { Router } from './router.js';

/**
 * Public Route Renderer: #/caregiver/:token
 */
export async function renderCaregiver(params) {
  const token = params.token;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Caregiver Portal';

  if (!db) {
    viewport.innerHTML = `<div class="empty-state"><p>Database is not connected.</p></div>`;
    return;
  }

  showLoading(true, "Authenticating caregiver token...");
  try {
    // 1. Fetch token details
    const tokenDoc = await db.collection('caregiver_tokens').doc(token).get();
    if (!tokenDoc.exists) {
      renderInvalidTokenState(viewport);
      return;
    }

    const tokenData = tokenDoc.data();
    tokenData.id = tokenDoc.id; // preserve ID for updates
    
    // Check if token is active and not expired
    const now = new Date();
    const expiresAt = (tokenData.expiresAt && typeof tokenData.expiresAt.toDate === 'function') 
      ? tokenData.expiresAt.toDate() 
      : new Date(tokenData.expiresAt);
    const isExpired = now > expiresAt;
    
    if (!tokenData.active || isExpired) {
      renderInvalidTokenState(viewport, isExpired);
      return;
    }

    // 2. Fetch associated pet details from embedded snapshot
    const pet = tokenData.petDetails || {};
    pet.id = tokenData.petId;

    // Render Caregiver workspace layouts
    viewport.innerHTML = `
      <!-- Caregiver Top Alert Status Banner -->
      <div class="glass-card" style="background: rgba(var(--portal-accent-rgb), 0.08); border-color: var(--portal-accent); padding:1rem; margin-bottom:1.5rem; text-align:center;">
        <h4 style="color:var(--portal-accent); font-weight:700;"><i class="fa-solid fa-user-shield"></i> Caregiver Authorization Active</h4>
        <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
          You have temporary authorization to access ${pet.name}'s records. Expires on: <strong>${expiresAt.toLocaleString()}</strong>
        </p>
      </div>

      <!-- Core Pet Info Card -->
      <div class="glass-card detail-header">
        <div class="detail-avatar">
          ${getPetImageHTML(pet, 'small')}
        </div>
        <div class="detail-info">
          <h2 style="font-family: 'Outfit', sans-serif; font-size: 2rem; font-weight:800;">
            <span>${pet.name}</span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            Breed: <strong>${pet.breed}</strong> &nbsp;|&nbsp; 
            Gender: <strong>${pet.gender}</strong> &nbsp;|&nbsp;
            Weight: <strong>${pet.weight} kg</strong>
          </p>
        </div>
      </div>

      <!-- Caregiver Navigation Tabs inside same SPA page context -->
      <div class="detail-tabs" id="caregiver-tabs">
        <span class="tab-link active" id="cg-tab-med" style="cursor:pointer;">Medical Logs</span>
        <span class="tab-link" id="cg-tab-rem" style="cursor:pointer;">Reminders</span>
        <span class="tab-link" id="cg-tab-jour" style="cursor:pointer;">Growth Journal</span>
      </div>

      <div id="caregiver-workspace">
        <!-- Render current caregiver-tab content -->
      </div>
    `;

    // Bind tab clicks manually to avoid standard hash-router intercept
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

    // Default load: Medical
    selectTab('cg-tab-med', loadCaregiverMedical);

  } catch (error) {
    console.error("Caregiver load error:", error);
    renderInvalidTokenState(viewport, false);
    if (error.code !== 'permission-denied') {
      showToast("Authorization validation failed.", "error");
    }
  } finally {
    showLoading(false);
  }
}

function renderInvalidTokenState(container, isExpired = false) {
  container.innerHTML = `
    <div class="auth-wrapper">
      <div class="glass-card" style="text-align:center; max-width:450px;">
        <i class="fa-solid fa-ban" style="font-size:3rem; color:var(--accent-red); margin-bottom:1rem;"></i>
        <h2>${isExpired ? 'Link Expired' : 'Invalid Link'}</h2>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-top:0.5rem; line-height:1.4;">
          ${isExpired 
            ? 'This temporary caregiver sharing link has expired. Please request a new link from the pet owner.' 
            : 'This sharing link is invalid or has been revoked by the owner.'}
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

  try {
    const records = tokenData.medicalRecords || [];
    if (records.length === 0) {
      timeline.innerHTML = `<div class="empty-state-mini"><p>No medical records logged.</p></div>`;
      return;
    }

    records.forEach(record => {
      let attachmentMarkup = '';
      if (record.attachment) {
        attachmentMarkup = `
          <a href="${record.attachment}" target="_blank" class="timeline-attachment">
            <i class="fa-solid fa-file"></i> View Attachment
          </a>
        `;
      }
      const item = document.createElement('div');
      item.className = `timeline-item ${record.category.toLowerCase()}`;
      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="glass-card timeline-content" style="box-shadow:none; border-color:var(--border-glass);">
          <span class="timeline-date">${formatFriendlyDate(record.date)}</span>
          <h4 class="timeline-title">${record.title}</h4>
          <p class="timeline-body">${record.notes || ''}</p>
          ${attachmentMarkup}
        </div>
      `;
      timeline.appendChild(item);
    });
  } catch (err) {
    timeline.innerHTML = `<p>Failed to load medical history.</p>`;
  }
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

  try {
    if (reminders.length === 0) {
      list.innerHTML = `<div class="empty-state-mini"><p>No active reminders.</p></div>`;
      return;
    }

    reminders.forEach(reminder => {
      const id = reminder.id;
      const isOverdue = reminder.dueDate < new Date().toISOString().split('T')[0] && !reminder.completed;

      const item = document.createElement('div');
      item.className = `reminder-item ${reminder.completed ? 'completed' : ''}`;
      
      const canToggle = tokenData.permissions.completeReminders;

      item.innerHTML = `
        <div class="reminder-left">
          <div class="reminder-checkbox ${reminder.completed ? 'checked' : ''} ${canToggle ? '' : 'disabled'}" 
               data-id="${id}" data-status="${reminder.completed}" style="${canToggle ? '' : 'cursor:not-allowed; opacity:0.6;'}">
          </div>
          <div class="reminder-info">
            <span class="reminder-title">${reminder.title}</span>
            <span class="reminder-meta">${reminder.type} &bull; Due: ${formatFriendlyDate(reminder.dueDate)}</span>
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
                return { ...rem, completed: !status };
              }
              return rem;
            });

            await db.collection('caregiver_tokens').doc(tokenData.id).update({
              reminders: updatedReminders
            });

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

  } catch (err) {
    list.innerHTML = `<p>Failed to load reminders.</p>`;
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
  await loadCaregiverJournalList(petId, tokenData, timeline);

  if (canWrite) {
    document.getElementById('btn-cg-add-journal').onclick = () => showCaregiverJournalModal(petId, tokenData, timeline);
  }
}

async function loadCaregiverJournalList(petId, tokenData, timelineContainer) {
  try {
    const entries = tokenData.journalEntries || [];
    timelineContainer.innerHTML = '';
    
    if (entries.length === 0) {
      timelineContainer.innerHTML = `<div class="empty-state-mini"><p>No journal history found.</p></div>`;
      return;
    }

    entries.forEach(record => {
      let img = '';
      if (record.photo) {
        img = `<img src="${record.photo}" style="max-width:200px; border-radius:var(--radius-sm); margin-top:0.5rem; display:block;">`;
      }
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = `
        <div class="timeline-dot" style="background:var(--terracotta);"></div>
        <div class="glass-card timeline-content" style="box-shadow:none; border-color:var(--border-glass);">
          <span class="timeline-date">${formatFriendlyDate(record.date)}</span>
          <p class="timeline-body">${record.notes}</p>
          ${img}
        </div>
      `;
      timelineContainer.appendChild(item);
    });
  } catch (err) {
    timelineContainer.innerHTML = `<p>Failed to load journal logs.</p>`;
  }
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
        try {
          if (storage) {
            const ref = storage.ref(`pets/${petId}/journal/cg_${Date.now()}_${file.name}`);
            const snapshot = await ref.put(file);
            photoUrl = await snapshot.ref.getDownloadURL();
          } else {
            photoUrl = await readFileAsDataURL(file);
          }
        } catch (err) {
          photoUrl = await readFileAsDataURL(file);
        }
      }

      try {
        const newEntry = {
          id: `cg_${Date.now()}`,
          date,
          notes: `[Caregiver log] ${notes}`,
          photo: photoUrl,
          createdAt: new Date().toISOString()
        };

        const updatedJournal = [newEntry, ...(tokenData.journalEntries || [])];

        await db.collection('caregiver_tokens').doc(tokenData.id).update({
          journalEntries: updatedJournal
        });

        tokenData.journalEntries = updatedJournal;
        showToast("Journal entry added successfully.", "success");
        closeModal();
        loadCaregiverJournalList(petId, tokenData, timelineContainer);
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

/**
 * Draw Caregiver Management widget inside the owner's pet details profile view
 */
export async function renderCaregiverManager(petId, containerEl) {
  if (!db) return;

  containerEl.innerHTML = `
    <h3 style="font-weight:700; margin-top:2.5rem; margin-bottom:1rem;">Caregiver Access Manager</h3>
    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.5rem;">
      Generate temporary sharing links to give pet sitters, friends, or vets access to medical, reminder, and journal logs.
    </p>

    <div class="grid-split">
      <!-- Active Token Links Table -->
      <div>
        <h4 style="font-weight:600; margin-bottom:0.75rem;">Active Sharing Keys</h4>
        <div id="caregiver-keys-list" style="display:flex; flex-direction:column; gap:0.75rem;">
          <!-- Fetched tokens list -->
          <div class="skeleton skeleton-text"></div>
        </div>
      </div>

      <!-- Generator panel -->
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

  // Bind token creation form submit
  const form = document.getElementById('cg-token-form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    await generateCaregiverToken(petId, containerEl);
  };

  // Fetch and display active tokens
  await loadActiveCaregiverTokens(petId);
}

async function loadActiveCaregiverTokens(petId) {
  const container = document.getElementById('caregiver-keys-list');
  if (!container) return;

  const user = getCurrentUser();
  if (!user || !db) {
    container.innerHTML = `<div class="empty-state-mini" style="padding:1rem;"><p>Please log in to view sharing keys.</p></div>`;
    return;
  }

  try {
    const snapshot = await db.collection('caregiver_tokens')
      .where('petId', '==', petId)
      .where('ownerId', '==', user.uid)
      .where('active', '==', true)
      .get();
      
    container.innerHTML = '';
    let hasKeys = false;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const id = doc.id;
      const now = new Date();
      const expiresAt = (data.expiresAt && typeof data.expiresAt.toDate === 'function') 
        ? data.expiresAt.toDate() 
        : new Date(data.expiresAt);

      if (now > expiresAt) continue; // skip expired tokens

      // Background Sync Caregiver Updates to Main Pet Records
      // 1. Sync reminders
      if (data.reminders) {
        for (const rem of data.reminders) {
          try {
            const mainRemDoc = await db.collection('pets').doc(petId).collection('reminders').doc(rem.id).get();
            if (mainRemDoc.exists && mainRemDoc.data().completed !== rem.completed) {
              await db.collection('pets').doc(petId).collection('reminders').doc(rem.id).update({
                completed: rem.completed,
                lastUpdated: fb.firestore.FieldValue.serverTimestamp()
              });
            }
          } catch (e) {
            console.warn("Sitter reminders sync warning:", e);
          }
        }
      }

      // 2. Sync journal entries
      if (data.journalEntries) {
        for (const entry of data.journalEntries) {
          if (entry.id && entry.id.startsWith('cg_')) {
            try {
              const mainJourDoc = await db.collection('pets').doc(petId).collection('journal_entries').doc(entry.id).get();
              if (!mainJourDoc.exists) {
                await db.collection('pets').doc(petId).collection('journal_entries').doc(entry.id).set({
                  date: entry.date,
                  notes: entry.notes,
                  photo: entry.photo || '',
                  createdAt: fb.firestore.FieldValue.serverTimestamp()
                });
              }
            } catch (e) {
              console.warn("Sitter journal sync warning:", e);
            }
          }
        }
      }

      hasKeys = true;
      const shareUrl = `${window.location.origin}${window.location.pathname}#/caregiver/${id}`;

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
              <span class="pet-status-badge safe" style="background:${data.permissions.completeReminders ? 'var(--portal-accent)' : 'var(--text-muted)'}; font-size:0.6rem; position:static; display:inline-block;">Tasks</span>
              <span class="pet-status-badge safe" style="background:${data.permissions.writeJournal ? 'var(--portal-accent)' : 'var(--text-muted)'}; font-size:0.6rem; position:static; display:inline-block;">Journal</span>
            </div>
            <input type="text" class="form-control" value="${shareUrl}" readonly style="padding:0.25rem 0.5rem; font-size:0.7rem; width:220px; background:var(--bg-app);">
          </div>
          <div style="display:flex; gap:0.35rem;">
            <button class="btn btn-outline btn-copy-link" data-url="${shareUrl}" style="padding:0.4rem;"><i class="fa-solid fa-copy"></i></button>
            <button class="btn btn-danger btn-revoke-link" data-id="${id}" style="padding:0.4rem;"><i class="fa-solid fa-ban"></i></button>
          </div>
        </div>
      `;
      container.appendChild(row);
    }

    if (!hasKeys) {
      container.innerHTML = `<div class="empty-state-mini" style="padding:1rem;"><p>No active caregiver keys created.</p></div>`;
    }

    // Bind copy links
    container.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.onclick = () => {
        const url = btn.getAttribute('data-url');
        navigator.clipboard.writeText(url);
        showToast("Access link copied to clipboard!", "success");
      };
    });

    // Bind revoke links
    container.querySelectorAll('.btn-revoke-link').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.getAttribute('data-id');
        showLoading(true, "Revoking access key...");
        try {
          await db.collection('caregiver_tokens').doc(id).update({ active: false });
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
  if (!user || !db) return;

  const expiresDate = new Date();
  expiresDate.setHours(expiresDate.getHours() + hours);

  showLoading(true, "Creating sharing token...");
  try {
    // 1. Fetch pet details
    const petDoc = await db.collection('pets').doc(petId).get();
    if (!petDoc.exists) {
      showToast("Pet details not found.", "error");
      return;
    }
    const pet = petDoc.data();

    // 2. Fetch medical records
    const medicalSnapshot = await db.collection('pets').doc(petId).collection('medical_records').orderBy('date', 'desc').get();
    const medicalRecords = [];
    medicalSnapshot.forEach(doc => {
      medicalRecords.push({ id: doc.id, ...doc.data() });
    });

    // 3. Fetch reminders
    const remindersSnapshot = await db.collection('pets').doc(petId).collection('reminders').orderBy('dueDate', 'asc').get();
    const reminders = [];
    remindersSnapshot.forEach(doc => {
      reminders.push({ id: doc.id, ...doc.data() });
    });

    // 4. Fetch journal entries
    const journalSnapshot = await db.collection('pets').doc(petId).collection('journal_entries').orderBy('date', 'desc').get();
    const journalEntries = [];
    journalSnapshot.forEach(doc => {
      journalEntries.push({ id: doc.id, ...doc.data() });
    });

    const tokenData = {
      petId,
      ownerId: user.uid,
      active: true,
      expiresAt: expiresDate,
      createdAt: fb.firestore.FieldValue.serverTimestamp(),
      permissions: {
        read: true,
        completeReminders,
        writeJournal
      },
      petDetails: {
        name: pet.name,
        breed: pet.breed,
        gender: pet.gender,
        weight: pet.weight,
        profileImage: pet.profileImage || ''
      },
      medicalRecords,
      reminders,
      journalEntries
    };

    // Add token doc (generating unique random doc ID inside Firestore)
    const docRef = await db.collection('caregiver_tokens').add(tokenData);
    showToast("Temporary access token configured successfully.", "success");
    
    // Reset permissions values
    document.getElementById('cg-perm-rem').checked = true;
    document.getElementById('cg-perm-jour').checked = true;
    
    // Refresh token tables
    await loadActiveCaregiverTokens(petId);
  } catch (err) {
    console.error("Token creation error:", err);
    showToast("Failed to generate caregiver token.", "error");
  } finally {
    showLoading(false);
  }
}

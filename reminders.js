// ==========================================================================
// REMINDERS & TASK MANAGEMENT MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate, getPetImageHTML } from './utils.js';
import { Router } from './router.js';

/**
 * Renders the pet reminders list page
 */
export async function renderReminders(params) {
  const petId = params.id;
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Care Reminders';

  showLoading(true, "Fetching reminders log...");
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
            <span>${pet.name}</span>
            <span class="pet-status-badge ${pet.is_lost ? 'lost' : 'safe'}">
              ${pet.is_lost ? 'LOST' : 'SAFE'}
            </span>
          </h2>
          <p style="font-size: 0.9rem; color: var(--text-muted);">
            <i class="fa-solid fa-dna"></i> ${pet.breed} &nbsp;|&nbsp;
            <i class="fa-solid fa-scale-balanced"></i> ${pet.weight} kg &nbsp;|&nbsp;
            <i class="fa-solid fa-id-card"></i> ${pet.pawtrace_id}
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
        <a href="#/pet/${pet.id}/reminders" class="tab-link active" id="tab-reminders">Reminders</a>
        <a href="#/pet/${pet.id}/journal" class="tab-link" id="tab-journal">Growth Journal</a>
      </div>

      <div class="grid-cols-3">

        <div class="glass-card" style="grid-column: span 2;">
          <div class="flex-between mb-2">
            <h3 style="font-weight:700;">Active Reminders</h3>
            <button id="btn-add-reminder" class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">
              <i class="fa-solid fa-plus"></i> Add Reminder
            </button>
          </div>

          <div id="active-reminders-list" style="display:flex; flex-direction:column;">
          </div>

          <h3 style="font-weight:700; margin-top:2.5rem; margin-bottom:1rem; opacity:0.8;">Completed Reminders</h3>
          <div id="completed-reminders-list" style="display:flex; flex-direction:column; opacity:0.8;">
          </div>
        </div>

        <div>
          <div class="glass-card" style="position: sticky; top: 90px;">
            <h4 style="font-weight:700; color:var(--teal); margin-bottom:0.5rem;"><i class="fa-solid fa-circle-info"></i> Care Tip</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted); line-height:1.4;">
              Keep your pet's vaccination cycle and medicine intakes up to date. Toggling completed status updates notifications accordingly.
            </p>
          </div>
        </div>

      </div>
    `;

    document.getElementById('btn-add-reminder').onclick = () => showAddReminderModal(petId);

    await loadRemindersList(petId);

  } catch (error) {
    console.error("Reminders view load error:", error);
    viewport.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-exclamation" style="color:var(--accent-red); font-size: 3rem;"></i>
        <h3>Failed to load reminders</h3>
        <p>You may not have permission to view schedules for this companion, or you are offline.</p>
        <a href="#/pet/${petId}" class="btn btn-primary mt-1">Back to Profile</a>
      </div>
    `;
    showToast("Failed to initialize reminders view.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Fetch and render reminders from Supabase
 */
async function loadRemindersList(petId) {
  const activeContainer = document.getElementById('active-reminders-list');
  const completedContainer = document.getElementById('completed-reminders-list');
  if (!activeContainer || !completedContainer) return;

  activeContainer.innerHTML = `<div class="skeleton-container"><div class="skeleton skeleton-text"></div></div>`;
  completedContainer.innerHTML = '';

  try {
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('pet_id', petId)
      .order('reminder_date', { ascending: true });

    if (error) throw error;

    activeContainer.innerHTML = '';
    completedContainer.innerHTML = '';

    if (!reminders || reminders.length === 0) {
      activeContainer.innerHTML = `
        <div class="empty-state-mini">
          <i class="fa-solid fa-bell-slash"></i>
          <p>No reminders configured. Press "Add Reminder" to log one.</p>
        </div>
      `;
      return;
    }

    let hasActive = false;
    let hasCompleted = false;

    reminders.forEach((item) => {
      const dueDateOnly = item.reminder_date ? item.reminder_date.split('T')[0] : '';
      const todayString = new Date().toISOString().split('T')[0];
      const isOverdue = dueDateOnly < todayString && !item.is_completed;

      let icon = 'fa-clock';
      if (item.reminder_type === 'Vaccination') icon = 'fa-syringe';
      if (item.reminder_type === 'Medicine') icon = 'fa-pills';
      if (item.reminder_type === 'Vet Appointment') icon = 'fa-user-doctor';

      const row = document.createElement('div');
      row.className = `glass-card reminder-item ${item.is_completed ? 'completed' : ''}`;
      row.innerHTML = `
        <div class="reminder-left">
          <div class="reminder-checkbox ${item.is_completed ? 'checked' : ''}" data-id="${item.id}" data-status="${item.is_completed}"></div>
          <div class="reminder-info">
            <span class="reminder-title">${item.title}</span>
            <span class="reminder-meta">
              <i class="fa-solid ${icon}" style="color:var(--teal); font-size:0.75rem;"></i> ${item.reminder_type}
              &nbsp;|&nbsp; Due Date: <strong>${formatFriendlyDate(dueDateOnly)}</strong>
              ${item.due_time ? `&bull; Time: <strong>${item.due_time}</strong>` : ''}
            </span>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; align-items:center;">
          ${isOverdue ? `<span class="badge-overdue"><i class="fa-solid fa-circle-exclamation"></i> OVERDUE</span>` : ''}
          <button class="icon-btn btn-delete-reminder" data-id="${item.id}" style="width:28px; height:28px; background:transparent; border:none; color:var(--text-muted);">
            <i class="fa-solid fa-trash" style="font-size:0.8rem;"></i>
          </button>
        </div>
      `;

      if (item.is_completed) {
        completedContainer.appendChild(row);
        hasCompleted = true;
      } else {
        activeContainer.appendChild(row);
        hasActive = true;
      }
    });

    if (!hasActive) {
      activeContainer.innerHTML = `<div class="empty-state-mini"><p>All reminders completed!</p></div>`;
    }
    if (!hasCompleted) {
      completedContainer.innerHTML = `<div class="empty-state-mini"><p>No archived completed reminders.</p></div>`;
    }

    document.querySelectorAll('.reminder-checkbox').forEach(box => {
      box.onclick = async () => {
        const id = box.getAttribute('data-id');
        const status = box.getAttribute('data-status') === 'true';
        await toggleReminderCompleted(petId, id, !status);
      };
    });

    document.querySelectorAll('.btn-delete-reminder').forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute('data-id');
        confirmDeleteReminder(petId, id);
      };
    });

  } catch (error) {
    console.error("Error fetching reminders list:", error);
    showToast("Failed to retrieve reminders details.", "error");
  }
}

/**
 * Mark reminder as complete/incomplete
 */
async function toggleReminderCompleted(petId, reminderId, completedStatus) {
  try {
    const { error } = await supabase
      .from('reminders')
      .update({ is_completed: completedStatus })
      .eq('id', reminderId);
    if (error) throw error;

    showToast(completedStatus ? "Reminder completed!" : "Reminder marked active.", "success");
    loadRemindersList(petId);
  } catch (error) {
    console.error("Error updating reminder completion:", error);
    showToast("Failed to update reminder status.", "error");
  }
}

/**
 * Display modal dialog to add new reminder task
 */
function showAddReminderModal(petId) {
  showModal({
    title: "Add Care Reminder",
    bodyHtml: `
      <form id="reminder-form" style="display:flex; flex-direction:column; gap:1rem;">
        <div class="form-group">
          <label for="rem-type">Type of Reminder *</label>
          <select id="rem-type" class="form-control" required>
            <option value="Vaccination">Vaccination Booster</option>
            <option value="Medicine">Medicine / Pill intake</option>
            <option value="Vet Appointment">Vet Consultation Appointment</option>
            <option value="Other">Other Duty</option>
          </select>
        </div>

        <div class="form-group">
          <label for="rem-title">Title / Action Item *</label>
          <input type="text" id="rem-title" class="form-control" placeholder="Deworming pill / Anti-rabies shot" required>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="rem-date">Due Date *</label>
            <input type="date" id="rem-date" class="form-control" value="${new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="form-group">
            <label for="rem-time">Due Time</label>
            <input type="time" id="rem-time" class="form-control">
          </div>
        </div>
      </form>
    `,
    confirmText: "Configure Reminder",
    onConfirm: async () => {
      const form = document.getElementById('reminder-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const type = document.getElementById('rem-type').value;
      const title = document.getElementById('rem-title').value.trim();
      const dueDate = document.getElementById('rem-date').value;
      const dueTime = document.getElementById('rem-time').value;

      try {
        const { error } = await supabase.from('reminders').insert({
          pet_id: petId,
          reminder_type: type,
          title,
          reminder_date: dueDate,
          due_time: dueTime || null,
          is_completed: false
        });
        if (error) throw error;

        showToast("Reminder created successfully.", "success");
        closeModal();
        loadRemindersList(petId);
        return false;
      } catch (err) {
        console.error("Error creating reminder task:", err);
        showToast("Failed to create reminder.", "error");
        return true;
      }
    }
  });
}

/**
 * Remove reminder task check
 */
function confirmDeleteReminder(petId, reminderId) {
  showModal({
    title: "Delete Reminder?",
    bodyHtml: `<p style="text-align:center; padding: 1rem 0;">Permanently remove this reminder scheduled duty?</p>`,
    confirmText: "Yes, Delete",
    onConfirm: async () => {
      try {
        const { error } = await supabase.from('reminders').delete().eq('id', reminderId);
        if (error) throw error;
        showToast("Reminder deleted.", "info");
        closeModal();
        loadRemindersList(petId);
        return false;
      } catch (err) {
        console.error("Delete reminder failure:", err);
        showToast("Failed to delete reminder.", "error");
        return true;
      }
    }
  });
}
// ==========================================================================
// UNIFIED NOTIFICATION MANAGEMENT SERVICES
// ==========================================================================

import { supabase } from './supabase-config.js';
import { showToast, escapeHTML } from './utils.js';

/**
 * Mark a single notification as read
 */
export async function markNotificationAsRead(uid, notificationId) {
    if (!supabase || !uid || !notificationId) return;

    try {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId)
            .eq('user_id', uid);

        if (error) throw error;
    } catch (err) {
        console.warn("Error marking notification read:", err);
    }
}

/**
 * Clear all notifications for a user
 */
export async function clearAllNotifications(uid) {
    if (!supabase || !uid) return;

    try {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('user_id', uid);

        if (error) throw error;

        showToast("Notifications feed cleared.", "info");
    } catch (error) {
        console.error("Error clearing notifications:", error);
        showToast("Failed to clear notifications feed.", "error");
    }
}

/**
 * Trigger an emergency alert banner at top of dashboard
 */
export function renderEmergencyAlertBanner(
    containerEl,
    petName,
    lastSeenText,
    contactPhone
) {
    if (!containerEl) return;

    // FIX (XSS): petName, lastSeenText, and contactPhone were previously
    // inserted raw. petName in particular is a user-editable field set at
    // pet registration time.
    const safePetName = escapeHTML(petName);
    const safeLastSeen = escapeHTML(lastSeenText || 'Pending scan');
    const safeContactPhone = escapeHTML(contactPhone);

    const div = document.createElement('div');
    div.className = 'alert-banner';

    div.innerHTML = `
        <div style="display:flex; gap:0.75rem; align-items:center;">
            <i class="fa-solid fa-triangle-exclamation fa-beat-fade"
               style="font-size:1.5rem; color:var(--accent-red);"></i>

            <div>
                <strong style="color:var(--accent-red); font-size:0.95rem;">
                    EMERGENCY: ${safePetName} is MISSING!
                </strong>

                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">
                    Last tracked spottings: ${safeLastSeen}.
                    Contact: ${safeContactPhone}
                </p>
            </div>
        </div>

        <button
            class="btn btn-danger btn-alert-dismiss"
            style="padding:0.35rem 0.75rem; font-size:0.7rem;">
            Dismiss
        </button>
    `;

    div.querySelector('.btn-alert-dismiss').onclick = () => {
        div.remove();
    };

    containerEl.prepend(div);
}
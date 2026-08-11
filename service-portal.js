import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, formatFriendlyDate } from './utils.js';

export async function renderServicePortal() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Service Portal';
  const user = getCurrentUser();
  if (!user) return;

  showLoading(true, "Loading provider profile...");
  try {
    const { data: provider } = await supabase.from('service_providers').select('*').eq('user_id', user.uid).single();

    if (!provider) {
      viewport.innerHTML = `<div class="empty-state"><i class="fa-solid fa-lock"></i><h3>No Service Provider Profile Found</h3><p>Contact support to register as a provider.</p></div>`;
      return;
    }

    viewport.innerHTML = `
      <div style="margin-bottom:1.5rem;">
        <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.6rem;">Service Provider Dashboard</h2>
        <p style="color:var(--text-muted); font-size:0.9rem;">Status: <strong style="color:${provider.status === 'approved' ? 'var(--accent-green)' : 'var(--accent-yellow)'};">${provider.status.toUpperCase()}</strong></p>
      </div>
      <div class="dashboard-grid">
        <div>
          <h3 style="font-weight:700; margin-bottom:1rem;">Booking Requests</h3>
          <div id="svc-bookings-list" style="display:flex; flex-direction:column; gap:0.75rem;"><div class="skeleton skeleton-text"></div></div>
        </div>
        <div>
          <div class="glass-card">
            <h4 style="font-weight:700; margin-bottom:0.75rem;">Update Profile</h4>
            <form id="svc-profile-form" style="display:flex; flex-direction:column; gap:0.6rem;">
              <select id="svc-p-type" class="form-control" style="font-size:0.8rem;">
                <option value="walker" ${provider.provider_type==='walker'?'selected':''}>Dog Walker</option>
                <option value="pet_sitter" ${provider.provider_type==='pet_sitter'?'selected':''}>Pet Sitter</option>
                <option value="cab_driver" ${provider.provider_type==='cab_driver'?'selected':''}>Pet Taxi Driver</option>
                <option value="groomer" ${provider.provider_type==='groomer'?'selected':''}>Groomer</option>
                <option value="boarding" ${provider.provider_type==='boarding'?'selected':''}>Boarding / Kennel</option>
              </select>
              <input type="text" id="svc-p-phone" class="form-control" placeholder="Phone" value="${provider.phone || ''}" style="font-size:0.8rem;">
              <input type="text" id="svc-p-location" class="form-control" placeholder="Service Area" value="${provider.location || ''}" style="font-size:0.8rem;">
              <input type="number" id="svc-p-rate" class="form-control" placeholder="Rate/hr" value="${provider.rate || 0}" style="font-size:0.8rem;">
              <button type="submit" class="btn btn-primary" style="font-size:0.8rem;">Save Profile</button>
            </form>
          </div>
        </div>
      </div>
    `;

    document.getElementById('svc-profile-form').onsubmit = async (e) => {
      e.preventDefault();
      showLoading(true, "Saving profile...");
      try {
        await supabase.from('service_providers').update({
          provider_type: document.getElementById('svc-p-type').value,
          phone: document.getElementById('svc-p-phone').value.trim(),
          location: document.getElementById('svc-p-location').value.trim(),
          rate: parseFloat(document.getElementById('svc-p-rate').value) || 0
        }).eq('user_id', user.uid);
        showToast("Profile updated.", "success");
      } catch (err) { showToast("Failed to update.", "error"); }
      finally { showLoading(false); }
    };

    await loadBookings(user.uid);

  } catch (err) {
    console.error(err);
    viewport.innerHTML = `<div class="empty-state"><p>Failed to load service portal.</p></div>`;
  } finally {
    showLoading(false);
  }
}

async function loadBookings(providerId) {
  const container = document.getElementById('svc-bookings-list');
  const { data: bookings } = await supabase.from('service_bookings').select('*, users!service_bookings_owner_id_fkey(display_name), pets(name)').eq('provider_id', providerId).order('created_at', { ascending: false });

  if (!bookings || bookings.length === 0) { container.innerHTML = '<div class="empty-state-mini"><p>No bookings yet.</p></div>'; return; }

  container.innerHTML = bookings.map(b => {
    let actions = '';
    if (b.status === 'pending') {
      actions = `<div style="display:flex; gap:0.5rem; margin-top:0.5rem;"><button class="btn btn-primary btn-accept-svc" data-id="${b.id}" style="font-size:0.7rem;">Accept</button><button class="btn btn-danger btn-reject-svc" data-id="${b.id}" style="font-size:0.7rem;">Reject</button></div>`;
    } else if (b.status === 'accepted') {
      actions = `<button class="btn btn-secondary btn-complete-svc" data-id="${b.id}" style="font-size:0.7rem; margin-top:0.5rem;">Mark Completed</button>`;
    }
    return `
      <div class="glass-card" style="padding:0.85rem;">
        <div class="flex-between"><strong>${b.pets?.name || 'Pet'}</strong><span style="text-transform:capitalize; font-size:0.7rem; color:${b.status==='accepted'?'var(--accent-green)':b.status==='rejected'?'var(--accent-red)':'var(--accent-yellow)'};">${b.status}</span></div>
        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">Owner: ${b.users?.display_name} &bull; ${formatFriendlyDate(b.booking_date)} at ${b.booking_time}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${b.notes || ''}</div>
        ${actions}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.btn-accept-svc, .btn-reject-svc, .btn-complete-svc').forEach(btn => {
    btn.onclick = async () => {
      const status = btn.classList.contains('btn-accept-svc') ? 'accepted' : btn.classList.contains('btn-reject-svc') ? 'rejected' : 'completed';
      showLoading(true, "Updating booking...");
      try {
        const { data: booking } = await supabase.from('service_bookings').update({ status }).eq('id', btn.getAttribute('data-id')).select('*').single();
        await supabase.from('notifications').insert({ user_id: booking.owner_id, type: 'STATUS_CHANGE', message: `Your service booking status is now: ${status.toUpperCase()}.`, is_read: false });
        showToast(`Booking ${status}.`, "success");
        loadBookings(providerId);
      } catch (err) { showToast("Failed to update booking.", "error"); }
      finally { showLoading(false); }
    };
  });
}
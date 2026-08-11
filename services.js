import { supabase } from './supabase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate } from './utils.js';

export async function renderServices() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Browse Services';
  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div style="margin-bottom:1.5rem;">
      <h2 style="font-family:'Outfit'; font-weight:700; font-size:1.6rem;">Independent Service Providers</h2>
      <p style="color:var(--text-muted); font-size:0.9rem;">Book walkers, sitters, groomers, and pet taxis near you.</p>
    </div>
    <div class="glass-card mb-2" style="padding:1rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
      <select id="svc-filter-type" class="form-control" style="max-width:200px;">
        <option value="ALL">All Categories</option>
        <option value="walker">Dog Walker</option>
        <option value="pet_sitter">Pet Sitter</option>
        <option value="cab_driver">Pet Taxi Driver</option>
        <option value="groomer">Groomer</option>
        <option value="boarding">Boarding / Kennel</option>
      </select>
      <input type="text" id="svc-search" class="form-control" placeholder="Search location..." style="flex:1; min-width:150px;">
    </div>
    <div id="services-grid" class="pets-grid"><div class="skeleton skeleton-card"></div></div>
  `;

  let allProviders = [];

  const load = async () => {
    const { data: providers, error } = await supabase.from('service_providers').select('*, users!service_providers_user_id_fkey(display_name, email)').eq('status', 'approved');
    if (error) { document.getElementById('services-grid').innerHTML = '<p>Failed to load providers.</p>'; return; }
    allProviders = providers || [];
    renderGrid(allProviders);
  };

  const renderGrid = (list) => {
    const grid = document.getElementById('services-grid');
    if (list.length === 0) { grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="fa-solid fa-handshake-angle"></i><h3>No providers found</h3></div>`; return; }
    grid.innerHTML = '';
    list.forEach(p => {
      const providerName = p.users?.display_name || 'Provider';
      const card = document.createElement('div');
      card.className = 'glass-card pet-card';
      card.innerHTML = `
        <div class="pet-card-content" style="padding:1.25rem;">
          <h4 style="font-family:'Outfit'; font-weight:700;">${providerName}</h4>
          <span style="font-size:0.7rem; text-transform:uppercase; font-weight:600; color:var(--teal);">${(p.provider_type || '').replace('_', ' ')}</span>
          <div style="font-size:0.8rem; color:var(--text-muted); margin:0.5rem 0; line-height:1.4;">
            <div><i class="fa-solid fa-location-dot"></i> ${p.location || 'N/A'}</div>
            <div><i class="fa-solid fa-indian-rupee-sign"></i> ${p.rate}/hr</div>
          </div>
          <button class="btn btn-primary btn-full btn-book-provider" data-id="${p.user_id}" data-name="${providerName}" data-type="${p.provider_type}" style="font-size:0.8rem;">Book Now</button>
        </div>
      `;
      grid.appendChild(card);
    });
    grid.querySelectorAll('.btn-book-provider').forEach(btn => {
      btn.onclick = () => showBookingModal(btn.getAttribute('data-id'), btn.getAttribute('data-name'), btn.getAttribute('data-type'), user);
    });
  };

  document.getElementById('svc-filter-type').onchange = (e) => {
    const type = e.target.value;
    renderGrid(type === 'ALL' ? allProviders : allProviders.filter(p => p.provider_type === type));
  };
  document.getElementById('svc-search').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    renderGrid(allProviders.filter(p => (p.location || '').toLowerCase().includes(q)));
  };

  await load();
  await loadMyBookings(user, viewport);
}

async function loadMyBookings(user, viewport) {
  const { data: pets } = await supabase.from('pets').select('id, name').eq('owner_id', user.uid);
  const box = document.createElement('div');
  box.className = 'glass-card';
  box.style.marginTop = '1.5rem';
  box.innerHTML = `<h3 style="font-weight:700; margin-bottom:0.75rem;">My Service Bookings</h3><div id="my-svc-bookings"></div>`;
  viewport.appendChild(box);

  const { data: bookings } = await supabase.from('service_bookings').select('*, users!service_bookings_provider_id_fkey(display_name)').eq('owner_id', user.uid).order('created_at', { ascending: false });
  const container = document.getElementById('my-svc-bookings');
  if (!bookings || bookings.length === 0) { container.innerHTML = '<p style="font-size:0.8rem; color:var(--text-muted);">No bookings yet.</p>'; return; }

  const petMap = {}; (pets || []).forEach(p => petMap[p.id] = p.name);

  container.innerHTML = bookings.map(b => `
    <div style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--border-glass); font-size:0.8rem;">
      <span>${b.users?.display_name || 'Provider'} — ${petMap[b.pet_id] || 'Pet'} on ${formatFriendlyDate(b.booking_date)}</span>
      <strong style="text-transform:capitalize; color:${b.status==='accepted'?'var(--accent-green)':b.status==='rejected'?'var(--accent-red)':'var(--accent-yellow)'};">${b.status}</strong>
    </div>
  `).join('');
}

function showBookingModal(providerId, providerName, providerType, user) {
  showModal({
    title: `Book ${providerName}`,
    bodyHtml: `
      <form id="svc-booking-form" style="display:flex; flex-direction:column; gap:0.85rem;">
        <div class="form-group"><label>Select Pet *</label><select id="svc-pet" class="form-control" required></select></div>
        <div class="form-row">
          <div class="form-group"><label>Date *</label><input type="date" id="svc-date" class="form-control" required></div>
          <div class="form-group"><label>Time *</label><input type="time" id="svc-time" class="form-control" required></div>
        </div>
        <div class="form-group"><label>Notes</label><textarea id="svc-notes" class="form-control" rows="2"></textarea></div>
      </form>
    `,
    confirmText: "Book Service",
    onConfirm: async () => {
      const form = document.getElementById('svc-booking-form');
      if (!form.checkValidity()) { form.reportValidity(); return true; }
      showLoading(true, "Booking service...");
      try {
        const petId = document.getElementById('svc-pet').value;
        const { data: pet } = await supabase.from('pets').select('name').eq('id', petId).single();
        await supabase.from('service_bookings').insert({
          owner_id: user.uid, provider_id: providerId, pet_id: petId, service_type: providerType,
          booking_date: document.getElementById('svc-date').value,
          booking_time: document.getElementById('svc-time').value,
          notes: document.getElementById('svc-notes').value.trim(),
          status: 'pending'
        });
        await supabase.from('notifications').insert({ user_id: providerId, type: 'STATUS_CHANGE', message: `New service booking request from ${user.displayName} for ${pet?.name || 'a pet'}.`, is_read: false });
        showToast("Service booked successfully!", "success");
        closeModal();
        return false;
      } catch (err) { showToast("Failed to book service.", "error"); return true; }
      finally { showLoading(false); }
    }
  });

  supabase.from('pets').select('id, name').eq('owner_id', user.uid).then(({ data }) => {
    const sel = document.getElementById('svc-pet');
    if (sel) sel.innerHTML = (data || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('') || '<option value="">Register a pet first</option>';
  });
}
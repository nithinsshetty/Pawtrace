// ==========================================================================
// PAWTRACE SMART TAG ORDER SYSTEM MODULE
// ==========================================================================

import { db, fb } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, showModal, closeModal, formatFriendlyDate } from './utils.js';
import { Router } from './router.js';

/**
 * Show Modal Form to purchase and order a Smart Tag Pendant
 */
export function showOrderModal(petId, petName) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please sign in to order a smart tag.", "warning");
    return;
  }

  showModal({
    title: `Order Smart Tag for ${petName}`,
    bodyHtml: `
      <div style="text-align:center; margin-bottom:1.5rem;">
        <i class="fa-solid fa-qrcode" style="font-size:3rem; color:var(--terracotta); margin-bottom:0.5rem; display:block;"></i>
        <h4 style="font-weight:800; font-family:'Outfit'; font-size:1.1rem;">Ecosystem Smart Pendant Tag</h4>
        <p style="font-size:0.8rem; color:var(--text-muted); padding:0 1rem; line-height:1.4; margin-top:0.25rem;">
          Secure your pet with a physical QR collar attachment tag linked directly to this account profile.
        </p>
        <div style="background:rgba(var(--terracotta-rgb), 0.05); border:1px solid rgba(var(--terracotta-rgb), 0.15); border-radius:var(--radius-sm); padding:0.5rem 1rem; display:inline-block; margin-top:0.75rem;">
          <strong style="color:var(--terracotta); font-size:1.1rem;">Price: ₹299 <span style="font-size:0.7rem; font-weight:500; color:var(--text-muted);">one-time</span></strong>
        </div>
      </div>

      <form id="order-tag-form" style="display:flex; flex-direction:column; gap:0.75rem;">
        <div class="form-group">
          <label for="order-phone">Emergency Phone Number *</label>
          <input type="tel" id="order-phone" class="form-control" placeholder="+91 98765 43210" required>
        </div>
        
        <div class="form-group">
          <label for="order-address">Shipping Delivery Address *</label>
          <textarea id="order-address" class="form-control" rows="3" placeholder="No. 12, Park View Residency, Sector 3, HSR Layout, Bengaluru, KA - 560102" required></textarea>
        </div>
        
        <p style="font-size:0.65rem; color:var(--text-muted); line-height:1.3; text-align:center;">
          * Fulfilling simulated orders requires clicking deliver and activate keys inside the Admin portal.
        </p>
      </form>
    `,
    confirmText: "Place Order (₹299)",
    onConfirm: async () => {
      const form = document.getElementById('order-tag-form');
      if (!form.checkValidity()) {
        form.reportValidity();
        return true;
      }

      const phone = document.getElementById('order-phone').value.trim();
      const address = document.getElementById('order-address').value.trim();

      showLoading(true, "Processing tag order...");
      try {
        // Create order document
        const orderRef = await db.collection('orders').add({
          petId: petId,
          petName: petName,
          ownerId: user.uid,
          ownerName: user.displayName || user.email.split('@')[0],
          ownerEmail: user.email,
          ownerPhone: phone,
          address: address,
          status: 'Pending',
          qrActivated: false,
          amount: 299,
          createdAt: fb.firestore.FieldValue.serverTimestamp()
        });

        // Update pet with pending tag status
        await db.collection('pets').doc(petId).update({
          hasTag: false,
          tagOrderId: orderRef.id
        });

        // Log notification to owner
        await db.collection('users').doc(user.uid).collection('notifications').add({
          type: 'STATUS_CHANGE',
          petId: petId,
          message: `Your smart tag order for ${petName} was successfully placed! View status under orders.`,
          timestamp: fb.firestore.FieldValue.serverTimestamp(),
          read: false
        });

        showToast("Smart Tag order placed successfully!", "success");
        closeModal();
        Router.navigate('/orders');
        return false;
      } catch (err) {
        console.error("Order error:", err);
        showToast("Failed to place order.", "error");
        return true;
      } finally {
        showLoading(false);
      }
    }
  });
}

/**
 * Render Customer Orders Page: #/orders
 */
export async function renderOrders() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'My Tag Orders';

  const user = getCurrentUser();
  if (!user) return;

  viewport.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700;">Order History</h2>
      <p style="color: var(--text-muted); font-size: 0.9rem;">
        Track collar pendant tags shipping progress and activation states.
      </p>
    </div>

    <div id="orders-timeline-list" style="display:flex; flex-direction:column; gap:2rem;">
      <div class="skeleton skeleton-card" style="height:150px;"></div>
    </div>
  `;

  const container = document.getElementById('orders-timeline-list');
  showLoading(true, "Fetching your orders...");
  
  try {
    // NOTE: Querying orders filtered by ownerId without orderBy. Sorting is handled client-side
    // to bypass the requirement for a composite index in Firestore.
    const snapshot = await db.collection('orders')
      .where('ownerId', '==', user.uid)
      .get();
      
    container.innerHTML = '';

    const orders = [];
    snapshot.forEach(doc => {
      const order = doc.data();
      order.id = doc.id;
      orders.push(order);
    });

    // Client-side sorting by createdAt desc
    orders.sort((a, b) => {
      const timeA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : (a.createdAt.seconds ? a.createdAt.seconds * 1000 : 0)) : 0;
      const timeB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : (b.createdAt.seconds ? b.createdAt.seconds * 1000 : 0)) : 0;
      return timeB - timeA;
    });

    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state glass-card" style="text-align:center; padding:3rem 1.5rem; max-width: 600px; margin: 0 auto; border-radius: var(--radius-md);">
          <span style="font-size:3.5rem; display:block; margin-bottom:1rem;">📦</span>
          <h3 style="font-family:'Outfit'; font-weight:800; font-size:1.4rem; color:var(--text-main); margin-bottom:0.75rem;">
            No smart tag orders found yet
          </h3>
          <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.5; margin-bottom:1.5rem;">
            Secure your companion with a physical PawTrace QR collar pendant. Finders can instantly scan to report geolocations, view critical medical notes, and call emergency contact numbers.
          </p>
          <div style="background:rgba(31, 122, 140, 0.05); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding:1rem; display:inline-block; margin-bottom:1.5rem; text-align:left; width: 100%; max-width: 400px; margin-left: auto; margin-right: auto;">
            <div style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.4rem; display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-circle-check" style="color:var(--accent-green);"></i> One-time tag price: <strong>₹299</strong>
            </div>
            <div style="font-size:0.85rem; color:var(--text-main); display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-circle-check" style="color:var(--accent-green);"></i> Free shipping & lifetime registry updates
            </div>
          </div>
          <br>
          <a href="#/pets" class="btn btn-primary" style="background:var(--terracotta); border:none; padding:0.6rem 1.5rem; display:inline-flex; align-items:center; gap:0.5rem; font-size:0.9rem;">
            <i class="fa-solid fa-tags"></i> Order Smart Tag
          </a>
        </div>
      `;
      return;
    }

    orders.forEach(doc => {
      const order = doc;

      // Map progress state
      const steps = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Activated'];
      const activeIndex = steps.indexOf(order.status);

      let stepCardsHtml = '';
      steps.forEach((step, index) => {
        let isPast = index < activeIndex;
        let isActive = index === activeIndex;
        let stateClass = isPast ? 'past' : (isActive ? 'active' : 'upcoming');
        
        let icon = 'fa-circle-dot';
        if (step === 'Pending') icon = 'fa-cart-shopping';
        else if (step === 'Confirmed') icon = 'fa-circle-check';
        else if (step === 'Shipped') icon = 'fa-truck-fast';
        else if (step === 'Delivered') icon = 'fa-box-open';
        else if (step === 'Activated') icon = 'fa-qrcode';

        stepCardsHtml += `
          <div class="order-step-node ${stateClass}">
            <div class="order-step-circle">
              <i class="fa-solid ${icon}"></i>
            </div>
            <span class="order-step-label">${step}</span>
          </div>
        `;
      });

      const orderCard = document.createElement('div');
      orderCard.className = 'glass-card magnetic-card';
      orderCard.style.padding = '1.5rem';
      orderCard.innerHTML = `
        <div class="flex-between" style="align-items:flex-start; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600;">ORDER REFERENCE</span>
            <strong style="font-family:monospace; font-size:0.9rem;">${order.id}</strong>
          </div>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-align:right;">ORDERED FOR</span>
            <strong style="font-size:0.9rem; text-align:right; display:block;">${order.petName}</strong>
          </div>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; text-align:right;">PLACED AT</span>
            <strong style="font-size:0.9rem; text-align:right; display:block;">${formatFriendlyDate(order.createdAt)}</strong>
          </div>
        </div>

        <!-- 5 Stage Progress Timeline -->
        <div class="order-timeline-indicator">
          <div class="order-timeline-line">
            <div class="order-timeline-progress" style="width: ${(activeIndex / 4) * 100}%;"></div>
          </div>
          <div class="order-timeline-nodes">
            ${stepCardsHtml}
          </div>
        </div>

        ${order.status === 'Activated' ? `
          <div class="geo-panel mt-2" style="background:rgba(82, 183, 136, 0.08); border-color:var(--accent-green); text-align:center; padding:0.75rem;">
            <strong style="color:var(--accent-green);"><i class="fa-solid fa-circle-check"></i> QR Code Active & Scannable!</strong>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
              The smart recovery tag pendant has been fully linked to ${order.petName}'s profile. Go to <a href="#/pet/${order.petId}" style="color:var(--teal); font-weight:600;">Pet Profile</a> to download your code.
            </p>
          </div>
        ` : (order.status === 'Delivered' ? `
          <div class="geo-panel mt-2" style="background:rgba(224, 159, 62, 0.08); border-color:#e09f3e; text-align:center; padding:0.75rem;">
            <strong style="color:#e09f3e;"><i class="fa-solid fa-clock"></i> Pendant Delivered — Awaiting Activation</strong>
            <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.25rem;">
              Your smart pendant has arrived. Our admins will configure and activate the QR code linkage shortly.
            </p>
          </div>
        ` : `
          <div class="geo-panel mt-2" style="text-align:center; padding:0.75rem;">
            <p style="font-size:0.75rem; color:var(--text-muted); margin:0;">
              Shipping pendant tag to: <strong>${order.address}</strong>
            </p>
          </div>
        `)}
      `;

      container.appendChild(orderCard);
    });

  } catch (error) {
    console.error('Orders page failed:', error);
    if (error.code === 'permission-denied' || error.message?.includes('permission') || error.message?.includes('Missing or insufficient permissions')) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-circle-exclamation" style="font-size:3rem; color:var(--accent-red);"></i>
          <h3>Access Denied</h3>
          <p>Failed to sync order history list due to insufficient permissions. (Query: orders collection)</p>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-circle-exclamation" style="font-size:3rem; color:var(--accent-red);"></i>
          <h3>Sync Failed</h3>
          <p>Failed to sync order history list. Please verify database indexes. (Details: ${error.message || error})</p>
        </div>
      `;
    }
  } finally {
    showLoading(false);
  }
}

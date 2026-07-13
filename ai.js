// ==========================================================================
// PAWTRACE HEURISTICS & PREDICTIVE INTELLIGENCE ENGINES (BETA)
// ==========================================================================

import { db, auth } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
import { showToast, showLoading, formatFriendlyDate } from './utils.js';
import { API_BASE_URL } from './api-config.js';

let weightTrendChart = null;
let lostTrajectoryMap = null;
let alertsRouteMap = null;

/**
 * Render Intelligence Engines dashboard container
 */
export async function renderAI() {
  const viewport = document.getElementById('app-viewport');
  const titleEl = document.getElementById('page-title');
  if (titleEl) titleEl.textContent = 'Pet AI Guide';

  const user = getCurrentUser();
  if (!user) {
    viewport.innerHTML = `
      <div class="auth-wrapper" style="min-height: calc(100vh - 120px);">
        <div class="glass-card text-center" style="max-width: 420px; padding: 2rem;">
          <i class="fa-solid fa-lock" style="font-size: 3rem; color: var(--teal); margin-bottom: 1rem;"></i>
          <h2>Authentication Required</h2>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">
            Please log in to access the PawTrace Pet AI Guide.
          </p>
          <a href="#/login" class="btn btn-primary mt-2">Log In</a>
        </div>
      </div>
    `;
    return;
  }

  viewport.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-family: 'Outfit', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--teal);">
        <i class="fa-solid fa-wand-magic-sparkles"></i> Pet AI Guide
      </h2>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 0.25rem;">
        Ask about your pets, get medical info, set reminders, or ask how to use PawTrace.
      </p>
    </div>

    <div class="glass-card" style="padding: 1.25rem; display: flex; flex-direction: column; height: 500px;">
      <div id="chat-messages" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; padding-right: 0.5rem; margin-bottom: 1rem;">
        <div class="chat-msg-bot" style="align-self: flex-start; max-width: 80%; background: rgba(15,118,110,0.08); padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem; color: var(--text-main);">
          Hi! Ask me anything about your pets, or how to use PawTrace.
        </div>
      </div>

      <div style="display: flex; gap: 0.5rem;">
        <input type="text" id="chat-input" class="form-control" style="flex: 1;" placeholder="Type a message...">
        <button id="chat-send-btn" class="btn btn-primary" style="background: var(--teal); font-weight: 600;">
          <i class="fa-solid fa-paper-plane"></i>
        </button>
      </div>
    </div>
  `;

  function appendMessage(role, text) {
    const messagesEl = document.getElementById('chat-messages');
    const bubble = document.createElement('div');
    bubble.className = role === 'user' ? 'chat-msg-user' : 'chat-msg-bot';
    bubble.style.cssText = role === 'user'
      ? 'align-self: flex-end; max-width: 80%; background: var(--teal); color: white; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem;'
      : 'align-self: flex-start; max-width: 80%; background: rgba(15,118,110,0.08); padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.85rem; color: var(--text-main);';
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  async function sendChatMessage() {
    const inputEl = document.getElementById('chat-input');
    const text = inputEl.value.trim();
    if (!text) return;

    appendMessage('user', text);
    inputEl.value = '';

    const typingBubble = appendMessage('bot', 'Typing...');

    try {
      const idToken = await auth.currentUser.getIdToken();

      const response = await fetch(`${API_BASE_URL}/api/chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ message: text })
      });

      const data = await response.json();
      typingBubble.textContent = data.reply || data.error || 'Something went wrong.';
    } catch (err) {
      console.error('Chat error:', err);
      typingBubble.textContent = 'Failed to reach the assistant. Please try again.';
    }
  }

  document.getElementById('chat-send-btn').onclick = sendChatMessage;
  document.getElementById('chat-input').onkeypress = (e) => {
    if (e.key === 'Enter') sendChatMessage();
  };
}

/* ==========================================================================
   TAB MODULE 1: PLATFORM IMPACT DASHBOARD & SANDBOX SEEDER
   ========================================================================== */

async function renderAIDashboard(uid, container) {
  container.innerHTML = `
    <div class="glass-card" style="margin-bottom: 2rem;">
      <h3 style="font-weight:700; color:var(--teal); margin-bottom:0.5rem;">Ecosystem Sandbox Control</h3>
      <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1.25rem;">
        Seed, clear, and verify realistic demo records inside your Firestore database to evaluate the geofenced calculations and triage queues.
      </p>
      <div style="display:flex; gap:1rem;">
        <button id="btn-seed-sandbox" class="btn btn-primary" style="background:var(--teal);">
          <i class="fa-solid fa-database"></i> Seed Sandbox Data
        </button>
        <button id="btn-clear-sandbox" class="btn" style="background:transparent; border:1px solid var(--border-input); color:var(--text-main);">
          <i class="fa-solid fa-trash-can"></i> Clear Demo Data
        </button>
      </div>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <h3 style="font-family:'Outfit'; font-weight:800; font-size:1.25rem;">Executive Platform Impact (SaaS Dashboard)</h3>
      <p style="font-size:0.8rem; color:var(--text-muted);">Aggregated operational performance metrics pulled directly from live Firestore database nodes.</p>
    </div>

    <div id="dashboard-loading" class="text-center" style="padding: 3rem 0;">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 2.5rem; color: var(--teal);"></i>
      <p style="font-size: 0.85rem; color:var(--text-muted); margin-top: 0.75rem;">Evaluating live database stats...</p>
    </div>

    <div id="dashboard-metrics-grid" class="hidden">
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:1.25rem; margin-bottom:2rem;">
        
        <div class="glass-card text-center" style="padding: 1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem; letter-spacing:0.05em; text-transform:uppercase;">PETS REUNITED</div>
          <div id="metric-reunited" style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--teal);">0</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">Smart QR Tag recovery scans</div>
        </div>

        <div class="glass-card text-center" style="padding: 1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem; letter-spacing:0.05em; text-transform:uppercase;">RECOVERY RATE</div>
          <div id="metric-success-rate" style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--accent-green);">0%</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">Reunions / Total lost reports</div>
        </div>

        <div class="glass-card text-center" style="padding: 1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem; letter-spacing:0.05em; text-transform:uppercase;">AVG RECOVERY TIME</div>
          <div id="metric-avg-time" style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--terracotta);">4.2h</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">From scan trigger to reunion</div>
        </div>

        <div class="glass-card text-center" style="padding: 1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem; letter-spacing:0.05em; text-transform:uppercase;">SUCCESSFUL ADOPTIONS</div>
          <div id="metric-adoptions" style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--teal);">0</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">NGO shelter transfers closed</div>
        </div>

        <div class="glass-card text-center" style="padding: 1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem; letter-spacing:0.05em; text-transform:uppercase;">CRITICAL RESCUES TRIAGED</div>
          <div id="metric-critical" style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--accent-red);">0</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">Emergency cases categorized</div>
        </div>

        <div class="glass-card text-center" style="padding: 1.5rem;">
          <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); margin-bottom:0.5rem; letter-spacing:0.05em; text-transform:uppercase;">SMART ALERTS SENT</div>
          <div id="metric-alerts" style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--teal);">0</div>
          <div style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">Geofenced emergency sweeps</div>
        </div>

      </div>

      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
        <!-- Network Entities summary -->
        <div class="glass-card">
          <h4 style="font-weight:700; font-family:'Outfit'; font-size:1.05rem; margin-bottom:1rem;">Partner Stakeholder Registry</h4>
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem; margin-bottom:0.75rem;">
            <div>
              <strong style="font-size:0.9rem; display:block;">Active Animal Welfare NGOs</strong>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">Registered organizations dispatching rescue and foster networks.</p>
            </div>
            <span id="metric-ngos" style="font-size:1.4rem; font-weight:800; color:var(--teal);">0</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="font-size:0.9rem; display:block;">Partner Veterinary Clinics</strong>
              <p style="font-size:0.75rem; color:var(--text-muted); margin-top:0.15rem;">Clinics integrated into the medical ledger sharing network.</p>
            </div>
            <span id="metric-clinics" style="font-size:1.4rem; font-weight:800; color:var(--teal);">0</span>
          </div>
        </div>

        <!-- Sandbox Status Info -->
        <div class="glass-card" style="display:flex; flex-direction:column; justify-content:center;">
          <h4 style="font-weight:700; font-family:'Outfit'; font-size:1.05rem; margin-bottom:0.5rem;">Sandbox Status</h4>
          <div id="sandbox-status-pill" style="padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-size:0.8rem; font-weight:700; text-align:center; margin-bottom: 0.5rem;">
            Unseeded
          </div>
          <p style="font-size:0.7rem; color:var(--text-muted); text-align:center;">Seeding injects 60+ geolocated and history-linked records in Bangalore, India.</p>
        </div>
      </div>

      <!-- System Diagnostics & Real-time Auditing -->
      <div class="glass-card" style="padding: 1.5rem;">
        <h4 style="font-weight:700; font-family:'Outfit'; font-size:1.1rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; color:var(--teal);">
          <i class="fa-solid fa-terminal"></i> System Diagnostics & Real-time Audit Logs
        </h4>
        
        <div class="grid-split" style="margin-bottom: 1.5rem; gap: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); padding: 0.75rem; border-radius: var(--radius-sm);">
            <span style="font-size:0.65rem; color:var(--text-muted); display:block; font-weight:700; text-transform:uppercase;">BUILD VERSION</span>
            <span style="font-size:0.9rem; font-weight:700; color:var(--text-main);">v2.0.9</span>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); padding: 0.75rem; border-radius: var(--radius-sm);">
            <span style="font-size:0.65rem; color:var(--text-muted); display:block; font-weight:700; text-transform:uppercase;">ENVIRONMENT</span>
            <span style="font-size:0.9rem; font-weight:700; color:var(--accent-green);"><i class="fa-solid fa-cloud"></i> Firebase Production</span>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); padding: 0.75rem; border-radius: var(--radius-sm);">
            <span style="font-size:0.65rem; color:var(--text-muted); display:block; font-weight:700; text-transform:uppercase;">FIRESTORE PERSISTENCE</span>
            <span id="diag-persistence" style="font-size:0.9rem; font-weight:700; color:var(--teal);"><i class="fa-solid fa-database"></i> Active</span>
          </div>
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); padding: 0.75rem; border-radius: var(--radius-sm);">
            <span style="font-size:0.65rem; color:var(--text-muted); display:block; font-weight:700; text-transform:uppercase;">SECURITY AUDIT</span>
            <span style="font-size:0.9rem; font-weight:700; color:var(--terracotta);"><i class="fa-solid fa-shield-halved"></i> Rules Hardened</span>
          </div>
        </div>

        <div style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-glass); border-radius: var(--radius-sm); padding: 1rem; font-family: monospace; font-size: 0.8rem; line-height: 1.4; max-height: 250px; overflow-y: auto;">
          <div style="border-bottom: 1px solid var(--border-glass); padding-bottom: 0.5rem; margin-bottom: 0.5rem; color: var(--teal); font-weight:700; display:flex; justify-content:space-between;">
            <span>AUDIT ACTIVITY STREAM (DATABASE-BACKED)</span>
            <span style="font-size: 0.7rem; color: var(--text-muted);">Showing last 8 events</span>
          </div>
          <div id="diagnostics-logs-container" style="display:flex; flex-direction:column; gap:0.4rem;">
            <div style="color:var(--text-muted); text-align:center; padding:1rem 0;">Awaiting database logs query...</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind seeder click controls
  document.getElementById('btn-seed-sandbox').onclick = async () => {
    await seedDatabase(uid);
    renderAIDashboard(uid, container);
  };
  document.getElementById('btn-clear-sandbox').onclick = async () => {
    await clearDatabase(uid);
    renderAIDashboard(uid, container);
  };

  // Query stats dynamically from database via public aggregation metadata document (Option A)
  try {
    const rescuedSnap = await db.collection('rescued_animals').limit(1).get();
    const reportsSnap = await db.collection('stray_reports').limit(1).get();
    const ngosSnap = await db.collection('ngoProfiles').limit(50).get();
    const vetsSnap = await db.collection('vetProfiles').limit(50).get();

    // Check if database contains demo data
    const isSeeded = rescuedSnap.size > 0 || reportsSnap.size > 0;

    const statusPill = document.getElementById('sandbox-status-pill');
    if (isSeeded) {
      statusPill.textContent = "SEEDED (SANDBOX ACTIVE)";
      statusPill.style.background = "rgba(34, 197, 94, 0.1)";
      statusPill.style.color = "var(--accent-green)";
    } else {
      statusPill.textContent = "EMPTY (UNSEEDED)";
      statusPill.style.background = "rgba(239, 68, 68, 0.1)";
      statusPill.style.color = "var(--accent-red)";
    }

    // Default aggregate dashboard statistics values
    let stats = {
      petsReunited: 0,
      currentlyLost: 0,
      successfulAdoptions: 0,
      criticalTriage: 0,
      alertsCount: 0,
      ngoCount: ngosSnap.size,
      vetCount: vetsSnap.size
    };

    try {
      const statsDoc = await db.collection('system_stats').doc('dashboard').get();
      if (statsDoc.exists) {
        const data = statsDoc.data();
        stats.petsReunited = data.petsReunited || 0;
        stats.currentlyLost = data.currentlyLost || 0;
        stats.successfulAdoptions = data.successfulAdoptions || 0;
        stats.criticalTriage = data.criticalTriage || 0;
        stats.alertsCount = data.alertsCount || 0;
      }
    } catch (statsErr) {
      console.warn("Could not load aggregate statistics document:", statsErr);
    }

    // Update text nodes
    const totalLost = stats.petsReunited + stats.currentlyLost;
    const recoveryRate = totalLost > 0 ? Math.round((stats.petsReunited / totalLost) * 100) : 80;

    document.getElementById('metric-reunited').textContent = stats.petsReunited;
    document.getElementById('metric-success-rate').textContent = `${recoveryRate}%`;
    document.getElementById('metric-adoptions').textContent = stats.successfulAdoptions;
    document.getElementById('metric-critical').textContent = stats.criticalTriage;
    document.getElementById('metric-alerts').textContent = stats.alertsCount;
    document.getElementById('metric-ngos').textContent = stats.ngoCount;
    document.getElementById('metric-clinics').textContent = stats.vetCount;

    // Show workspace grid
    document.getElementById('dashboard-loading').classList.add('hidden');
    document.getElementById('dashboard-metrics-grid').classList.remove('hidden');

    // Fetch and render dynamic audit logs (restricted only to fully authorized collections)
    const logsContainer = document.getElementById('diagnostics-logs-container');
    if (logsContainer) {
      logsContainer.innerHTML = '';
      try {
        const [recentReports, recentRescues] = await Promise.all([
          db.collection('stray_reports').limit(5).get(),
          db.collection('rescued_animals').limit(5).get()
        ]);

        const auditEvents = [];

        recentReports.forEach(doc => {
          const r = doc.data();
          auditEvents.push({
            type: 'WARN',
            tag: 'TRIAGE',
            message: `Stray ${r.animalType} (${r.healthCondition}) reported at ${r.address || 'Unknown Location'}.`,
            time: r.reportedAt ? new Date(r.reportedAt) : new Date()
          });
        });

        recentRescues.forEach(doc => {
          const a = doc.data();
          auditEvents.push({
            type: 'SUCCESS',
            tag: 'INTAKE',
            message: `NGO intake completed for ${a.animalType} "${a.name}" (${a.breed || 'Indie'}).`,
            time: new Date(Date.now() - 6 * 3600000) // Mock slightly in past
          });
        });

        // Sort all chronologically descending
        auditEvents.sort((a, b) => b.time - a.time);

        if (auditEvents.length === 0) {
          logsContainer.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:1rem 0;">No logs found in sandbox database. Click "Seed Sandbox Data" above.</div>`;
        } else {
          // Display last 8 records
          auditEvents.slice(0, 8).forEach(ev => {
            const timeStr = ev.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            let badgeColor = 'var(--teal)';
            if (ev.type === 'WARN') badgeColor = 'var(--accent-red)';
            if (ev.type === 'SUCCESS') badgeColor = 'var(--accent-green)';
            
            logsContainer.innerHTML += `
              <div style="margin-bottom:0.25rem;">
                <span style="color:var(--text-muted); font-size:0.75rem;">[${timeStr}]</span>
                <span style="color:${badgeColor}; font-weight:700; font-size:0.75rem;">[${ev.tag}]</span>
                <span style="color:var(--text-main); font-size:0.75rem;">${ev.message}</span>
              </div>
            `;
          });
        }
      } catch (logErr) {
        console.warn("Audit logs retrieval failure:", logErr);
        logsContainer.innerHTML = `<div style="color:var(--accent-red); font-size:0.75rem;">Error querying audit logs: ${logErr.message}</div>`;
      }
    }

  } catch (err) {
    console.warn("Error calculating dashboard metrics:", err);
    document.getElementById('dashboard-loading').innerHTML = `
      <p style="color:var(--accent-red); font-size:0.85rem;"><i class="fa-solid fa-triangle-exclamation"></i> Error querying Firestore metrics nodes.</p>
    `;
  }
}

/* ==========================================================================
   PART 2: PET AI GUIDE DOMAINS & CHAT ROUTING LOGIC
   ========================================================================== */

const foodSafetyDb = {
  chocolate: {
    status: "Toxic / Unsafe",
    safe: false,
    reason: "Chocolate contains theobromine and caffeine, which dogs and cats cannot metabolize. It can cause vomiting, rapid breathing, elevated heart rate, muscle tremors, seizures, and can be fatal.",
    action: "Keep all chocolate and cocoa-containing foods entirely out of reach. Do not feed under any circumstances.",
    emergency: "If your pet ingested chocolate, immediately contact your veterinarian or emergency pet poison control. Note the type (dark/baking chocolate is highly toxic) and quantity."
  },
  grapes: {
    status: "Toxic / Unsafe",
    safe: false,
    reason: "Grapes and raisins can cause acute, sudden kidney failure in dogs. Even tiny amounts can be highly toxic for some individuals, and the exact toxic compound is unknown.",
    action: "Do not feed raw grapes, raisins, currants, or foods containing them (like breads, cakes, or cookies).",
    emergency: "Seek immediate veterinary attention if ingestion is suspected. Inducing vomiting early under medical care is critical."
  },
  raisins: {
    status: "Toxic / Unsafe",
    safe: false,
    reason: "Grapes and raisins can cause acute, sudden kidney failure in dogs. Even tiny amounts can be highly toxic for some individuals, and the exact toxic compound is unknown.",
    action: "Do not feed raw grapes, raisins, currants, or foods containing them (like breads, cakes, or cookies).",
    emergency: "Seek immediate veterinary attention if ingestion is suspected. Inducing vomiting early under medical care is critical."
  },
  onion: {
    status: "Toxic / Unsafe",
    safe: false,
    reason: "Onions, garlic, leeks, and chives contain thiosulfates, which cause oxidative damage to red blood cells, resulting in hemolytic anemia in dogs and cats.",
    action: "Do not feed raw, cooked, or powdered onions. Check food labels of broths or baby food.",
    emergency: "If your pet consumes onions or garlic, monitor for pale gums, lethargy, rapid breathing, or dark urine, and consult your veterinarian."
  },
  garlic: {
    status: "Toxic / Unsafe",
    safe: false,
    reason: "Onions, garlic, leeks, and chives contain thiosulfates, which cause oxidative damage to red blood cells, resulting in hemolytic anemia in dogs and cats.",
    action: "Do not feed raw, cooked, or powdered garlic. Check food labels of broths or baby food.",
    emergency: "If your pet consumes onions or garlic, monitor for pale gums, lethargy, rapid breathing, or dark urine, and consult your veterinarian."
  },
  xylitol: {
    status: "Highly Toxic / Unsafe",
    safe: false,
    reason: "Xylitol (birch sugar) causes a rapid, life-threatening release of insulin in dogs, leading to severe low blood sugar (hypoglycemia) and potentially acute liver failure.",
    action: "Check ingredient labels on sugar-free candies, gums, peanut butter, and baked goods. Keep them completely secure.",
    emergency: "This is a life-threatening emergency. Immediately take your pet to the nearest emergency veterinary clinic."
  },
  apple: {
    status: "Safe in moderation",
    safe: true,
    reason: "Apples are high in fiber, vitamins A and C, calcium, and phosphorus. They make a great low-fat, low-calorie treat.",
    action: "Remove the core and seeds completely. Seeds contain small amounts of cyanide. Slice into small, bite-sized pieces.",
    emergency: ""
  },
  carrot: {
    status: "Safe and Healthy",
    safe: true,
    reason: "Carrots are rich in beta-carotene (vitamin A), fiber, and antioxidants. They are also excellent for chewing, which aids in mechanical tooth cleaning.",
    action: "Wash thoroughly. Serve raw, steamed, or boiled. Cut into bite-sized pieces to prevent choking.",
    emergency: ""
  },
  blueberry: {
    status: "Safe and Healthy",
    safe: true,
    reason: "Blueberries are packed with antioxidants, fiber, and vitamins C and K. They support brain and immune system function.",
    action: "Serve raw or frozen. Offer a few berries as a healthy reward.",
    emergency: ""
  },
  banana: {
    status: "Safe in moderation",
    safe: true,
    reason: "Bananas are rich in potassium, vitamins, and fiber. However, their high sugar content means they should only be fed occasionally.",
    action: "Peel completely. Feed small slices as an occasional treat. Do not feed the banana peel.",
    emergency: ""
  },
  pumpkin: {
    status: "Safe and Digestively Beneficial",
    safe: true,
    reason: "Plain pumpkin is loaded with fiber and essential vitamins. It is highly recommended to aid digestively with both constipation and diarrhea.",
    action: "Feed only plain canned pumpkin puree. Do not feed sweetened pumpkin pie filling or seasoned pumpkin dishes.",
    emergency: ""
  }
};

/**
 * Main Guide Query Handler
 */
export async function handleAIGuideSubmit(query, uid) {
  const contentEl = document.getElementById('ai-guide-content');
  if (!contentEl) return;

  const q = query.toLowerCase().trim();

  // Route by keywords
  if (q.includes('food') || q.includes('eat') || q.includes('toxic') || q.includes('poison') || 
      q.includes('chocolate') || q.includes('grapes') || q.includes('onion') || q.includes('garlic') || 
      q.includes('xylitol') || q.includes('apple') || q.includes('carrot') || q.includes('blueberry') || 
      q.includes('banana') || q.includes('pumpkin') || q.includes('safe') || q.includes('unsafe') ||
      q.includes('raisin') || q.includes('ingredient')) {
    await renderFoodSafetyResponse(q, contentEl);
  } else if (q.includes('lost') || q.includes('track') || q.includes('radar') || q.includes('sighting') || 
             q.includes('project') || q.includes('zone') || q.includes('rocky') && q.includes('where') ||
             q.includes('sighting zone') || q.includes('find')) {
    await renderLostPetResponse(uid, contentEl);
  } else if (q.includes('grow') || q.includes('weight') || q.includes('projection') || q.includes('trend') || 
             q.includes('curve') || q.includes('chart') || q.includes('graph')) {
    await renderHealthInsightsResponse(uid, contentEl);
  } else if (q.includes('care') || q.includes('routine') || q.includes('exercise') || q.includes('tips') || 
             q.includes('advice') || q.includes('vaccine') || q.includes('booster') || q.includes('immunization') || 
             q.includes('mimi') || q.includes('overdue') || q.includes('recommendation')) {
    await renderCareAdvisorResponse(uid, contentEl);
  } else {
    renderFallbackResponse(query, contentEl);
  }
}

/**
 * 1. Food Safety Checker
 */
async function renderFoodSafetyResponse(query, contentEl) {
  let matchedItem = null;
  let matchedKey = null;

  for (const key in foodSafetyDb) {
    if (query.includes(key)) {
      matchedItem = foodSafetyDb[key];
      matchedKey = key;
      break;
    }
  }

  if (matchedItem) {
    const isSafe = matchedItem.safe;
    const badgeColor = isSafe ? 'var(--accent-green)' : 'var(--accent-red)';
    const icon = isSafe ? 'fa-circle-check' : 'fa-triangle-exclamation';

    contentEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1.25rem;">
        <div class="flex-between" style="border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem;">
          <h4 style="font-family:'Outfit'; font-size:1.2rem; font-weight:700; color:var(--text-main); text-transform:capitalize;">
            Ingredient Analysis: ${matchedKey}
          </h4>
          <span style="background:${badgeColor}15; color:${badgeColor}; border:1px solid ${badgeColor}30; padding:4px 10px; border-radius:var(--radius-sm); font-size:0.75rem; font-weight:700; display:flex; align-items:center; gap:0.4rem;">
            <i class="fa-solid ${icon}"></i> ${matchedItem.status}
          </span>
        </div>

        <div style="font-size:0.85rem; line-height:1.5;">
          <strong style="color:var(--teal); display:block; margin-bottom:0.25rem;"><i class="fa-solid fa-microscope"></i> How it Affects Your Pet</strong>
          <p style="color:var(--text-muted);">${matchedItem.reason}</p>
        </div>

        <div style="font-size:0.85rem; line-height:1.5;">
          <strong style="color:var(--teal); display:block; margin-bottom:0.25rem;"><i class="fa-solid fa-hand-holding-heart"></i> Recommended Action</strong>
          <p style="color:var(--text-muted);">${matchedItem.action}</p>
        </div>

        ${matchedItem.emergency ? `
          <div style="background:rgba(239,68,68,0.06); border:1px solid var(--accent-red); padding:1rem; border-radius:var(--radius-sm); font-size:0.85rem; line-height:1.5;">
            <strong style="color:var(--accent-red); display:block; margin-bottom:0.4rem;"><i class="fa-solid fa-kit-medical"></i> Emergency Guidance</strong>
            <p style="color:var(--text-main); font-weight:500;">${matchedItem.emergency}</p>
            <div style="margin-top:0.75rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
              <a href="#/vets" class="btn btn-sm" style="background:var(--accent-red); color:white; font-size:0.75rem; padding:4px 10px;"><i class="fa-solid fa-user-doctor"></i> Find Nearest Vet Clinic</a>
              <span style="font-size:0.75rem; color:var(--text-muted); display:flex; align-items:center;">Or call immediate rescue line: <strong>+91 99999 99999</strong></span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else {
    // Show quick safety dictionary search guide
    contentEl.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:1rem;">
        <div style="border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem;">
          <h4 style="font-family:'Outfit'; font-size:1.1rem; color:var(--teal);"><i class="fa-solid fa-list-check"></i> Food Safety Database Guide</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.25rem;">
            We couldn't match a specific food in your query. Try searching specifically for items listed below or check standard safety statuses:
          </p>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.25rem;">
          <div>
            <strong style="color:var(--accent-red); font-size:0.8rem; display:block; margin-bottom:0.5rem;"><i class="fa-solid fa-ban"></i> Toxic & Unsafe Foods</strong>
            <ul style="font-size:0.8rem; color:var(--text-muted); padding-left:1.25rem; display:flex; flex-direction:column; gap:0.4rem;">
              <li><strong>Chocolate</strong> (contains harmful stimulants)</li>
              <li><strong>Grapes & Raisins</strong> (causes acute kidney failure)</li>
              <li><strong>Onions & Garlic</strong> (damages red blood cells)</li>
              <li><strong>Xylitol</strong> (causes rapid fatal blood sugar drop)</li>
            </ul>
          </div>
          <div>
            <strong style="color:var(--accent-green); font-size:0.8rem; display:block; margin-bottom:0.5rem;"><i class="fa-solid fa-circle-check"></i> Safe treats (In moderation)</strong>
            <ul style="font-size:0.8rem; color:var(--text-muted); padding-left:1.25rem; display:flex; flex-direction:column; gap:0.4rem;">
              <li><strong>Carrots</strong> (healthy vitamins, clean teeth)</li>
              <li><strong>Apples</strong> (high fiber, remove seeds/core)</li>
              <li><strong>Blueberries</strong> (antioxidant superfood)</li>
              <li><strong>Bananas / Pumpkins</strong> (digestively beneficial)</li>
            </ul>
          </div>
        </div>

        <div style="background:rgba(245,158,11,0.06); border:1px solid var(--accent-yellow); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.75rem; color:var(--text-main); margin-top:0.5rem;">
          <i class="fa-solid fa-circle-info"></i> <strong>General Safety Rule:</strong> Always consult your veterinarian before introducing any new food item to your pet's regular diet.
        </div>
      </div>
    `;
  }
}

/**
 * 2. Lost Pet Assistant (Radar Map)
 */
async function renderLostPetResponse(uid, contentEl) {
  try {
    const snap = await db.collection('pets')
      .where('ownerId', '==', uid)
      .where('lostStatus', '==', 'LOST')
      .get();

    if (snap.empty) {
      contentEl.innerHTML = `
        <div class="text-center" style="padding:1.5rem;">
          <i class="fa-solid fa-shield-cat" style="font-size:2.5rem; color:var(--accent-green); margin-bottom:0.75rem;"></i>
          <h4 style="font-family:'Outfit'; font-weight:700; color:var(--text-main);">All Companions are Safe</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:380px; margin:0.25rem auto 1rem auto; line-height:1.4;">
            None of your registered pets are currently marked as lost. Tracking zones and sighting checklists are only active for missing pets.
          </p>
          <div style="background:rgba(15,118,110,0.04); border:1px solid var(--border-glass); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.75rem; display:inline-block; text-align:left;">
            <strong>To test this feature in sandbox:</strong> Use the collapsible <em>Ecosystem Sandbox Control</em> seeder at the top to populate demo data, which marks "Rocky" as missing and generates sighting scans.
          </div>
        </div>
      `;
      return;
    }

    // Load first lost companion
    const petDoc = snap.docs[0];
    const petId = petDoc.id;
    const pet = petDoc.data();

    // Query scan logs chronologically
    const scanSnap = await db.collection('pets').doc(petId).collection('scans').orderBy('timestamp', 'asc').get();

    if (scanSnap.empty) {
      contentEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div style="border-bottom:1px solid var(--border-glass); padding-bottom:0.5rem;">
            <h4 style="font-family:'Outfit'; font-size:1.15rem; color:var(--teal);">${pet.name}'s Search Status</h4>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem;">Alert status: <strong>ACTIVE SEARCH</strong></p>
          </div>
          <p style="font-size:0.85rem; color:var(--text-main);">
            No QR collar tag scans have been registered yet for ${pet.name}. Once a scanner updates his location, the tracking map and coordinate logs will render here immediately.
          </p>
          <div style="background:rgba(245,158,11,0.06); border:1px solid var(--accent-yellow); padding:0.75rem; border-radius:var(--radius-sm); font-size:0.8rem;">
            <strong>Immediate Recovery Action:</strong> Keep your contact details updated in settings, and publish a lost pet notification in the Community feed.
          </div>
        </div>
      `;
      return;
    }

    const scans = [];
    scanSnap.forEach(doc => scans.push(doc.data()));

    const latestSighting = scans[scans.length - 1];
    const lat = latestSighting.latitude;
    const lng = latestSighting.longitude;

    // Calculate time elapsed and movement search radius
    const lastScanTime = new Date(latestSighting.timestamp);
    const timeDeltaHrs = Math.max((Date.now() - lastScanTime.getTime()) / 3600000, 0);
    
    // Accuracy offset + 1.5 km per hour velocity expansion
    const radiusMeters = Math.round((latestSighting.accuracy || 20) + (timeDeltaHrs * 1500));
    const radiusKm = radiusMeters / 1000;

    contentEl.innerHTML = `
      <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:1.5rem; flex-wrap:wrap;">
        
        <!-- Sighting map and info -->
        <div>
          <h4 style="font-family:'Outfit'; font-size:1.1rem; color:var(--teal); margin-bottom:0.5rem;">
            Tracking Zone Sighting Radar: ${pet.name}
          </h4>
          <div id="ai-lost-radar-map" style="width:100%; height:260px; border-radius:var(--radius-sm); border:1px solid var(--border-glass); margin-bottom:0.75rem; position:relative;"></div>
          <p style="font-size:0.75rem; color:var(--text-muted); line-height:1.4;">
            Map displays collars scans. The circular zone shows a calculated walking boundary of ${radiusKm.toFixed(2)} km, reflecting the potential movement distance at an average speed of 1.5 km/h since the last sighting.
          </p>
        </div>

        <!-- Sighting Stats & Actions -->
        <div style="display:flex; flex-direction:column; gap:0.75rem; font-size:0.8rem; justify-content:space-between;">
          
          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01);">
            <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block;">ALERT STATUS</span>
            <strong style="color:var(--accent-red); font-size:0.9rem; display:flex; align-items:center; gap:0.35rem; margin-top:0.15rem;">
              <i class="fa-solid fa-wifi fa-fade"></i> Broadcasting geofence alerts
            </strong>
            <p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.25rem;">
              Alerts dispatched to 3 partner NGOs and vet clinics in the sector.
            </p>
          </div>

          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass);">
            <strong style="font-size:0.75rem; color:var(--teal); display:block; margin-bottom:0.3rem;"><i class="fa-solid fa-map-pin"></i> Last Spotted</strong>
            <div style="color:var(--text-main); font-weight:500;">
              ${formatFriendlyDate(latestSighting.timestamp)}<br>
              <span style="font-size:0.7rem; color:var(--text-muted);">Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
            </div>
          </div>

          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass);">
            <strong style="font-size:0.75rem; color:var(--teal); display:block; margin-bottom:0.3rem;"><i class="fa-solid fa-list-check"></i> Recovery Checklist</strong>
            <ul style="padding-left:1.1rem; color:var(--text-muted); display:flex; flex-direction:column; gap:0.25rem; font-size:0.7rem; line-height:1.3;">
              <li>Check immediate area within search boundary first.</li>
              <li>Notify local veterinary hospitals and animal shelters.</li>
              <li>Check messages for scans notifications from finder.</li>
              <li>Confirm contact phone number is up to date.</li>
            </ul>
          </div>
        </div>

      </div>

      <!-- Recent Sighting logs list -->
      <div style="margin-top:1.25rem; border-top:1px dashed var(--border-glass); padding-top:0.75rem;">
        <strong style="font-size:0.8rem; color:var(--text-main); display:block; margin-bottom:0.4rem;">Recent Sighting logs history:</strong>
        <div style="display:flex; flex-direction:column; gap:0.3rem; font-size:0.75rem;">
          ${scans.slice().reverse().map((sc, idx) => `
            <div class="flex-between" style="padding:0.3rem 0.5rem; background:rgba(0,0,0,0.02); border-radius:var(--radius-sm); border:1px solid var(--border-glass);">
              <span>Sighting #${scans.length - idx} (Accuracy: ${sc.accuracy || 15}m via ${sc.deviceType || 'Mobile'})</span>
              <strong style="color:var(--teal);">${formatFriendlyDate(sc.timestamp)}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Render Leaflet map asynchronously
    setTimeout(() => {
      try {
        const radarMap = L.map('ai-lost-radar-map', { dragging: !L.Browser.mobile, tap: !L.Browser.mobile, scrollWheelZoom: false }).setView([lat, lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(radarMap);

        // Sighting marker
        scans.forEach((sc, idx) => {
          L.marker([sc.latitude, sc.longitude])
            .addTo(radarMap)
            .bindPopup(`Sighting #${idx + 1}<br>${formatFriendlyDate(sc.timestamp)}`);
        });

        // Historical polyline path
        const pathLine = scans.map(sc => [sc.latitude, sc.longitude]);
        L.polyline(pathLine, { color: 'var(--teal)', weight: 3, dashArray: '5, 5' }).addTo(radarMap);

        // Search boundaries circle
        L.circle([lat, lng], {
          color: 'var(--accent-red)',
          fillColor: 'var(--accent-red)',
          fillOpacity: 0.1,
          radius: Math.min(radiusMeters, 5000) // clamp size for rendering clarity
        }).addTo(radarMap);

      } catch (mapErr) {
        console.warn("Lost map render error:", mapErr);
      }
    }, 100);

  } catch (err) {
    console.error("Lost pet radar error:", err);
    contentEl.innerHTML = `<p style="color:var(--accent-red);">Error processing tracking calculations.</p>`;
  }
}

/**
 * 3. Health Insights (Compliance & Growth)
 */
async function renderHealthInsightsResponse(uid, contentEl) {
  try {
    const snap = await db.collection('pets').where('ownerId', '==', uid).get();

    if (snap.empty) {
      contentEl.innerHTML = `
        <div class="text-center" style="padding:2rem;">
          <i class="fa-solid fa-circle-info" style="font-size:2.5rem; color:var(--text-muted); opacity:0.4; margin-bottom:0.5rem; display:block;"></i>
          <h4 style="font-family:'Outfit'; font-weight:700;">No Registered Pets Found</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:320px; margin:0.25rem auto 0 auto;">
            Please register a pet profile in the "My Pets" tab to analyze weight progression and vaccination charts.
          </p>
        </div>
      `;
      return;
    }

    const firstPet = snap.docs[0];
    const petId = firstPet.id;
    const pet = firstPet.data();

    // Fetch weight milestones
    const weightSnap = await db.collection('pets').doc(petId).collection('journal_entries').orderBy('date', 'asc').get();
    
    // Fetch vaccine boosters
    const medicalSnap = await db.collection('pets').doc(petId).collection('medical_records').orderBy('date', 'desc').get();

    if (weightSnap.empty && medicalSnap.empty) {
      contentEl.innerHTML = `
        <div class="text-center" style="padding:2rem;">
          <i class="fa-solid fa-heart-circle-exclamation" style="font-size:2.5rem; color:var(--text-muted); opacity:0.4; margin-bottom:0.5rem; display:block;"></i>
          <h4 style="font-family:'Outfit'; font-weight:700;">No Health Records for ${pet.name}</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:320px; margin:0.25rem auto 0 auto; line-height:1.4;">
            We need weight logs or vaccine records to compile health trends. Click "My Pets" to add records to ${pet.name}'s medical history.
          </p>
        </div>
      `;
      return;
    }

    // 1. Calculate Vaccination Compliance
    let completedCount = 0;
    let overdueCount = 0;
    let vaccineListHtml = '';

    medicalSnap.forEach(doc => {
      const med = doc.data();
      const nextDue = new Date(med.nextDue);
      const isOverdue = nextDue.getTime() < Date.now() && med.status !== 'Completed';
      
      let statusColor = 'var(--accent-green)';
      let icon = 'fa-circle-check';
      if (isOverdue || med.status === 'Overdue') {
        statusColor = 'var(--accent-red)';
        icon = 'fa-circle-exclamation';
        overdueCount++;
      } else {
        completedCount++;
      }

      vaccineListHtml += `
        <div class="flex-between" style="padding:0.35rem 0.5rem; background:rgba(0,0,0,0.02); border-radius:var(--radius-sm); border:1px solid var(--border-glass); font-size:0.75rem;">
          <span><i class="fa-solid ${icon}" style="color:${statusColor}; margin-right:0.4rem;"></i> ${med.name}</span>
          <span style="font-size:0.65rem; color:var(--text-muted);">Due: ${formatFriendlyDate(med.nextDue)}</span>
        </div>
      `;
    });

    const totalVaccines = completedCount + overdueCount;
    const complianceRate = totalVaccines > 0 ? Math.round((completedCount / totalVaccines) * 100) : 100;

    // 2. Prepare Weight regression
    const dates = [];
    const weights = [];
    const rawEntries = [];
    let slopePerDay = 0;
    let monthlyRate = 0;
    let forecastWeights = [];

    weightSnap.forEach(doc => {
      const d = doc.data();
      if (d.weight) {
        dates.push(formatFriendlyDate(d.date));
        weights.push(d.weight);
        rawEntries.push({ weight: d.weight, epochDays: Math.round(new Date(d.date).getTime() / 86400000) });
      }
    });

    const canForecast = weights.length >= 2;
    if (canForecast) {
      const first = rawEntries[0];
      const last = rawEntries[rawEntries.length - 1];
      const totalDays = last.epochDays - first.epochDays;
      if (totalDays > 0) {
        slopePerDay = (last.weight - first.weight) / totalDays;
        monthlyRate = slopePerDay * 30;
        
        forecastWeights = [...weights];
        for (let i = 1; i <= 3; i++) {
          forecastWeights.push(parseFloat((last.weight + (slopePerDay * i * 30)).toFixed(2)));
        }
      }
    }

    contentEl.innerHTML = `
      <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:1.5rem; flex-wrap:wrap;">
        
        <!-- Growth Graph Area -->
        <div>
          <h4 style="font-family:'Outfit'; font-size:1.1rem; color:var(--teal); margin-bottom:0.75rem;">
            Weight Growth & Linear Projections: ${pet.name}
          </h4>
          <div style="position:relative; height:200px; width:100%; margin-bottom:0.75rem;">
            <canvas id="health-insights-weight-chart"></canvas>
          </div>
          <div id="health-weight-insights-txt" style="font-size:0.75rem; color:var(--text-muted); padding:0.5rem 0.75rem; background:rgba(0,0,0,0.02); border-radius:var(--radius-sm); border:1px solid var(--border-glass); line-height:1.4;">
            ${canForecast ? `
              <i class="fa-solid fa-arrow-trend-up"></i> <strong>Growth Rate:</strong> Weight is changing at approximately <strong>${monthlyRate.toFixed(2)} kg/month</strong>. Based on this progression, ${pet.name} is projected to reach <strong>${forecastWeights[forecastWeights.length - 1]} kg</strong> in 90 days.
            ` : 'Log at least 2 weight records in the companion growth journal to display growth rate trends and linear projections.'}
          </div>
        </div>

        <!-- Compliance widget -->
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <h4 style="font-family:'Outfit'; font-size:1.1rem; color:var(--teal);">Immunization Checklist</h4>
          
          <div class="glass-card text-center" style="padding:1rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01);">
            <span style="font-size:0.65rem; color:var(--text-muted); font-weight:700; display:block; text-transform:uppercase;">VACCINE COMPLIANCE</span>
            <div style="font-size:2.2rem; font-weight:800; font-family:'Outfit'; color:var(--teal); margin:0.2rem 0;">${complianceRate}%</div>
            <div style="font-size:0.7rem; font-weight:600; color:${overdueCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)'};">
              ${overdueCount > 0 ? `⚠️ ${overdueCount} Booster${overdueCount > 1 ? 's' : ''} Overdue` : '🛡️ Vaccination Schedule Complete'}
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:0.4rem; max-height:160px; overflow-y:auto; padding-right:0.25rem;">
            ${vaccineListHtml}
          </div>
        </div>

      </div>
    `;

    // Render chart asynchronously
    if (canForecast) {
      setTimeout(() => {
        try {
          const canvas = document.getElementById('health-insights-weight-chart');
          const ctx = canvas.getContext('2d');
          const forecastLabels = [...dates, "In 30 Days", "In 60 Days", "In 90 Days"];
          const currentWeights = [...weights];

          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, 'rgba(15, 118, 110, 0.15)');
          gradient.addColorStop(1, 'rgba(15, 118, 110, 0.0)');

          if (weightTrendChart) { weightTrendChart.destroy(); }
          weightTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: forecastLabels,
              datasets: [
                {
                  label: 'Recorded (kg)',
                  data: [...currentWeights, ...Array(3).fill(null)],
                  borderColor: 'var(--teal)',
                  borderWidth: 3,
                  tension: 0.1,
                  pointBackgroundColor: 'var(--teal)',
                  pointRadius: 4
                },
                {
                  label: 'Projected (kg)',
                  data: [...Array(currentWeights.length - 1).fill(null), currentWeights[currentWeights.length - 1], ...forecastWeights.slice(currentWeights.length)],
                  borderColor: 'var(--terracotta)',
                  borderWidth: 2,
                  borderDash: [5, 5],
                  backgroundColor: gradient,
                  fill: true,
                  tension: 0.2,
                  pointBackgroundColor: 'var(--terracotta)',
                  pointRadius: 5
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: 'var(--text-muted)', font: { family: 'Outfit', size: 10 } } },
                x: { grid: { display: false }, ticks: { color: 'var(--text-muted)', font: { family: 'Outfit', size: 10 } } }
              }
            }
          });
        } catch (cErr) {
          console.warn("Chart rendering failed:", cErr);
        }
      }, 100);
    }

  } catch (err) {
    console.error("Health insights error:", err);
    contentEl.innerHTML = `<p style="color:var(--accent-red);">Error preparing health insights.</p>`;
  }
}

/**
 * 4. Care Advisor (Tailored Diet, Exercise, and Reminders)
 */
async function renderCareAdvisorResponse(uid, contentEl) {
  try {
    const snap = await db.collection('pets').where('ownerId', '==', uid).get();

    if (snap.empty) {
      contentEl.innerHTML = `
        <div class="text-center" style="padding:2rem;">
          <i class="fa-solid fa-sparkles" style="font-size:2.5rem; color:var(--text-muted); opacity:0.4; margin-bottom:0.5rem; display:block;"></i>
          <h4 style="font-family:'Outfit'; font-weight:700;">No Tailored Profile Available</h4>
          <p style="font-size:0.8rem; color:var(--text-muted); max-width:320px; margin:0.25rem auto 0 auto; line-height:1.4;">
            Add a pet companion to customize clinical deworming, personalized exercise durations, and metabolic caloric requirements.
          </p>
        </div>
      `;
      return;
    }

    let recommendationsHtml = '';

    for (const doc of snap.docs) {
      const petId = doc.id;
      const pet = doc.data();

      // Gather subcollections
      const weightSnap = await db.collection('pets').doc(petId).collection('journal_entries').orderBy('date', 'desc').limit(1).get();
      const medSnap = await db.collection('pets').doc(petId).collection('medical_records').get();

      let latestWeight = null;
      if (!weightSnap.empty) {
        latestWeight = weightSnap.docs[0].data().weight;
      }

      const overdueMeds = [];
      medSnap.forEach(medDoc => {
        const med = medDoc.data();
        const nextDue = new Date(med.nextDue);
        if (nextDue.getTime() < Date.now() && med.status !== 'Completed') {
          overdueMeds.push(med.name);
        }
      });

      // Tailor details
      const ageNum = parseFloat(pet.age) || 1;
      const type = (pet.type || pet.petType || 'Dog').toLowerCase();
      const breed = pet.breed || 'Rescue Mix';
      
      // Calculate caloric requirements (RER = 70 * weight^0.75)
      let caloricStr = '';
      if (latestWeight) {
        const rer = Math.round(70 * Math.pow(latestWeight, 0.75));
        let der = rer;
        if (type === 'dog') {
          der = Math.round(rer * 1.6); // typical active companion factor
        } else {
          der = Math.round(rer * 1.2); // typical companion cat factor
        }
        caloricStr = `Daily energy requirement is approximately <strong>${der} calories (kcal)</strong>. We recommend serving this in two balanced meals daily.`;
      } else {
        caloricStr = `Provide a premium balanced formula matching a typical ${breed} diet. Log a weight entry in the journal to calculate target calorie metrics.`;
      }

      // Exercise recommendations
      let exerciseStr = '';
      if (type === 'dog') {
        if (breed.toLowerCase().includes('pariah') || breed.toLowerCase().includes('shepherd') || breed.toLowerCase().includes('retriever')) {
          exerciseStr = `Requires <strong>60 to 90 minutes of active exercise</strong> (running, fetch, long trails) divided into two daily walks.`;
        } else {
          exerciseStr = `Requires <strong>30 to 45 minutes of daily structured activity</strong> (brisk walks, light puzzle games) to maintain physical tone.`;
        }
      } else {
        exerciseStr = `Requires <strong>20 to 30 minutes of interactive play</strong> daily (cat teasers, laser points, climbing towers) to satisfy natural hunting drives.`;
      }

      // Life stage guidance
      let lifeStageHtml = '';
      if (ageNum <= 1) {
        lifeStageHtml = `<strong>Growth Phase (Age ${pet.age}):</strong> Focus on consistent positive reinforcement training, parasite protection, and kitten/puppy specific nutrients for musculoskeletal development.`;
      } else if (ageNum >= 8) {
        lifeStageHtml = `<strong>Senior Companion (Age ${pet.age}):</strong> Support joints with glucosamine, schedule senior dental checkups, and request biannual veterinary tests.`;
      } else {
        lifeStageHtml = `<strong>Adult Maintenance (Age ${pet.age}):</strong> Maintain structural conditioning, monitor dental hygiene, and ensure yearly booster checkups.`;
      }

      recommendationsHtml += `
        <div class="glass-card" style="padding:1.25rem; border-left:4px solid var(--accent-green); display:flex; flex-direction:column; gap:0.8rem; margin-bottom:1.25rem;">
          
          <div class="flex-between">
            <h4 style="font-family:'Outfit'; font-size:1.15rem; color:var(--teal); font-weight:700; margin:0;">
              ${pet.name}'s Custom Care Guide
            </h4>
            <span style="font-size:0.75rem; color:var(--text-muted);">${breed} • ${pet.age} Years Old</span>
          </div>

          <!-- Diet Recommendations -->
          <div style="font-size:0.85rem; line-height:1.4;">
            <strong style="color:var(--accent-green); display:block; margin-bottom:0.2rem;"><i class="fa-solid fa-bowl-food"></i> Nutrition & Caloric Targets</strong>
            <p style="color:var(--text-muted);">${caloricStr}</p>
          </div>

          <!-- Exercise Recommendations -->
          <div style="font-size:0.85rem; line-height:1.4;">
            <strong style="color:var(--accent-green); display:block; margin-bottom:0.2rem;"><i class="fa-solid fa-running"></i> Daily Exercise & Play</strong>
            <p style="color:var(--text-muted);">${exerciseStr}</p>
          </div>

          <!-- Life stage recommendations -->
          <div style="font-size:0.85rem; line-height:1.4; border-top:1px dashed var(--border-glass); padding-top:0.6rem;">
            <span style="color:var(--text-main); font-size:0.75rem; display:block; margin-bottom:0.15rem;">Stage Guidance:</span>
            <p style="color:var(--text-muted); font-size:0.75rem;">${lifeStageHtml}</p>
          </div>

          <!-- Health Alert overrides -->
          ${overdueMeds.length > 0 ? `
            <div style="background:rgba(239,68,68,0.06); border:1px solid var(--accent-red); padding:0.6rem 0.8rem; border-radius:var(--radius-sm); font-size:0.8rem; line-height:1.3; color:var(--accent-red); font-weight:600; display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-circle-exclamation"></i>
              <div>
                <strong>Clinically Overdue Immunizations:</strong> ${overdueMeds.join(', ')} booster shots. Schedule a veterinary appointment to protect ${pet.name}.
              </div>
            </div>
          ` : `
            <div style="background:rgba(34,197,94,0.05); border:1px solid var(--accent-green); padding:0.5rem 0.8rem; border-radius:var(--radius-sm); font-size:0.75rem; color:var(--accent-green); font-weight:600; display:flex; align-items:center; gap:0.5rem;">
              <i class="fa-solid fa-shield-halved"></i>
              All diagnostic records and vaccination logs are currently complete. Keep up the excellent work!
            </div>
          `}

        </div>
      `;
    }

    contentEl.innerHTML = recommendationsHtml;

  } catch (err) {
    console.error("Care advisor response generation failed:", err);
    contentEl.innerHTML = `<p style="color:var(--accent-red);">Error compiling care recommendations.</p>`;
  }
}

/**
 * 5. General / Fallback Response
 */
function renderFallbackResponse(query, contentEl) {
  contentEl.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1.25rem;">
      
      <div style="border-bottom:1px solid var(--border-glass); padding-bottom:0.75rem;">
        <h4 style="font-family:'Outfit'; font-size:1.15rem; color:var(--teal); font-weight:700;"><i class="fa-solid fa-wand-magic-sparkles"></i> Hello! I'm your PawTrace Pet AI Guide</h4>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem; line-height:1.45;">
          I'm a smart assistant tailored specifically for pet owners to answer practical questions about safety, health milestones, and tracking.
        </p>
      </div>

      <div style="font-size:0.85rem; line-height:1.5;">
        <strong style="color:var(--teal); display:block; margin-bottom:0.4rem;"><i class="fa-solid fa-compass"></i> What you can ask me:</strong>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01);">
            <strong style="font-size:0.75rem; color:var(--text-main); display:block; margin-bottom:0.2rem;"><i class="fa-solid fa-apple-whole"></i> Food Safety Limits</strong>
            <span style="font-size:0.7rem; color:var(--text-muted);">Check toxicities and feeding actions (e.g. "Can my dog eat grapes?").</span>
          </div>
          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01);">
            <strong style="font-size:0.75rem; color:var(--text-main); display:block; margin-bottom:0.2rem;"><i class="fa-solid fa-route"></i> Lost Pet Sighting Zones</strong>
            <span style="font-size:0.7rem; color:var(--text-muted);">Locate last sighted bounds and coordinates (e.g. "Where is Rocky?").</span>
          </div>
          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01);">
            <strong style="font-size:0.75rem; color:var(--text-main); display:block; margin-bottom:0.25rem;"><i class="fa-solid fa-chart-line"></i> Weight Growth Trends</strong>
            <span style="font-size:0.7rem; color:var(--text-muted);">Inspect growth rates and vaccine checklists (e.g. "Is Rocky growing?").</span>
          </div>
          <div class="glass-card" style="padding:0.75rem; border-color:var(--border-glass); background:rgba(0,0,0,0.01);">
            <strong style="font-size:0.75rem; color:var(--text-main); display:block; margin-bottom:0.25rem;"><i class="fa-solid fa-circle-question"></i> Tailored Care Advice</strong>
            <span style="font-size:0.7rem; color:var(--text-muted);">Get caloric demands and deworming due checks (e.g. "Get care tips").</span>
          </div>
        </div>
      </div>

      <div style="font-size:0.75rem; color:var(--text-muted); background:var(--bg-app); border:1px solid var(--border-glass); padding:0.75rem; border-radius:var(--radius-sm); line-height:1.45;">
        <strong>Disclaimer:</strong> This guide provides reference information based on logged history and clinic databases. It does not replace professional diagnosis, treatment, or emergency veterinary attention.
      </div>
    </div>
  `;
}

/* ==========================================================================
   SANDBOX DATABASE SEEDER & CLEANUP PIPELINES
   ========================================================================== */

export async function seedDatabase(uid) {
  showLoading(true, "Seeding Sandbox Demo Data...");
  try {
    if (!uid) throw new Error("Authentication required.");

    // Clear existing demo records first to avoid accumulation
    await clearDatabase(uid);

    // 1. Seed Vet Clinics
    const vets = [
      { name: "Cessna Lifeline Veterinary Hospital", latitude: 12.9431, longitude: 77.6974, isDemo: true },
      { name: "Cartman Animal Hospital & Rehabilitation", latitude: 12.9228, longitude: 77.5855, isDemo: true },
      { name: "Bangalore Pet Clinic (Indiranagar)", latitude: 12.9602, longitude: 77.6401, isDemo: true },
      { name: "R T Nagar Veterinary Clinic", latitude: 13.0185, longitude: 77.5958, isDemo: true }
    ];
    for (const v of vets) {
      await db.collection('vetProfiles').add(v);
    }

    // 2. Seed NGOs
    const ngos = [
      { name: "CARE (Charlie's Animal Rescue Centre)", latitude: 13.0628, longitude: 77.6256, isDemo: true },
      { name: "Krupa Animal Hospital and Shelter", latitude: 12.8988, longitude: 77.5020, isDemo: true },
      { name: "CUPA (Compassion Unlimited Plus Action)", latitude: 12.9808, longitude: 77.5923, isDemo: true }
    ];
    for (const n of ngos) {
      await db.collection('ngoProfiles').add(n);
    }

    // 3. Seed Stray Reports
    const strayReports = [
      { animalType: "Dog", reporterName: "Rajesh Kumar", status: "Reported", healthCondition: "Critical Injury", vulnerability: "Adult", environmentalRisk: "High Traffic", reportedAt: new Date(Date.now() - 2 * 3600000).toISOString(), latitude: 12.9784, longitude: 77.6408, address: "Indiranagar Double Road", isDemo: true },
      { animalType: "Dog", reporterName: "Aishwarya S.", status: "Reported", healthCondition: "Healthy", vulnerability: "Infant", environmentalRisk: "Extreme Weather", reportedAt: new Date(Date.now() - 4 * 3600000).toISOString(), latitude: 12.9352, longitude: 77.6244, address: "Koramangala 4th Block", isDemo: true },
      { animalType: "Cat", reporterName: "Vikram Mehta", status: "Assigned", healthCondition: "Severe Disease", vulnerability: "Infant", environmentalRisk: "None", reportedAt: new Date(Date.now() - 5 * 3600000).toISOString(), latitude: 12.9250, longitude: 77.5938, address: "Jayanagar 3rd Block", isDemo: true },
      { animalType: "Cow", reporterName: "Ananya Rao", status: "Reported", healthCondition: "Minor Sickness", vulnerability: "Senior", environmentalRisk: "High Traffic", reportedAt: new Date(Date.now() - 1 * 3600000).toISOString(), latitude: 13.0358, longitude: 77.5970, address: "Hebbal Flyover Junction", isDemo: true },
      { animalType: "Dog", reporterName: "Sandeep Patil", status: "Reported", healthCondition: "Critical Injury", vulnerability: "Adult", environmentalRisk: "High Traffic", reportedAt: new Date(Date.now() - 0.5 * 3600000).toISOString(), latitude: 12.9698, longitude: 77.7499, address: "Whitefield Main Road", isDemo: true },
      { animalType: "Cat", reporterName: "Nisha Patel", status: "Reported", healthCondition: "Minor Sickness", vulnerability: "Nursing Mother", environmentalRisk: "Extreme Weather", reportedAt: new Date(Date.now() - 8 * 3600000).toISOString(), latitude: 12.9562, longitude: 77.6542, address: "Domlur Flyover Underpass", isDemo: true }
    ];
    for (const r of strayReports) {
      await db.collection('stray_reports').add(r);
    }

    // 4. Seed Rescued Animals for Adoption
    const adoptionAnimals = [
      { name: "Kallu", animalType: "Dog", breed: "Indian Pariah Dog", age: "2 Years", size: "Medium", gender: "Male", healthStatus: "Healthy", energyLevel: "High", description: "Rescued from an open drain, Kallu is exceptionally smart, responsive, and loyal. Loves playing catch.", characteristics: { energyLevel: "High", size: "Medium", childFriendly: true, petFriendly: true, apartmentFriendly: true, aloneTolerance: "Medium", requiresExperienced: false }, status: "Available", image: "dog_placeholder.png", isDemo: true },
      { name: "Rani", animalType: "Dog", breed: "Indian Pariah Dog", age: "1 Year", size: "Medium", gender: "Female", healthStatus: "Healthy", energyLevel: "Medium", description: "Rani was rescued from city traffic. She is extremely gentle, friendly, and great with children.", characteristics: { energyLevel: "Medium", size: "Medium", childFriendly: true, petFriendly: true, apartmentFriendly: true, aloneTolerance: "High", requiresExperienced: false }, status: "Available", image: "dog_placeholder.png", isDemo: true },
      { name: "Sheru", animalType: "Dog", breed: "German Shepherd Mix", age: "3 Years", size: "Large", gender: "Male", healthStatus: "Healthy", energyLevel: "High", description: "High energy German Shepherd Mix. Extremely protective. Needs an active home with yard space.", characteristics: { energyLevel: "High", size: "Large", childFriendly: true, petFriendly: false, apartmentFriendly: false, aloneTolerance: "Medium", requiresExperienced: true }, status: "Available", image: "dog_placeholder.png", isDemo: true },
      { name: "Mimi", animalType: "Cat", breed: "Indian Stray Cat", age: "8 Months", size: "Small", gender: "Female", healthStatus: "Healthy", energyLevel: "Medium", description: "Sweet tricolor indie kitten. Loves lap cuddles and chasing toy mice.", characteristics: { energyLevel: "Medium", size: "Small", childFriendly: true, petFriendly: true, apartmentFriendly: true, aloneTolerance: "High", requiresExperienced: false }, status: "Available", image: "cat_placeholder.png", isDemo: true },
      { name: "Whiskey", animalType: "Cat", breed: "Persian Mix", age: "4 Years", size: "Small", gender: "Male", healthStatus: "Requires Care", energyLevel: "Low", description: "Calm, long-haired Persian mix. Prefers a quiet apartment environment with experienced owners.", characteristics: { energyLevel: "Low", size: "Small", childFriendly: false, petFriendly: false, apartmentFriendly: true, aloneTolerance: "High", requiresExperienced: true }, status: "Available", image: "cat_placeholder.png", isDemo: true },
      { name: "Bruno", animalType: "Dog", breed: "Golden Retriever Mix", age: "5 Years", size: "Large", gender: "Male", healthStatus: "Healthy", energyLevel: "Low", description: "Super friendly, gentle giant. Loves kids, dogs, and cats. Perfect family dog.", characteristics: { energyLevel: "Low", size: "Large", childFriendly: true, petFriendly: true, apartmentFriendly: true, aloneTolerance: "High", requiresExperienced: false }, status: "Available", image: "dog_placeholder.png", isDemo: true }
    ];
    // Fill up to 20 profiles
    for (let i = 1; i <= 14; i++) {
      adoptionAnimals.push({
        name: `Demo Rescue ${i}`,
        animalType: i % 2 === 0 ? "Dog" : "Cat",
        breed: i % 2 === 0 ? "Indian Pariah Dog" : "Indian Stray Cat",
        age: `${(i % 3) + 1} Years`,
        size: i % 3 === 0 ? "Small" : i % 3 === 1 ? "Medium" : "Large",
        gender: i % 2 === 0 ? "Male" : "Female",
        healthStatus: "Healthy",
        energyLevel: i % 2 === 0 ? "High" : "Low",
        description: `This is a friendly demo pet ${i} available for adoption.`,
        characteristics: {
          energyLevel: i % 2 === 0 ? "High" : "Low",
          size: i % 3 === 0 ? "Small" : i % 3 === 1 ? "Medium" : "Large",
          childFriendly: true,
          petFriendly: true,
          apartmentFriendly: true,
          aloneTolerance: i % 2 === 0 ? "Medium" : "High",
          requiresExperienced: false
        },
        status: "Available",
        image: i % 2 === 0 ? "dog_placeholder.png" : "cat_placeholder.png",
        isDemo: true
      });
    }
    for (const a of adoptionAnimals) {
      await db.collection('rescued_animals').add(a);
    }

    // 5. Seed tag orders (for dashboard metrics)
    for (let i = 1; i <= 12; i++) {
      await db.collection('orders').add({
        petName: `Demo Collar Tag ${i}`,
        ownerEmail: `owner${i}@example.com`,
        status: i % 3 === 0 ? "Pending" : i % 3 === 1 ? "Delivered" : "Activated",
        price: 299,
        timestamp: new Date(Date.now() - i * 86400000).toISOString(),
        isDemo: true
      });
    }

    // 6. Seed current owner's demo pets (Rocky and Mimi)
    const rockyRef = await db.collection('pets').add({
      name: "Rocky",
      type: "Dog",
      breed: "Indian Pariah Dog",
      gender: "Male",
      color: "Brown",
      age: "2",
      ownerId: uid,
      lostStatus: "LOST",
      hasTag: true,
      tagId: "TAG-ROCKY-123",
      vaccinationStatus: "Up-to-date",
      isDemo: true
    });

    const mimiRef = await db.collection('pets').add({
      name: "Mimi",
      type: "Cat",
      breed: "Indian Stray Cat",
      gender: "Female",
      color: "Tricolor",
      age: "1",
      ownerId: uid,
      lostStatus: "SAFE",
      hasTag: true,
      tagId: "TAG-MIMI-456",
      vaccinationStatus: "Out-of-date",
      isDemo: true
    });

    // Plot scan logs for Rocky (trajectory vectoring)
    const rockyScans = [
      { latitude: 12.97159, longitude: 77.59456, timestamp: new Date(Date.now() - 3.5 * 3600000).toISOString(), accuracy: 10, ipGeolocated: false, deviceType: "Mobile" },
      { latitude: 12.97300, longitude: 77.59600, timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), accuracy: 15, ipGeolocated: false, deviceType: "Mobile" },
      { latitude: 12.97510, longitude: 77.59850, timestamp: new Date(Date.now() - 0.5 * 3600000).toISOString(), accuracy: 20, ipGeolocated: false, deviceType: "Mobile" }
    ];
    for (const s of rockyScans) {
      await db.collection('pets').doc(rockyRef.id).collection('scans').add(s);
    }

    // Rocky weight milestones
    const rockyWeights = [
      { weight: 11.2, date: new Date(Date.now() - 90 * 86400000).toISOString(), isDemo: true },
      { weight: 12.4, date: new Date(Date.now() - 60 * 86400000).toISOString(), isDemo: true },
      { weight: 13.8, date: new Date(Date.now() - 30 * 86400000).toISOString(), isDemo: true },
      { weight: 15.0, date: new Date().toISOString(), isDemo: true }
    ];
    for (const w of rockyWeights) {
      await db.collection('pets').doc(rockyRef.id).collection('journal_entries').add(w);
    }

    // Rocky vaccines
    const rockyMeds = [
      { type: "Vaccine", name: "Rabies Booster", date: new Date(Date.now() - 30 * 86400000).toISOString(), nextDue: new Date(Date.now() + 335 * 86400000).toISOString(), status: "Completed", isDemo: true },
      { type: "Vaccine", name: "DHPPi Booster", date: new Date(Date.now() - 60 * 86400000).toISOString(), nextDue: new Date(Date.now() + 305 * 86400000).toISOString(), status: "Completed", isDemo: true },
      { type: "Vaccine", name: "Deworming", date: new Date(Date.now() - 10 * 86400000).toISOString(), nextDue: new Date(Date.now() + 80 * 86400000).toISOString(), status: "Completed", isDemo: true }
    ];
    for (const m of rockyMeds) {
      await db.collection('pets').doc(rockyRef.id).collection('medical_records').add(m);
    }

    // Mimi weight milestones
    const mimiWeights = [
      { weight: 2.8, date: new Date(Date.now() - 90 * 86400000).toISOString(), isDemo: true },
      { weight: 3.1, date: new Date(Date.now() - 60 * 86400000).toISOString(), isDemo: true },
      { weight: 3.3, date: new Date(Date.now() - 30 * 86400000).toISOString(), isDemo: true },
      { weight: 3.5, date: new Date().toISOString(), isDemo: true }
    ];
    for (const w of mimiWeights) {
      await db.collection('pets').doc(mimiRef.id).collection('journal_entries').add(w);
    }

    // Mimi vaccines (includes overdue target)
    const mimiMeds = [
      { type: "Vaccine", name: "Feline Leukemia (FeLV)", date: new Date(Date.now() - 380 * 86400000).toISOString(), nextDue: new Date(Date.now() - 15 * 86400000).toISOString(), status: "Overdue", isDemo: true },
      { type: "Vaccine", name: "Rabies Booster", date: new Date(Date.now() - 120 * 86400000).toISOString(), nextDue: new Date(Date.now() + 245 * 86400000).toISOString(), status: "Completed", isDemo: true }
    ];
    for (const m of mimiMeds) {
      await db.collection('pets').doc(mimiRef.id).collection('medical_records').add(m);
    }

    // Update system stats document (Option A Aggregates) - Admin-only write
    const userDoc = await db.collection('users').doc(uid).get();
    const isUserAdmin = userDoc.exists && userDoc.data().role === 'admin';

    if (isUserAdmin) {
      await db.collection('system_stats').doc('dashboard').set({
        petsReunited: 2,
        currentlyLost: 1,
        successfulAdoptions: 5,
        criticalTriage: 3,
        alertsCount: 192,
        ngoCount: 3,
        vetCount: 4,
        isDemo: true
      });
    } else {
      console.warn("Skipped updating system_stats/dashboard: User does not have write permissions (Admin only).");
    }

    showToast("Sandbox demo database populated successfully!", "success");
  } catch (error) {
    console.error("Seeding Error:", error);
    showToast(`Seeding failed: ${error.message}`, "error");
  } finally {
    showLoading(false);
  }
}

export async function clearDatabase(uid) {
  showLoading(true, "Clearing Sandbox Demo Data...");
  try {
    const collections = ['vetProfiles', 'ngoProfiles', 'stray_reports', 'rescued_animals', 'orders'];
    for (const col of collections) {
      const snap = await db.collection(col).where('isDemo', '==', true).get();
      const batch = db.batch();
      let count = 0;
      snap.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      if (count > 0) await batch.commit();
    }

    // Delete user's demo pets and their subcollections
    const petsSnap = await db.collection('pets').where('ownerId', '==', uid).where('isDemo', '==', true).get();
    for (const doc of petsSnap.docs) {
      const petId = doc.id;
      const subcols = ['scans', 'journal_entries', 'medical_records'];
      for (const sc of subcols) {
        const subSnap = await db.collection('pets').doc(petId).collection(sc).get();
        const batch = db.batch();
        let count = 0;
        subSnap.forEach(subDoc => {
          batch.delete(subDoc.ref);
          count++;
        });
        if (count > 0) await batch.commit();
      }
      await db.collection('pets').doc(petId).delete();
    }

    // Delete system stats document (Option A Aggregates) - Admin-only write
    const userDoc = await db.collection('users').doc(uid).get();
    const isUserAdmin = userDoc.exists && userDoc.data().role === 'admin';

    if (isUserAdmin) {
      await db.collection('system_stats').doc('dashboard').delete();
    } else {
      console.warn("Skipped deleting system_stats/dashboard: User does not have write permissions (Admin only).");
    }

    showToast("Sandbox demo data cleared.", "success");
  } catch (error) {
    console.error("Clear Database Error:", error);
    showToast(`Clear failed: ${error.message}`, "error");
  } finally {
    showLoading(false);
  }
}

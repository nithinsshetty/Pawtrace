# 🐾 PawTrace — Smart Digital Pet Identity & Recovery Ecosystem

PawTrace is a responsive Single Page Application (SPA) designed to provide a digital ecosystem for pet owners, veterinarians, NGOs, service providers, and administrators.

The platform provides digital pet identity, QR-linked pet profiles, medical records, reminders, lost-pet recovery, caregiver access, veterinary services, NGO workflows, adoption functionality, marketplace features, notifications, community functionality, and AI-assisted pet support.

The application uses a lightweight frontend architecture with Vanilla JavaScript ES Modules and a Node.js/Express backend. **PawTrace is fully independent of Firebase — all authentication, database, storage, and backend services run entirely on Supabase.**

---

# 🛠️ Technology Stack

## Frontend
* HTML5
* CSS3
* Vanilla JavaScript
* JavaScript ES Modules
* Hash-based SPA routing
* Responsive UI
* Progressive Web App (PWA) support

## Backend
* Node.js
* Express.js
* REST API
* CORS
* dotenv
* bcrypt

## Database, Authentication & Storage
* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase Storage (file uploads: pet photos, medical attachments, journal photos)
* Supabase JavaScript Client
* Row Level Security (RLS) on every table

## Other Libraries
* Chart.js
* QRCode.js
* Leaflet.js
* OpenStreetMap

---

# ✨ Main Features

* 🐾 Digital pet identity profiles
* 🔳 QR-linked pet identification
* 🏥 Medical and vaccination records
* 💊 Health and medication reminders
* 📍 Lost-pet recovery and location scanning
* 👥 Temporary caregiver access
* 👨‍⚕️ Veterinary portal
* 🏠 NGO rescue and adoption workflows
* 🏡 Adoption center
* 🛒 Pet services and marketplace functionality
* 📦 Orders and listings
* 💬 Community functionality
* 🔔 Notifications
* 🤖 AI-assisted pet support
* 📊 Pet growth and health information
* 👨‍💼 Admin functionality
* 📱 Responsive desktop and mobile interface
* 📲 Progressive Web App support

---

# 📂 Project Structure

```
PawTrace/
│
├── backend/
│   ├── chatbot-routes.js
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── supabase-admin.js
│
├── database/
│   └── schema.sql
│
├── assets/
│
├── index.html
├── style.css
├── app.js
├── router.js
├── auth.js
├── utils.js
├── api-config.js
├── supabase-config.js
├── dashboard.js
├── pets.js
├── medical.js
├── reminders.js
├── journal.js
├── caregiver.js
├── scan.js
├── vets.js
├── vet-portal.js
├── ngo.js
├── adoptions-client.js
├── community.js
├── notifications.js
├── services.js
├── service-portal.js
├── listings.js
├── orders.js
├── admin.js
├── settings.js
├── ai.js
├── pages.js
├── manifest.json
├── sw.js
├── robots.txt
├── sitemap.xml
└── README.md
```

---

# ⚙️ Requirements

Before running PawTrace locally, install:

1. Node.js
2. npm
3. A modern web browser
4. A free Supabase account (https://supabase.com)

Verify installation:
```bash
node --version
npm --version
```

---

# 🚀 LOCAL INSTALLATION

## Step 1 — Extract the ZIP
Extract `PawTrace.zip` to any location and open the extracted `PawTrace` folder.

## Step 2 — Create a Supabase Project
1. Go to https://supabase.com and create a new project.
2. Wait for provisioning to finish.
3. Go to **Project Settings → API Keys** and copy:
   - Project URL
   - Publishable (anon) key
   - Secret (service_role) key — **keep this private, backend only**

## Step 3 — Set Up the Database Schema
This step is required — the database is empty by default and the app will not function without it.

1. Open your Supabase project → **SQL Editor**.
2. Open `database/schema.sql` from this ZIP.
3. Paste the entire contents into the SQL Editor and click **Run**.
4. Confirm it completes with no errors. This creates all tables (users, pets, medical_records, reminders, journal_entries, orders, notifications, vet_access, appointments, service_providers, service_bookings, rescued_animals, adoption_applications, community_posts, and others) along with their Row Level Security policies.

## Step 4 — Create Storage Buckets
In your Supabase project → **Storage**, create these three buckets:

| Bucket name | Public |
|---|---|
| `pet-photos` | Yes |
| `journal-photos` | Yes |
| `medical-attachments` | No |

After creating them, go back to the SQL Editor and run the storage policy statements included at the bottom of `database/schema.sql` (they are labeled clearly in the file) — these control who can upload/view files in each bucket.

## Step 5 — Configure the Frontend
Open `supabase-config.js` in the project root and set:
```javascript
const supabaseUrl = "YOUR_SUPABASE_PROJECT_URL";
const supabaseAnonKey = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

## Step 6 — Configure Backend Environment Variables
Create a single `backend/.env` file containing all backend secrets together:
```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
PORT=5000
```
- The service-role key must remain private and must only be used by the backend — never place it in any frontend file.
- `GEMINI_API_KEY` is required for the AI chatbot (`backend/chatbot-routes.js`) — without it, `/api/chatbot/chat` will respond with a clear `500` error explaining the key is missing.
- Get a Gemini API key at https://aistudio.google.com/apikey.

## Step 7 — Install Backend Dependencies
```bash
cd backend
npm install
```

## Step 8 — Start the Backend
```bash
npm start
```
Runs at: `http://localhost:5000`

## Step 9 — Test the Backend
Open `http://localhost:5000/api/health` in your browser. Expected response:
```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

## Step 10 — Start the Frontend
Keep the backend terminal running, open a second terminal, and return to the project root:
```bash
cd ..
```
Do not open `index.html` directly via `file://` — ES module imports require a real HTTP server.

**Option A — Python:**
```bash
python -m http.server 8080
```
**Option B — Node.js:**
```bash
npx http-server . -p 8080
```
**Option C — VS Code Live Server:** open the folder in VS Code and click "Go Live."

Open `http://localhost:8080`.

---

# 🖥️ Running the Complete Application (Summary)

**Terminal 1 — Backend:**
```bash
cd PawTrace/backend
npm install
npm start
```
→ `http://localhost:5000`

**Terminal 2 — Frontend:**
```bash
cd PawTrace
python -m http.server 8080
```
→ `http://localhost:8080`

---

# 🔐 Creating a Test Admin Account

There is no separate admin signup form. To get admin access for testing:

1. Sign up normally through the app as a regular user.
2. In Supabase → SQL Editor, run:
```sql
update public.users set role = 'admin' where email = 'YOUR_TEST_EMAIL_HERE';
```
3. Log out and log back in — the account now has full Admin Portal access.

To test the Vet or NGO portals, sign up using the role selector on the signup screen and choose "Veterinarian" or "NGO Rescue" — these accounts start in a pending-verification state and must be approved via the Admin Portal (Vet Verification / NGO Approval tabs) before their full portal unlocks.

---

# 🔌 API Configuration

Frontend API base URL is set in `api-config.js`. During local development this should point to `http://localhost:5000`. Ensure the backend is running on port `5000` before testing frontend features that call it (AI chatbot).

---

# 🤖 AI Chatbot Backend

Located in `backend/chatbot-routes.js`, registered under `/api/chatbot`, main server in `backend/server.js`. The route creates its own Supabase client using the service-role key (`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` from `backend/.env`) and authenticates every request by verifying the caller's Supabase JWT via `supabase.auth.getUser(accessToken)` — **not** Firebase tokens. If chat messages don't get replies, check, in order:
1. `backend/.env` has `GEMINI_API_KEY` set (see Step 6) — the server logs a startup warning if it's missing.
2. `backend/.env` has valid `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — the server will refuse to start without these.
3. The frontend is sending a valid `Authorization: Bearer <access_token>` header (see `ai.js`).

Health endpoint: `GET /api/health``

---

# 🔐 Authentication

PawTrace uses Supabase Authentication exclusively. Core logic lives in `auth.js`. Application roles: Pet Owner/Customer, Veterinarian, NGO, Service Provider, Administrator.

---

# 🗄️ Database & Storage

- Database: Supabase PostgreSQL, schema in `database/schema.sql`
- Frontend Supabase client: `supabase-config.js`
- Backend Supabase client: `backend/supabase-admin.js`
- File storage: Supabase Storage, three buckets as described in Step 4
- All tables are protected with Row Level Security — do not disable RLS on any table.

---

# 📱 Progressive Web App

PWA functionality via `manifest.json` and `sw.js`. The service worker manages caching and offline resources.

---

# 🌐 SEO

`robots.txt` and `sitemap.xml` support search engine crawling.

---

# 🧪 Local Testing Checklist

* User registration (owner, vet, NGO, service provider)
* Login / logout
* Dashboard
* Pet creation with photo upload
* Pet profile (all tabs: Profile, Medical, Reminders, Journal)
* QR scan flow (open `#/scan/{petId}` in an incognito window)
* Medical records with file attachment
* Reminders
* Caregiver link generation and anonymous access
* Vet portal: appointments, accept/reject, medical logging
* NGO portal: intake, fosters, volunteers, adoption applications, stray reports
* Adoption center browsing and applications
* Marketplace listings
* Service booking (owner + provider sides)
* Notifications (real-time)
* Community posts, likes, comments
* Admin portal (all 8 tabs)
* AI chatbot reply
* Responsive/mobile layout
* PWA install prompt

---

# 🐛 Troubleshooting

**Frontend does not load** — use `http://localhost:8080`, never open `index.html` via `file://`.

**API requests fail** — confirm backend is running (`cd backend && npm start`), then check `http://localhost:5000/api/health`.

**Supabase authentication fails** — check `supabase-config.js` for correct URL and publishable key.

**Signup succeeds but role/profile data is missing** — confirm `database/schema.sql` ran successfully, specifically the `handle_new_user()` trigger.

**File uploads fail** — confirm the three Storage buckets exist with correct public/private settings and their policies were applied (Step 4).

**AI chatbot doesn't reply** — confirm the backend is running and that `chatbot-routes.js` verifies Supabase JWTs, not Firebase tokens.

**Backend reports missing environment variables** — confirm `backend/.env` contains `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PORT=5000`, then restart the backend.

---

# 📦 ZIP Distribution

Include: all source files, `database/schema.sql`, this README.

Do not include:
```
node_modules/
backend/node_modules/
backend/.env
.git/
.agents/
scratch/
old Firebase files
debug/search scripts
old test files
unused JSON data files
```

Install backend dependencies after extraction: `cd backend && npm install`

---

# 🔑 Required Credentials

**Frontend:** Supabase Project URL, Supabase Publishable/Anon Key
**Backend:** Supabase Project URL, Supabase Service Role Key (private — provide separately to authorized testers, never in the ZIP)

---

# 🏗️ Application Architecture

```
Browser
   │
   ├── Vanilla JavaScript SPA
   ├── Supabase Client (Auth, Database, Storage, Realtime)
   │
   └── REST API
          │
          ▼
   Node.js + Express
          │
          ▼
      Supabase
          │
          ├── Authentication
          ├── PostgreSQL (with Row Level Security)
          └── Storage
```

---

# 👨‍💻 PawTrace

**Smart Digital Pet Identity & Recovery Ecosystem**

**Frontend:** Vanilla JavaScript SPA
**Backend:** Node.js + Express
**Database:** Supabase PostgreSQL
**Authentication:** Supabase Authentication
**Storage:** Supabase Storage
**API:** REST
**PWA:** Service Worker + Web App Manifest

This application is fully independent of Firebase — no Firebase services are used anywhere in authentication, database, storage, hosting, or backend functionality.

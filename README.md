# PawTrace — Smart Digital Pet Identity & Recovery Ecosystem

PawTrace is a production-quality, responsive Single Page Application (SPA) designed to secure pets with digital identity profiles, QR-linked collar tags, real-time geolocation recovery scans, and flexible caregiver sharing permissions.

Built completely from scratch using a secure, client-side modular architecture without bundlers or heavy frameworks.

---

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3 (Glassmorphism layout, Terracotta & Teal warm earth theme), Vanilla JavaScript (ES Modules).
* **Database & Auth:** Firebase v8 SDK (Auth, Firestore, Cloud Storage).
* **Libraries:** 
  - Chart.js (Growth & weight curve plotting, AI regressions)
  - QRCode.js (Printable capability QR tag generation)
  - Leaflet.js (Interactive OpenStreetMap tracking maps)
* **SEO:** Semantic structure, Sitemap, crawler guidelines.
* **PWA:** Service Worker caching, Offline modes, Standalone display mode.

---

## 📂 Project Architecture

```text
pawtrace/
├── index.html               # Main SPA entry point, CDN script loading
├── style.css                # Global design system, glassmorphic layout, dark theme
├── firebase-config.js       # Firebase v8 configuration and initializer
├── router.js                # Custom client-side hash router with auth guards
├── utils.js                 # Shared UI elements: toast, modals, loaders, GPS queries
├── auth.js                  # Authentication operations (signup, login, profiles, onboarding)
├── app.js                   # Main application coordinator & PWA service worker registration
├── dashboard.js             # Owner Dashboard: metrics, pet cards, recent scans map, and alerts feed
├── pets.js                  # Pet Profile CRUD, QR Printable Tag code, details tabs
├── scan.js                  # Public scan responder, geolocation logger, scan analytics
├── medical.js               # Vaccination timeline, surgery logs, files upload
├── reminders.js             # Reminders scheduler, completion widgets, calendar-style logs
├── journal.js               # Milestones, weight log, Chart.js weight progression curve
├── caregiver.js             # Temporary caregiver keys generation, permission checks, caregiver view
├── vets.js                  # Vet Finder: location searches, emergency clinics, appointments
├── vet-portal.js            # Vet Dashboard: verify license, patient history, log reports/treatment
├── ngo.js                   # NGO Portal: stray reports, adoption list, rescue cases tracker
├── community.js             # Community Hub: posts feed, stories showcase, comments & likes
├── notifications.js         # Unified Notification panel, clear utilities, live alerts dropdown
├── settings.js              # Theme manager, diagnostic logs, account details
├── ai.js                    # AI Predictive Analytics: Breed ID mock, health scorer, lost motion projection
├── sw.js                    # Service Worker caching assets for offline PWA installability
├── manifest.json            # PWA manifest configurations
├── firestore.rules          # Firestore collection authorization security rules
├── firestore.indexes.json   # Composite indices for advanced query ordering
├── firebase.json            # Deployment hosting configuration
├── robots.txt               # SEO Crawlers guidelines
├── sitemap.xml              # Search engine mapping layout
└── README.md                # Configuration and installation guide
```

---

## ⚙️ Setup and Deployment Guide

Follow these steps to initialize and deploy your PawTrace application:

### Step 1: Firebase Project Creation
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it `PawTrace`.
3. Enable Google Analytics (Optional) and click **Create Project**.

### Step 2: Enable Firebase Services
Configure the following services in the console:

* **Authentication:**
  1. Click **Authentication** in the left menu, then click **Get Started**.
  2. Select **Email/Password** under Native Providers and toggle it to **Enabled**. Save.
  
* **Cloud Firestore:**
  1. Click **Firestore Database**, then click **Create Database**.
  2. Select **Start in Test Mode** (you will upload the production rules later) and click **Next**.
  3. Select your database location and click **Enable**.
  
* **Cloud Storage:**
  1. Click **Storage**, then click **Get Started**.
  2. Choose test mode, click **Next**, and click **Done**.

### Step 3: Local Development Run
Since the application uses ES Modules, opening the `index.html` file directly in a browser via the `file://` protocol will cause CORS restrictions. Run a local web server inside this directory:

* **Option A: Node.js (http-server)**
  ```bash
  npx http-server . -p 8080
  ```
* **Option B: Python**
  ```bash
  python -m http.server 8080
  ```
* **Option C: VS Code**
  Install the **Live Server** extension and click **Go Live**.

Open your browser to `http://localhost:8080/`.

### Step 4: Deploy to Live Hosting
Deploy the security configuration and files to Firebase:

1. Install the Firebase CLI globally if you haven't:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in to your Google Account:
   ```bash
   firebase login
   ```
3. Initialize the directory association (Select your active project):
   ```bash
   firebase use --add pawtrace-2aa9a
   ```
4. Deploy the rules, indexes, and hosting assets:
   ```bash
   firebase deploy
   ```

---

## 🔒 Security & Data Integrity

The [firestore.rules](file:///C:/Users/NITHIN S SHETTY/.gemini/antigravity/scratch/pawtrace/firestore.rules) file secures pet records, medical history, notifications, and scans:
* **Pets & Medical logs:** Access is limited to the authenticated `ownerId` of the document or authorized veterinarians inside `sharedWithVets`, unless the pet is flagged as `lostStatus == 'LOST'` (releasing critical recovery information to scanners).
* **Caregiver Tokens:** Expiring, cryptographically random sharing keys are stored in `caregiver_tokens`. These give read/write access to specified subcollections for users matching the sharing key path, even if they aren't logged in.
* **Scan GPS logs:** Scanners have write-only permission to register coordinates, preventing database reading by third parties.
* **NGO Rescue Cases:** Updating stray reports and adoption postings is restricted to authenticated user accounts carrying the role `ngo`.
* **Community Board:** Adding likes, publishing comments and posting discussions is guarded to authenticated users.

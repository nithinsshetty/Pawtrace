# 🐾 PawTrace — Smart Digital Pet Identity & Recovery Ecosystem

PawTrace is a responsive Single Page Application (SPA) designed to provide a digital ecosystem for pet owners, veterinarians, NGOs, service providers, and administrators.

The platform provides digital pet identity, QR-linked pet profiles, medical records, reminders, lost-pet recovery, caregiver access, veterinary services, NGO workflows, adoption functionality, marketplace features, notifications, community functionality, and AI-assisted pet support.

The application uses a lightweight frontend architecture with Vanilla JavaScript ES Modules and a Node.js/Express backend.

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

## Database & Authentication

* Supabase
* PostgreSQL
* Supabase Authentication
* Supabase JavaScript Client

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

```text
PawTrace/
│
├── backend/
│   ├── chatbot-routes.js
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── supabase-admin.js
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

Verify the installation:

```bash
node --version
npm --version
```

---

# 🚀 LOCAL INSTALLATION

## Step 1 — Extract the ZIP

Extract `PawTrace.zip` to any location and open the extracted `PawTrace` folder.

---

## Step 2 — Configure Supabase

PawTrace uses Supabase for authentication and database functionality.

The frontend configuration is located in:

```text
supabase-config.js
```

If the ZIP already contains the correct Supabase URL and publishable/anon key, no changes are required.

---

# 🔐 Backend Environment Variables

Create:

```text
backend/.env
```

Add:

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PORT=5000
```

The Supabase service-role key must remain private and must only be used by the backend.

---

# Step 3 — Install Backend Dependencies

Open a terminal in the PawTrace directory:

```bash
cd backend
npm install
```

---

# Step 4 — Start the Backend

```bash
npm start
```

The backend will run at:

```text
http://localhost:5000
```

---

# Step 5 — Test the Backend

Open:

```text
http://localhost:5000/api/health
```

A successful response should look similar to:

```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

---

# Step 6 — Start the Frontend

Keep the backend terminal running and open a second terminal.

Return to the PawTrace root directory:

```bash
cd ..
```

Do not open `index.html` directly using `file://`.

Use a local HTTP server.

## Option A — Python

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

## Option B — Node.js

```bash
npx http-server . -p 8080
```

Open:

```text
http://localhost:8080
```

## Option C — VS Code Live Server

Open the PawTrace folder in VS Code and select **Go Live**.

---

# 🖥️ Running the Complete Application

Two terminals are required.

### Terminal 1 — Backend

```bash
cd PawTrace/backend
npm install
npm start
```

Backend:

```text
http://localhost:5000
```

### Terminal 2 — Frontend

```bash
cd PawTrace
python -m http.server 8080
```

Frontend:

```text
http://localhost:8080
```

---

# 🔌 API Configuration

The frontend API configuration is located in:

```text
api-config.js
```

During local development, the application uses:

```text
http://localhost:5000
```

Make sure the backend is running on port `5000`.

---

# 🤖 AI Chatbot Backend

The chatbot backend is located in:

```text
backend/chatbot-routes.js
```

The chatbot API is registered under:

```text
/api/chatbot
```

The main backend server is:

```text
backend/server.js
```

Health endpoint:

```text
GET /api/health
```

---

# 🔐 Authentication

PawTrace uses Supabase Authentication.

Authentication logic:

```text
auth.js
```

Application roles include:

* Pet Owner / Customer
* Veterinarian
* NGO
* Administrator

---

# 🗄️ Database

PawTrace uses:

```text
Supabase PostgreSQL
```

Frontend Supabase client:

```text
supabase-config.js
```

Backend Supabase client:

```text
backend/supabase-admin.js
```

Database security should be enforced through appropriate Supabase Row Level Security (RLS) policies.

---

# 📱 Progressive Web App

PawTrace includes PWA functionality through:

```text
manifest.json
sw.js
```

The service worker manages application caching and offline resources.

---

# 🌐 SEO

PawTrace includes:

```text
robots.txt
sitemap.xml
```

These files support search engine crawling and SEO.

---

# 🧪 Local Testing Checklist

After starting both servers, test:

* User registration
* User login
* Logout
* Dashboard
* Pet creation
* Pet profile
* QR functionality
* Medical records
* Reminders
* Caregiver functionality
* Veterinary functionality
* NGO functionality
* Adoption functionality
* Marketplace functionality
* Services
* Notifications
* Community functionality
* Admin functionality
* AI/chatbot functionality
* Responsive/mobile interface
* PWA functionality

---

# 🐛 Troubleshooting

## Frontend does not load

Use:

```text
http://localhost:8080
```

Do not open:

```text
file:///C:/.../index.html
```

## API requests fail

Make sure the backend is running:

```bash
cd backend
npm start
```

Then check:

```text
http://localhost:5000/api/health
```

## Supabase authentication fails

Check:

```text
supabase-config.js
```

Verify the Supabase URL and publishable/anon key.

## Backend reports missing environment variables

Make sure:

```text
backend/.env
```

contains:

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PORT=5000
```

Restart the backend after changing `.env`.

---

# 📦 ZIP Distribution

The ZIP should contain the source code and required project files.

Do not include:

```text
node_modules/
backend/node_modules/
backend/.env
serviceAccountKey.json
.git/
.agents/
scratch/
old Firebase files
debug/search scripts
old test files
unused JSON data files
```

Install backend dependencies after extraction:

```bash
cd backend
npm install
```

---

# 🔑 Required Credentials

### Frontend

```text
Supabase Project URL
Supabase Publishable/Anon Key
```

### Backend

```text
Supabase Project URL
Supabase Service Role Key
```

The service-role key must remain private and should be provided separately to authorized testers if required.

---

# 🏗️ Application Architecture

PawTrace follows a lightweight SPA + REST backend architecture.

```text
Browser
   │
   ├── Vanilla JavaScript SPA
   │
   ├── Supabase Client
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
          └── PostgreSQL
```

---

# 🧹 Legacy Firebase

The original version of PawTrace was developed using Firebase.

The current architecture uses:

```text
Supabase Authentication
        +
Supabase PostgreSQL
        +
Supabase JavaScript Client
        +
Node.js / Express Backend
```

The current application does not require Firebase for its active authentication, database, or backend functionality.

---

# 📌 Quick Start

### 1. Extract ZIP

```text
Extract PawTrace.zip
```

### 2. Create backend environment file

```text
backend/.env
```

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PORT=5000
```

### 3. Install backend

```bash
cd backend
npm install
```

### 4. Start backend

```bash
npm start
```

Backend:

```text
http://localhost:5000
```

### 5. Open a second terminal

```bash
cd ..
```

### 6. Start frontend

```bash
python -m http.server 8080
```

### 7. Open PawTrace

```text
http://localhost:8080
```

---

# 👨‍💻 PawTrace

**Smart Digital Pet Identity & Recovery Ecosystem**

**Frontend:** Vanilla JavaScript SPA
**Backend:** Node.js + Express
**Database:** Supabase PostgreSQL
**Authentication:** Supabase Authentication
**API:** REST
**PWA:** Service Worker + Web App Manifest

The application does not depend on Firebase for its active application functionality.

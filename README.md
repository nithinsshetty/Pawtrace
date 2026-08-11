````markdown
# PawTrace — Smart Digital Pet Identity & Recovery Ecosystem

PawTrace is a production-quality, responsive Single Page Application (SPA) designed to provide secure digital pet identities, QR-linked pet profiles, medical record management, reminders, lost-pet recovery, caregiver access, veterinary services, NGO workflows, marketplace functionality, and AI-assisted pet support.

The application is built using a lightweight client-side architecture with Vanilla JavaScript ES Modules and a Node.js/Express backend.

The project has been migrated from Firebase to Supabase for authentication and database functionality.

---

## 🚀 Key Features

- 🐾 Digital pet identity profiles
- 🔳 QR-linked pet identification
- 🏥 Medical and vaccination records
- 💊 Health and medication reminders
- 📍 Lost-pet recovery and location scanning
- 👥 Temporary caregiver access
- 👨‍⚕️ Veterinary portal and services
- 🏠 NGO rescue and adoption workflows
- 🛒 Pet services and marketplace
- 💬 Community functionality
- 🔔 Notifications
- 🤖 AI-powered pet assistance
- 📊 Pet health and growth information
- 📱 Responsive desktop and mobile UI
- 🌐 Single Page Application architecture
- 📲 Progressive Web App (PWA) support
- 🔍 SEO support through sitemap and robots.txt

---

# 🛠️ Technology Stack

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript
- ES Modules
- Responsive UI
- Glassmorphism-inspired design
- Hash-based SPA routing

## Backend

- Node.js
- Express.js
- CORS
- dotenv
- bcrypt
- REST API

## Database & Authentication

- Supabase
- Supabase PostgreSQL
- Supabase Authentication
- Supabase JavaScript Client
- Supabase service-role client for trusted backend operations

## Additional Libraries / Services

- Chart.js — charts and growth visualization
- QRCode.js — QR code generation
- Leaflet.js — maps and location visualization
- OpenStreetMap — map data

## PWA

- Service Worker
- Web App Manifest
- Offline asset caching
- Installable web application support

---

# 📂 Project Structure

```text
pawtrace/
│
├── assets/
│
├── backend/
│   ├── chatbot-routes.js
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── supabase-admin.js
│
├── admin.js
├── adoptions-client.js
├── ai.js
├── api-config.js
├── app.js
├── auth.js
├── caregiver.js
├── community.js
├── dashboard.js
├── index.html
├── journal.js
├── listings.js
├── manifest.json
├── medical.js
├── ngo.js
├── notifications.js
├── orders.js
├── pages.js
├── pets.js
├── README.md
├── reminders.js
├── robots.txt
├── router.js
├── scan.js
├── service-portal.js
├── services.js
├── settings.js
├── sitemap.xml
├── style.css
├── supabase-config.js
├── sw.js
├── utils.js
├── vet-portal.js
├── vets.js
└── .gitignore
````

---

# 🏗️ Architecture

PawTrace follows a lightweight SPA + REST backend architecture.

```text
                    ┌──────────────────────┐
                    │      Browser         │
                    │                      │
                    │ HTML / CSS / JS      │
                    │ ES Modules           │
                    │ SPA Router           │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Supabase Client    │
                    │                      │
                    │ Authentication       │
                    │ PostgreSQL access    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Supabase        │
                    │                      │
                    │ PostgreSQL           │
                    │ Auth                 │
                    │ Storage              │
                    └──────────────────────┘


                    ┌──────────────────────┐
                    │      Browser         │
                    └──────────┬───────────┘
                               │
                         REST API calls
                               │
                    ┌──────────▼───────────┐
                    │ Node.js + Express    │
                    │                      │
                    │ Backend API          │
                    │ Chatbot API          │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Supabase        │
                    │      Backend         │
                    └──────────────────────┘
```

---

# 🔐 Supabase Configuration

The frontend uses the Supabase JavaScript client through:

```text
supabase-config.js
```

The frontend requires:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

The backend uses:

```text
backend/supabase-admin.js
```

and requires:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### Important Security Rule

The Supabase service-role key is a secret and must NEVER be placed inside frontend JavaScript.

It must only exist inside:

```text
backend/.env
```

The `.env` file is excluded from Git using `.gitignore`.

The frontend may use the Supabase publishable/anon key because it is designed for client-side use. Database access must still be protected using appropriate Supabase Row Level Security (RLS) policies.

---

# ⚙️ Local Development Setup

## Requirements

Install the following before running PawTrace:

* Node.js
* npm
* Git
* A modern web browser

Verify Node.js:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

---

# 1. Clone the Repository

```bash
git clone https://github.com/nithinsshetty/Pawtrace.git
```

Enter the project:

```bash
cd Pawtrace
```

Switch to the migration branch if required:

```bash
git checkout firebase-to-supabase
```

---

# 2. Install Frontend Dependencies

From the project root:

```bash
npm install
```

The frontend currently uses the Supabase JavaScript client.

---

# 3. Configure Supabase

Create or use a Supabase project.

You will need:

```text
Supabase Project URL
Supabase Publishable/Anon Key
```

Configure the frontend in:

```text
supabase-config.js
```

Example structure:

```javascript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_PUBLISHABLE_KEY';

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);
```

Do not place the service-role key in this file.

---

# 4. Configure the Backend

Enter the backend directory:

```bash
cd backend
```

Install backend dependencies:

```bash
npm install
```

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

The `.env` file must not be committed to GitHub.

---

# 5. Start the Backend

From:

```text
pawtrace/backend/
```

run:

```bash
npm start
```

The backend should start on:

```text
http://localhost:5000
```

You can verify the server using:

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

# 6. Start the Frontend

Open another terminal.

Go back to the project root:

```bash
cd ..
```

Because PawTrace uses JavaScript ES Modules, do not open `index.html` directly using:

```text
file://
```

Use a local HTTP server instead.

### Option A — Python

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

### Option B — Node.js

If required:

```bash
npx http-server . -p 8080
```

Then open:

```text
http://localhost:8080
```

### Option C — VS Code

Install the Live Server extension and open the project using:

```text
Go Live
```

---

# 7. Run Frontend + Backend Together

You need two terminals.

### Terminal 1 — Backend

```bash
cd backend
npm install
npm start
```

Backend:

```text
http://localhost:5000
```

### Terminal 2 — Frontend

From the PawTrace root:

```bash
python -m http.server 8080
```

Frontend:

```text
http://localhost:8080
```

The frontend API configuration automatically uses the local backend when running on localhost.

---

# 🔌 API Configuration

The frontend API endpoint is configured in:

```text
api-config.js
```

Local development:

```text
http://localhost:5000
```

Production backend:

```text
https://pawtrace-backend.onrender.com
```

The configuration automatically selects the local backend when the application is opened through localhost.

---

# 🤖 AI Chatbot Backend

The AI chatbot API is handled by:

```text
backend/chatbot-routes.js
```

The Express server mounts the chatbot routes at:

```text
/api/chatbot
```

The backend server is configured in:

```text
backend/server.js
```

The backend provides:

```text
GET /api/health
```

and chatbot-related endpoints under:

```text
/api/chatbot/*
```

---

# 🔑 Authentication

PawTrace uses Supabase Authentication.

The authentication flow is handled primarily through:

```text
auth.js
```

The application uses Supabase Auth for user authentication and Supabase database records for application-specific user information such as roles and profiles.

Supported application roles include functionality for:

* Customer / Pet Owner
* Veterinarian
* NGO
* Administrator

---

# 🐾 Main Application Modules

### `app.js`

Main application coordinator.

Responsible for:

* Application initialization
* Route registration
* Authentication state handling
* Global DOM events
* Sidebar/navigation state
* PWA service-worker registration

### `router.js`

Custom hash-based SPA router.

Handles application routes without requiring a separate HTML file for every page.

### `auth.js`

Authentication and user-account functionality.

### `dashboard.js`

Pet-owner dashboard and application overview.

### `pets.js`

Pet profile management and pet-related operations.

### `medical.js`

Medical records and health information.

### `reminders.js`

Pet health and medication reminders.

### `journal.js`

Pet journal and growth/weight information.

### `caregiver.js`

Temporary caregiver access and permissions.

### `scan.js`

QR scanning and lost-pet recovery functionality.

### `vets.js`

Veterinary discovery and related functionality.

### `vet-portal.js`

Veterinarian portal.

### `ngo.js`

NGO-related rescue and adoption functionality.

### `adoptions-client.js`

Adoption center functionality.

### `community.js`

Community functionality including posts and interactions.

### `notifications.js`

Application notifications.

### `services.js`

Pet-related services.

### `service-portal.js`

Service provider portal.

### `listings.js`

Marketplace/listing functionality.

### `orders.js`

Order-related functionality.

### `admin.js`

Administrative dashboard and management functionality.

### `settings.js`

User settings and application preferences.

### `ai.js`

AI-related frontend functionality.

---

# 📱 Progressive Web App

PawTrace supports PWA functionality through:

```text
manifest.json
sw.js
```

The manifest defines:

* Application name
* Icons
* Theme
* Display mode
* Start URL
* Installation metadata

The service worker handles:

* Asset caching
* Offline functionality
* PWA resource management

---

# 🌐 SEO

PawTrace includes:

```text
robots.txt
sitemap.xml
```

### `robots.txt`

Provides crawler instructions to search engines.

### `sitemap.xml`

Provides search engines with information about available public URLs.

These files are not required for normal application execution but are retained for SEO and deployment purposes.

---

# 🗄️ Database

Supabase PostgreSQL is the application's database layer.

The project no longer relies on the previous Firebase Firestore/MySQL schema files.

Database operations are performed through:

```text
supabase-config.js
```

for frontend operations and:

```text
backend/supabase-admin.js
```

for trusted backend operations.

Database security should be enforced using Supabase Row Level Security (RLS) policies.

---

# 🔒 Security

Important security practices:

* Never commit `.env`
* Never expose the Supabase service-role key
* Never commit private service credentials
* Use Supabase RLS for database protection
* Validate authenticated users on protected backend routes
* Restrict administrative operations to authorized roles
* Validate user input on both frontend and backend
* Use HTTPS in production
* Keep backend secrets on the server only

The repository `.gitignore` excludes:

```text
.env
*.env
serviceAccountKey.json
backend/serviceAccountKey.json
node_modules/
logs
```

---

# 🧹 Legacy Firebase Migration

PawTrace was originally built using Firebase.

The project has been migrated to Supabase.

The migration removed the previous Firebase-specific application infrastructure and replaced it with Supabase-based functionality.

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

The old Firebase-specific development artifacts, debugging scripts, agent skills, Firebase configuration files, and obsolete database/test files are not part of the current application architecture.

---

# 📦 Production Deployment

## Frontend

The frontend can be deployed to any static hosting provider that supports:

* HTML
* CSS
* JavaScript ES Modules
* SPA routing
* HTTPS

Examples include:

* Vercel
* Netlify
* GitHub Pages
* Cloudflare Pages
* Firebase Hosting
* Any standard static web server

The application itself does not require Firebase to run.

---

# Backend Deployment

The Node.js backend can be deployed to services such as:

* Render
* Railway
* Fly.io
* AWS
* Azure
* Google Cloud
* Any Node.js-compatible hosting provider

Configure the following environment variables on the hosting platform:

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
PORT=5000
```

Do not upload `.env` to the repository.

---

# 🧪 Local Testing Checklist

After starting both servers, verify:

### Backend

```text
http://localhost:5000/api/health
```

Expected:

```json
{
  "status": "healthy"
}
```

### Frontend

```text
http://localhost:8080
```

Test:

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
* Vet functionality
* NGO functionality
* Adoption functionality
* Marketplace
* Services
* Notifications
* Community
* Admin functionality
* AI/chatbot functionality
* Responsive/mobile layout
* PWA installation where supported

---

# 🐛 Troubleshooting

## Frontend shows CORS/module errors

Make sure you are using an HTTP server.

Do not open:

```text
file:///...
```

Instead use:

```text
http://localhost:8080
```

---

## API requests fail

Make sure the backend is running:

```bash
cd backend
npm start
```

Then test:

```text
http://localhost:5000/api/health
```

---

## Supabase authentication fails

Check:

```text
supabase-config.js
```

and verify that the Supabase URL and publishable/anon key are correct.

---

## Backend reports missing environment variables

Verify:

```text
backend/.env
```

contains:

```env
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Restart the backend after changing `.env`.

---

## Dependencies are missing

Frontend:

```bash
npm install
```

Backend:

```bash
cd backend
npm install
```

---

# 📁 Files That Should NOT Be Committed

Never commit:

```text
.env
backend/.env
serviceAccountKey.json
backend/serviceAccountKey.json
node_modules/
```

These files may contain secrets, credentials, or generated dependencies.

---

# 📌 Development Commands

## Frontend

Install dependencies:

```bash
npm install
```

Run local frontend:

```bash
python -m http.server 8080
```

---

## Backend

```bash
cd backend
npm install
npm start
```

Development mode, if `nodemon` is installed:

```bash
npm run dev
```

---

# 📜 License

This project is currently maintained as a student/development project.

---

# 👨‍💻 Project

**PawTrace — Smart Digital Pet Identity & Recovery Ecosystem**

Built with:

```text
Vanilla JavaScript
HTML5
CSS3
Node.js
Express.js
Supabase
PostgreSQL
Chart.js
Leaflet.js
QRCode.js
PWA
```

The current production architecture is **Supabase-based and does not depend on Firebase for the application's database, authentication, or backend services**.

```
```

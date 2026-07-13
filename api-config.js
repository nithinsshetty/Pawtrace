// PawTrace API Configuration File (PaaS Migration)
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : window.location.origin; // Dynamically uses same host on PaaS deployment

export const POLLING_INTERVAL_MS = 25000; // Poll for notifications every 25 seconds

console.log(`PawTrace API Config: Backend target is ${API_BASE_URL}`);

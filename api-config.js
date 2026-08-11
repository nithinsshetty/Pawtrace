// PawTrace API Configuration File
export const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://pawtrace-backend.onrender.com';

export const POLLING_INTERVAL_MS = 25000; // Poll for notifications every 25 seconds

console.log(`PawTrace API Config: Backend target is ${API_BASE_URL}`);
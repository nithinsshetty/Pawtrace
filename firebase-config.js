// ==========================================================================
// FIREBASE CONFIGURATION AND INITIALIZATION
// ==========================================================================



const firebaseConfig = {
  apiKey: "AIzaSyDJTcgxplZ2MgwHM7wtZmYUpqdAf1Ft3X0",
  authDomain: "pawtrace-2aa9a.firebaseapp.com",
  projectId: "pawtrace-2aa9a",
  storageBucket: "pawtrace-2aa9a.firebasestorage.app",
  messagingSenderId: "94706228788",
  appId: "1:94706228788:web:d663ee5e539ef1ef6b3461",
  measurementId: "G-Y4S78YQL7W"
};

// Initialize Firebase if not already initialized
let app;
if (!firebase.apps.length) {
  app = firebase.initializeApp(firebaseConfig);
} else {
  app = firebase.app();
}

export const isFirebaseConfigured = true;
export const auth = app.auth();
export const db = app.firestore();
export const storage = app.storage();
export const fb = firebase;

export default { auth, db, storage, fb, isFirebaseConfigured };
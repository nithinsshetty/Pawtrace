// ==========================================================================
// PAWTRACE AUTHENTICATION MODULE (Firebase SDK Reversion)
// ==========================================================================

import { auth, db } from './firebase-config.js';
import { showToast, showLoading } from './utils.js';
import { Router } from './router.js';

// State management variables
let currentUser = null;
let authInitialized = false;
const authListeners = new Set();

const ADMIN_EMAILS = [
  'admin@pawtrace.com',
  'admin@example.com',
  'nithin@pawtrace.com',
  'nss@pawtrace.com',
  'nithinsshetty3@gmail.com'
];

/**
 * Register callback to trigger on user authentication state adjustments
 */
export function subscribeToAuthChanges(callback) {
  authListeners.add(callback);
  if (authInitialized) {
    callback(currentUser, true);
  }
}

function notifyAuthChange() {
  authListeners.forEach(callback => callback(currentUser, authInitialized));
}

export function getCurrentUser() {
  return currentUser;
}

export function getRouterAuthState() {
  return {
    isLoggedIn: !!currentUser,
    isPending: !authInitialized
  };
}

/**
 * Initialise session persistence state listener using custom API
 */
export function initAuth() {
  // Listen for Firebase Auth state changes
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        const role = userDoc.exists ? (userDoc.data().role || 'owner') : 'owner';
        currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role: role,
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName || user.uid)}`
        };
        console.log("Auth Session Initialized: Logged in as", currentUser.email, "with role", role);
      } catch (err) {
        console.error("Failed to load user role from Firestore:", err);
        currentUser = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          role: 'owner',
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName || user.uid)}`
        };
      }
    } else {
      currentUser = null;
      console.log("Auth Session Initialized: Logged Out");
    }
    authInitialized = true;
    notifyAuthChange();
    Router.resolve();
  });
}

/**
 * Register a new user account and synchronize parameters in Firestore
 */
export async function signUp(email, password, displayName, additionalData = { role: 'owner' }) {
  showLoading(true, "Registering profile ecosystem...");
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Update display name
    await user.updateProfile({ displayName });

    // Store user data in Firestore users collection
    const userData = {
      uid: user.uid,
      email: email.toLowerCase().trim(),
      displayName,
      role: additionalData.role
    };
    await db.collection('users').doc(user.uid).set(userData);

    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      role: additionalData.role,
      photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`
    };

    showToast(`Welcome to PawTrace, ${displayName}!`, "success");
    notifyAuthChange();
    return currentUser;
  } catch (error) {
    console.error("Sign Up Error:", error);
    showToast(error.message || "Registration failed. Please try again.", "error");
    throw error;
  } finally {
    showLoading(false);
  }
}

/**
 * Authenticate existing user session
 */
export async function signIn(email, password) {
  showLoading(true, "Authenticating user...");
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Load role from Firestore users collection
    const userDoc = await db.collection('users').doc(user.uid).get();
    const role = userDoc.exists ? (userDoc.data().role || 'owner') : 'owner';

    currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      role: role,
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.displayName || user.uid)}`
    };

    showToast("Logged in successfully!", "success");
    notifyAuthChange();
    Router.resolve();
    return currentUser;
  } catch (error) {
    console.error("Sign In Error:", error);
    showToast(error.message || "Login failed. Check your credentials.", "error");
    throw error;
  } finally {
    showLoading(false);
  }
}

/**
 * Sign out current session
 */
export async function signOut() {
  showLoading(true, "Signing out...");
  try {
    await auth.signOut();
    currentUser = null;
    showToast("Signed out successfully.", "info");
    notifyAuthChange();
    Router.navigate('/login');
  } catch (error) {
    console.error("Sign Out Error:", error);
    showToast("Logout failed.", "error");
  } finally {
    showLoading(false);
  }
}

/**
 * Update user display profile settings
 */
export async function updateUserProfile(displayName) {
  showLoading(true, "Updating profile details...");
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No authenticated user.");

    await user.updateProfile({ displayName });

    // Update in Firestore users collection
    await db.collection('users').doc(user.uid).update({ displayName });

    if (currentUser) {
      currentUser.displayName = displayName;
      currentUser.photoURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName)}`;
    }
    
    notifyAuthChange();
    showToast("Profile settings updated successfully.", "success");
  } catch (error) {
    console.error("Profile Update Error:", error);
    showToast(error.message || "Failed to update profile settings.", "error");
    throw error;
  } finally {
    showLoading(false);
  }
}
export { ADMIN_EMAILS };

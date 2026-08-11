// ==========================================================================
// PAWTRACE AUTHENTICATION MODULE (Supabase)
// ==========================================================================

import { supabase } from './supabase-config.js';
import { showToast, showLoading } from './utils.js';
import { Router } from './router.js';

let currentUser = null;
let authInitialized = false;
const authListeners = new Set();

const ADMIN_EMAILS = [
  'nss@pt.com'
];

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

// TODO: vet/ngo/service_provider approval checks depended on Firestore fields
// (vetDetails, ngoDetails, serviceProviders collection) that don't exist yet
// in Supabase. Re-enable real checks once those tables are built.
async function checkUserVerificationStatus(user, role) {
  return { allowed: true };
}

async function loadProfile(supabaseUser) {
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', supabaseUser.id)
    .single();

  const role = profile?.role || 'customer';

  return {
    uid: supabaseUser.id,
    email: supabaseUser.email,
    displayName: profile?.display_name || supabaseUser.email.split('@')[0],
    role: role,
    photoURL: profile?.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile?.display_name || supabaseUser.id)}`
  };
}

export function initAuth() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      try {
        currentUser = await loadProfile(session.user);

        const check = await checkUserVerificationStatus(session.user, currentUser.role);
        if (!check.allowed) {
          await supabase.auth.signOut();
          currentUser = null;
          showToast(check.message, "error");
          authInitialized = true;
          notifyAuthChange();
          Router.navigate('/login');
          return;
        }

        console.log("Auth Session Initialized: Logged in as", currentUser.email, "with role", currentUser.role);
      } catch (err) {
        console.error("Failed to load user profile from Supabase:", err);
        currentUser = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.email.split('@')[0],
          role: 'customer',
          photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(session.user.id)}`
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

export async function signUp(email, password, displayName, additionalData = { role: 'customer' }) {
  showLoading(true, "Registering profile ecosystem...");
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: additionalData.role
        }
      }
    });

    if (error) throw error;
    const user = data.user;

    currentUser = {
      uid: user.id,
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

export async function signIn(email, password) {
  showLoading(true, "Authenticating user...");
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    currentUser = await loadProfile(data.user);

    const check = await checkUserVerificationStatus(data.user, currentUser.role);
    if (!check.allowed) {
      await supabase.auth.signOut();
      throw new Error(check.message);
    }

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

export async function signOut() {
  showLoading(true, "Signing out...");
  try {
    await supabase.auth.signOut();
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

export async function updateUserProfile(displayName) {
  showLoading(true, "Updating profile details...");
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No authenticated user.");

    const { error } = await supabase
      .from('users')
      .update({ display_name: displayName })
      .eq('id', user.id);

    if (error) throw error;

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
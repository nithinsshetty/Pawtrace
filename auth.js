// ==========================================================================
// PAWTRACE AUTHENTICATION MODULE (Supabase)
// ==========================================================================
//
// SECURITY NOTE (role handling):
// The `role` value here is NEVER trusted as an authorization decision by
// itself. It is restricted to a fixed allowlist before it is ever sent to
// Supabase, so this client can never request 'admin' (or any other
// privileged/unknown role) through signUp(). The authoritative enforcement
// MUST also exist server-side: the `handle_new_user()` Postgres trigger and
// every RLS policy on `public.users` must independently ignore/reject any
// client-supplied role value outside this same allowlist, and must NEVER
// allow a self-service UPDATE to set role = 'admin'. This file alone cannot
// guarantee that — it only removes this client as an attack vector.
// ==========================================================================

import { supabase } from './supabase-config.js';
import { showToast, showLoading } from './utils.js';
import { Router } from './router.js';

let currentUser = null;
let authInitialized = false;
const authListeners = new Set();

// Roles this client is ever allowed to request at signup time.
// 'admin' is intentionally excluded — admin accounts must only ever be
// granted via a privileged, server-side-controlled path (see admin.js's
// makeUserAdmin(), itself gated by isHeadAdmin and RLS).
const ALLOWED_SIGNUP_ROLES = ['customer', 'vet', 'ngo', 'service_provider'];

function sanitizeSignupRole(role) {
  return ALLOWED_SIGNUP_ROLES.includes(role) ? role : 'customer';
}

// True only for the brief window inside signUp() between creating the
// account and finishing its role-specific detail writes + explicit
// verification check. Supabase's onAuthStateChange fires a SIGNED_IN event
// synchronously as part of supabase.auth.signUp() itself — i.e. BEFORE our
// own follow-up code runs — so without this flag the listener below would
// race signUp()'s own (more correct, non-destructive) verification check.
let isRegistering = false;

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

async function checkUserVerificationStatus(user, role) {
  if (role === 'vet') {
    const { data, error } = await supabase
      .from('users')
      .select('vet_details')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Vet verification check failed:', error);
      return {
        allowed: false,
        message: 'Unable to verify veterinarian account status.'
      };
    }

    if (!data?.vet_details?.verified) {
      return {
        allowed: false,
        message: 'Your veterinarian account is pending admin verification.'
      };
    }
  }

  if (role === 'ngo') {
    const { data, error } = await supabase
      .from('users')
      .select('ngo_details')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('NGO approval check failed:', error);
      return {
        allowed: false,
        message: 'Unable to verify NGO account status.'
      };
    }

    if (!data?.ngo_details?.approved) {
      return {
        allowed: false,
        message: 'Your NGO account is pending admin approval.'
      };
    }
  }

  // FIX (#4): service providers were never gated here before, so a
  // pending/unapproved provider could log in and use the portal freely.
  // This mirrors the vet/NGO checks against service_providers.status.
  if (role === 'service_provider') {
    const { data, error } = await supabase
      .from('service_providers')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Service provider approval check failed:', error);
      return {
        allowed: false,
        message: 'Unable to verify service provider account status.'
      };
    }

    if (!data || data.status !== 'approved') {
      return {
        allowed: false,
        message: 'Your service provider account is pending admin approval.'
      };
    }
  }

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
    isHeadAdmin: profile?.is_head_admin === true,
    photoURL: profile?.photo_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(profile?.display_name || supabaseUser.id)}`
  };
}

export function initAuth() {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      try {
        currentUser = await loadProfile(session.user);

        // FIX (#4): skip the gate here while signUp() is still mid-flight
        // for this exact account — signUp() runs its own, non-racy version
        // of this same check right after it finishes writing role-specific
        // details, so nothing skips verification permanently; this just
        // avoids a premature, data-losing sign-out during registration.
        if (!isRegistering) {
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
        }

        if (event === 'SIGNED_IN' && !isRegistering) {
          showToast("Logged in successfully!", "success");
        }

        console.log("Auth Session Initialized: Logged in as", currentUser.email, "with role", currentUser.role);
      } catch (err) {
        console.error("Failed to load user profile from Supabase:", err);
        currentUser = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.email.split('@')[0],
          role: 'customer',
          isHeadAdmin: false,
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

/**
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @param {object} additionalData - { role }. role is sanitized against
 *   ALLOWED_SIGNUP_ROLES before it ever leaves this function (FIX #1) —
 *   this client can never request 'admin' or any unrecognized role here,
 *   no matter what is passed in.
 * @param {object|null} roleDetails - optional role-specific payload,
 *   written immediately after account creation (while isRegistering still
 *   suppresses the gate, so the write always has a valid session — FIX #4):
 *   - vet:              { licenseNumber }
 *   - ngo:               { registrationId }
 *   - service_provider:  { providerType, phone, location, idProofUrl }
 */
export async function signUp(email, password, displayName, additionalData = { role: 'customer' }, roleDetails = null) {
  const safeRole = sanitizeSignupRole(additionalData?.role);

  showLoading(true, "Registering profile ecosystem...");
  isRegistering = true;
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: safeRole
        }
      }
    });

    if (error) throw error;
    const user = data.user;
    if (!user) throw new Error("Registration did not return a user session.");

    // Persist role-specific details now, while isRegistering still
    // suppresses the listener's gate above, so this write is guaranteed to
    // still have a valid session (fixes the old race where the gate could
    // sign the user out and permanently lose their license/registration
    // number before it was ever saved).
    if (safeRole === 'vet' && roleDetails?.licenseNumber) {
      const { error: vetErr } = await supabase
        .from('users')
        .update({ vet_details: { licenseNumber: roleDetails.licenseNumber, verified: false } })
        .eq('id', user.id);
      if (vetErr) console.error("Failed to save vet details:", vetErr);
    } else if (safeRole === 'ngo' && roleDetails?.registrationId) {
      const { error: ngoErr } = await supabase
        .from('users')
        .update({ ngo_details: { registrationId: roleDetails.registrationId, approved: false } })
        .eq('id', user.id);
      if (ngoErr) console.error("Failed to save NGO details:", ngoErr);
    } else if (safeRole === 'service_provider' && roleDetails) {
      const { error: providerErr } = await supabase.from('service_providers').insert({
        user_id: user.id,
        provider_type: roleDetails.providerType || '',
        phone: roleDetails.phone || '',
        location: roleDetails.location || '',
        id_proof_url: roleDetails.idProofUrl || '',
        status: 'pending'
      });
      if (providerErr) console.error("Failed to save service provider details:", providerErr);
    }

    const profile = await loadProfile(user);

    // FIX (#4): now that details are safely written, explicitly run the
    // same gate a normal login would hit — deterministically this time,
    // instead of via the old accidental (and destructive) race. Roles
    // needing admin approval are signed back out immediately with a clear
    // message instead of either slipping through unverified or losing
    // their submitted details.
    const check = await checkUserVerificationStatus(user, safeRole);
    if (!check.allowed) {
      await supabase.auth.signOut();
      currentUser = null;
      notifyAuthChange();
      const pendingError = new Error(check.message);
      pendingError.pendingApproval = true;
      throw pendingError;
    }

    currentUser = profile;
    showToast(`Welcome to PawTrace, ${displayName}!`, "success");
    notifyAuthChange();
    return currentUser;
  } catch (error) {
    console.error("Sign Up Error:", error);
    showToast(error.message || "Registration failed. Please try again.", error.pendingApproval ? "info" : "error");
    throw error;
  } finally {
    isRegistering = false;
    showLoading(false);
  }
}

export async function signIn(email, password) {
  showLoading(true, "Authenticating user...");
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
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
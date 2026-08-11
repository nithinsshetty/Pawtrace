// ==========================================================================
// SUPABASE CONFIGURATION AND INITIALIZATION
// ==========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://vfaffqrixccmsmaqhydv.supabase.co';

const supabaseAnonKey = 'sb_publishable_nC-r_P7aGpWEtiNx5Eqw6A_3zuXfuRD';

export const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey
);

export const isSupabaseConfigured = true;

export default {
    supabase,
    isSupabaseConfigured
};
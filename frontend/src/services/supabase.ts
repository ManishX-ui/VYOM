/**
 * Supabase Frontend Client Configuration
 * Safe browser client initialized ONLY with public anonymous keys.
 * Never place service-role keys here.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

export const supabaseConfig: SupabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: isSupabaseConfigured,
};

/**
 * Lightweight browser auth helper for Supabase
 */
export const supabaseAuth = {
  async signInWithEmail(email: string) {
    if (!isSupabaseConfigured) {
      // Local fallback for offline/demo operation
      return { data: { user: { email, id: 'demo-user-id' } }, error: null };
    }
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      return { data, error: response.ok ? null : data };
    } catch (err: any) {
      return { data: null, error: err.message };
    }
  },

  async signOut() {
    return { error: null };
  },
};


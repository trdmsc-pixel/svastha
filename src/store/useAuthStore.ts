import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as Crypto from 'expo-crypto';
import { cancelAllUserNotifications } from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { persistStorage } from '@/lib/storage';
import { exportUserData, switchUserData, useAppStore, wipeUserData } from './useAppStore';

export type SessionMode = 'supabase' | 'local' | 'demo';

export interface Session {
  userId: string;
  email: string;
  mode: SessionMode;
  signedInAt: string;
}

interface LocalAccount {
  userId: string;
  email: string;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

type Result = { ok: true } | { ok: false; error: string; needsConfirmation?: boolean };

interface AuthState {
  hasHydrated: boolean;
  session: Session | null;
  localAccounts: LocalAccount[];
  /** Device-level security (applies to whoever is signed in on this phone). */
  biometricEnabled: boolean;
  lockAfterSeconds: number; // 0 = every time the app opens
  register: (email: string, password: string) => Promise<Result>;
  login: (email: string, password: string) => Promise<Result>;
  startDemo: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<Result>;
  changePassword: (current: string, next: string) => Promise<Result>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<Result>;
  setBiometricEnabled: (enabled: boolean) => void;
  setLockAfterSeconds: (s: number) => void;
}

const normEmail = (e: string) => e.trim().toLowerCase();

async function hashPassword(password: string, salt: string): Promise<string> {
  // Iterated SHA-256 (local-only fallback when Supabase Auth isn't configured).
  let h = `${salt}:${password}`;
  for (let i = 0; i < 600; i++) {
    h = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}${h}`);
  }
  return h;
}

export function validateEmail(email: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? null : 'Please enter a valid email address.';
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use at least one letter and one number.';
  return null;
}

export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)) s++;
  if (pw.length >= 12 || /[^A-Za-z0-9]/.test(pw)) s++;
  return s as 0 | 1 | 2 | 3;
}

async function syncProfileToCloud(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { profile, healthBackground, consents } = useAppStore.getState();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !profile.full_name || !profile.dob) return;
  const { id: _id, ...rest } = profile;
  await supabase.from('profiles').upsert({ id: data.user.id, ...rest, updated_at: new Date().toISOString() });
  const { user_id: _u, under_medical_supervision: _m, medications: _meds, ...hb } = healthBackground;
  await supabase.from('health_background').upsert({ user_id: data.user.id, ...hb, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  for (const c of consents) {
    await supabase.from('consents').upsert({ user_id: data.user.id, purpose: c.purpose, version: c.version, granted_at: c.granted_at, withdrawn_at: c.withdrawn_at ?? null });
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      session: null,
      localAccounts: [],
      biometricEnabled: false,
      lockAfterSeconds: 60,

      register: async (rawEmail, password) => {
        const email = normEmail(rawEmail);
        const err = validateEmail(email) ?? validatePassword(password);
        if (err) return { ok: false, error: err };

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) return { ok: false, error: error.message };
          if (!data.session || !data.user) {
            return { ok: false, needsConfirmation: true, error: 'Check your inbox to confirm your email, then log in.' };
          }
          await switchUserData(data.user.id);
          useAppStore.getState().grantConsent('account');
          set({ session: { userId: data.user.id, email, mode: 'supabase', signedInAt: new Date().toISOString() } });
          return { ok: true };
        }

        if (get().localAccounts.some((a) => a.email === email)) {
          return { ok: false, error: 'An account with this email already exists on this device. Try logging in.' };
        }
        const userId = Crypto.randomUUID();
        const salt = Crypto.randomUUID();
        const passwordHash = await hashPassword(password, salt);
        set((s) => ({ localAccounts: [...s.localAccounts, { userId, email, salt, passwordHash, createdAt: new Date().toISOString() }] }));
        await switchUserData(userId);
        useAppStore.getState().grantConsent('account');
        set({ session: { userId, email, mode: 'local', signedInAt: new Date().toISOString() } });
        return { ok: true };
      },

      login: async (rawEmail, password) => {
        const email = normEmail(rawEmail);
        const err = validateEmail(email);
        if (err) return { ok: false, error: err };
        if (!password) return { ok: false, error: 'Please enter your password.' };

        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error || !data.user) return { ok: false, error: error?.message ?? 'Could not sign in.' };
          await switchUserData(data.user.id);
          set({ session: { userId: data.user.id, email, mode: 'supabase', signedInAt: new Date().toISOString() } });
          return { ok: true };
        }

        const acct = get().localAccounts.find((a) => a.email === email);
        if (!acct) return { ok: false, error: 'No account found for this email on this device.' };
        const h = await hashPassword(password, acct.salt);
        if (h !== acct.passwordHash) return { ok: false, error: 'Incorrect password. Please try again.' };
        await switchUserData(acct.userId);
        set({ session: { userId: acct.userId, email, mode: 'local', signedInAt: new Date().toISOString() } });
        return { ok: true };
      },

      startDemo: async () => {
        await switchUserData('demo', { seedDemo: true });
        set({ session: { userId: 'demo', email: 'demo@svastha.app', mode: 'demo', signedInAt: new Date().toISOString() } });
      },

      requestPasswordReset: async (rawEmail) => {
        const email = normEmail(rawEmail);
        const err = validateEmail(email);
        if (err) return { ok: false, error: err };
        if (!isSupabaseConfigured) {
          return { ok: false, error: 'This account lives only on this device, so it can’t be reset by email. Create a new account or use the demo.' };
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        return error ? { ok: false, error: error.message } : { ok: true };
      },

      changePassword: async (current, next) => {
        const s = get().session;
        if (!s) return { ok: false, error: 'Not signed in.' };
        const err = validatePassword(next);
        if (err) return { ok: false, error: err };
        if (s.mode === 'demo') return { ok: false, error: 'The demo account has no password.' };
        if (s.mode === 'supabase') {
          const { error } = await supabase.auth.updateUser({ password: next });
          return error ? { ok: false, error: error.message } : { ok: true };
        }
        const acct = get().localAccounts.find((a) => a.userId === s.userId);
        if (!acct) return { ok: false, error: 'Account not found.' };
        if ((await hashPassword(current, acct.salt)) !== acct.passwordHash) return { ok: false, error: 'Current password is incorrect.' };
        const salt = Crypto.randomUUID();
        const passwordHash = await hashPassword(next, salt);
        set((st) => ({ localAccounts: st.localAccounts.map((a) => (a.userId === acct.userId ? { ...a, salt, passwordHash } : a)) }));
        return { ok: true };
      },

      logout: async () => {
        const s = get().session;
        await cancelAllUserNotifications();
        if (s?.mode === 'supabase') {
          try {
            await syncProfileToCloud();
          } catch {
            // best effort
          }
          await supabase.auth.signOut();
        }
        set({ session: null });
        await switchUserData(null);
      },

      deleteAccount: async () => {
        const s = get().session;
        if (!s) return { ok: false, error: 'Not signed in.' };
        if (s.mode === 'supabase') {
          const { error } = await supabase.functions.invoke('delete-account', { body: { confirmation: 'DELETE' } });
          if (error) return { ok: false, error: `Server deletion failed: ${error.message}` };
          await supabase.auth.signOut();
        }
        await cancelAllUserNotifications();
        await wipeUserData(s.userId);
        set((st) => ({ session: null, localAccounts: st.localAccounts.filter((a) => a.userId !== s.userId), biometricEnabled: false }));
        return { ok: true };
      },

      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
      setLockAfterSeconds: (sec) => set({ lockAfterSeconds: sec }),
    }),
    {
      name: 'svastha-auth',
      storage: persistStorage,
      version: 2,
      partialize: (s) => ({ session: s.session, localAccounts: s.localAccounts, biometricEnabled: s.biometricEnabled, lockAfterSeconds: s.lockAfterSeconds }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    }
  )
);

export { exportUserData, syncProfileToCloud };

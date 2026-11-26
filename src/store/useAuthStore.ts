import { create } from 'zustand';
import { HealthBackground, UserProfile } from '@/types/domain';
import { cancelAllUserNotifications } from '@/lib/notifications';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  userEmail: string | null;
  ageConfirmed18Plus: boolean;
  dpdpConsentGranted: boolean;
  biometricEnabled: boolean;
  profile: UserProfile;
  healthBackground: HealthBackground;
  signInDemo: (email: string) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateHealthBackground: (patch: Partial<HealthBackground>) => void;
  completeOnboarding: () => void;
  grantDpdpConsent: () => void;
  toggleBiometric: (enabled: boolean) => void;
  logout: () => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'demo-user-001',
  full_name: 'Aarav Sharma',
  dob: '1994-05-14',
  sex: 'M',
  height_cm: 175,
  weight_kg: 76,
  waist_cm: 88,
  target_weight_kg: 72,
  city: 'Delhi',
  diet_type: 'vegetarian',
  fasting_practices: ['None'],
  activity_level: 'moderate',
  job_type: 'desk',
  wake_time: '06:30',
  sleep_time: '22:45',
  cuisine_prefs: ['North Indian', 'South Indian'],
  budget_level: 'moderate',
  goals: ['Improve lab report', 'More energy'],
  units: 'metric',
  language: 'en',
};

const DEFAULT_HEALTH_BG: HealthBackground = {
  user_id: 'demo-user-001',
  conditions: [],
  family_history: ['Heart disease'],
  allergies: [],
  smoking: 'never',
  alcohol_units_week: 2,
  pregnant: false,
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: true,
  onboardingComplete: true,
  userEmail: 'demo@svastha.app',
  ageConfirmed18Plus: true,
  dpdpConsentGranted: true,
  biometricEnabled: false,
  profile: DEFAULT_PROFILE,
  healthBackground: DEFAULT_HEALTH_BG,
  signInDemo: (email) => set({ isAuthenticated: true, userEmail: email }),
  updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
  updateHealthBackground: (patch) =>
    set((s) => ({ healthBackground: { ...s.healthBackground, ...patch } })),
  completeOnboarding: () => set({ onboardingComplete: true }),
  grantDpdpConsent: () => set({ dpdpConsentGranted: true }),
  toggleBiometric: (enabled) => set({ biometricEnabled: enabled }),
  logout: async () => {
    await cancelAllUserNotifications();
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    set({ isAuthenticated: false, userEmail: null });
  },
}));

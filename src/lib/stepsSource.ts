import { Platform } from 'react-native';

/**
 * Read-only step-count source (steps only — no other health data is requested or stored).
 *
 * Native providers (iOS HealthKit, Android Health Connect) need a dev/EAS build with their
 * config plugins, so they REGISTER themselves from `src/lib/stepsProviders.native-health.ts`
 * once those packages are installed (see DECISIONS.md §11). Until then — and on web, Expo Go,
 * or with the feature flag off — the manual stepper is the source of truth.
 *
 * Feature flag: EXPO_PUBLIC_STEPS_AUTOFILL=1 (dev builds only).
 */
export interface StepsProvider {
  id: 'healthkit' | 'health-connect' | 'manual';
  label: string;
  isAvailable(): Promise<boolean>;
  /** Asks for read access to step count only. */
  requestPermission(): Promise<boolean>;
  /** Steps from local midnight to now, or null when unavailable. */
  readToday(): Promise<number | null>;
}

export const manualStepsProvider: StepsProvider = {
  id: 'manual',
  label: 'Manual entry',
  isAvailable: async () => true,
  requestPermission: async () => true,
  readToday: async () => null,
};

const registry: Partial<Record<'ios' | 'android', StepsProvider>> = {};

export function registerStepsProvider(platform: 'ios' | 'android', provider: StepsProvider): void {
  registry[platform] = provider;
}

export function stepsAutofillEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.EXPO_PUBLIC_STEPS_AUTOFILL === '1' || env.EXPO_PUBLIC_STEPS_AUTOFILL === 'true';
}

/** The provider to use right now: the registered native one when enabled + available, else manual. */
export async function resolveStepsProvider(
  platform: string = Platform.OS,
  enabled: boolean = stepsAutofillEnabled()
): Promise<StepsProvider> {
  if (!enabled || (platform !== 'ios' && platform !== 'android')) return manualStepsProvider;
  const p = registry[platform];
  if (!p) return manualStepsProvider;
  try {
    return (await p.isAvailable()) ? p : manualStepsProvider;
  } catch {
    return manualStepsProvider;
  }
}

/**
 * Deterministic merge of a device reading with what's already logged for today: the device
 * count is used when it's higher (it only grows during a day); a manual entry is never lowered,
 * so a walk logged without the phone isn't wiped. Invalid readings are ignored.
 */
export function mergeSteps(current: number | undefined, device: number | null): number | null {
  if (device === null || !Number.isFinite(device) || device < 0) return null;
  const d = Math.round(device);
  if (current !== undefined && current >= d) return null; // nothing to change
  return Math.min(d, 100_000);
}

/** Reads today's steps once and returns the value to store, or null if nothing should change. */
export async function autofillTodaySteps(current: number | undefined, provider?: StepsProvider): Promise<number | null> {
  const p = provider ?? (await resolveStepsProvider());
  if (p.id === 'manual') return null;
  try {
    if (!(await p.requestPermission())) return null;
    return mergeSteps(current, await p.readToday());
  } catch {
    return null;
  }
}

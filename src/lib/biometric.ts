import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricCapability {
  available: boolean;
  enrolled: boolean;
  kind: 'face' | 'fingerprint' | 'iris' | 'none';
  /** Human label: "Face ID", "Fingerprint", "Face unlock"… */
  label: string;
  reason?: string;
}

/** Detects what the phone supports (Face ID / Touch ID / Android fingerprint or face unlock). */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS === 'web') {
    return { available: false, enrolled: false, kind: 'none', label: 'Biometrics', reason: 'Biometric lock works in the iOS and Android app, not the web preview.' };
  }
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const T = LocalAuthentication.AuthenticationType;
    const kind = types.includes(T.FACIAL_RECOGNITION) ? 'face' : types.includes(T.FINGERPRINT) ? 'fingerprint' : types.includes(T.IRIS) ? 'iris' : 'none';
    const label = kind === 'face' ? (Platform.OS === 'ios' ? 'Face ID' : 'Face unlock') : kind === 'fingerprint' ? (Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint') : kind === 'iris' ? 'Iris' : 'Biometrics';
    if (!hasHardware) return { available: false, enrolled: false, kind: 'none', label, reason: 'This device has no biometric sensor.' };
    if (!enrolled) return { available: true, enrolled: false, kind, label, reason: `Set up ${label} in your phone’s Settings first, then turn this on.` };
    return { available: true, enrolled: true, kind, label };
  } catch {
    return { available: false, enrolled: false, kind: 'none', label: 'Biometrics', reason: 'Biometrics could not be checked on this device.' };
  }
}

/**
 * Prompts the system biometric sheet. Falls back to the device passcode/PIN so users are
 * never locked out of their own data if the sensor fails.
 */
export async function authenticate(reason = 'Unlock Svastha'): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') return { success: true };
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    if (res.success) return { success: true };
    return { success: false, error: res.error };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

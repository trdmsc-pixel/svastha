import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, StateStorage } from 'zustand/middleware';

/**
 * Persistent key-value storage for zustand (AsyncStorage on native, localStorage on web).
 * Never store media here: meal photos and report files are processed in memory only.
 */
const safeStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // storage full / private mode — app keeps working in memory
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const persistStorage = createJSONStorage(() => safeStorage);

export async function readRaw(key: string): Promise<string | null> {
  return safeStorage.getItem(key) as Promise<string | null>;
}

export async function removeKey(key: string): Promise<void> {
  await safeStorage.removeItem(key);
}

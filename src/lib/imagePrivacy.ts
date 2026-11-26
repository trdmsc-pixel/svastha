import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export interface EphemeralImagePayload {
  readonly base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  discard: () => void;
}

const MAX_EDGE = 1024;

/** Deletes a temporary local file (camera capture / manipulator output). Never throws. */
export async function deleteTempFile(uri: string | null | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web') {
    if (uri && Platform.OS === 'web' && uri.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(uri);
      } catch {
        /* noop */
      }
    }
    return;
  }
  if (!uri.startsWith('file:')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    /* noop */
  }
}

/**
 * Privacy-first image preparation (CLAUDE.md rule 3):
 * - Downscales so the LONG edge is ≤ 1024 px (never upscales)
 * - Re-encodes as JPEG q0.7 — re-encoding drops EXIF (GPS, device serial, timestamps)
 * - Returns base64 held in memory only; the original capture AND the re-encoded temp file
 *   are deleted from the device immediately
 * - discard() clears the in-memory reference once the AI response arrives
 */
export async function prepareEphemeralImageForAI(uri: string, srcWidth?: number, srcHeight?: number): Promise<EphemeralImagePayload> {
  const actions: ImageManipulator.Action[] = [];
  if (srcWidth && srcHeight) {
    const longEdge = Math.max(srcWidth, srcHeight);
    if (longEdge > MAX_EDGE) {
      actions.push({ resize: srcWidth >= srcHeight ? { width: MAX_EDGE } : { height: MAX_EDGE } });
    }
  } else {
    actions.push({ resize: { width: MAX_EDGE } });
  }

  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });

  // Zero-storage: remove both files from disk right away.
  await Promise.all([deleteTempFile(uri), deleteTempFile(result.uri)]);

  let base64Ref = result.base64 ?? '';
  return {
    get base64() {
      return base64Ref;
    },
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
    discard: () => {
      base64Ref = '';
    },
  };
}

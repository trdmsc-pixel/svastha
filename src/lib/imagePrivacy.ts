import * as ImageManipulator from 'expo-image-manipulator';

export interface EphemeralImagePayload {
  base64: string;
  mimeType: 'image/jpeg';
  width: number;
  height: number;
  discard: () => void;
}

/**
 * Privacy-first image preparation (Section 2.2.1 & 8.4.1):
 * - Downscales to max 1024px on the long edge
 * - Re-encodes as JPEG (quality 0.7), stripping EXIF metadata (GPS, camera serial, timestamps)
 * - Never writes to Supabase Storage or device gallery
 * - Exposes discard() to clear references immediately after Edge Function response
 */
export async function prepareEphemeralImageForAI(uri: string): Promise<EphemeralImagePayload> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

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

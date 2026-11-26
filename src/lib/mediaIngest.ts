import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { deleteTempFile, EphemeralImagePayload, prepareEphemeralImageForAI } from './imagePrivacy';

export type IngestResult<T> = { ok: true; value: T } | { ok: false; cancelled?: boolean; error: string };

const MAX_PDF_BYTES = 8 * 1024 * 1024;

/**
 * Opens the phone's camera app (system camera UI). On the mobile web preview this opens the
 * browser's camera capture sheet.
 */
export async function captureWithCamera(): Promise<IngestResult<ImagePicker.ImagePickerAsset>> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, error: perm.canAskAgain ? 'Camera permission is needed to scan.' : 'Camera access is off. Enable it in Settings → Svastha → Camera.' };
    }
  }
  try {
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, exif: false, allowsEditing: false });
    if (res.canceled || !res.assets?.[0]) return { ok: false, cancelled: true, error: 'Cancelled' };
    return { ok: true, value: res.assets[0] };
  } catch {
    // Simulators / desktop browsers without a camera: fall back to the photo library.
    return pickFirstImage();
  }
}

async function pickFirstImage(): Promise<IngestResult<ImagePicker.ImagePickerAsset>> {
  const r = await pickImages(false);
  return r.ok ? { ok: true, value: r.value[0] } : r;
}

export async function pickImages(multiple: boolean, limit = 6): Promise<IngestResult<ImagePicker.ImagePickerAsset[]>> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return { ok: false, error: 'Photo library permission is needed to choose images.' };
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
    exif: false,
    allowsMultipleSelection: multiple,
    selectionLimit: multiple ? limit : 1,
  });
  if (res.canceled || !res.assets?.length) return { ok: false, cancelled: true, error: 'Cancelled' };
  return { ok: true, value: res.assets.slice(0, limit) };
}

export async function toEphemeral(asset: ImagePicker.ImagePickerAsset): Promise<EphemeralImagePayload> {
  return prepareEphemeralImageForAI(asset.uri, asset.width, asset.height);
}

export interface EphemeralPdf {
  readonly base64: string;
  mimeType: 'application/pdf';
  name: string;
  bytes: number;
  discard: () => void;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const s = String(reader.result ?? '');
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Lets the user pick a lab-report PDF; reads it into memory and deletes the cached copy. */
export async function pickPdf(): Promise<IngestResult<EphemeralPdf>> {
  const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return { ok: false, cancelled: true, error: 'Cancelled' };
  const asset = res.assets[0];
  if (asset.size && asset.size > MAX_PDF_BYTES) {
    await deleteTempFile(asset.uri);
    return { ok: false, error: 'That PDF is larger than 8 MB. Try exporting just the result pages, or take photos instead.' };
  }
  let base64 = '';
  try {
    if (Platform.OS === 'web') {
      const file = (asset as unknown as { file?: File }).file;
      const blob = file ?? (await (await fetch(asset.uri)).blob());
      base64 = await blobToBase64(blob);
    } else {
      base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    }
  } catch {
    return { ok: false, error: 'Could not read that PDF. If it is password-protected, remove the password or take photos of the pages.' };
  } finally {
    await deleteTempFile(asset.uri);
  }
  let ref = base64;
  return {
    ok: true,
    value: {
      get base64() {
        return ref;
      },
      mimeType: 'application/pdf',
      name: asset.name ?? 'report.pdf',
      bytes: asset.size ?? Math.round((base64.length * 3) / 4),
      discard: () => {
        ref = '';
      },
    },
  };
}

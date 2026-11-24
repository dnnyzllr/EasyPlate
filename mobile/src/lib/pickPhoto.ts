import * as ImagePicker from 'expo-image-picker';
import { MAX_UPLOAD_BYTES, base64ByteLength } from './photoReview';

export type PickResult =
  | { kind: 'ok'; uri: string; base64: string; mimeType: string; byteLength: number }
  | { kind: 'cancelled' }
  | { kind: 'denied'; canAskAgain: boolean }
  | { kind: 'tooLarge'; byteLength: number }
  | { kind: 'failed'; message: string };

const FAILED_MESSAGE = "Couldn't open the camera or photo library.";

const OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  base64: true,
  // Below 1 so iOS re-encodes to JPEG, which keeps uploads small and avoids HEIC.
  quality: 0.6,
  exif: false,
  allowsEditing: false,
  allowsMultipleSelection: false,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];

// The picker returns base64 of the real bytes. Trust the signature over the reported type.
function mimeFromBase64(b64: string, reported: string | undefined): string {
  if (b64.startsWith('/9j/')) return 'image/jpeg';
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (b64.startsWith('UklGR')) return 'image/webp';
  return reported && SUPPORTED.includes(reported) ? reported : 'image/jpeg';
}

function isPermissionError(err: unknown): boolean {
  const text = `${(err as { code?: unknown })?.code ?? ''} ${(err as { message?: unknown })?.message ?? ''}`;
  return /permission/i.test(text);
}

/** Photos stay in memory: the result is returned to the caller and never written anywhere. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { kind: 'denied', canAskAgain: perm.canAskAgain };
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(OPTIONS)
        : await ImagePicker.launchImageLibraryAsync(OPTIONS);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return { kind: 'cancelled' };
    if (!asset.base64) return { kind: 'failed', message: "Couldn't read that photo. Try another." };
    const byteLength = base64ByteLength(asset.base64);
    if (byteLength > MAX_UPLOAD_BYTES) return { kind: 'tooLarge', byteLength };
    return {
      kind: 'ok',
      uri: asset.uri,
      base64: asset.base64,
      mimeType: mimeFromBase64(asset.base64, asset.mimeType),
      byteLength,
    };
  } catch (err) {
    if (isPermissionError(err)) return { kind: 'denied', canAskAgain: false };
    return { kind: 'failed', message: FAILED_MESSAGE };
  }
}

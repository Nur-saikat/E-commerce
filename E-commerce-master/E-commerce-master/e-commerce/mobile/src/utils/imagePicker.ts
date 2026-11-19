import { launchCamera, launchImageLibrary, type PhotoQuality } from 'react-native-image-picker';

export type LocalImage = { uri: string; name: string; type: string };
export type ImageSource = 'library' | 'camera';

const imageOptions = {
  mediaType: 'photo' as const,
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.9 as PhotoQuality,
};

export async function pickImages(source: ImageSource = 'library', selectionLimit = 1): Promise<LocalImage[]> {
  const result =
    source === 'camera'
      ? await launchCamera(imageOptions)
      : await launchImageLibrary({ ...imageOptions, selectionLimit });

  if (result.didCancel) return [];
  if (result.errorCode) {
    throw new Error(result.errorMessage ?? `Unable to open the ${source === 'camera' ? 'camera' : 'image browser'}.`);
  }
  return (result.assets ?? [])
    .filter(asset => !!asset.uri)
    .map(asset => ({
      uri: asset.uri!,
      name: asset.fileName ?? `image-${Date.now()}.jpg`,
      type: asset.type ?? 'image/jpeg',
    }));
}
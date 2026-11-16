import { pickWebFile } from './webFile';

export type LocalImage = File;
export type ImageSource = 'library' | 'camera';

export async function pickImages(_source: ImageSource = 'library', _selectionLimit = 1): Promise<LocalImage[]> {
  const file = await pickWebFile('image/jpeg,image/png,image/webp,image/gif');
  return file ? [file] : [];
}
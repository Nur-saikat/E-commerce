import { Platform } from 'react-native';

export async function pickWebFile(accept = 'image/*'): Promise<File | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

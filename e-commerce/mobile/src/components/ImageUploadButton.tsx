import React, { useState } from 'react';
import { Alert, Platform, StyleProp, ViewStyle } from 'react-native';
import { uploadsApi } from '../api';
import { useFeedback } from '../state/FeedbackContext';
import { pickImages, type ImageSource } from '../utils/imagePicker';
import { Button } from './ui';

interface Props {
  onUploaded: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

export function ImageUploadButton({ onUploaded, multiple = false, label, size = 'md', style }: Props) {
  const { toast } = useFeedback();
  const [uploading, setUploading] = useState(false);

  const upload = async (source: ImageSource) => {
    try {
      const files = await pickImages(source, multiple ? 0 : 1);
      if (!files.length) return;
      setUploading(true);
      const urls: string[] = [];
      for (const file of files) {
        const uploaded = await uploadsApi.upload(file);
        urls.push(uploaded.url);
      }
      onUploaded(urls);
      toast(urls.length > 1 ? `${urls.length} images uploaded.` : 'Image uploaded.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to upload this image.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const choose = () => {
    if (Platform.OS === 'web') {
      void upload('library');
      return;
    }
    Alert.alert('Add image', 'Browse your photos or take a new one.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Photo library', onPress: () => void upload('library') },
      { text: 'Camera', onPress: () => void upload('camera') },
    ]);
  };

  return (
    <Button
      label={uploading ? 'Uploading…' : label ?? (multiple ? 'Browse images' : 'Browse image')}
      variant="outline"
      size={size}
      onPress={choose}
      loading={uploading}
      style={style}
    />
  );
}
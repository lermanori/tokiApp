import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface WebImagePickerOptions {
  onSuccess: (uri: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

// Web-compatible image picker that might work better on iOS
export const webCompatibleImagePicker = async ({
  onSuccess,
  onError,
  onCancel,
}: WebImagePickerOptions): Promise<void> => {
  try {
    console.log('Web-compatible approach: Using basic configuration...');
    
    // Use the most basic configuration that works on web
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    console.log('Web picker result:', result);

    if (result.canceled) {
      onCancel?.();
    } else if (result.assets && result.assets[0]) {
      onSuccess(result.assets[0].uri);
    } else {
      onCancel?.();
    }
  } catch (error) {
    console.error('Web picker error:', error);
    onError(error instanceof Error ? error.message : 'Failed to pick image');
  }
};

// Try using the old deprecated API that might be more stable
export const deprecatedApiImagePicker = async ({
  onSuccess,
  onError,
  onCancel,
}: WebImagePickerOptions): Promise<void> => {
  try {
    console.log('Deprecated API approach: Using MediaTypeOptions...');
    
    // Use the deprecated but potentially more stable API
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    console.log('Deprecated API result:', result);

    if (result.canceled) {
      onCancel?.();
    } else if (result.assets && result.assets[0]) {
      onSuccess(result.assets[0].uri);
    } else {
      onCancel?.();
    }
  } catch (error) {
    console.error('Deprecated API error:', error);
    onError(error instanceof Error ? error.message : 'Failed to pick image');
  }
};

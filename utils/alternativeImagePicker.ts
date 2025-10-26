import { Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface AlternativeImagePickerOptions {
  onSuccess: (uri: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

let isPicking = false;

// Alternative approach: Use a completely different strategy
export const alternativeLaunchImageLibrary = async ({
  onSuccess,
  onError,
  onCancel,
}: AlternativeImagePickerOptions): Promise<void> => {
  if (isPicking) {
    console.log('Image picker already in progress, ignoring request');
    return;
  }

  isPicking = true;

  try {
    console.log('Alternative approach: Using minimal configuration...');
    
    // Try the most basic configuration possible
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    console.log('Alternative picker result:', result);

    if (result.canceled) {
      console.log('Image picker canceled');
      onCancel?.();
    } else if (result.assets && result.assets[0]) {
      console.log('Image selected successfully:', result.assets[0].uri);
      onSuccess(result.assets[0].uri);
    } else {
      console.log('No image selected');
      onCancel?.();
    }
  } catch (error) {
    console.error('Alternative image picker error:', error);
    onError(error instanceof Error ? error.message : 'Failed to pick image');
  } finally {
    isPicking = false;
  }
};

// Alternative approach: Use a timeout-based retry mechanism
export const retryLaunchImageLibrary = async ({
  onSuccess,
  onError,
  onCancel,
  maxRetries = 3,
}: AlternativeImagePickerOptions & { maxRetries?: number }): Promise<void> => {
  let retries = 0;

  const attemptPick = async (): Promise<void> => {
    try {
      console.log(`Retry attempt ${retries + 1}/${maxRetries}`);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        onCancel?.();
      } else if (result.assets && result.assets[0]) {
        onSuccess(result.assets[0].uri);
      } else {
        onCancel?.();
      }
    } catch (error) {
      retries++;
      if (retries < maxRetries) {
        console.log(`Retrying in 1 second... (${retries}/${maxRetries})`);
        setTimeout(attemptPick, 1000);
      } else {
        onError(error instanceof Error ? error.message : 'Failed to pick image after retries');
      }
    }
  };

  attemptPick();
};

// Alternative approach: Use a completely different library approach
export const fallbackImagePicker = async ({
  onSuccess,
  onError,
  onCancel,
}: AlternativeImagePickerOptions): Promise<void> => {
  try {
    console.log('Fallback approach: Using document picker as alternative...');
    
    // This would require expo-document-picker
    // For now, let's try a different ImagePicker configuration
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (result.canceled) {
      onCancel?.();
    } else if (result.assets && result.assets[0]) {
      onSuccess(result.assets[0].uri);
    } else {
      onCancel?.();
    }
  } catch (error) {
    console.error('Fallback picker error:', error);
    onError(error instanceof Error ? error.message : 'All image picker methods failed');
  }
};

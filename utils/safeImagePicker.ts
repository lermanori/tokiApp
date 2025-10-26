import { InteractionManager } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface SafeImagePickerOptions {
  useCamera?: boolean;
  onSuccess: (uri: string) => void;
  onError: (error: string) => void;
  onCancel?: () => void;
}

let isPicking = false;

export const safeLaunchImageLibrary = async ({
  useCamera = false,
  onSuccess,
  onError,
  onCancel,
}: SafeImagePickerOptions): Promise<void> => {
  // Guard against double-taps
  if (isPicking) {
    console.log('Image picker already in progress, ignoring request');
    return;
  }

  isPicking = true;

  try {
    // Wait for all interactions to complete and add a small delay
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        // Add a small timeout to ensure modal is fully dismissed
        setTimeout(resolve, 100);
      });
    });

    console.log('Safe launching image picker...');
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      selectionLimit: 1,
      quality: 0.8,
    });

    console.log('Image picker result:', result);

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
    console.error('Image picker error:', error);
    onError(error instanceof Error ? error.message : 'Failed to pick image');
  } finally {
    isPicking = false;
  }
};

export const safeLaunchCamera = async ({
  onSuccess,
  onError,
  onCancel,
}: Omit<SafeImagePickerOptions, 'useCamera'>): Promise<void> => {
  // Guard against double-taps
  if (isPicking) {
    console.log('Image picker already in progress, ignoring request');
    return;
  }

  isPicking = true;

  try {
    // Wait for all interactions to complete and add a small delay
    await new Promise<void>((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        // Add a small timeout to ensure modal is fully dismissed
        setTimeout(resolve, 100);
      });
    });

    console.log('Safe launching camera...');
    
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    console.log('Camera result:', result);

    if (result.canceled) {
      console.log('Camera canceled');
      onCancel?.();
    } else if (result.assets && result.assets[0]) {
      console.log('Photo taken successfully:', result.assets[0].uri);
      onSuccess(result.assets[0].uri);
    } else {
      console.log('No photo taken');
      onCancel?.();
    }
  } catch (error) {
    console.error('Camera error:', error);
    onError(error instanceof Error ? error.message : 'Failed to take photo');
  } finally {
    isPicking = false;
  }
};

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Camera, Image as ImageIcon, Trash2, X, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useApp } from '@/contexts/AppContext';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  onImageUpdate: (imageUrl: string) => void;
  size?: number;
  showEditButton?: boolean;
}

export default function ProfileImageUpload({
  currentImageUrl,
  onImageUpdate,
  size = 80,
  showEditButton = true,
}: ProfileImageUploadProps) {
  const { state, dispatch } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library to upload a profile image.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestCameraPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your camera to take a profile photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const processImage = async (uri: string): Promise<string> => {
    try {
      // Resize and compress the image
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return processedImage.uri;
    } catch (error) {
      console.error('Error processing image:', error);
      return uri; // Return original if processing fails
    }
  };

  const uploadImage = async (uri: string) => {
    if (!state.currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsUploading(true);
    try {
      // Convert image to base64
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create FormData
      const formData = new FormData();
      formData.append('image', blob as any, 'profile-image.jpg');

      // Upload to backend
      const uploadResponse = await fetch(`${getBackendUrl()}/api/profile-images/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await apiService.getAccessToken()}`,
        },
        body: formData,
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        if (result.success) {
          // Update the global state first
          dispatch({
            type: 'UPDATE_CURRENT_USER',
            payload: { avatar: result.data.imageUrl }
          });
          // Then call the callback
          onImageUpdate(result.data.imageUrl);
          Alert.alert('Success', 'Profile image updated successfully!');
        } else {
          Alert.alert('Upload Failed', result.message || 'Failed to upload image');
        }
      } else {
        const errorData = await uploadResponse.json();
        Alert.alert('Upload Failed', errorData.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      setShowOptions(false);
    }
  };

  const handleImagePicker = async (useCamera: boolean = false) => {
    try {
      if (useCamera) {
        if (!(await requestCameraPermissions())) return;
      } else {
        if (!(await requestPermissions())) return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };

      const result = useCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        const processedUri = await processImage(result.assets[0].uri);
        await uploadImage(processedUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'Remove Profile Image',
      'Are you sure you want to remove your profile image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${getBackendUrl()}/api/profile-images/remove`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${await apiService.getAccessToken()}`,
                },
              });

                           if (response.ok) {
               // Update the global state first
               dispatch({
                 type: 'UPDATE_CURRENT_USER',
                 payload: { avatar: '' }
               });
               // Then call the callback
               onImageUpdate('');
               Alert.alert('Success', 'Profile image removed successfully!');
             } else {
                Alert.alert('Error', 'Failed to remove profile image');
              }
            } catch (error) {
              console.error('Remove image error:', error);
              Alert.alert('Error', 'Failed to remove profile image');
            }
          },
        },
      ]
    );
  };

  const defaultImageUrl = 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2';

  return (
    <>
      <View style={[styles.container, { width: size, height: size }]}>
        <Image
          source={{ uri: currentImageUrl || defaultImageUrl }}
          style={[styles.profileImage, { width: size, height: size, borderRadius: size / 2 }]}
        />
        
        {showEditButton && (
          <TouchableOpacity
            style={[styles.editButton, { width: size * 0.3, height: size * 0.3, borderRadius: (size * 0.3) / 2 }]}
            onPress={() => setShowOptions(true)}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Camera size={size * 0.15} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Profile Image</Text>
              <TouchableOpacity onPress={() => setShowOptions(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleImagePicker(false)}
              disabled={isUploading}
            >
              <ImageIcon size={24} color="#1C1C1C" />
              <Text style={styles.optionText}>Choose from Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleImagePicker(true)}
              disabled={isUploading}
            >
              <Camera size={24} color="#1C1C1C" />
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>

            {currentImageUrl && currentImageUrl !== defaultImageUrl && (
              <TouchableOpacity
                style={[styles.optionButton, styles.removeButton]}
                onPress={handleRemoveImage}
                disabled={isUploading}
              >
                <Trash2 size={24} color="#FF3B30" />
                <Text style={[styles.optionText, styles.removeButtonText]}>Remove Current Image</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptions(false)}
              disabled={isUploading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
    marginLeft: 12,
  },
  removeButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  removeButtonText: {
    color: '#FF3B30',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
});

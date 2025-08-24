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
  ScrollView,
  Dimensions,
} from 'react-native';
import { Camera, Image as ImageIcon, Trash2, X, Upload, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';

interface TokiImage {
  url: string;
  publicId: string;
}

interface TokiImageUploadProps {
  tokiId?: string; // The ID of the Toki this image belongs to (optional for create mode)
  currentImages: TokiImage[];
  onImagesUpdate: (images: TokiImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  mode?: 'create' | 'edit'; // Whether this is create or edit mode
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 60) / 3; // 3 images per row with margins

export default function TokiImageUpload({
  tokiId,
  currentImages = [],
  onImagesUpdate,
  maxImages = 6,
  disabled = false,
  mode = 'edit',
}: TokiImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<TokiImage | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant permission to access your photo library to upload Toki images.',
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
        'Please grant permission to access your camera to take photos for your Toki.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const processImage = async (uri: string): Promise<string> => {
    try {
      // Resize and compress the image for Toki display
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800, height: 600 } }],
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
    if (currentImages.length >= maxImages) {
      Alert.alert('Image Limit Reached', `You can only upload up to ${maxImages} images.`);
      return;
    }

    setIsUploading(true);
    try {
      // Process the image
      const processedUri = await processImage(uri);
      
      if (mode === 'create') {
        // In create mode, store images locally with temporary IDs
        const tempImage: TokiImage = {
          url: processedUri,
          publicId: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        const updatedImages = [...currentImages, tempImage];
        onImagesUpdate(updatedImages);
        console.log('📸 [TOKI IMAGE UPLOAD] Image added locally in create mode:', tempImage);
      } else {
        // In edit mode, upload to backend immediately
        if (!tokiId) {
          throw new Error('Toki ID is required for edit mode');
        }
        
        // Convert image to blob
        const response = await fetch(processedUri);
        const blob = await response.blob();
        
        // Create FormData
        const formData = new FormData();
        formData.append('image', blob as any, 'toki-image.jpg');

        // Upload to backend
        const uploadResponse = await fetch(`${getBackendUrl()}/api/toki-images/upload/${tokiId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          if (result.success) {
            const newImage: TokiImage = {
              url: result.data.imageUrl,
              publicId: result.data.publicId,
            };
            const updatedImages = [...currentImages, newImage];
            onImagesUpdate(updatedImages);
            Alert.alert('Success', 'Image uploaded successfully!');
          } else {
            Alert.alert('Upload Failed', result.message || 'Failed to upload image');
          }
        } else {
          const errorData = await uploadResponse.json();
          Alert.alert('Upload Failed', errorData.message || 'Failed to upload image');
        }
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (publicId: string) => {
    console.log('🗑️ [TOKI IMAGE UPLOAD] deleteImage called with publicId:', publicId);
    console.log('🗑️ [TOKI IMAGE UPLOAD] tokiId:', tokiId);
    console.log('🗑️ [TOKI IMAGE UPLOAD] Mode:', mode);
    
    setDeletingImage(publicId);
    
    try {
      if (mode === 'create') {
        // In create mode, just remove from local state
        const updatedImages = currentImages.filter(img => img.publicId !== publicId);
        onImagesUpdate(updatedImages);
        console.log('🗑️ [TOKI IMAGE UPLOAD] Image removed locally in create mode');
      } else {
        // In edit mode, delete from backend
        if (!tokiId) {
          throw new Error('Toki ID is required for edit mode');
        }
        
        const deleteUrl = `${getBackendUrl()}/api/toki-images/delete/${tokiId}/${encodeURIComponent(publicId)}`;
        console.log('🗑️ [TOKI IMAGE UPLOAD] Delete URL:', deleteUrl);
        const deleteResponse = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
        });

        if (deleteResponse.ok) {
          const result = await deleteResponse.json();
          if (result.success) {
            const updatedImages = currentImages.filter(img => img.publicId !== publicId);
            onImagesUpdate(updatedImages);
            Alert.alert('Success', 'Image deleted successfully!');
          } else {
            Alert.alert('Delete Failed', result.message || 'Failed to delete image');
          }
        } else {
          const errorData = await deleteResponse.json();
          Alert.alert('Delete Failed', errorData.message || 'Failed to delete image');
        }
      }
    } catch (error) {
      console.error('Image deletion error:', error);
      Alert.alert('Delete Error', 'Failed to delete image. Please try again.');
    } finally {
      setDeletingImage(null);
    }
  };

  const handleImagePicker = async (useCamera: boolean) => {
    setShowOptions(false);
    
    try {
      let result;
      
      if (useCamera) {
        if (!(await requestCameraPermissions())) return;
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        if (!(await requestPermissions())) return;
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          allowsMultipleSelection: false,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleDeletePress = (image: TokiImage) => {
    console.log('🗑️ [TOKI IMAGE UPLOAD] Delete button pressed for image:', image);
    setImageToDelete(image);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (imageToDelete) {
      console.log('🗑️ [TOKI IMAGE UPLOAD] Delete confirmed, calling deleteImage with publicId:', imageToDelete.publicId);
      deleteImage(imageToDelete.publicId);
      setShowDeleteConfirm(false);
      setImageToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setImageToDelete(null);
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Toki Images</Text>
          <Text style={styles.subtitle}>
            {currentImages.length}/{maxImages} images
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
          {/* Existing Images */}
          {currentImages.map((image, index) => (
            <View key={image.publicId} style={styles.imageWrapper}>
              <Image source={{ uri: image.url }} style={styles.image} />
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePress(image)}
                disabled={deletingImage === image.publicId}
              >
                {deletingImage === image.publicId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Trash2 size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          ))}

          {/* Add Image Button */}
          {currentImages.length < maxImages && !disabled && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowOptions(true)}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="large" color="#8B5CF6" />
              ) : (
                <Plus size={32} color="#8B5CF6" />
              )}
              <Text style={styles.addButtonText}>Add Image</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {currentImages.length === 0 && !disabled && (
          <Text style={styles.emptyText}>
            Add images to make your Toki more engaging!
          </Text>
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
              <Text style={styles.modalTitle}>Add Toki Image</Text>
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete Image</Text>
              <TouchableOpacity onPress={cancelDelete}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete this image? This action cannot be undone.
            </Text>

            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.cancelDeleteButton}
                onPress={cancelDelete}
              >
                <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDelete}
                disabled={deletingImage === imageToDelete?.publicId}
              >
                {deletingImage === imageToDelete?.publicId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  imagesContainer: {
    marginBottom: 8,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  addButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  deleteConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelDeleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

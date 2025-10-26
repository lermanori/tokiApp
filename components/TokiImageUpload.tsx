import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { Trash2, Plus, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import ImageCropModal from './ImageCrop/ImageCropModal';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';

interface TokiImage {
  url: string;
  publicId: string;
}

interface TokiImageUploadProps {
  tokiId?: string;
  currentImages: TokiImage[];
  onImagesUpdate: (images: TokiImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
  mode?: 'create' | 'edit';
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
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImageUri(result.assets[0].uri);
        setTimeout(() => setShowCropModal(true), 300);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const handleCropComplete = async (croppedUri: string) => {
    console.log('🎨 [TOKI IMAGE UPLOAD] Crop complete, URI:', croppedUri);
    console.log('🎨 [TOKI IMAGE UPLOAD] Current images count:', currentImages.length);
    console.log('🎨 [TOKI IMAGE UPLOAD] Mode:', mode, 'TokiId:', tokiId);
    
    setShowCropModal(false);
    
    if (currentImages.length >= maxImages) {
      Alert.alert('Maximum Images Reached', `You can only upload up to ${maxImages} images.`);
      setSelectedImageUri(null);
      return;
    }

    setIsUploading(true);
    try {
      if (mode === 'edit' && tokiId) {
        // Edit mode: Upload to backend immediately
        console.log('📸 [TOKI IMAGE UPLOAD] Edit mode - uploading to backend...');
        
        const uploadedImage = await uploadImageToBackend(croppedUri, tokiId);
        
        if (uploadedImage) {
          const updatedImages = [...currentImages, uploadedImage];
          onImagesUpdate(updatedImages);
          Alert.alert('Success', 'Image uploaded successfully!');
        } else {
          throw new Error('Upload failed');
        }
      } else {
        // Create mode: Add locally with temp ID
        console.log('📸 [TOKI IMAGE UPLOAD] Create mode - adding locally...');
        
        const uniqueId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newImage: TokiImage = {
          url: croppedUri,
          publicId: uniqueId,
        };
        
        const updatedImages = [...currentImages, newImage];
        onImagesUpdate(updatedImages);
        Alert.alert('Success', 'Image added successfully!');
      }
    } catch (error) {
      console.error('📸 [TOKI IMAGE UPLOAD] Error:', error);
      Alert.alert('Error', 'Failed to add image. Please try again.');
    } finally {
      setIsUploading(false);
      setSelectedImageUri(null);
    }
  };

  const uploadImageToBackend = async (imageUri: string, tokiId: string): Promise<TokiImage | null> => {
    try {
      console.log('📸 [TOKI IMAGE UPLOAD] Starting backend upload for:', imageUri);
      
      let imageData: string;
      
      if (Platform.OS === 'web') {
        // Web: Convert to base64
        console.log('📸 [TOKI IMAGE UPLOAD] Web platform - converting to base64...');
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        
        if (!manipResult.base64) {
          throw new Error('Failed to convert image to base64');
        }
        
        imageData = `data:image/jpeg;base64,${manipResult.base64}`;
        
        // Send as JSON
        const response = await fetch(`${getBackendUrl()}/api/toki-images/upload/${tokiId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiService.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ image: imageData }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('📸 [TOKI IMAGE UPLOAD] Upload failed:', errorData);
          throw new Error(errorData.message || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('📸 [TOKI IMAGE UPLOAD] Upload successful:', result);
        
        return {
          url: result.data.imageUrl,
          publicId: result.data.publicId,
        };
      } else {
        // React Native: Use FormData
        console.log('📸 [TOKI IMAGE UPLOAD] React Native - using FormData...');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('image', blob as any, 'toki-image.jpg');
        
        const uploadResponse = await fetch(`${getBackendUrl()}/api/toki-images/upload/${tokiId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiService.getAccessToken()}`,
          },
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          console.error('📸 [TOKI IMAGE UPLOAD] Upload failed:', errorData);
          throw new Error(errorData.message || 'Upload failed');
        }
        
        const result = await uploadResponse.json();
        console.log('📸 [TOKI IMAGE UPLOAD] Upload successful:', result);
        
        return {
          url: result.data.imageUrl,
          publicId: result.data.publicId,
        };
      }
    } catch (error) {
      console.error('📸 [TOKI IMAGE UPLOAD] Upload error:', error);
      return null;
    }
  };

  const handleRemoveImage = (publicId: string) => {
    console.log('🗑️ [TOKI IMAGE UPLOAD] handleRemoveImage called with publicId:', publicId);
    setImageToDelete(publicId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!imageToDelete) return;
    
    console.log('🗑️ [TOKI IMAGE UPLOAD] Delete confirmed for:', imageToDelete);
    console.log('🗑️ [TOKI IMAGE UPLOAD] tokiId:', tokiId);
    console.log('🗑️ [TOKI IMAGE UPLOAD] mode:', mode);
    
    setShowDeleteModal(false);
    
    // Check if this is a temporary image (not yet uploaded) or a real one
    const isTempImage = imageToDelete.startsWith('temp_');
    console.log('🗑️ [TOKI IMAGE UPLOAD] isTempImage:', isTempImage);
    
    if (isTempImage || !tokiId) {
      // Just remove locally for temp images or when no tokiId
      console.log('🗑️ [TOKI IMAGE UPLOAD] Removing temp image locally:', imageToDelete);
      const updatedImages = currentImages.filter(img => img.publicId !== imageToDelete);
      onImagesUpdate(updatedImages);
      setImageToDelete(null);
    } else {
      // Delete from backend for real uploaded images
      console.log('🗑️ [TOKI IMAGE UPLOAD] Deleting image from backend:', imageToDelete);
      console.log('🗑️ [TOKI IMAGE UPLOAD] Delete URL:', `${getBackendUrl()}/api/toki-images/delete/${tokiId}/${encodeURIComponent(imageToDelete)}`);
      setIsUploading(true);
      
      try {
        const response = await fetch(
          `${getBackendUrl()}/api/toki-images/delete/${tokiId}/${encodeURIComponent(imageToDelete)}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${apiService.getAccessToken()}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        console.log('🗑️ [TOKI IMAGE UPLOAD] Response status:', response.status);
        
        if (response.ok) {
          console.log('🗑️ [TOKI IMAGE UPLOAD] Image deleted successfully');
          const updatedImages = currentImages.filter(img => img.publicId !== imageToDelete);
          onImagesUpdate(updatedImages);
          Alert.alert('Success', 'Image deleted successfully!');
        } else {
          const errorData = await response.json();
          console.error('🗑️ [TOKI IMAGE UPLOAD] Delete failed:', errorData);
          Alert.alert('Error', errorData.message || 'Failed to delete image');
        }
      } catch (error) {
        console.error('🗑️ [TOKI IMAGE UPLOAD] Delete error:', error);
        Alert.alert('Error', 'Failed to delete image. Please try again.');
      } finally {
        setIsUploading(false);
        setImageToDelete(null);
      }
    }
  };

  const cancelDelete = () => {
    console.log('🗑️ [TOKI IMAGE UPLOAD] Delete cancelled');
    setShowDeleteModal(false);
    setImageToDelete(null);
  };

  const canAddMoreImages = currentImages.length < maxImages;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Toki Images
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Existing Images */}
        {currentImages.map((image) => (
          <View key={image.publicId} style={styles.imageContainer}>
            <Image source={{ uri: image.url }} style={styles.image} />
            {!disabled && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveImage(image.publicId)}
              >
                <Trash2 size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        ))}
        
        {/* Add Image Button - Purple Style */}
        {canAddMoreImages && !disabled && (
          <TouchableOpacity
            style={styles.addImageButton}
            onPress={handlePickImage}
            disabled={isUploading}
          >
            <View style={styles.addImageContent}>
              <Plus size={32} color="#9333EA" />
              <Text style={styles.addImageText}>Add Image</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {isUploading && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#1C1C1C" />
          <Text style={styles.uploadingText}>Processing image...</Text>
        </View>
      )}

      {/* Crop Modal */}
      {showCropModal && selectedImageUri && (
        <ImageCropModal
          visible={showCropModal}
          imageUri={selectedImageUri}
          aspectRatio="4:3"
          mode="toki"
          onCrop={handleCropComplete}
          onCancel={() => {
            setShowCropModal(false);
            setSelectedImageUri(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalIcon}>
              <AlertCircle size={48} color="#EF4444" />
            </View>
            
            <Text style={styles.deleteModalTitle}>Remove Image</Text>
            <Text style={styles.deleteModalMessage}>
              Are you sure you want to remove this image? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity
                style={styles.deleteModalCancelButton}
                onPress={cancelDelete}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.deleteModalConfirmButton}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteModalConfirmText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  scrollContainer: {
    paddingRight: 20,
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 8,
  },
  image: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    resizeMode: 'cover',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 5, // For Android
  },
  addImageButton: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9333EA',
    borderStyle: 'dashed',
    backgroundColor: '#FAF5FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageContent: {
    alignItems: 'center',
    gap: 8,
  },
  addImageText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9333EA',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteModalIcon: {
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
    textAlign: 'center',
  },
  deleteModalMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  deleteModalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
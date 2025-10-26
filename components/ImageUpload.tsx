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
  Platform,
} from 'react-native';
import { Camera, Image as ImageIcon, Trash2, X, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useApp } from '@/contexts/AppContext';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';
import ImageCropModal from './ImageCrop/ImageCropModal';

// Types for different upload scenarios
export interface ImageUploadConfig {
  endpoint: string;
  method: 'POST' | 'PUT';
  additionalData?: Record<string, any>;
  successMessage?: string;
  errorMessage?: string;
}

export interface ImageUploadProps {
  // Display props
  currentImageUrl?: string;
  onImageUpdate: (imageUrl: string) => void;
  size?: number;
  showEditButton?: boolean;
  
  // Upload configuration
  uploadConfig: ImageUploadConfig;
  
  // Optional props
  aspectRatio?: '1:1' | '4:3' | '16:9';
  mode?: 'crop' | 'direct'; // Whether to show crop modal or upload directly
  disabled?: boolean;
  circular?: boolean; // Whether the preview should be circular
}

export default function ImageUpload({
  currentImageUrl,
  onImageUpdate,
  size = 80,
  showEditButton = true,
  uploadConfig,
  aspectRatio = '1:1',
  mode = 'crop',
  disabled = false,
  circular = false,
}: ImageUploadProps) {
  const { state, dispatch } = useApp();
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  // Debug state changes
  React.useEffect(() => {
    console.log('ImageUpload: State changed - showCropModal:', showCropModal, 'selectedImageUri:', selectedImageUri);
    if (selectedImageUri === null && showCropModal === false) {
      console.log('⚠️ WARNING: Both selectedImageUri and showCropModal are null/false - this might cause issues');
    }
  }, [showCropModal, selectedImageUri]);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      return false;
    }
    return true;
  };

  const handleImagePicker = async (useCamera: boolean = false) => {
    console.log('ImageUpload: handleImagePicker called with useCamera:', useCamera);
    
    // Reset state
    setSelectedImageUri(null);
    setShowCropModal(false);
    
    try {
      console.log('ImageUpload: Requesting library permissions...');
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      console.log('ImageUpload: Launching image picker with options:', {
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.8
      });
      
      console.log('ImageUpload: About to call ImagePicker.launchImageLibraryAsync...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.8,
      });

      console.log('ImageUpload: Image picker launched, waiting for result...');
      console.log('ImageUpload: 🎉 NATIVE PICKER CLOSED! Result received:', result);
      console.log('ImageUpload: Result canceled:', result.canceled);
      console.log('ImageUpload: Result assets:', result.assets);
      console.log('ImageUpload: Result assets length:', result.assets?.length);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('ImageUpload: Image selected successfully:', asset.uri);
        console.log('ImageUpload: Image selected! Showing simple alert...');
        
        if (mode === 'crop') {
          console.log('ImageUpload: Setting 1-second timeout before showing crop modal...');
          setSelectedImageUri(asset.uri);
          setTimeout(() => {
            console.log('ImageUpload: 1-second timeout completed, showing crop modal now');
            setShowCropModal(true);
          }, 1000);
        } else {
          // Direct upload mode
          await uploadImage(asset.uri);
        }
      }
    } catch (error) {
      console.error('ImageUpload: Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const processImage = async (uri: string) => {
    try {
      console.log('🔍 STEP 1 - Processing image URI:', uri);
      
      // Get image dimensions first
      const imageInfo = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
      console.log('🔍 STEP 2 - Image info:', {
        uri: imageInfo.uri,
        width: imageInfo.width,
        height: imageInfo.height
      });
      
      if (imageInfo.width === 0 || imageInfo.height === 0) {
        throw new Error('Invalid image dimensions');
      }
      
      // Resize and compress the image
      const processedImage = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 400, height: 400 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('🔍 STEP 3 - Processed image:', {
        uri: processedImage.uri,
        width: processedImage.width,
        height: processedImage.height
      });
      
      return processedImage.uri;
    } catch (error) {
      console.error('❌ STEP ERROR - Error processing image:', error);
      throw error;
    }
  };

  const uploadImage = async (uri: string) => {
    console.log('🚀🚀🚀 UPLOAD FUNCTION CALLED - Platform.OS:', Platform.OS);
    console.log('🚀🚀🚀 UPLOAD FUNCTION CALLED - typeof window:', typeof window);
    console.log('🚀🚀🚀 UPLOAD FUNCTION CALLED - typeof document:', typeof document);
    
    if (!state.currentUser?.id) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setIsUploading(true);
    try {
      console.log('🔍 STEP 4 - Starting upload for URI:', uri);
      
      // Platform detection
      const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');
      
      console.log('🔍 Platform detection:', {
        PlatformOS: Platform.OS,
        isWeb: isWeb,
        hasWindow: typeof window !== 'undefined',
        hasDocument: typeof document !== 'undefined'
      });
      
      let uploadResponse;
      
      if (isWeb) {
        // Web version: Convert to base64 and send as JSON
        console.log('🔍 STEP 5 - Web platform: Converting to base64...');
        
        const base64Response = await ImageManipulator.manipulateAsync(
          uri,
          [], // No transformations needed
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true, // This is the key - get base64 data
          }
        );
        
        console.log('🔍 STEP 6 - Web base64 conversion result:', {
          hasBase64: !!base64Response.base64,
          base64Length: base64Response.base64?.length || 0,
        });
        
        if (!base64Response.base64) {
          throw new Error('Failed to convert image to base64');
        }
        
        const uploadData = {
          image: `data:image/jpeg;base64,${base64Response.base64}`,
          userId: state.currentUser.id,
          ...uploadConfig.additionalData,
        };
        
        console.log('🔍 STEP 7 - Web: Sending JSON request...');
        
        uploadResponse = await fetch(`${getBackendUrl()}${uploadConfig.endpoint}`, {
          method: uploadConfig.method,
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadData),
        });
        
        console.log('🔍 STEP 8 - Web JSON request sent, response status:', uploadResponse.status);
      } else {
        // React Native (iOS/Android): Convert to base64 and send as JSON
        console.log('🔍 STEP 5 - React Native platform: Converting to base64...');
        
        const base64Response = await ImageManipulator.manipulateAsync(
          uri,
          [], // No transformations needed - already processed
          {
            compress: 0.8,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true, // Get base64 data
          }
        );
        
        console.log('🔍 STEP 6 - React Native base64 conversion result:', {
          hasBase64: !!base64Response.base64,
          base64Length: base64Response.base64?.length || 0,
        });
        
        if (!base64Response.base64) {
          throw new Error('Failed to convert image to base64');
        }
        
        const uploadData = {
          image: `data:image/jpeg;base64,${base64Response.base64}`,
          userId: state.currentUser.id,
          ...uploadConfig.additionalData,
        };
        
        console.log('🔍 STEP 7 - React Native: Sending JSON request...');
        
        uploadResponse = await fetch(`${getBackendUrl()}${uploadConfig.endpoint}`, {
          method: uploadConfig.method,
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(uploadData),
        });
        
        console.log('🔍 STEP 8 - React Native JSON request sent, response status:', uploadResponse.status);
      }

      console.log('🔍 STEP 9 - Upload response:', {
        status: uploadResponse.status,
        ok: uploadResponse.ok,
        statusText: uploadResponse.statusText
      });

      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log('🔍 STEP 10 - Upload success result:', result);
        if (result.success) {
          // Update the global state first
          dispatch({
            type: 'UPDATE_CURRENT_USER',
            payload: { avatar: result.data.imageUrl }
          });
          // Then call the callback
          onImageUpdate(result.data.imageUrl);
          Alert.alert('Success', uploadConfig.successMessage || 'Image uploaded successfully!');
        } else {
          Alert.alert('Upload Failed', result.message || uploadConfig.errorMessage || 'Failed to upload image');
        }
      } else {
        const errorData = await uploadResponse.json();
        console.error('❌ STEP ERROR - Upload failed:', errorData);
        Alert.alert('Upload Failed', errorData.message || uploadConfig.errorMessage || 'Failed to upload image');
      }
    } catch (error) {
      console.error('❌ STEP ERROR - Upload error:', error);
      Alert.alert('Upload Error', uploadConfig.errorMessage || 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
      setShowOptions(false);
      // Now reset the selected image URI after successful upload or on error
      setSelectedImageUri(null);
    }
  };

  const handleCropComplete = async (croppedUri: string) => {
    try {
      console.log('ImageUpload: handleCropComplete called with URI:', croppedUri);
      setShowCropModal(false);
      // DON'T reset selectedImageUri yet - keep it until upload is complete
      console.log('ImageUpload: Processing image...');
      const processedUri = await processImage(croppedUri);
      console.log('ImageUpload: Image processed, uploading...');
      await uploadImage(processedUri);
      console.log('ImageUpload: Upload complete');
      // Now reset the selected image URI after successful upload
      setSelectedImageUri(null);
    } catch (error) {
      console.error('ImageUpload: Error in handleCropComplete:', error);
      Alert.alert('Error', 'Failed to process the cropped image. Please try again.');
      // Reset on error too
      setSelectedImageUri(null);
    }
  };

  const handleRemoveImage = async () => {
    Alert.alert(
      'Remove Image',
      'Are you sure you want to remove this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            onImageUpdate('');
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={[
          styles.imageContainer, 
          { 
            width: size, 
            height: size,
            borderRadius: circular ? size / 2 : 8,
          }
        ]}>
          {currentImageUrl ? (
            <Image source={{ uri: currentImageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.placeholder, { borderRadius: circular ? size / 2 : 8 }]}>
              <ImageIcon size={size * 0.4} color="#9CA3AF" />
            </View>
          )}
        </View>
        
        {/* Buttons outside the image container so they overflow */}
        {showEditButton && !disabled && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setShowOptions(true)}
          >
            <Upload size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        
        {currentImageUrl && showEditButton && !disabled && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemoveImage}
          >
            <Trash2 size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Image Selection Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Image</Text>
              <TouchableOpacity
                onPress={() => setShowOptions(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setShowOptions(false);
                  handleImagePicker(false);
                }}
                disabled={isUploading}
              >
                <ImageIcon size={24} color="#1C1C1C" />
                <Text style={styles.optionText}>Choose from Library</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => {
                  setShowOptions(false);
                  handleImagePicker(true);
                }}
                disabled={isUploading}
              >
                <Camera size={24} color="#1C1C1C" />
                <Text style={styles.optionText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
            
            {isUploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="small" color="#1C1C1C" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Crop Modal */}
      {showCropModal && selectedImageUri && (
        <ImageCropModal
          visible={showCropModal}
          imageUri={selectedImageUri}
          aspectRatio={aspectRatio}
          mode="crop"
          onCrop={handleCropComplete}
          onCancel={() => {
            console.log('ImageUpload: Crop modal canceled');
            setShowCropModal(false);
            setSelectedImageUri(null); // Reset the selected image URI
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  editButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: '80%',
    maxWidth: 400,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionText: {
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
});

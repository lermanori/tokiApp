import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { X, Crop, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ImageCropModalProps, AspectRatioButton } from './types';
import { styles } from './styles';

export default function ImageCropModalIOS({
  visible,
  imageUri,
  aspectRatio,
  mode,
  onCrop,
  onCancel,
  onAspectRatioChange,
}: ImageCropModalProps) {
  console.log('ImageCropModalIOS: Component rendered with visible:', visible, 'imageUri:', imageUri);
  
  const insets = useSafeAreaInsets();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [croppedPreviewUri, setCroppedPreviewUri] = useState<string | null>(null);
  
  // Crop position state
  const [cropPosition, setCropPosition] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState({ width: 150, height: 150 });
  
  // Animated values for smooth dragging
  const pan = useRef(new Animated.ValueXY()).current;

  // Simple touch handling for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });

  const handleTouchStart = (evt: any) => {
    console.log('🔥 TOUCH START FIRED!', evt.nativeEvent.pageX, evt.nativeEvent.pageY);
    setIsDragging(true);
    setDragStart({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY });
    setStartPosition(cropPosition);
  };

  const handleTouchMove = (evt: any) => {
    if (!isDragging) {
      console.log('❌ Not dragging, ignoring touch move');
      return;
    }
    
    const currentX = evt.nativeEvent.pageX;
    const currentY = evt.nativeEvent.pageY;
    const deltaX = currentX - dragStart.x;
    const deltaY = currentY - dragStart.y;
    
    console.log('🔥 TOUCH MOVE FIRED!', { deltaX, deltaY, currentX, currentY, dragStart });
    console.log('Image dimensions:', imageDimensions);
    console.log('Crop size:', cropSize);
    console.log('Start position:', startPosition);
    
    // Ensure crop box stays within image bounds
    const maxX = Math.max(0, imageDimensions.width - cropSize.width);
    const maxY = Math.max(0, imageDimensions.height - cropSize.height);
    
    const newX = Math.max(0, Math.min(
      startPosition.x + deltaX, 
      maxX
    ));
    const newY = Math.max(0, Math.min(
      startPosition.y + deltaY, 
      maxY
    ));
    
    console.log('New position:', { newX, newY, maxX, maxY });
    console.log('Position changed:', newX !== cropPosition.x || newY !== cropPosition.y);
    setCropPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    console.log('Touch end');
    setIsDragging(false);
  };

  // Update preview when imageUri changes
  useEffect(() => {
    if (imageUri) {
      setPreviewUri(imageUri);
    }
  }, [imageUri]);

  // Update crop size when aspect ratio changes
  useEffect(() => {
    if (aspectRatio === '1:1') {
      setCropSize({ width: 150, height: 150 });
    } else {
      setCropSize({ width: 200, height: 150 });
    }
  }, [aspectRatio]);

  // Update crop position when image dimensions change
  useEffect(() => {
    if (imageDimensions.width > 0 && imageDimensions.height > 0) {
      // Center the crop box initially
      const centerX = Math.max(0, (imageDimensions.width - cropSize.width) / 2);
      const centerY = Math.max(0, (imageDimensions.height - cropSize.height) / 2);
      
      console.log('Centering crop box:', { centerX, centerY, imageDimensions, cropSize });
      setCropPosition({ x: centerX, y: centerY });
    }
  }, [imageDimensions, cropSize]);

  // Update profile preview when crop position changes
  useEffect(() => {
    if (previewUri && imageDimensions.width > 0) {
      updateProfilePreview();
    }
  }, [cropPosition, cropSize, previewUri, imageDimensions]);

  const updateProfilePreview = async () => {
    if (!previewUri || imageDimensions.width === 0) {
      console.log('Cannot update preview - missing data:', { previewUri: !!previewUri, imageDimensions });
      return;
    }
    
    try {
      console.log('Updating profile preview with:', { cropPosition, cropSize, imageDimensions });
      
      // The preview image is 300x200, so we need to scale from that to the actual image
      // But we're cropping from the preview image itself, so no scaling needed!
      const previewCropX = cropPosition.x;
      const previewCropY = cropPosition.y;
      const previewCropWidth = cropSize.width;
      const previewCropHeight = cropSize.height;
      
      console.log('Preview crop coordinates (no scaling):', { previewCropX, previewCropY, previewCropWidth, previewCropHeight });
      
      // Create a cropped version for the profile preview
      const croppedPreview = await ImageManipulator.manipulateAsync(
        previewUri,
        [
          {
            crop: {
              originX: Math.round(previewCropX),
              originY: Math.round(previewCropY),
              width: Math.round(previewCropWidth),
              height: Math.round(previewCropHeight),
            },
          },
          {
            resize: {
              width: 50,
              height: 50,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('Profile preview updated:', croppedPreview.uri);
      setCroppedPreviewUri(croppedPreview.uri);
    } catch (error) {
      console.error('Error updating profile preview:', error);
    }
  };

  const handleCrop = async () => {
    if (!imageUri) return;
    
    setIsProcessing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('ImageCropModal iOS: Starting crop process for image:', imageUri);
      
      // Get image dimensions first
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], { format: ImageManipulator.SaveFormat.JPEG });
      
      // Calculate crop dimensions based on aspect ratio and image size
      const { width: imageWidth, height: imageHeight } = imageInfo;
      console.log('ImageCropModal iOS: Image dimensions:', { imageWidth, imageHeight });
      
      // Calculate scale factors from preview to actual image
      const scaleX = imageWidth / imageDimensions.width;
      const scaleY = imageHeight / imageDimensions.height;
      
      // Convert crop position from preview coordinates to actual image coordinates
      const actualCropX = cropPosition.x * scaleX;
      const actualCropY = cropPosition.y * scaleY;
      const actualCropWidth = cropSize.width * scaleX;
      const actualCropHeight = cropSize.height * scaleY;
      
      console.log('ImageCropModal iOS: Actual crop dimensions:', { 
        actualCropX, 
        actualCropY, 
        actualCropWidth, 
        actualCropHeight 
      });
      
      // Use ImageManipulator to crop the image
      const croppedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.round(actualCropX),
              originY: Math.round(actualCropY),
              width: Math.round(actualCropWidth),
              height: Math.round(actualCropHeight),
            },
          },
          {
            resize: {
              width: aspectRatio === '1:1' ? 400 : 400,
              height: aspectRatio === '1:1' ? 400 : 300,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('ImageCropModal iOS: Crop completed, result:', croppedImage.uri);
      onCrop(croppedImage.uri);
      
    } catch (error) {
      console.error('ImageCropModal iOS: Crop error:', error);
      Alert.alert('Crop Failed', 'Unable to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const aspectRatioButtons: AspectRatioButton[] = [
    { key: '1:1', label: '1:1', active: aspectRatio === '1:1' },
    { key: '4:3', label: '4:3', active: aspectRatio === '4:3' },
  ];

  console.log('ImageCropModalIOS: About to render modal with visible:', visible);
  
  const handleRequestClose = () => {
    console.log('ImageCropModalIOS: onRequestClose called');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleRequestClose}
    >
      <View style={[styles.iosContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Header */}
        <View style={styles.iosHeader}>
          <TouchableOpacity onPress={() => {
            console.log('ImageCropModalIOS: Cancel button pressed');
            onCancel();
          }} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Crop Image</Text>
          <TouchableOpacity 
            onPress={handleCrop} 
            style={[styles.cropButton, isProcessing && styles.disabledButton]}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.cropText}>Crop</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Aspect Ratio Controls */}
        <View style={styles.aspectRatioContainer}>
          {aspectRatioButtons.map((button) => (
            <TouchableOpacity
              key={button.key}
              style={[
                styles.aspectRatioButton,
                button.active && styles.activeAspectRatio,
              ]}
              onPress={() => onAspectRatioChange?.(button.key)}
            >
              <Text style={[
                styles.aspectRatioText,
                button.active && styles.activeAspectRatioText,
              ]}>
                {button.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Image Preview Area */}
        <View style={styles.iosPreviewContainer}>
          {previewUri && (
            <View style={styles.imageWrapper}>
              <Image 
                source={{ uri: previewUri }} 
                style={styles.iosPreviewImage}
                onLayout={(event) => {
                  const { width, height } = event.nativeEvent.layout;
                  console.log('🔥 IMAGE LAYOUT FIRED:', { width, height });
                  setImageDimensions({ width, height });
                }}
              />
              {/* Interactive crop overlay */}
              <View style={styles.cropOverlay}>
                {/* Image boundary indicator */}
                <View 
                  style={[
                    styles.imageBoundary,
                    {
                      width: imageDimensions.width,
                      height: imageDimensions.height,
                    }
                  ]}
                />
                
                <View
                  style={[
                    styles.cropArea,
                    {
                      width: cropSize.width,
                      height: cropSize.height,
                      left: cropPosition.x,
                      top: cropPosition.y,
                    },
                  ]}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  <View style={styles.cropAreaInner}>
                    <Text style={styles.dragHint}>
                      {isDragging ? 'Dragging...' : 'Drag me'}
                    </Text>
                    <Text style={styles.positionText}>
                      {Math.round(cropPosition.x)},{Math.round(cropPosition.y)}
                    </Text>
                    <Text style={styles.debugText}>
                      Size: {cropSize.width}x{cropSize.height}
                    </Text>
                    <Text style={styles.debugText}>
                      Image: {Math.round(imageDimensions.width)}x{Math.round(imageDimensions.height)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Profile Preview */}
        <View style={styles.profilePreviewContainer}>
          <Text style={styles.profilePreviewLabel}>Profile Preview</Text>
          <View style={styles.profilePreviewImage}>
            {croppedPreviewUri ? (
              <Image 
                source={{ uri: croppedPreviewUri }} 
                style={styles.profilePreviewThumbnail}
                resizeMode="cover"
              />
            ) : previewUri && (
              <Image 
                source={{ uri: previewUri }} 
                style={styles.profilePreviewThumbnail}
                resizeMode="cover"
              />
            )}
          </View>
        </View>

        {/* Test Button */}
        <View style={styles.testContainer}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={() => {
              console.log('🔥 TEST: Moving crop box to random position');
              const newX = Math.random() * (imageDimensions.width - cropSize.width);
              const newY = Math.random() * (imageDimensions.height - cropSize.height);
              console.log('🔥 TEST: New position:', { newX, newY });
              setCropPosition({ x: newX, y: newY });
            }}
          >
            <Text style={styles.testButtonText}>Test Move</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Drag the crop area to position it, then tap "Crop" to apply
          </Text>
        </View>
      </View>
    </Modal>
  );
}

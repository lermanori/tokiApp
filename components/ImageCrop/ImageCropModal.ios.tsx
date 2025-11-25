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
  
  // Preview container size (drawn image sits inside with contain-fit)
  // Make it as large as possible without overflowing screen
  const screen = Dimensions.get('window');
  const CONTAINER_W = Math.min(screen.width - 40, 600);
  const CONTAINER_H = Math.min(Math.round(screen.height * 0.38), 420);

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
  
  // Resize handling
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStartData, setResizeStartData] = useState<{
    startSize: { width: number; height: number };
    startPosition: { x: number; y: number };
    startTouch: { x: number; y: number };
  } | null>(null);
  const MIN_CROP_SIZE = 60;
  
  // Debounce preview updates
  const previewUpdateTimeout = useRef<any>(null);

  const handleTouchStart = (evt: any) => {
    console.log('🔥 TOUCH START FIRED!', evt.nativeEvent.pageX, evt.nativeEvent.pageY);
    setIsDragging(true);
    setDragStart({ x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY });
    setStartPosition(cropPosition);
  };

  const handleTouchMove = (evt: any) => {
    if (isResizing) {
      handleResizeMove(evt);
    } else if (isDragging) {
      const currentX = evt.nativeEvent.pageX;
      const currentY = evt.nativeEvent.pageY;
      const deltaX = currentX - dragStart.x;
      const deltaY = currentY - dragStart.y;
      
      // Keep crop within drawn image bounds (coordinates are relative to overlay origin)
      const maxX = Math.max(0, imageDimensions.width - cropSize.width);
      const maxY = Math.max(0, imageDimensions.height - cropSize.height);
      
      const newX = Math.max(0, Math.min(startPosition.x + deltaX, maxX));
      const newY = Math.max(0, Math.min(startPosition.y + deltaY, maxY));
      
      setCropPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStartData(null);
    
    // Update preview immediately when user stops dragging/resizing
    if (previewUri && imageDimensions.width > 0) {
      if (previewUpdateTimeout.current) {
        clearTimeout(previewUpdateTimeout.current);
      }
      updateProfilePreview();
    }
  };

  const handleResizeStart = (handle: string, event: any) => {
    setIsResizing(true);
    setResizeHandle(handle);
    
    setResizeStartData({
      startSize: { width: cropSize.width, height: cropSize.height },
      startPosition: { x: cropPosition.x, y: cropPosition.y },
      startTouch: { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }
    });
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleResizeMove = (event: any) => {
    if (!isResizing || !resizeHandle || !resizeStartData) return;

    const { pageX, pageY } = event.nativeEvent;
    const { width: imageWidth, height: imageHeight } = imageDimensions;
    
    const deltaX = pageX - resizeStartData.startTouch.x;
    const deltaY = pageY - resizeStartData.startTouch.y;
    
    let newWidth = resizeStartData.startSize.width;
    let newHeight = resizeStartData.startSize.height;
    let newX = resizeStartData.startPosition.x;
    let newY = resizeStartData.startPosition.y;
    
    const aspectRatioValue = aspectRatio === '1:1' ? 1 : 4/3;

    switch (resizeHandle) {
      case 'se': // Bottom-right corner - grow from top-left
        const deltaSE = Math.max(deltaX, deltaY);
        newWidth = Math.max(MIN_CROP_SIZE, resizeStartData.startSize.width + deltaSE);
        newHeight = newWidth / aspectRatioValue;
        break;
        
      case 'sw': // Bottom-left corner - grow from top-right
        const deltaSW = Math.max(-deltaX, deltaY);
        newWidth = Math.max(MIN_CROP_SIZE, resizeStartData.startSize.width + deltaSW);
        newHeight = newWidth / aspectRatioValue;
        newX = resizeStartData.startPosition.x + resizeStartData.startSize.width - newWidth;
        break;
        
      case 'ne': // Top-right corner - grow from bottom-left
        const deltaNE = Math.max(deltaX, -deltaY);
        newWidth = Math.max(MIN_CROP_SIZE, resizeStartData.startSize.width + deltaNE);
        newHeight = newWidth / aspectRatioValue;
        newY = resizeStartData.startPosition.y + resizeStartData.startSize.height - newHeight;
        break;
        
      case 'nw': // Top-left corner - grow from bottom-right
        const deltaNW = Math.max(-deltaX, -deltaY);
        newWidth = Math.max(MIN_CROP_SIZE, resizeStartData.startSize.width + deltaNW);
        newHeight = newWidth / aspectRatioValue;
        newX = resizeStartData.startPosition.x + resizeStartData.startSize.width - newWidth;
        newY = resizeStartData.startPosition.y + resizeStartData.startSize.height - newHeight;
        break;
    }
    
    // Clamp size to image bounds while keeping top-left at newX/newY
    newWidth = Math.min(newWidth, imageWidth - Math.max(0, newX));
    newHeight = Math.min(newHeight, imageHeight - Math.max(0, newY));

    // Recompute position to stay inside bounds
    newX = Math.max(0, Math.min(newX, imageWidth - newWidth));
    newY = Math.max(0, Math.min(newY, imageHeight - newHeight));
    
    // Ensure minimum size
    if (newWidth >= MIN_CROP_SIZE && newHeight >= MIN_CROP_SIZE) {
      setCropSize({ width: newWidth, height: newHeight });
      setCropPosition({ x: newX, y: newY });
    }
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

  // Update profile preview when crop position changes (debounced)
  useEffect(() => {
    if (previewUri && imageDimensions.width > 0) {
      // Clear existing timeout
      if (previewUpdateTimeout.current) {
        clearTimeout(previewUpdateTimeout.current);
      }
      
      // Set new timeout for debounced update
      previewUpdateTimeout.current = setTimeout(() => {
        updateProfilePreview();
      }, 150);
    }
    
    // Cleanup on unmount
    return () => {
      if (previewUpdateTimeout.current) {
        clearTimeout(previewUpdateTimeout.current);
      }
    };
  }, [cropPosition, cropSize, previewUri, imageDimensions]);

  const updateProfilePreview = async () => {
    if (!imageUri || imageDimensions.width === 0) {
      console.log('Cannot update preview - missing data:', { imageUri: !!imageUri, imageDimensions });
      return;
    }
    
    try {
      console.log('Updating preview with:', { cropPosition, cropSize, imageDimensions });
      
      // Get the actual image dimensions - use Image.getSize instead of manipulateAsync
      // This avoids re-processing the image which can cause pixelation
      const actualImageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(
          imageUri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error)
        );
      });
      
      const actualImageWidth = actualImageDimensions.width;
      const actualImageHeight = actualImageDimensions.height;
      
      console.log('Actual image dimensions:', { actualImageWidth, actualImageHeight });
      
      // Calculate scale factors from preview (300x200) to actual image
      const scaleX = actualImageWidth / imageDimensions.width;
      const scaleY = actualImageHeight / imageDimensions.height;
      
      console.log('Scale factors:', { scaleX, scaleY });
      
      // Convert crop position from overlay coordinates to actual image coordinates and clamp
      let actualCropX = Math.max(0, Math.round(cropPosition.x * scaleX));
      let actualCropY = Math.max(0, Math.round(cropPosition.y * scaleY));
      let actualCropWidth = Math.round(cropSize.width * scaleX);
      let actualCropHeight = Math.round(cropSize.height * scaleY);

      // Ensure crop rectangle stays within image bounds to avoid errors
      if (actualCropX + actualCropWidth > actualImageWidth) {
        actualCropWidth = actualImageWidth - actualCropX;
      }
      if (actualCropY + actualCropHeight > actualImageHeight) {
        actualCropHeight = actualImageHeight - actualCropY;
      }
      
      console.log('Actual crop coordinates:', { actualCropX, actualCropY, actualCropWidth, actualCropHeight });
      
      // Determine preview size based on aspect ratio
      const previewWidth = aspectRatio === '1:1' ? 80 : 120;
      const previewHeight = aspectRatio === '1:1' ? 80 : 90;
      
      // Create a cropped version for the preview
      const croppedPreview = await ImageManipulator.manipulateAsync(
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
              width: previewWidth,
              height: previewHeight,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log('Preview updated:', croppedPreview.uri);
      setCroppedPreviewUri(croppedPreview.uri);
    } catch (error) {
      console.error('Error updating preview:', error);
    }
  };

  const handleCrop = async () => {
    if (!imageUri) return;
    
    setIsProcessing(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('ImageCropModal iOS: Starting crop process for image:', imageUri);
      
      // Get image dimensions first - use Image.getSize to avoid unnecessary processing
      const imageDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        Image.getSize(
          imageUri,
          (width, height) => resolve({ width, height }),
          (error) => reject(error)
        );
      });
      
      // Calculate crop dimensions based on aspect ratio and image size
      const { width: imageWidth, height: imageHeight } = imageDimensions;
      console.log('ImageCropModal iOS: Image dimensions:', { imageWidth, imageHeight });
      
      // Calculate scale factors from preview to actual image
      const scaleX = imageWidth / imageDimensions.width;
      const scaleY = imageHeight / imageDimensions.height;
      
      // Convert crop position from overlay coordinates to actual image coordinates and clamp
      let actualCropX = Math.max(0, Math.round(cropPosition.x * scaleX));
      let actualCropY = Math.max(0, Math.round(cropPosition.y * scaleY));
      let actualCropWidth = Math.round(cropSize.width * scaleX);
      let actualCropHeight = Math.round(cropSize.height * scaleY);

      if (actualCropX + actualCropWidth > imageWidth) {
        actualCropWidth = imageWidth - actualCropX;
      }
      if (actualCropY + actualCropHeight > imageHeight) {
        actualCropHeight = imageHeight - actualCropY;
      }
      
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
            <View style={styles.previewCard}>
              <View 
                style={styles.imageWrapper}
                onLayout={async () => {
                // Measure drawn image size for contain-fit inside container
                // Only do this once to avoid re-processing the image
                if (imageDimensions.width > 0) {
                  return; // Already measured
                }
                
                try {
                  // Use Image.getSize instead of manipulateAsync to avoid re-processing
                  const imgDimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
                    Image.getSize(
                      previewUri!,
                      (width, height) => resolve({ width, height }),
                      (error) => reject(error)
                    );
                  });
                  
                  const imgW = imgDimensions.width;
                  const imgH = imgDimensions.height;
                  const containerW = CONTAINER_W;
                  const containerH = CONTAINER_H;
                  const scale = Math.min(containerW / imgW, containerH / imgH);
                  const drawnW = Math.round(imgW * scale);
                  const drawnH = Math.round(imgH * scale);

                  setImageDimensions({ width: drawnW, height: drawnH });

                  // Center crop area within overlay coordinates
                  setCropPosition({
                    x: Math.max(0, (drawnW - cropSize.width) / 2),
                    y: Math.max(0, (drawnH - cropSize.height) / 2),
                  });
                } catch (e) {
                  console.error('Error measuring image:', e);
                  // fallback to container size
                  setImageDimensions({ width: CONTAINER_W, height: CONTAINER_H });
                }
                }}
              >
                <Image 
                  source={{ uri: previewUri }} 
                  style={[styles.iosPreviewImage, { width: CONTAINER_W, height: CONTAINER_H }]}
                  resizeMode="contain"
                />
              {/* Interactive crop overlay - positioned over the image */}
              {imageDimensions.width > 0 && (
                <View style={[styles.cropOverlay, {
                  width: imageDimensions.width,
                  height: imageDimensions.height,
                  left: Math.round((CONTAINER_W - imageDimensions.width) / 2),
                  top: Math.round((CONTAINER_H - imageDimensions.height) / 2),
                }]}> 
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
                  />
                  
                  {/* Resize handles */}
                  <View
                    style={[styles.resizeHandle, styles.resizeHandleNW, {
                      left: cropPosition.x - 10,
                      top: cropPosition.y - 10,
                    }]}
                    onTouchStart={(event) => handleResizeStart('nw', event)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  <View
                    style={[styles.resizeHandle, styles.resizeHandleNE, {
                      left: cropPosition.x + cropSize.width - 10,
                      top: cropPosition.y - 10,
                    }]}
                    onTouchStart={(event) => handleResizeStart('ne', event)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  <View
                    style={[styles.resizeHandle, styles.resizeHandleSW, {
                      left: cropPosition.x - 10,
                      top: cropPosition.y + cropSize.height - 10,
                    }]}
                    onTouchStart={(event) => handleResizeStart('sw', event)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                  <View
                    style={[styles.resizeHandle, styles.resizeHandleSE, {
                      left: cropPosition.x + cropSize.width - 10,
                      top: cropPosition.y + cropSize.height - 10,
                    }]}
                    onTouchStart={(event) => handleResizeStart('se', event)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />
                </View>
              )}
              </View>
            </View>
          )}
        </View>

        {/* Dual Preview - Circle and Rectangle */}
        <View style={styles.dualPreviewContainer}>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Circle</Text>
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
          
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>Rectangle</Text>
            <View style={styles.tokiPreviewImage}>
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

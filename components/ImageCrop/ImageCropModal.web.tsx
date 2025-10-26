import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './ImageCrop.css';
import { ImageCropModalProps, AspectRatioButton } from './types';
import { styles } from './styles';

export default function ImageCropModalWeb({
  visible,
  imageUri,
  aspectRatio,
  mode,
  onCrop,
  onCancel,
  onAspectRatioChange,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(imageUri);
  const imgRef = useRef<HTMLImageElement>(null);

  // Update preview URI when image URI changes
  React.useEffect(() => {
    setPreviewUri(imageUri);
  }, [imageUri]);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    
    let cropWidth, cropHeight;
    if (aspectRatio === '1:1') {
      // Make square crop bigger - use 80% of the smaller dimension
      const size = Math.min(width, height) * 0.8;
      cropWidth = cropHeight = size;
    } else if (aspectRatio === '4:3') {
      // Make 4:3 crop bigger - use 80% of width or appropriate height
      cropWidth = width * 0.8;
      cropHeight = (cropWidth * 3) / 4;
      // If height is too big, adjust width
      if (cropHeight > height * 0.8) {
        cropHeight = height * 0.8;
        cropWidth = (cropHeight * 4) / 3;
      }
    } else {
      cropWidth = width * 0.7;
      cropHeight = height * 0.7;
    }

    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: 'px',
          width: cropWidth,
          height: cropHeight,
        },
        aspectRatio === '1:1' ? 1 : 4/3,
        width,
        height
      ),
      width,
      height
    );

    setCrop(crop);
  }, [aspectRatio]);

  // Update crop when aspect ratio changes
  React.useEffect(() => {
    if (imgRef.current && crop) {
      const { width, height } = imgRef.current;
      const currentAspectRatio = aspectRatio === '1:1' ? 1 : 4/3;
      
      let newWidth, newHeight;
      if (aspectRatio === '1:1') {
        // Make square crop bigger - use 80% of the smaller dimension
        const size = Math.min(width, height) * 0.8;
        newWidth = newHeight = size;
      } else {
        // Make 4:3 crop bigger - use 80% of width or appropriate height
        newWidth = width * 0.8;
        newHeight = (newWidth * 3) / 4;
        // If height is too big, adjust width
        if (newHeight > height * 0.8) {
          newHeight = height * 0.8;
          newWidth = (newHeight * 4) / 3;
        }
      }
      
      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: 'px',
            width: newWidth,
            height: newHeight,
          },
          currentAspectRatio,
          width,
          height
        ),
        width,
        height
      );
      
      setCrop(newCrop);
    }
  }, [aspectRatio]);

  // Generate preview when crop changes
  const generatePreview = useCallback(async (crop: PixelCrop) => {
    if (!imgRef.current || !crop.width || !crop.height) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setPreviewUri(dataUrl);
  }, []);

  // Handle crop completion
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
    generatePreview(crop);
  }, [generatePreview]);

  // Handle crop change
  const onCropChange = useCallback((crop: Crop) => {
    setCrop(crop);
  }, []);

  // Crop the image
  const handleCrop = async () => {
    if (!completedCrop || !imgRef.current) {
      Alert.alert('Error', 'Please select an area to crop');
      return;
    }

    setIsProcessing(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      const image = imgRef.current;
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;

      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      canvas.toBlob((blob) => {
        if (blob) {
          const croppedUrl = URL.createObjectURL(blob);
          onCrop(croppedUrl);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('Crop error:', error);
      Alert.alert('Crop Failed', 'Unable to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const aspectRatioButtons: AspectRatioButton[] = [
    { key: '1:1', label: '1:1', active: aspectRatio === '1:1' },
    { key: '4:3', label: '4:3', active: aspectRatio === '4:3' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
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

          {/* Image Crop Area */}
          <View style={styles.canvasContainer}>
            <ReactCrop
              crop={crop}
              onChange={onCropChange}
              onComplete={onCropComplete}
              aspect={aspectRatio === '1:1' ? 1 : 4/3}
              minWidth={80}
              minHeight={aspectRatio === '1:1' ? 80 : 60}
              keepSelection
              className="react-crop"
            >
              <img
                ref={imgRef}
                src={imageUri}
                style={{ maxWidth: 400, maxHeight: 500, objectFit: 'contain' }}
                onLoad={onImageLoad}
                alt="Crop me"
              />
            </ReactCrop>
          </View>

          {/* Dual Preview for Toki Mode */}
          {mode === 'toki' && (
            <View style={styles.dualPreviewContainer}>
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Card Preview</Text>
                <View style={styles.rectangularPreview}>
                  {previewUri ? (
                    <img 
                      src={previewUri} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      alt="Card preview"
                    />
                  ) : (
                    <Text style={{ fontSize: 12, color: '#666' }}>No preview</Text>
                  )}
                </View>
              </View>
              <View style={styles.previewItem}>
                <Text style={styles.previewLabel}>Profile Preview</Text>
                <View style={styles.circularPreview}>
                  {previewUri ? (
                    <img 
                      src={previewUri} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      alt="Profile preview"
                    />
                  ) : (
                    <Text style={{ fontSize: 12, color: '#666' }}>No preview</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* Single Preview for Profile Mode */}
          {mode === 'profile' && (
            <View style={styles.singlePreviewContainer}>
              <Text style={styles.previewLabel}>Profile Preview</Text>
              <View style={styles.circularPreview}>
                {previewUri ? (
                  <img 
                    src={previewUri} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    alt="Profile preview"
                  />
                ) : (
                  <Text style={{ fontSize: 12, color: '#666' }}>No preview</Text>
                )}
              </View>
            </View>
          )}

          {/* Preview for Crop Mode - show based on aspect ratio */}
          {mode === 'crop' && (
            <View style={styles.singlePreviewContainer}>
              <Text style={styles.previewLabel}>Preview {aspectRatio === '1:1' ? '(Square)' : '(Landscape)'}</Text>
              <View style={aspectRatio === '1:1' ? styles.circularPreview : styles.rectangularPreview}>
                {previewUri ? (
                  <img 
                    src={previewUri} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover', 
                      borderRadius: aspectRatio === '1:1' ? '50%' : '8px' 
                    }}
                    alt="Crop preview"
                  />
                ) : (
                  <Text style={{ fontSize: 12, color: '#666' }}>No preview</Text>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
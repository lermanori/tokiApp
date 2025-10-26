import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  // Modal containers
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.9,
    maxWidth: 500,
    maxHeight: height * 0.9,
    padding: 20,
  },
  iosContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  iosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    minHeight: 60,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  cropButton: {
    backgroundColor: '#1C1C1C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cropText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },

  // Aspect ratio controls
  aspectRatioContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  aspectRatioButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  activeAspectRatio: {
    backgroundColor: '#1C1C1C',
    borderColor: '#1C1C1C',
  },
  aspectRatioText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  activeAspectRatioText: {
    color: '#FFFFFF',
  },

  // Canvas and crop area
  canvasContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  canvasWrapper: {
    position: 'relative',
    width: 300,
    height: 200,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  sourceImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cropOverlay: {
    position: 'absolute',
    border: '2px solid #1C1C1C',
    backgroundColor: 'rgba(28, 28, 28, 0.1)',
    cursor: 'move',
    borderRadius: 4,
  },

  // iOS specific styles
  iosPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iosPreviewImage: {
    width: 300,
    height: 200,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  imageWrapper: {
    position: 'relative',
  },
  cropOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Removed justifyContent and alignItems to allow absolute positioning
  },
  cropArea: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cropAreaInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHint: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // Resize handles
  resizeHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1C1C1C',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resizeHandleNW: {
    top: -10,
    left: -10,
  },
  resizeHandleNE: {
    top: -10,
    right: -10,
  },
  resizeHandleSW: {
    bottom: -10,
    left: -10,
  },
  resizeHandleSE: {
    bottom: -10,
    right: -10,
  },
  cropAreaSquare: {
    width: 150,
    height: 150,
  },
  cropArea43: {
    width: 200,
    height: 150,
  },
  profilePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dualPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewItem: {
    alignItems: 'center',
    gap: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  profilePreviewLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
    marginRight: 12,
  },
  profilePreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tokiPreviewImage: {
    width: 120,
    height: 90,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  profilePreviewThumbnail: {
    width: '100%',
    height: '100%',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    textAlign: 'center',
  },

  // Preview sections
  dualPreviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  singlePreviewContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  previewItem: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    marginBottom: 8,
  },
  rectangularPreview: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  circularPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  cardPreview: {
    width: '100%',
    height: '100%',
  },
  profilePreview: {
    width: '100%',
    height: '100%',
  },

  // Web specific styles
  webCanvasWrapper: {
    position: 'relative',
    width: 300,
    height: 200,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    cursor: 'crosshair',
  },
  webCropOverlay: {
    position: 'absolute',
    border: '2px solid #1C1C1C',
    backgroundColor: 'rgba(28, 28, 28, 0.1)',
    cursor: 'move',
    borderRadius: 4,
    boxSizing: 'border-box',
  },
  webCropHandle: {
    position: 'absolute',
    width: 12,
    height: 12,
    backgroundColor: '#1C1C1C',
    border: '2px solid #FFFFFF',
    borderRadius: 6,
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  webCropHandleNw: {
    top: -6,
    left: -6,
    cursor: 'nw-resize',
  },
  webCropHandleNe: {
    top: -6,
    right: -6,
    cursor: 'ne-resize',
  },
  webCropHandleSw: {
    bottom: -6,
    left: -6,
    cursor: 'sw-resize',
  },
  webCropHandleSe: {
    bottom: -6,
    right: -6,
    cursor: 'se-resize',
  },

  // React Image Crop styles
  reactCropContainer: {
    '& .react-crop': {
      '& .react-crop__crop-selection': {
        border: '2px solid #1C1C1C',
        borderRadius: '4px',
      },
      '& .react-crop__drag-handle': {
        backgroundColor: '#1C1C1C',
        border: '2px solid #FFFFFF',
        borderRadius: '6px',
        width: '12px',
        height: '12px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      },
      '& .react-crop__drag-handle::after': {
        backgroundColor: '#FFFFFF',
        borderRadius: '2px',
        width: '4px',
        height: '4px',
      },
    },
  },
});

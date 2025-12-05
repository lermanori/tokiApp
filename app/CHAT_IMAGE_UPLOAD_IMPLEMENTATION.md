# Chat Image Upload Feature Implementation Guide

## Overview
This document outlines the implementation plan for adding image upload functionality to the chat screen. The backend already supports image messages via the `mediaUrl` parameter, but the frontend needs to be updated to handle image selection, upload, and display.

## Current State

### Backend Support ✅
- **API Endpoints**: Both `sendMessage` and `sendTokiMessage` already accept `mediaUrl` parameter
- **Database**: Messages table has `media_url` column
- **Message Types**: Supports `messageType` field (currently defaults to 'text', can be 'image')

### Frontend Status ❌
- **Image Upload Button**: Currently exists but has no functionality (lines 920-922 in `chat.tsx`)
- **AppContext**: `sendConversationMessage` and `sendTokiMessage` don't expose `mediaUrl` parameter
- **Message Display**: No rendering logic for images in messages
- **Image Upload Endpoint**: Need to create or identify endpoint for uploading chat message images

## Implementation Steps

### Step 1: Create Chat Message Image Upload Endpoint (Backend)

**Location**: `toki-backend/src/routes/messages.ts`

Create a new endpoint similar to profile image upload:

```typescript
// Upload image for chat message
router.post('/upload-image', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    let imageBuffer: Buffer;
    
    // Check if request is multipart (React Native) or JSON (Web)
    const contentType = req.headers['content-type'] || '';
    const isJsonRequest = contentType.includes('application/json');
    
    if (!isJsonRequest) {
      // Handle multipart/form-data (React Native)
      const multerMiddleware = upload.single('image');
      await new Promise((resolve, reject) => {
        multerMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          message: 'Please select an image to upload'
        });
      }

      const file = req.file as Express.Multer.File;
      const validation = ImageService.validateImage(file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image file',
          message: validation.error
        });
      }

      imageBuffer = file.buffer;
    } else {
      // Handle JSON with base64 data (Web)
      const { image } = req.body;
      if (!image) {
        return res.status(400).json({
          success: false,
          error: 'No image data provided',
          message: 'Please provide image data'
        });
      }

      // Extract base64 data
      const base64String: string = image;
      const base64Data = base64String.includes(',')
        ? base64String.split(',')[1]
        : base64String;

      if (!base64Data) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image data',
          message: 'Failed to process image data'
        });
      }

      imageBuffer = Buffer.from(base64Data, 'base64');
    }

    // Upload to Cloudinary using ImageService
    const uploadResult = await ImageService.uploadMessageImage(userId, imageBuffer);

    if (!uploadResult.success || !uploadResult.url) {
      return res.status(500).json({
        success: false,
        error: 'Upload failed',
        message: uploadResult.error || 'Failed to upload image'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId
      },
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    logger.error('Failed to upload message image:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to upload image'
    });
  }
});
```

**Note**: You'll need to add `uploadMessageImage` method to `ImageService` or use an existing method with appropriate folder path.

### Step 2: Update AppContext to Support mediaUrl

**Location**: `contexts/AppContext.tsx`

#### Update Type Definitions (around line 602):
```typescript
sendConversationMessage: (conversationId: string, content: string, mediaUrl?: string) => Promise<boolean>;
sendTokiMessage: (tokiId: string, content: string, mediaUrl?: string) => Promise<boolean>;
```

#### Update Implementation (around line 2487):
```typescript
const sendConversationMessage = async (
  conversationId: string, 
  content: string, 
  mediaUrl?: string
): Promise<boolean> => {
  try {
    const response = await apiService.sendMessage(
      conversationId, 
      content, 
      mediaUrl ? 'image' : 'text', 
      mediaUrl
    );
    console.log('✅ Message sent:', response.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send message:', error);
    return false;
  }
};
```

#### Update Implementation (around line 2521):
```typescript
const sendTokiMessage = async (
  tokiId: string, 
  content: string, 
  mediaUrl?: string
): Promise<boolean> => {
  try {
    const response = await apiService.sendTokiMessage(
      tokiId, 
      content, 
      mediaUrl ? 'image' : 'text', 
      mediaUrl
    );
    console.log('✅ Toki message sent:', response.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Toki message:', error);
    return false;
  }
};
```

### Step 3: Add Image Upload Functionality to Chat Screen

**Location**: `app/chat.tsx`

#### Add Imports:
```typescript
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';
import { ActivityIndicator } from 'react-native';
```

#### Add State:
```typescript
const [isUploadingImage, setIsUploadingImage] = useState(false);
```

#### Add Image Upload Handler:
```typescript
const handleImageUpload = async () => {
  try {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload images.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const imageUri = result.assets[0].uri;
    setIsUploadingImage(true);

    // Convert to base64
    const manipResult = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { 
        compress: 0.8, 
        format: ImageManipulator.SaveFormat.JPEG, 
        base64: true 
      }
    );

    if (!manipResult.base64) {
      throw new Error('Failed to convert image to base64');
    }

    const imageData = `data:image/jpeg;base64,${manipResult.base64}`;

    // Upload image
    const uploadResponse = await fetch(`${getBackendUrl()}/api/messages/upload-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiService.getAccessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageData }),
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json();
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const uploadResult = await uploadResponse.json();
    const imageUrl = uploadResult.data?.imageUrl;

    if (!imageUrl) {
      throw new Error('No image URL returned');
    }

    // Send message with image
    const messageText = '📷 Image'; // Optional caption
    if (isGroup && tokiId) {
      await actions.sendTokiMessage(tokiId, messageText, imageUrl);
    } else if (dynamicConversationId) {
      await actions.sendConversationMessage(dynamicConversationId, messageText, imageUrl);
    } else if (otherUserId) {
      const newConversationId = await actions.startConversation(otherUserId);
      if (newConversationId) {
        setDynamicConversationId(newConversationId);
        await actions.sendConversationMessage(newConversationId, messageText, imageUrl);
      }
    }
  } catch (error) {
    console.error('❌ Failed to upload image:', error);
    Alert.alert('Error', 'Failed to upload image. Please try again.');
  } finally {
    setIsUploadingImage(false);
  }
};
```

#### Update Attach Button:
```typescript
<TouchableOpacity 
  style={styles.attachButton}
  onPress={handleImageUpload}
  disabled={isUploadingImage || isSending}
>
  {isUploadingImage ? (
    <ActivityIndicator size="small" color="#6B7280" />
  ) : (
    <ImageIcon size={20} color="#6B7280" />
  )}
</TouchableOpacity>
```

### Step 4: Display Images in Messages

**Location**: `app/chat.tsx` (message rendering section, around line 868)

#### Update Message Rendering:
```typescript
<View style={[
  styles.messageBubble,
  message.sender_id === state.currentUser?.id ? styles.currentUserBubble : styles.otherUserBubble
]}>
  {message.media_url && (
    <Image 
      source={{ uri: message.media_url }} 
      style={styles.messageImage}
      resizeMode="cover"
    />
  )}
  {message.content && message.content.trim() && (
    <Text style={[
      styles.messageText,
      message.sender_id === state.currentUser?.id ? styles.currentUserText : styles.otherUserText
    ]}>
      {message.content}
    </Text>
  )}
</View>
```

#### Add Image Styles:
```typescript
messageImage: {
  width: 200,
  maxWidth: '75%',
  height: 200,
  borderRadius: 12,
  marginBottom: 8,
  backgroundColor: '#F3F4F6',
},
```

### Step 5: Add ImageService Method (if needed)

**Location**: `toki-backend/src/services/imageService.ts`

If `uploadMessageImage` doesn't exist, add it:

```typescript
async uploadMessageImage(userId: string, imageBuffer: Buffer): Promise<{
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}> {
  try {
    const uploadResult = await this.uploadToCloudinary(
      imageBuffer,
      `messages/${userId}`, // Folder path for message images
      {
        transformation: [
          { width: 800, height: 800, crop: 'limit' },
          { quality: 'auto' }
        ]
      }
    );

    return {
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    };
  } catch (error) {
    logger.error('Failed to upload message image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

## Testing Checklist

- [ ] Image picker opens and allows selection
- [ ] Image uploads successfully to backend
- [ ] Image URL is returned from upload endpoint
- [ ] Message is sent with `mediaUrl` parameter
- [ ] Image displays correctly in message bubble
- [ ] Image displays for both sent and received messages
- [ ] Works for both individual conversations and Toki group chats
- [ ] Loading state shows during upload
- [ ] Error handling works for failed uploads
- [ ] Permissions are requested properly
- [ ] Image compression works correctly
- [ ] Works on both iOS and Android
- [ ] Works on web platform

## Considerations

1. **Image Size Limits**: Consider max file size (backend has 10MB limit)
2. **Image Compression**: Already implemented in handler (0.8 quality)
3. **Image Dimensions**: Consider max dimensions for display
4. **Thumbnails**: May want to generate thumbnails for large images
5. **Image Caching**: React Native Image component handles caching
6. **Error States**: Handle network errors, permission denials, etc.
7. **Loading States**: Show progress during upload
8. **Image Preview**: Could add preview before sending
9. **Multiple Images**: Current implementation is single image, could extend later
10. **Image Captions**: Currently sends "📷 Image" as text, could allow custom caption

## Future Enhancements

- Add camera option (take photo directly)
- Support multiple images per message
- Image preview before sending
- Image compression options
- Image editing/cropping before upload
- Support for other media types (videos, files)
- Image gallery view for message images
- Image download functionality


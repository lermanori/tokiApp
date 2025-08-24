# 📸 Photos Feature - Complete Implementation Plan

## 🎯 **Feature Overview**

Implement comprehensive photo management for TokiApp, including:
- **Profile Images**: User profile pictures across the app
- **Toki Pictures**: Event photos for Toki events
- **Organized Storage**: Cloudinary with structured folder organization
- **Seamless UX**: Image upload, display, and management

---

## 🏗️ **Architecture & Storage**

### **Storage Solution: Cloudinary**
- **Provider**: Cloudinary (free tier: 25GB storage, 25GB bandwidth/month)
- **Cloud Name**: `dsq1ocdl1`
- **Environment Variable**: `CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@dsq1ocdl1`

### **Folder Structure**
```
toki/
├── profiles/          # Profile pictures
│   ├── user_{userId}_{timestamp}.{ext}
│   └── ...
└── tokis/            # Toki event pictures
    ├── toki_{tokiId}_{timestamp}.{ext}
    └── ...
```

### **File Naming Convention**
- **Profile Images**: `toki/profiles/user_{userId}_{timestamp}.{ext}`
- **Toki Images**: `toki/tokis/toki_{tokiId}_{timestamp}.{ext}`
- **Timestamp**: Unix timestamp for uniqueness
- **Extensions**: jpg, png, webp (auto-converted by Cloudinary)

---

## 🔧 **Backend Implementation**

### **1. Dependencies & Setup**
```bash
npm install cloudinary multer
```

### **2. Environment Configuration**
```env
CLOUDINARY_URL=cloudinary://772281827225297:9wQnRq87JX2tSyqb4uQl5cgaHbM@dsq1ocdl1
CLOUDINARY_CLOUD_NAME=dsq1ocdl1
CLOUDINARY_API_KEY=772281827225297
CLOUDINARY_API_SECRET=9wQnRq87JX2tSyqb4uQl5cgaHbM
```

### **3. Cloudinary Service**
- **Upload Service**: Handle file uploads to Cloudinary
- **Image Optimization**: Auto-resize, compress, format conversion
- **Error Handling**: Upload failures, invalid files, size limits
- **Cleanup**: Remove old images when updating

### **4. API Endpoints**

#### **Profile Images**
```
POST /api/users/profile-image
- Upload new profile image
- Replace existing image
- Return image URL

DELETE /api/users/profile-image  
- Remove profile image
- Set to default avatar
```

#### **Toki Images**
```
POST /api/tokis/:tokiId/image
- Upload Toki image
- Multiple images support
- Return image URLs

DELETE /api/tokis/:tokiId/image/:imageId
- Remove specific Toki image

GET /api/tokis/:tokiId/images
- Get all images for a Toki
```

### **5. Database Updates**
```sql
-- Users table
ALTER TABLE users ADD COLUMN profile_image_url TEXT;

-- Tokis table  
ALTER TABLE tokis ADD COLUMN image_urls TEXT[]; -- Array of image URLs
```

---

## 📱 **Frontend Implementation**

### **1. Image Upload Components**

#### **Profile Image Upload**
- **Image Picker**: Camera + gallery selection
- **Preview**: Show selected image before upload
- **Crop/Edit**: Basic image editing capabilities
- **Upload Progress**: Loading indicator during upload
- **Error Handling**: Display upload errors

#### **Toki Image Upload**
- **Multiple Images**: Support for multiple photos
- **Drag & Drop**: Reorder images
- **Image Preview**: Grid view of selected images
- **Upload Queue**: Handle multiple uploads
- **Validation**: File size, type, count limits

### **2. Image Display Components**

#### **Profile Image Display**
- **Circular Avatar**: Consistent with app design
- **Fallback**: Default avatar when no image
- **Loading States**: Skeleton while loading
- **Error Handling**: Graceful fallback on load failure

#### **Toki Image Display**
- **Image Carousel**: Swipeable image gallery
- **Thumbnail Grid**: Compact image previews
- **Full Screen**: Tap to view full size
- **Lazy Loading**: Load images as needed

### **3. Integration Points**

#### **Profile Page**
- Profile image upload/edit
- Image preview and management
- Remove image option

#### **Create/Edit Toki**
- Image upload interface
- Image preview and ordering
- Remove individual images

#### **Toki Cards & Details**
- Display Toki images prominently
- Image carousel in details view
- Optimized loading for lists

---

## 🎨 **User Experience Features**

### **1. Image Quality & Optimization**
- **Auto-resize**: Optimize for different screen sizes
- **Format Conversion**: Convert to webp for better performance
- **Compression**: Balance quality vs file size
- **Thumbnails**: Generate multiple sizes for different use cases

### **2. Upload Experience**
- **Drag & Drop**: Intuitive file selection
- **Progress Indicators**: Clear upload status
- **Batch Upload**: Handle multiple images efficiently
- **Retry Logic**: Automatic retry on failure

### **3. Image Management**
- **Edit Capabilities**: Basic crop, rotate, filter
- **Reordering**: Drag to reorder Toki images
- **Bulk Actions**: Select multiple images for deletion
- **Undo/Redo**: Revert image changes

---

## 🔒 **Security & Validation**

### **1. File Validation**
- **File Types**: Only jpg, png, webp allowed
- **File Size**: Max 10MB per image
- **Image Dimensions**: Min 100x100, Max 4000x4000
- **Content Validation**: Ensure uploaded file is actually an image

### **2. Access Control**
- **User Ownership**: Users can only modify their own images
- **Toki Ownership**: Only Toki hosts can modify Toki images
- **Public Access**: Images are publicly viewable (for Tokis)

### **3. Rate Limiting**
- **Upload Limits**: Max 10 images per minute per user
- **Storage Limits**: Monitor Cloudinary usage
- **Abuse Prevention**: Detect and prevent spam uploads

---

## 📊 **Performance Considerations**

### **1. Image Loading**
- **Lazy Loading**: Load images as they come into view
- **Progressive Loading**: Show low-res thumbnails first
- **CDN**: Leverage Cloudinary's global CDN
- **Caching**: Cache frequently accessed images

### **2. Storage Optimization**
- **Image Compression**: Automatic quality optimization
- **Format Selection**: Choose best format for use case
- **Cleanup**: Remove unused images periodically
- **Monitoring**: Track storage usage and costs

### **3. Network Efficiency**
- **Responsive Images**: Serve appropriate sizes for devices
- **Preloading**: Preload critical images
- **Background Sync**: Upload images in background
- **Offline Support**: Queue uploads when offline

---

## 🧪 **Testing Strategy**

### **1. Unit Tests**
- Image upload service
- File validation logic
- Cloudinary integration
- Error handling

### **2. Integration Tests**
- End-to-end upload flow
- Database updates
- API endpoint responses
- Image retrieval

### **3. User Testing**
- Upload experience
- Image display quality
- Performance on different devices
- Error scenarios

---

## 🚀 **Implementation Phases**

### **Phase 1: Foundation (Week 1)**
- [ ] Backend Cloudinary setup
- [ ] Basic upload endpoints
- [ ] Database schema updates
- [ ] Environment configuration

### **Phase 2: Profile Images (Week 2)**
- [ ] Profile image upload component
- [ ] Profile image display
- [ ] Image management interface
- [ ] Integration with profile page

### **Phase 3: Toki Images (Week 3)**
- [ ] Toki image upload component
- [ ] Multiple image support
- [ ] Image carousel display
- [ ] Integration with Toki forms

### **Phase 4: Polish & Testing (Week 4)**
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] User testing
- [ ] Bug fixes and refinements

---

## 💰 **Cost Analysis**

### **Cloudinary Free Tier**
- **Storage**: 25GB (sufficient for MVP)
- **Bandwidth**: 25GB/month (monitor usage)
- **Transformations**: 25,000/month
- **Cost**: $0/month

### **Future Scaling**
- **Pro Plan**: $89/month for 225GB storage
- **Advanced Plan**: $224/month for 500GB storage
- **Custom**: Enterprise pricing for large scale

---

## 🎯 **Success Metrics**

### **User Engagement**
- Profile completion rate (with images)
- Toki creation with images
- User interaction with image content

### **Technical Performance**
- Image upload success rate
- Average upload time
- Image load performance
- Storage usage efficiency

### **Business Impact**
- User retention improvement
- App store ratings
- User feedback on image features

---

## 🔮 **Future Enhancements**

### **Advanced Features**
- **AI Image Recognition**: Auto-tag images
- **Image Filters**: Instagram-style filters
- **Collage Creation**: Combine multiple images
- **Video Support**: Short video clips for Tokis

### **Social Features**
- **Image Sharing**: Share Toki images externally
- **User Galleries**: Browse user's photo collections
- **Image Comments**: Comment on specific images
- **Image Reactions**: Like/favorite images

---

## 📝 **Notes & Considerations**

- **Backup Strategy**: Ensure images are backed up
- **Compliance**: Consider GDPR/privacy implications
- **Accessibility**: Alt text for screen readers
- **Internationalization**: Support for different image formats
- **Monitoring**: Track upload failures and performance issues

---

*This document will be updated as implementation progresses and requirements evolve.*

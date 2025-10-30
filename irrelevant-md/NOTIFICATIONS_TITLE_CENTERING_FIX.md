# Notifications Title Centering Fix

## 🎯 **Problem**
The "Notifications" title in the header was not perfectly centered due to the `justifyContent: 'space-between'` layout, which doesn't account for the different widths of the left (back arrow) and right ("Mark all read") elements.

## ✅ **Solution**
Updated the header layout to use absolute positioning for the title, ensuring it's perfectly centered regardless of the side elements' widths.

## 🔧 **Changes Made**

### **1. Header Layout Update**
```typescript
// Before
headerContent: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

// After
headerContent: {
  flexDirection: 'row',
  alignItems: 'center',
  position: 'relative',
},
```

### **2. Title Positioning**
```typescript
// Before
title: {
  fontSize: 20,
  fontFamily: 'Inter-Bold',
  color: '#1C1C1C',
  margin: 0,
},

// After
title: {
  fontSize: 20,
  fontFamily: 'Inter-Bold',
  color: '#1C1C1C',
  position: 'absolute',
  left: 0,
  right: 0,
  textAlign: 'center',
  zIndex: 1,
},
```

### **3. Z-Index Management**
- **Back Button**: Added `zIndex: 2` to ensure it appears above the title
- **Mark All Read**: Added `zIndex: 2` to ensure it appears above the title
- **Title**: Set `zIndex: 1` as the base layer

### **4. Back Button Styling**
```typescript
// Added new style
backButton: {
  zIndex: 2,
},
```

## 📱 **Result**
- ✅ **Perfect Centering**: Title is now perfectly centered in the header
- ✅ **Responsive**: Works regardless of side elements' widths
- ✅ **Accessible**: Back button and "Mark all read" remain fully functional
- ✅ **Consistent**: Maintains the same visual appearance with better positioning

## 🎨 **Visual Impact**
The "Notifications" title now appears exactly in the center of the header bar, creating a more balanced and professional look. The absolute positioning ensures the title stays centered even if the "Mark all read" text changes or is hidden.

## 🧪 **Testing**
- ✅ No linting errors
- ✅ All interactive elements remain functional
- ✅ Title positioning is mathematically centered
- ✅ Z-index layering works correctly

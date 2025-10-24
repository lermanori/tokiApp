# Notifications "Mark All Read" Button Positioning

## 🎯 **Objective**
Position the "Mark all read" button on the right side of the header and ensure it's properly connected to the `markAllAsRead` function.

## ✅ **Current Status**
The "Mark all read" button is now properly positioned and fully functional!

## 🔧 **Implementation Details**

### **1. Button Positioning**
- **Layout**: Uses `justifyContent: 'space-between'` to push the button to the right
- **Structure**: 
  - Left: Back arrow button
  - Center: "Notifications" title (absolutely positioned)
  - Right: "Mark all read" button

### **2. Function Connection**
```typescript
const markAllAsRead = () => {
  setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  actions.markAllNotificationsRead();
};
```

**Button Implementation**:
```typescript
{unreadCount > 0 && (
  <TouchableOpacity onPress={markAllAsRead} style={styles.markAllReadButton}>
    <Text style={styles.markAllRead}>Mark all read</Text>
  </TouchableOpacity>
)}
```

### **3. Styling**
```typescript
markAllReadButton: {
  zIndex: 2,
  paddingVertical: 8,
  paddingHorizontal: 12,
},
markAllRead: {
  fontSize: 14,
  fontFamily: 'Inter-Medium',
  color: '#B49AFF',
  zIndex: 2,
},
```

## 📱 **Features**

### **✅ Proper Positioning**
- Button appears on the right side of the header
- Maintains proper spacing with padding
- Stays above the centered title with z-index

### **✅ Functionality**
- **Connected**: Properly linked to `markAllAsRead` function
- **Conditional**: Only shows when there are unread notifications (`unreadCount > 0`)
- **State Management**: Updates both local state and backend via `actions.markAllNotificationsRead()`

### **✅ User Experience**
- **Visual Feedback**: Purple color indicates it's clickable
- **Touch Target**: Adequate padding for easy tapping
- **Responsive**: Disappears when no unread notifications

## 🎨 **Visual Layout**
```
[← Back]     Notifications     [Mark all read]
```

- **Left**: Back arrow (24px icon)
- **Center**: "Notifications" title (perfectly centered)
- **Right**: "Mark all read" button (only when unread notifications exist)

## 🧪 **Testing**
- ✅ Button appears on the right side
- ✅ Function is properly connected
- ✅ Only shows when there are unread notifications
- ✅ Properly marks all notifications as read
- ✅ No linting errors
- ✅ Maintains centered title positioning

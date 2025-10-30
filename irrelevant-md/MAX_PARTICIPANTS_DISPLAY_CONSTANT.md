# Max Participants Display Constant

## 🎯 **Change Overview**
Extracted the hardcoded value `4` for maximum participants display into a named constant `MAX_PARTICIPANTS_DISPLAY` at the top of the file.

## ✅ **Changes Made**

### **1. Added Constant Declaration**
**Location**: `app/toki-details.tsx` (lines 19-20)

```typescript
// Constants
const MAX_PARTICIPANTS_DISPLAY = 4; // Maximum number of participants to show before "View more" button
```

### **2. Updated Participant Slicing**
**Location**: `app/toki-details.tsx` (line 1357)

```typescript
// Before
{toki.participants.slice(0, 4).map((participant, index) => (

// After
{toki.participants.slice(0, MAX_PARTICIPANTS_DISPLAY).map((participant, index) => (
```

### **3. Updated Condition Check**
**Location**: `app/toki-details.tsx` (line 1414)

```typescript
// Before
{toki.participants.length > 4 && (

// After
{toki.participants.length > MAX_PARTICIPANTS_DISPLAY && (
```

### **4. Updated "View More" Text**
**Location**: `app/toki-details.tsx` (line 1420)

```typescript
// Before
View more ({toki.participants.length - 4} more)

// After
View more ({toki.participants.length - MAX_PARTICIPANTS_DISPLAY} more)
```

## 🎯 **Benefits**

### **✅ Maintainability**
- **Single Source of Truth**: All references to the max participants count use the same constant
- **Easy to Change**: To change the display limit, only need to update one value
- **Clear Intent**: The constant name clearly describes what the value represents

### **✅ Code Quality**
- **DRY Principle**: Eliminates magic numbers scattered throughout the code
- **Self-Documenting**: The constant name explains the purpose
- **Consistency**: All three usages now reference the same constant

### **✅ Future Flexibility**
- **Easy Configuration**: Can easily change the display limit by updating the constant
- **A/B Testing**: Simple to test different display limits
- **Responsive Design**: Could potentially make this dynamic based on screen size

## 📱 **Functionality**
The "View more" button behavior remains exactly the same:
- Shows first 4 participants (now `MAX_PARTICIPANTS_DISPLAY`)
- Displays "View more" button when there are more than 4 participants
- Shows count of additional participants in the button text

## 🧪 **Testing**
- ✅ No linting errors
- ✅ All three usages updated consistently
- ✅ Functionality remains unchanged
- ✅ Constant is properly declared and documented

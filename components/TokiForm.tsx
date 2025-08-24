import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  Image,
} from 'react-native';
import { MapPin, Clock, Users, Tag, Camera, X, Navigation, Calendar } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { GeocodingResult, geocodingService } from '@/services/geocoding';
import TokiImageUpload from './TokiImageUpload';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';

interface TokiFormProps {
  mode: 'create' | 'edit';
  tokiId?: string; // Add tokiId for edit mode
  initialData?: {
    title?: string;
    description?: string;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
    activity?: string;
    time?: string;
    maxAttendees?: number;
    tags?: string[];
    customDateTime?: string; // Added missing field
    images?: Array<{ url: string; publicId: string }>; // Add images to initial data
  };
  onSubmit: (data: any) => Promise<string | boolean | null>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function TokiForm({
  mode,
  tokiId,
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting
}: TokiFormProps) {
  const { state } = useApp();
  
  console.log('TokiForm received initialData:', initialData);
  console.log('TokiForm mode:', mode);
  
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '');
  const [location, setLocation] = useState(initialData.location || '');
  const [latitude, setLatitude] = useState<number | null>(initialData.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(initialData.longitude || null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(initialData.activity || null);
  const [selectedTime, setSelectedTime] = useState<string | null>(initialData.time || null);
  const [maxAttendees, setMaxAttendees] = useState(initialData.maxAttendees?.toString() || '10');
  const [customTags, setCustomTags] = useState<string[]>(initialData.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [tokiImages, setTokiImages] = useState<Array<{ url: string; publicId: string }>>(initialData.images || []);

  // Update tokiImages when initialData.images changes
  useEffect(() => {
    if (initialData.images) {
      console.log('🖼️ [TOKI FORM] Updating tokiImages with:', initialData.images);
      setTokiImages(initialData.images);
    }
  }, [initialData.images]);

  // Activity types
  const activityTypes = [
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'coffee', label: 'Coffee', icon: '☕' },
    { id: 'music', label: 'Music', icon: '🎵' },
    { id: 'food', label: 'Food', icon: '🍕' },
    { id: 'work', label: 'Work', icon: '💼' },
    { id: 'art', label: 'Art', icon: '🎨' },
    { id: 'nature', label: 'Nature', icon: '🌿' },
    { id: 'drinks', label: 'Drinks', icon: '🍹' },
  ];

  // Enhanced time slots
  const timeSlots = [
    'Now', '30 min', '1 hour', '2 hours', '3 hours', 'Tonight', 'Tomorrow',
    '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', 
    '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
  ];

  // Helper function to get activity emoji
  const getActivityEmoji = (category: string): string => {
    switch (category) {
      case 'sports': return '⚽';
      case 'coffee': return '☕';
      case 'music': return '🎵';
      case 'food': return '🍕';
      case 'work': return '💼';
      case 'art': return '🎨';
      case 'nature': return '🌿';
      case 'drinks': return '🍹';
      case 'beach': return '🏖️';
      case 'sunset': return '🌅';
      case 'jazz': return '🎷';
      case 'networking': return '🤝';
      case 'wellness': return '🧘';
      case 'yoga': return '🧘‍♀️';
      case 'morning': return '🌅';
      case 'walking': return '🚶';
      case 'culture': return '🏛️';
      case 'social': return '👥';
      default: return '🎉';
    }
  };

  // Helper function to get activity label
  const getActivityLabel = (category: string): string => {
    switch (category) {
      case 'sports': return 'Sports';
      case 'coffee': return 'Coffee';
      case 'music': return 'Music';
      case 'food': return 'Food';
      case 'work': return 'Work';
      case 'art': return 'Art';
      case 'nature': return 'Nature';
      case 'drinks': return 'Drinks';
      case 'beach': return 'Beach';
      case 'sunset': return 'Sunset';
      case 'jazz': return 'Jazz';
      case 'networking': return 'Networking';
      case 'wellness': return 'Wellness';
      case 'yoga': return 'Yoga';
      case 'morning': return 'Morning';
      case 'walking': return 'Walking';
      case 'culture': return 'Culture';
      case 'social': return 'Social';
      default: return 'Activity';
    }
  };

  // Cleanup function to cancel any pending geocoding requests
  useEffect(() => {
    return () => {
      geocodingService.cancelRequest(`${mode}-toki`);
    };
  }, [mode]);

  // Initialize custom date/time with a default value
  useEffect(() => {
    if (mode === 'edit' && initialData.customDateTime) {
      // In edit mode, use the provided customDateTime
      setCustomDateTime(initialData.customDateTime);
    } else if (!customDateTime) {
      // In create mode, set default to tomorrow at 2:00 PM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0); // 2:00 PM tomorrow
      const dateStr = tomorrow.toISOString().split('T')[0];
      const timeStr = tomorrow.toTimeString().slice(0, 5);
      setCustomDateTime(`${dateStr} ${timeStr}`);
    }
  }, [mode, initialData.customDateTime]);

  // Update form state when initialData changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('Updating form state with initialData:', initialData);
      
      if (initialData.title) setTitle(initialData.title);
      if (initialData.description) setDescription(initialData.description);
      if (initialData.location) setLocation(initialData.location);
      if (initialData.latitude !== undefined) setLatitude(initialData.latitude);
      if (initialData.longitude !== undefined) setLongitude(initialData.longitude);
      if (initialData.activity) setSelectedActivity(initialData.activity);
      if (initialData.time) setSelectedTime(initialData.time);
      if (initialData.maxAttendees) setMaxAttendees(initialData.maxAttendees.toString());
      if (initialData.tags) setCustomTags(initialData.tags);
      if (initialData.customDateTime) setCustomDateTime(initialData.customDateTime);
      
      // If we have a custom date/time, mark the time as custom
      if (initialData.customDateTime && initialData.time) {
        // Check if the time is a specific time slot (like "10:00 AM")
        if (initialData.time.includes(':') || initialData.time === 'Now' || initialData.time === 'Tonight' || initialData.time === 'Tomorrow') {
          setSelectedTime('custom');
        }
      }
      
      // Log the state after setting
      setTimeout(() => {
        console.log('Form state after update:', {
          title,
          description,
          location,
          latitude,
          longitude,
          selectedActivity,
          selectedTime,
          maxAttendees,
          customTags,
          customDateTime
        });
      }, 100);
    }
  }, [initialData, mode]);

  // Function to handle time slot selection and update custom date/time
  const handleTimeSlotSelect = (timeSlot: string) => {
    console.log('Time slot selected:', timeSlot);
    setSelectedTime(timeSlot);
    
    // Convert time slot to actual date/time and update custom input
    const scheduledTime = getScheduledTimeFromSlot(timeSlot);
    console.log('Scheduled time:', scheduledTime);
    
    const dateStr = scheduledTime.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = scheduledTime.toTimeString().slice(0, 5); // HH:MM
    const formattedDateTime = `${dateStr} ${timeStr}`; // YYYY-MM-DD HH:MM
    console.log('Formatted date time:', formattedDateTime);
    
    setCustomDateTime(formattedDateTime);
    
    // If it's a specific time slot, also set selectedTime to 'custom' for the form
    if (timeSlot.includes(':') || timeSlot === 'Now' || timeSlot === 'Tonight' || timeSlot === 'Tomorrow') {
      setSelectedTime('custom');
    }
  };

  // Function to get scheduled time from time slot
  const getScheduledTimeFromSlot = (timeSlot: string): Date => {
    const now = new Date();
    
    switch (timeSlot) {
      case 'Now':
        return now;
      case '30 min':
        return new Date(now.getTime() + 30 * 60 * 1000);
      case '1 hour':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '2 hours':
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);
      case '3 hours':
        return new Date(now.getTime() + 3 * 60 * 60 * 1000);
      case 'Tonight':
        const tonight = new Date(now);
        tonight.setHours(19, 0, 0, 0); // 7:00 PM
        return tonight;
      case 'Tomorrow':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
        return tomorrow;
      default:
        // Handle specific time slots like "9:00 AM", "2:00 PM"
        if (timeSlot.includes(':')) {
          const [time, period] = timeSlot.split(' ');
          const [hours, minutes] = time.split(':').map(Number);
          let hour24 = hours;
          
          if (period === 'PM' && hours !== 12) hour24 += 12;
          if (period === 'AM' && hours === 12) hour24 = 0;
          
          const scheduledTime = new Date(now);
          scheduledTime.setHours(hour24, minutes, 0, 0);
          
          // If the time has passed today, schedule for tomorrow
          if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
          }
          
          return scheduledTime;
        }
        return now;
    }
  };

  // Function to format custom date/time for display
  const formatCustomDateTime = (dateString: string): string => {
    if (!dateString) return 'Select date & time';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      const timeString = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      if (eventDate.getTime() === today.getTime()) {
        return `today at ${timeString}`;
      } else if (eventDate.getTime() === tomorrow.getTime()) {
        return `tomorrow at ${timeString}`;
      } else {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year} at ${timeString}`;
      }
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to validate custom date/time format
  const isValidDateTime = (dateString: string): boolean => {
    // Simple regex for YYYY-MM-DD HH:MM format
    const dateTimeRegex = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
    if (!dateTimeRegex.test(dateString)) return false;
    
    try {
      const date = new Date(dateString.replace(' ', 'T'));
      return !isNaN(date.getTime()) && date > new Date();
    } catch (error) {
      return false;
    }
  };

  // Function to format location for display (more compact)
  const formatLocationDisplay = (fullLocation: string): string => {
    if (!fullLocation) return '';
    
    // Split by commas and clean up
    const parts = fullLocation.split(',').map(part => part.trim());
    
    if (parts.length >= 2) {
      // Try to extract city and landmark/area name
      const city = parts[parts.length - 2]; // Usually the city is second to last
      const landmark = parts[0]; // First part is usually the landmark/area name
      
      // If we have a city and landmark, format as "City, Landmark"
      if (city && landmark && city !== landmark) {
        return `${city}, ${landmark}`;
      }
      
      // Fallback: just show first two meaningful parts
      const meaningfulParts = parts.filter(part => 
        part && 
        !part.includes('Subdistrict') && 
        !part.includes('District') &&
        part.length > 2
      );
      
      if (meaningfulParts.length >= 2) {
        return `${meaningfulParts[0]}, ${meaningfulParts[1]}`;
      }
    }
    
    // If all else fails, just show the first meaningful part
    return parts[0] || fullLocation;
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !customTags.includes(currentTag.trim())) {
      setCustomTags([...customTags, currentTag.trim()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter(tag => tag !== tagToRemove));
  };

  // Function to handle location input change
  const handleLocationChange = async (newLocation: string) => {
    setLocation(newLocation);
    
    if (!newLocation.trim()) {
      setLatitude(null);
      setLongitude(null);
      setGeocodingResults([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      const results: GeocodingResult[] = await geocodingService.geocodeAddress(newLocation, 1000, `${mode}-toki`, 5);
      setGeocodingResults(results);
      
      if (results.length > 0) {
        setShowAutocomplete(true);
      } else {
        setShowAutocomplete(false);
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      if (error instanceof Error && error.message !== 'Request was cancelled') {
        setLatitude(null);
        setLongitude(null);
        setGeocodingResults([]);
        setShowAutocomplete(false);
      }
    }
  };

  // Function to handle location selection from autocomplete
  const handleLocationSelect = (result: GeocodingResult) => {
    setLocation(result.displayName);
    setLatitude(result.latitude);
    setLongitude(result.longitude);
    setShowAutocomplete(false);
    setGeocodingResults([]);
  };



  const handleSubmit = async () => {
    if (!title || !selectedActivity || !location || !selectedTime) {
      Alert.alert('Missing Information', 'Please fill in all required fields (title, activity type, location, and time).');
      return;
    }

    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to connect to server. Please check your connection and try again.');
      return;
    }

    // Check if there are temporary images that need to be uploaded
    const tempImages = tokiImages.filter(img => img.publicId.startsWith('temp_'));
    const hasTempImages = tempImages.length > 0;

    if (hasTempImages) {
      console.log('📸 [TOKI FORM] Creating Toki first, then uploading images...');
      
      // Create Toki without images first
      const tokiDataWithoutImages = {
        title,
        description: description || `Join us for ${title.toLowerCase()}!`,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        activity: selectedActivity,
        time: selectedTime,
        customDateTime: selectedTime === 'custom' ? customDateTime : null,
        maxAttendees: parseInt(maxAttendees) || 10,
        tags: [selectedActivity, ...customTags],
        category: selectedActivity,
        images: [], // No images initially
      };

      try {
        const result = await onSubmit(tokiDataWithoutImages);
        if (result && typeof result === 'string') {
          // Now upload the images to the created Toki
          console.log('📸 [TOKI FORM] Toki created, now uploading images...');
          
          // Show loading state for image uploads
          Alert.alert(
            'Uploading Images',
            'Your Toki has been created! Now uploading your images...',
            [{ text: 'OK' }]
          );
          
          await uploadImagesToToki(result, tempImages);
          console.log('📸 [TOKI FORM] All images uploaded successfully');
          
          // Return the result only after images are uploaded
          return result;
        }
        return result;
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } else {
      // No temporary images, create Toki normally
      const tokiData = {
        title,
        description: description || `Join us for ${title.toLowerCase()}!`,
        location,
        latitude: latitude || null,
        longitude: longitude || null,
        activity: selectedActivity,
        time: selectedTime,
        customDateTime: selectedTime === 'custom' ? customDateTime : null,
        maxAttendees: parseInt(maxAttendees) || 10,
        tags: [selectedActivity, ...customTags],
        category: selectedActivity,
        images: [], // No images
      };

      try {
        const result = await onSubmit(tokiData);
        if (result) {
          return result;
        }
      } catch (error) {
        console.error('Error in handleSubmit:', error);
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    }
  };

  const uploadImagesToToki = async (tokiId: string, tempImages: Array<{ url: string; publicId: string }>) => {
    for (const image of tempImages) {
      try {
        console.log(`📸 [TOKI FORM] Uploading image: ${image.publicId}`);
        
        // Convert the local URI to blob and upload
        const response = await fetch(image.url);
        const blob = await response.blob();
        
        const formData = new FormData();
        formData.append('image', blob as any, 'toki-image.jpg');

        const uploadResponse = await fetch(`${getBackendUrl()}/api/toki-images/upload/${tokiId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${await apiService.getAccessToken()}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const result = await uploadResponse.json();
          if (result.success) {
            console.log(`📸 [TOKI FORM] Image uploaded successfully: ${result.data.publicId}`);
          } else {
            console.error(`📸 [TOKI FORM] Image upload failed: ${result.message}`);
          }
        } else {
          console.error(`📸 [TOKI FORM] Image upload failed with status: ${uploadResponse.status}`);
        }
      } catch (error) {
        console.error(`📸 [TOKI FORM] Error uploading image ${image.publicId}:`, error);
      }
    }
  };



  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>What's the plan? *</Text>
          <TextInput
            style={styles.input}
            placeholder="Give your Toki a catchy title..."
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell people what to expect..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999999"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Activity Type *</Text>
          <View style={styles.activityGrid}>
            {activityTypes.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityButton,
                  selectedActivity === activity.id && styles.activityButtonSelected
                ]}
                onPress={() => setSelectedActivity(activity.id)}
              >
                <Text style={styles.activityIcon}>{activity.icon}</Text>
                <Text style={[
                  styles.activityLabel,
                  selectedActivity === activity.id && styles.activityLabelSelected
                ]}>
                  {activity.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location Area *</Text>
          <View style={styles.locationInputContainer}>
            <MapPin size={20} color="#B49AFF" style={styles.locationIcon} />
            <TextInput
              style={styles.locationInput}
              value={location}
              placeholder="e.g., Rothschild Boulevard, Gordon Beach..."
              placeholderTextColor="#999999"
              onChangeText={handleLocationChange}
              onFocus={() => setShowAutocomplete(true)}
            />
          </View>
          
          {showAutocomplete && geocodingResults.length > 0 && (
            <View style={styles.autocompleteContainer}>
              {geocodingResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.autocompleteItem}
                  onPress={() => handleLocationSelect(result)}
                >
                  <MapPin size={16} color="#666666" />
                  <Text style={styles.autocompleteText} numberOfLines={2}>
                    {result.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.locationHint}>
            Don't worry - we won't share your exact location
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>When? *</Text>
          <View style={styles.timeSlots}>
            {timeSlots.map((time) => (
              <TouchableOpacity
                key={time}
                style={[
                  styles.timeSlot,
                  selectedTime === time && styles.timeSlotSelected
                ]}
                onPress={() => handleTimeSlotSelect(time)}
              >
                <Text style={[
                  styles.timeSlotText,
                  selectedTime === time && styles.timeSlotTextSelected
                ]}>
                  {time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Custom Date & Time Input */}
          <View style={styles.customDateTimeContainer}>
            <Text style={styles.customDateTimeLabel}>Or set custom date & time:</Text>
            
            {/* Date and Time in a row */}
            <View style={styles.dateTimeRow}>
              {/* Date Input */}
              <View style={styles.dateTimeInputGroup}>
                <Text style={styles.dateTimeLabel}>Date:</Text>
                <View style={styles.dateTimeInputContainer}>
                  <TextInput
                    style={styles.dateTimeInput}
                    value={customDateTime ? customDateTime.split(' ')[0] : ''}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999999"
                    onChangeText={(text) => {
                      const currentTime = customDateTime ? customDateTime.split(' ')[1] : '14:00';
                      setCustomDateTime(`${text} ${currentTime}`);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      // Simple date picker - set to tomorrow
                      const today = new Date();
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      
                      const customDate = tomorrow.toISOString().split('T')[0];
                      const currentTime = customDateTime ? customDateTime.split(' ')[1] : '14:00';
                      setCustomDateTime(`${customDate} ${currentTime}`);
                    }}
                  >
                    <Calendar size={16} color="#B49AFF" />
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Time Input */}
              <View style={styles.dateTimeInputGroup}>
                <Text style={styles.dateTimeLabel}>Time:</Text>
                <View style={styles.dateTimeInputContainer}>
                  <TextInput
                    style={styles.dateTimeInput}
                    value={customDateTime ? customDateTime.split(' ')[1] : ''}
                    placeholder="HH:MM"
                    placeholderTextColor="#999999"
                    onChangeText={(text) => {
                      const currentDate = customDateTime ? customDateTime.split(' ')[0] : new Date().toISOString().split('T')[0];
                      setCustomDateTime(`${currentDate} ${text}`);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      // Show time options dropdown
                      const timeOptions = [
                        '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', 
                        '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
                      ];
                      
                      Alert.alert(
                        'Select Time',
                        'Choose a time:',
                        timeOptions.map(time => ({
                          text: time,
                          onPress: () => {
                            const currentDate = customDateTime ? customDateTime.split(' ')[0] : new Date().toISOString().split('T')[0];
                            setCustomDateTime(`${currentDate} ${time}`);
                          }
                        }))
                      );
                    }}
                  >
                    <Clock size={16} color="#B49AFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Max Attendees</Text>
          <View style={styles.attendeesInputContainer}>
            <Users size={20} color="#B49AFF" style={styles.attendeesIcon} />
            <TextInput
              style={styles.attendeesInput}
              placeholder="10"
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="numeric"
              placeholderTextColor="#999999"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tags</Text>
          <View style={styles.tagInputContainer}>
            <Tag size={20} color="#B49AFF" style={styles.tagIcon} />
            <TextInput
              style={styles.tagInput}
              placeholder="Add custom tags..."
              value={currentTag}
              onChangeText={setCurrentTag}
              onSubmitEditing={handleAddTag}
              placeholderTextColor="#999999"
            />
            <TouchableOpacity style={styles.addTagButton} onPress={handleAddTag}>
              <Text style={styles.addTagButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          {customTags.length > 0 && (
            <View style={styles.tagsContainer}>
              {customTags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(tag)}>
                    <X size={14} color="#666666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Toki Images Section */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Images</Text>
          <Text style={styles.imageHint}>
            Add up to 6 images to make your Toki more engaging
          </Text>
          <TokiImageUpload
            tokiId={tokiId}
            currentImages={tokiImages}
            onImagesUpdate={setTokiImages}
            maxImages={6}
            disabled={isSubmitting}
            mode={mode}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Creating...' : mode === 'create' ? 'Create Toki' : 'Update Toki'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  textArea: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    minHeight: 100,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    minWidth: 80,
  },
  activityButtonSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  activityIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    textAlign: 'center',
  },
  activityLabelSelected: {
    color: '#FFFFFF',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  locationHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 8,
    marginLeft: 4,
  },
  autocompleteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    marginTop: 8,
    maxHeight: 200,
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  autocompleteText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    marginLeft: 8,
    flex: 1,
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  timeSlotSelected: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  timeSlotText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  customDateTimeContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  customDateTimeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateTimeInputGroup: {
    flex: 1,
    marginRight: 12,
  },
  dateTimeLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 4,
  },
  dateTimeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  dateTimeInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  iconButton: {
    padding: 8,
  },
  attendeesInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  attendeesIcon: {
    marginRight: 12,
  },
  attendeesInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tagIcon: {
    marginRight: 12,
  },
  tagInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  addTagButton: {
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginLeft: 12,
  },
  addTagButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: '#B49AFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginRight: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 32,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#B49AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  fullLocationText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999999',
    marginTop: 8,
    marginLeft: 4,
  },
  imageHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  createModeImages: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  createModeText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  fallbackPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  fallbackPreviewEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  fallbackPreviewText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  fallbackPreviewImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
});

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
  Modal,
} from 'react-native';
import { MapPin, Clock, Users, Tag, Camera, X, Navigation, Calendar, Lock } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { GeocodingResult, geocodingService } from '@/services/geocoding';
import TokiImageUpload from './TokiImageUpload';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';
import DateTimePicker from 'react-native-ui-datepicker';
import RNDateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
// Web-only analog time picker
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TimePicker from 'react-time-picker';
// iOS-like wheel picker for web
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Picker from 'react-mobile-picker';
// Load styles for web analog clock
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-time-picker/dist/TimePicker.css');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('react-clock/dist/Clock.css');
}
import dayjs from 'dayjs';

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
    activities?: string[]; // Add support for multiple activities
    time?: string;
    maxAttendees?: number;
    tags?: string[];
    customDateTime?: string; // Added missing field
    images?: Array<{ url: string; publicId: string }>; // Add images to initial data
    visibility?: 'public' | 'private' | 'connections' | 'friends';
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
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    initialData.activities || (initialData.activity ? [initialData.activity] : [])
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(initialData.time || null);
  const [maxAttendees, setMaxAttendees] = useState(initialData.maxAttendees?.toString() || '10');
  const [customTags, setCustomTags] = useState<string[]>(initialData.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [geocodingResults, setGeocodingResults] = useState<GeocodingResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [placesPredictions, setPlacesPredictions] = useState<Array<{ description: string; place_id: string; types?: string[]; structured?: { mainText?: string; secondaryText?: string } }>>([]);
  const [placesSessionToken, setPlacesSessionToken] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [tokiImages, setTokiImages] = useState<Array<{ url: string; publicId: string }>>(initialData.images || []);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [isTimePickerVisible, setIsTimePickerVisible] = useState(false);
  const [webTimeTemp, setWebTimeTemp] = useState<string>('');
  const [isPrivate, setIsPrivate] = useState(!!initialData && initialData.visibility === 'private');

  // Keep privacy toggle in sync when editing existing Toki
  useEffect(() => {
    if (initialData && typeof initialData.visibility === 'string') {
      setIsPrivate(initialData.visibility === 'private');
    }
  }, [initialData?.visibility]);

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

  // Cleanup function to cancel any pending geocoding requests (legacy fallback)
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

  // Ensure that any manual date/time change marks the selection as custom
  useEffect(() => {
    if (customDateTime) {
      setSelectedTime('custom');
    }
  }, [customDateTime]);

  // Update form state when initialData changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && initialData) {
      console.log('Updating form state with initialData:', initialData);

      if (initialData.title) setTitle(initialData.title);
      if (initialData.description) setDescription(initialData.description);
      if (initialData.location) setLocation(initialData.location);
      if (initialData.latitude !== undefined) setLatitude(initialData.latitude);
      if (initialData.longitude !== undefined) setLongitude(initialData.longitude);
      if (initialData.activities) {
        setSelectedActivities(initialData.activities);
      } else if (initialData.activity) {
        setSelectedActivities([initialData.activity]);
      }
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
          selectedActivities,
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

  // Function to handle activity selection (multiple selection up to 3)
  const handleActivitySelect = (activityId: string) => {
    if (selectedActivities.includes(activityId)) {
      // Remove activity if already selected
      setSelectedActivities(selectedActivities.filter(id => id !== activityId));
    } else if (selectedActivities.length < 3) {
      // Add activity if less than 3 selected
      setSelectedActivities([...selectedActivities, activityId]);
    } else {
      // Show alert if trying to select more than 3
      Alert.alert('Maximum Reached', 'You can select up to 3 activity types.');
    }
  };

  // Function to handle location input change (Google Places)
  const handleLocationChange = async (newLocation: string) => {
    setLocation(newLocation);

    if (!newLocation.trim()) {
      setLatitude(null);
      setLongitude(null);
      setGeocodingResults([]); // legacy list hidden
      setPlacesPredictions([]);
      setShowAutocomplete(false);
      return;
    }

    // Only query after 2+ characters
    if (newLocation.trim().length < 2) {
      setPlacesPredictions([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      // Bias by profile coordinates if available
      const biasLat = (state.currentUser as any)?.latitude;
      const biasLng = (state.currentUser as any)?.longitude;
      const params = new URLSearchParams({ input: newLocation.trim() });
      if (biasLat && biasLng) {
        params.append('lat', String(biasLat));
        params.append('lng', String(biasLng));
      }
      if (placesSessionToken) params.append('sessiontoken', placesSessionToken);

      const resp = await fetch(`${getBackendUrl()}/api/maps/places?${params.toString()}`);
      const json = await resp.json();
      if (json?.success) {
        setPlacesPredictions(json.data?.predictions || []);
        setPlacesSessionToken(json.data?.sessionToken || placesSessionToken);
        setShowAutocomplete((json.data?.predictions || []).length > 0);
      } else {
        setPlacesPredictions([]);
        setShowAutocomplete(false);
      }
    } catch (error) {
      console.error('Places autocomplete failed:', error);
      setPlacesPredictions([]);
      setShowAutocomplete(false);
    }
  };

  // Handle selection of a Google Place prediction
  const handlePredictionSelect = async (prediction: { description: string; place_id: string }) => {
    try {
      const params = new URLSearchParams({ placeId: prediction.place_id });
      if (placesSessionToken) params.append('sessiontoken', placesSessionToken);
      const resp = await fetch(`${getBackendUrl()}/api/maps/place-details?${params.toString()}`);
      const json = await resp.json();
      if (json?.success) {
        const d = json.data;
        const main = (prediction as any)?.structured?.mainText;
        const secondary = (prediction as any)?.structured?.secondaryText;
        const pickedLabel = main && secondary
          ? `${main}, ${secondary}`
          : (d.shortLabel || d.formatted_address || prediction.description);
        setLocation(pickedLabel);
        setLatitude(d.location?.lat ?? null);
        setLongitude(d.location?.lng ?? null);
        setSelectedPlaceId(d.placeId || prediction.place_id);
      } else {
        // Fallback to description only
        setLocation(prediction.description);
      }
    } catch (error) {
      console.error('Place details failed:', error);
      setLocation(prediction.description);
    } finally {
      setShowAutocomplete(false);
      setPlacesPredictions([]);
      setGeocodingResults([]);
    }
  };



  const handleSubmit = async () => {
    if (!title || selectedActivities.length === 0 || !location || !selectedTime) {
      Alert.alert('Missing Information', 'Please fill in all required fields (title, at least one activity type, location, and time).');
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
        placeId: selectedPlaceId || null,
        activity: selectedActivities[0], // Primary activity (first selected)
        activities: selectedActivities, // All selected activities
        time: selectedTime,
        customDateTime: selectedTime === 'custom' ? customDateTime : null,
        maxAttendees: parseInt(maxAttendees) || 10,
        tags: [...selectedActivities, ...customTags],
        category: selectedActivities[0], // Primary category
        visibility: isPrivate ? 'private' : 'public',
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
        placeId: selectedPlaceId || null,
        activity: selectedActivities[0], // Primary activity (first selected)
        activities: selectedActivities, // All selected activities
        time: selectedTime,
        customDateTime: selectedTime === 'custom' ? customDateTime : null,
        maxAttendees: parseInt(maxAttendees) || 10,
        tags: [...selectedActivities, ...customTags],
        category: selectedActivities[0], // Primary category
        visibility: isPrivate ? 'private' : 'public',
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
          <Text style={styles.activityHint}>
            Select up to 3 activity types ({selectedActivities.length}/3 selected)
          </Text>
          <View style={styles.activityGrid}>
            {activityTypes.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityButton,
                  selectedActivities.includes(activity.id) && styles.activityButtonSelected,
                  selectedActivities.length >= 3 && !selectedActivities.includes(activity.id) && styles.activityButtonDisabled
                ]}
                onPress={() => handleActivitySelect(activity.id)}
                disabled={selectedActivities.length >= 3 && !selectedActivities.includes(activity.id)}
              >
                <Text style={styles.activityIcon}>{activity.icon}</Text>
                <Text style={[
                  styles.activityLabel,
                  selectedActivities.includes(activity.id) && styles.activityLabelSelected,
                  selectedActivities.length >= 3 && !selectedActivities.includes(activity.id) && styles.activityLabelDisabled
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
              style={{ outline: 'none', ...styles.locationInput }}
              value={location}
              placeholder="e.g., Rothschild Boulevard, Gordon Beach..."
              placeholderTextColor="#999999"
              onChangeText={handleLocationChange}
              onFocus={() => setShowAutocomplete(true)}
            />
          </View>

          {showAutocomplete && placesPredictions.length > 0 && (
            <View style={styles.autocompleteContainer}>
              {placesPredictions.map((p, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.autocompleteItem}
                  onPress={() => handlePredictionSelect(p)}
                >
                  <MapPin size={16} color="#666666" />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={styles.autocompleteText} numberOfLines={1}>
                      {p.structured?.mainText || p.description}
                    </Text>
                    {p.structured?.secondaryText && (
                      <Text style={{ fontSize: 12, color: '#6B7280' }} numberOfLines={1}>
                        {p.structured.secondaryText}
                      </Text>
                    )}
                  </View>
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


          {/* Custom Date & Time Input */}
          <View style={styles.customDateTimeContainer}>

            {/* Date and Time in a row */}
            <View style={styles.dateTimeRow}>
              {/* Date Input */}
              <View style={styles.dateTimeInputGroup}>
                <Text style={styles.dateTimeLabel}>Date:</Text>

                <View style={styles.dateTimeInputContainer}>

                  <TextInput
                    style={{ outline: 'none', ...styles.dateTimeInput }}
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
                    onPress={() => setIsDatePickerVisible(true)}
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
                    style={{ outline: 'none', ...styles.dateTimeInput }}
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
                    onPress={() => setIsTimePickerVisible(true)}
                  >
                    <Clock size={16} color="#B49AFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Date Picker Modal */}
        <Modal
          transparent
          visible={isDatePickerVisible}
          animationType="fade"
          onRequestClose={() => setIsDatePickerVisible(false)}
        >
          <View style={styles.pickerBackdrop}>
            <View style={styles.pickerContainer}>
              <DateTimePicker
                mode="single"
                date={customDateTime ? dayjs(customDateTime.split(' ')[0]).toDate() : new Date()}
                styles={{
                  today: { borderColor: '#8B5CF6', borderWidth: 1 },
                  selected: { backgroundColor: '#B49AFF' },
                  selected_label: { color: '#FFFFFF' },
                }}
                onChange={(params: any) => {
                  try {
                    const pickedDate: Date = params.date;
                    const dateStr = dayjs(pickedDate).format('YYYY-MM-DD');
                    const currentTime = customDateTime ? customDateTime.split(' ')[1] : '14:00';
                    setCustomDateTime(`${dateStr} ${currentTime}`);
                  } catch { }
                }}
              />
              <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setIsDatePickerVisible(false)}>
                <Text style={styles.pickerCloseText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Time Picker Modal using @react-native-community/datetimepicker */}
        {isTimePickerVisible && (
          <Modal
            transparent
            visible={isTimePickerVisible}
            animationType="fade"
            onRequestClose={() => setIsTimePickerVisible(false)}
          >
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerContainer}>
                {Platform.OS === 'web' ? (
                  <View>
                    <Text style={[styles.dateTimeLabel, { marginBottom: 8 }]}>Select time</Text>
                    {(() => {
                      const current = (webTimeTemp || (customDateTime ? customDateTime.split(' ')[1] : '14:00')).split(':');
                      const hour = current[0];
                      const minute = current[1];
                      const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
                      const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
                      return (
                        <Picker
                          value={{ hour, minute }}
                          onChange={(val: any) => {
                            const h = val.hour ?? hour;
                            const m = val.minute ?? minute;
                            setWebTimeTemp(`${h}:${m}`);
                          }}
                        >
                          <Picker.Column name="hour">
                            {hours.map(h => (
                              <Picker.Item key={h} value={h}>
                                {h}
                              </Picker.Item>
                            ))}
                          </Picker.Column>
                          <Picker.Column name="minute">
                            {minutes.map(m => (
                              <Picker.Item key={m} value={m}>
                                {m}
                              </Picker.Item>
                            ))}
                          </Picker.Column>
                        </Picker>
                      );
                    })()}
                    <TouchableOpacity
                      style={[styles.pickerCloseButton, { marginTop: 12 }]}
                      onPress={() => {
                        const timeStr = webTimeTemp || (customDateTime ? customDateTime.split(' ')[1] : '14:00');
                        const currentDate = customDateTime ? customDateTime.split(' ')[0] : dayjs().format('YYYY-MM-DD');
                        setCustomDateTime(`${currentDate} ${timeStr}`);
                        setIsTimePickerVisible(false);
                        setWebTimeTemp('');
                      }}
                    >
                      <Text style={styles.pickerCloseText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <RNDateTimePicker
                      mode="time"
                      value={customDateTime ? dayjs(customDateTime.replace(' ', 'T')).toDate() : new Date()}
                      display={Platform.OS === 'android' ? 'clock' : 'spinner'}
                      onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                        if (Platform.OS === 'android') {
                          if (event.type === 'set' && selectedDate) {
                            const timeStr = dayjs(selectedDate).format('HH:mm');
                            const currentDate = customDateTime ? customDateTime.split(' ')[0] : dayjs().format('YYYY-MM-DD');
                            setCustomDateTime(`${currentDate} ${timeStr}`);
                          }
                          setIsTimePickerVisible(false);
                        } else {
                          if (selectedDate) {
                            const timeStr = dayjs(selectedDate).format('HH:mm');
                            const currentDate = customDateTime ? customDateTime.split(' ')[0] : dayjs().format('YYYY-MM-DD');
                            setCustomDateTime(`${currentDate} ${timeStr}`);
                          }
                        }
                      }}
                    />
                    {Platform.OS !== 'android' && (
                      <TouchableOpacity style={styles.pickerCloseButton} onPress={() => setIsTimePickerVisible(false)}>
                        <Text style={styles.pickerCloseText}>Done</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </Modal>
        )}

        {/* Privacy toggle */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Privacy</Text>
          <TouchableOpacity
            style={[styles.privacyToggle, isPrivate && styles.privacyToggleOn]}
            onPress={() => setIsPrivate(!isPrivate)}
          >
            <Lock size={18} color={isPrivate ? '#FFFFFF' : '#B49AFF'} />
            <Text style={[styles.privacyToggleText, isPrivate && styles.privacyToggleTextOn]}>
              {isPrivate ? 'Private (invite-only)' : 'Public'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Max Attendees</Text>
          <View style={styles.attendeesInputContainer}>
            <Users size={20} color="#B49AFF" style={styles.attendeesIcon} />
            <TextInput
              style={{ outline: 'none', ...styles.attendeesInput }}
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
              style={{ outline: 'none', ...styles.tagInput }}
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
  activityLabelDisabled: {
    color: '#D1D5DB',
  },
  activityButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  activityHint: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 12,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 0,
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
    borderWidth: 0,
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
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    maxWidth: 420,
  },
  pickerCloseButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    backgroundColor: '#B49AFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pickerCloseText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 14,
  },
  dateTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateTimeInputGroup: {
    flex: 1,
    marginRight: 12,
    minWidth: 200,
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
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  privacyToggleOn: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  privacyToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  privacyToggleTextOn: {
    color: '#FFFFFF',
  },
});

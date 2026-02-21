import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { apiService } from '../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MapPin, Check } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getBackendUrl } from '@/services/config';

export default function CompleteProfileScreen() {
  const { dispatch } = useApp();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const initialName = searchParams.name as string | undefined;

  const [name, setName] = useState(initialName && initialName !== 'Toki User' ? initialName : '');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [placesPredictions, setPlacesPredictions] = useState<Array<{ description: string; place_id: string; types?: string[]; structured?: { mainText?: string; secondaryText?: string } }>>([]);
  const [placesSessionToken, setPlacesSessionToken] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const handleLocationTextChange = async (value: string) => {
    setLocation(value);
    setLatitude(undefined);
    setLongitude(undefined);

    const q = (value || '').trim();
    if (!q) {
      setPlacesPredictions([]);
      setShowAutocomplete(false);
      return;
    }
    if (q.length < 2) {
      setPlacesPredictions([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      const params = new URLSearchParams({ input: q });
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
      setPlacesPredictions([]);
      setShowAutocomplete(false);
    }
  };

  const handlePredictionSelect = async (prediction: { description: string; place_id: string; structured?: { mainText?: string; secondaryText?: string } }) => {
    try {
      const params = new URLSearchParams({ placeId: prediction.place_id });
      if (placesSessionToken) params.append('sessiontoken', placesSessionToken);
      const resp = await fetch(`${getBackendUrl()}/api/maps/place-details?${params.toString()}`);
      const json = await resp.json();
      if (json?.success) {
        const d = json.data;
        const main = prediction.structured?.mainText;
        const secondary = prediction.structured?.secondaryText;
        const pickedLabel = main && secondary ? `${main}, ${secondary}` : (d.shortLabel || d.formatted_address || prediction.description);
        setLocation(pickedLabel);
        setLatitude(d.location?.lat);
        setLongitude(d.location?.lng);
      } else {
        setLocation(prediction.description);
      }
    } catch (error) {
      setLocation(prediction.description);
    } finally {
      setShowAutocomplete(false);
      setPlacesPredictions([]);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setIsLocating(true);

      if (Platform.OS === 'web') {
        if (!navigator.geolocation) {
          Toast.show({
            type: 'error',
            text1: 'Location Not Supported',
            text2: 'Your browser does not support geolocation',
            visibilityTime: 4000,
          });
          setIsLocating(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude: lat, longitude: lng } = position.coords;

            let label = '';
            try {
              const resp = await fetch(`${getBackendUrl()}/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
              const json = await resp.json();
              if (resp.ok && json?.success) {
                label = json.data?.shortLabel || json.data?.formatted_address || '';
              }
            } catch {}

            setLocation(label);
            setLatitude(lat);
            setLongitude(lng);
            setIsLocating(false);
          },
          (error) => {
            setIsLocating(false);
            let errorMessage = 'Could not get your location';
            if (error.code === error.PERMISSION_DENIED) {
              errorMessage = 'Please allow location access in your browser';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              errorMessage = 'Location information is unavailable';
            } else if (error.code === error.TIMEOUT) {
              errorMessage = 'Location request timed out. Please try again.';
            }
            Toast.show({
              type: 'error',
              text1: 'Location Error',
              text2: errorMessage,
              visibilityTime: 4000,
            });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        );
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Toast.show({
            type: 'error',
            text1: 'Permission Needed',
            text2: 'Please enable location permission in your device settings',
            visibilityTime: 4000,
          });
          setIsLocating(false);
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { latitude: lat, longitude: lng } = pos.coords;

        let label = location || '';
        try {
          const resp = await fetch(`${getBackendUrl()}/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
          const json = await resp.json();
          if (resp.ok && json?.success) {
            label = json.data?.shortLabel || json.data?.formatted_address || '';
          } else {
            const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            const r = results?.[0];
            const neighborhood = r?.district || (r as any)?.subregion || '';
            const city = r?.city || '';
            const region = r?.region || '';
            const streetish = r?.name || r?.street || '';
            label = neighborhood || city || region || streetish || '';
          }
        } catch {}

        setLocation(label);
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Location Error',
        text2: 'Could not fetch your current location. Please try again.',
        visibilityTime: 4000,
      });
      setIsLocating(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Name Required',
        text2: 'Please enter your name',
        visibilityTime: 4000,
      });
      return;
    }

    if (!termsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Terms Required',
        text2: 'Please accept the Terms of Use and Privacy Policy to continue',
        visibilityTime: 4000,
      });
      return;
    }

    if (!location || !latitude || !longitude) {
      Toast.show({
        type: 'error',
        text1: 'Location Required',
        text2: 'Select from the dropdown or tap "Use current location"',
        visibilityTime: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.completeProfile({
        name: name.trim(),
        location,
        latitude,
        longitude,
        bio: bio || undefined,
        termsAccepted: true,
      });

      if (response.success) {
        // Update user in context
        dispatch({ type: 'UPDATE_CURRENT_USER', payload: response.data.user });

        Toast.show({
          type: 'success',
          text1: 'Profile Complete!',
          text2: 'Welcome to Toki',
          visibilityTime: 3000,
        });

        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.message || 'Failed to complete profile',
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      console.error('Complete profile error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Something went wrong. Please try again.',
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#F5F3FF', '#FFFFFF', '#F0EBFF']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Complete Your Profile</Text>
                <Text style={styles.subtitle}>
                  Just a few more details to get you started.
                </Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Name Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Your Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    maxLength={50}
                  />
                </View>

                {/* Location Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Your Location *</Text>
                  <View style={styles.locationInputWrapper}>
                    <MapPin size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.locationInput}
                      placeholder="Search for your city or area"
                      placeholderTextColor="#9CA3AF"
                      value={location}
                      onChangeText={handleLocationTextChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {latitude && longitude && (
                      <View style={styles.validIndicator}>
                        <Check size={14} color="#10B981" />
                      </View>
                    )}
                  </View>
                  {showAutocomplete && placesPredictions.length > 0 && (
                    <View style={styles.autocompleteContainer}>
                      {placesPredictions.map((p, idx) => (
                        <TouchableOpacity
                          key={p.place_id + idx}
                          style={[styles.predictionRow, idx !== placesPredictions.length - 1 && styles.predictionRowBorder]}
                          onPress={() => handlePredictionSelect(p)}
                        >
                          <MapPin size={14} color="#9CA3AF" style={{ marginRight: 8 }} />
                          <View style={styles.predictionTextWrapper}>
                            <Text style={styles.predictionMainText} numberOfLines={1}>
                              {p.structured?.mainText || p.description.split(',')[0]}
                            </Text>
                            {p.structured?.secondaryText && (
                              <Text style={styles.predictionSecondaryText} numberOfLines={1}>
                                {p.structured.secondaryText}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.useCurrentLocationButton}
                    onPress={useCurrentLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#B49AFF" />
                    ) : (
                      <>
                        <MapPin size={16} color="#B49AFF" />
                        <Text style={styles.useCurrentLocationText}>Use current location</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Bio Input (Optional) */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Bio (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.bioInput]}
                    placeholder="Tell us a bit about yourself..."
                    placeholderTextColor="#9CA3AF"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={200}
                  />
                  <Text style={styles.charCount}>{bio.length}/200</Text>
                </View>

                {/* Terms Agreement */}
                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted && <Check size={14} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => router.push('/terms-of-use')}
                    >
                      Terms of Use
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={styles.termsLink}
                      onPress={() => router.push('/privacy-policy')}
                    >
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>

                {/* Complete Button */}
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleCompleteProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Complete Profile</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputWrapper: {
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  bioInput: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  locationInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  locationInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  validIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  autocompleteContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  predictionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  predictionTextWrapper: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  predictionSecondaryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  useCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  useCurrentLocationText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    marginLeft: 8,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#B49AFF',
    borderColor: '#B49AFF',
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 22,
  },
  termsLink: {
    color: '#B49AFF',
    fontFamily: 'Inter-Medium',
  },
  submitButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});

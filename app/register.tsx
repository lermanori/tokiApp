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
import { apiService, OAuthResponse } from '../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getBackendUrl } from '@/services/config';
import SocialLoginButtons from '../components/SocialLoginButtons';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [placesPredictions, setPlacesPredictions] = useState<Array<{ description: string; place_id: string; types?: string[]; structured?: { mainText?: string; secondaryText?: string } }>>([]);
  const [placesSessionToken, setPlacesSessionToken] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const { dispatch } = useApp();
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  // Silently support invitation codes via URL (hidden from UI)
  const inviteCode = searchParams.invite as string | undefined;

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
        // Web: Use browser's native Geolocation API
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

            // Reverse geocode to get address label
            let label = '';
            try {
              const resp = await fetch(`${getBackendUrl()}/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
              const json = await resp.json();
              if (resp.ok && json?.success) {
                label = json.data?.shortLabel || json.data?.formatted_address || '';
              }
            } catch { }

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
        // Native (iOS/Android): Use expo-location
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
        } catch { }

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

  const handleRegister = async () => {
    if (!termsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Terms Required',
        text2: 'Please accept the Terms of Use and Privacy Policy to continue',
        visibilityTime: 4000,
      });
      return;
    }

    if (!name) {
      Toast.show({
        type: 'error',
        text1: 'Name Required',
        text2: 'Please enter your full name',
        visibilityTime: 3000,
      });
      return;
    }

    if (!email) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
        visibilityTime: 3000,
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
        visibilityTime: 3000,
      });
      return;
    }

    if (!password) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter a password',
        visibilityTime: 3000,
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters',
        visibilityTime: 3000,
      });
      return;
    }

    // Require location with valid coordinates
    if (!location || !latitude || !longitude) {
      Toast.show({
        type: 'error',
        text1: 'Location Required',
        text2: 'Select from the dropdown or tap "Add location"',
        visibilityTime: 4000,
      });
      return;
    }

    setLoading(true);
    try {
      let response;

      // Silently use invitation flow if code present in URL (hidden from UI)
      if (inviteCode) {
        try {
          // Validate invitation silently
          const validationResponse = await apiService.validateInvitationCode(inviteCode);
          if (validationResponse.success) {
            // Use invitation-based registration
            response = await apiService.registerWithInvitation({
              name,
              email,
              password,
              bio: bio || undefined,
              location: location || undefined,
              latitude: latitude,
              longitude: longitude,
              invitationCode: inviteCode,
              termsAccepted: true,
            });
          } else {
            // If invitation invalid, fall through to direct registration
            response = await apiService.register({
              name,
              email,
              password,
              bio: bio || undefined,
              location: location || undefined,
              latitude: latitude,
              longitude: longitude,
              termsAccepted: true,
            });
          }
        } catch (inviteError) {
          // If invitation validation fails, fall through to direct registration
          response = await apiService.register({
            name,
            email,
            password,
            bio: bio || undefined,
            location: location || undefined,
            latitude: latitude,
            longitude: longitude,
            termsAccepted: true,
          });
        }
      } else {
        // Direct registration (default)
        response = await apiService.register({
          name,
          email,
          password,
          bio: bio || undefined,
          location: location || undefined,
          latitude: latitude,
          longitude: longitude,
          termsAccepted: true,
        });
      }

      if (response.success) {
        // Show success toast and navigate to login
        Toast.show({
          type: 'success',
          text1: 'Account Created!',
          text2: 'Please log in to continue',
          visibilityTime: 3000,
        });
        // Navigate to login after a brief delay so user sees the toast
        setTimeout(() => {
          router.replace('/login');
        }, 500);
      } else {
        // Parse backend error message for user-friendly display
        const errorMessage = response.message || 'Registration failed';
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: errorMessage,
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      // Handle specific error cases
      let errorTitle = 'Registration Failed';
      let errorMessage = 'Please try again later';

      if (error.message?.includes('already exists')) {
        errorTitle = 'Email Already Registered';
        errorMessage = 'An account with this email already exists. Try logging in instead.';
      } else if (error.message?.includes('network') || error.message?.includes('Network')) {
        errorTitle = 'Connection Error';
        errorMessage = 'Please check your internet connection and try again';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Toast.show({
        type: 'error',
        text1: errorTitle,
        text2: errorMessage,
        visibilityTime: 4000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle social login success
  const handleSocialLoginSuccess = async (response: OAuthResponse) => {
    console.log('🔐 [SOCIAL REGISTER] Success:', { isNewUser: response.isNewUser, requiresProfileCompletion: response.requiresProfileCompletion });

    // IMPORTANT: Store tokens FIRST before any redirect
    // The OAuth response contains tokens that need to be saved for authenticated API calls
    if (response.data?.tokens) {
      await apiService.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
      console.log('🔐 [SOCIAL REGISTER] Tokens stored');
    }

    // OAuth users always need to complete profile (set location)
    if (response.requiresProfileCompletion) {
      router.replace({
        pathname: '/complete-profile',
        params: { name: response.data.user.name },
      });
    } else {
      // Profile already complete, go to main app
      apiService.clearAuthCache();
      const user = {
        ...response.data.user,
        rating: parseFloat(response.data.user.rating) || 0,
      };
      dispatch({ type: 'UPDATE_CURRENT_USER', payload: user });
      router.replace('/(tabs)');
    }
  };

  // Handle social login error
  const handleSocialLoginError = (error: Error, provider: 'apple' | 'google') => {
    console.error(`❌ [SOCIAL REGISTER] ${provider} error:`, error);
    Toast.show({
      type: 'error',
      text1: `${provider === 'apple' ? 'Apple' : 'Google'} Sign-In Failed`,
      text2: error.message || 'Please try again',
      visibilityTime: 4000,
    });
  };

  return (
    <LinearGradient colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']} style={styles.gradient}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.contentWrapper}>
              <View style={styles.contentContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                >
                  <ArrowLeft size={24} color="#1C1C1C" />
                </TouchableOpacity>

                <Text style={styles.title}>Create Account</Text>

                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name *"
                    placeholderTextColor="#666"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Email *"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Password *"
                      placeholderTextColor="#666"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="new-password"
                      textContentType="newPassword"
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.passwordToggleText}>
                        {showPassword ? '🙈' : '👁️'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Bio (optional)"
                    placeholderTextColor="#666"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />

                  <View style={styles.locationContainer}>
                    <MapPin size={20} color="#8B5CF6" style={styles.locationIcon} />
                    <TextInput
                      style={styles.locationInput}
                      placeholder="Location *"
                      placeholderTextColor="#666"
                      value={location}
                      onChangeText={handleLocationTextChange}
                      onFocus={() => setShowAutocomplete(true)}
                      autoCapitalize="words"
                    />
                    <TouchableOpacity
                      style={styles.useLocationButton}
                      onPress={useCurrentLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.useLocationText}>Add location</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {!latitude || !longitude ? (
                    <Text style={styles.locationHint}>
                      Select from dropdown or tap "Add location" button
                    </Text>
                  ) : null}
                  {showAutocomplete && placesPredictions.length > 0 && (
                    <View style={styles.autocompleteContainer}>
                      {placesPredictions.map((p, index) => (
                        <TouchableOpacity
                          key={`${p.place_id}-${index}`}
                          style={styles.autocompleteItem}
                          onPress={() => handlePredictionSelect(p)}
                        >
                          <MapPin size={16} color="#666666" />
                          <View style={styles.autocompleteTextContainer}>
                            <Text style={styles.autocompleteText} numberOfLines={1}>
                              {p.structured?.mainText || p.description}
                            </Text>
                            {p.structured?.secondaryText && (
                              <Text style={styles.autocompleteSecondaryText} numberOfLines={1}>
                                {p.structured.secondaryText}
                              </Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <View style={styles.termsContainer}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setTermsAccepted(!termsAccepted)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                        {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.termsLabel}>
                        I agree to the{' '}
                        <Text
                          style={styles.termsLink}
                          onPress={() => router.push('/terms-of-use')}
                        >
                          Terms of Use
                        </Text>
                        {' '}and{' '}
                        <Text
                          style={styles.termsLink}
                          onPress={() => router.push('/privacy-policy')}
                        >
                          Privacy Policy
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, (loading || !termsAccepted) && styles.buttonDisabled]}
                    onPress={handleRegister}
                    disabled={loading || !termsAccepted}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? 'Creating Account...' : 'Create Account'}
                    </Text>
                  </TouchableOpacity>

                  {/* Social Login Buttons */}
                  <SocialLoginButtons
                    onSuccess={handleSocialLoginSuccess}
                    onError={handleSocialLoginError}
                    onLoading={setSocialLoading}
                    disabled={loading || socialLoading}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 500,
    paddingHorizontal: 20,
  },
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    padding: 20,
  },
  backButton: {
    padding: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 24,
    textAlign: 'center',
  },
  invitationBanner: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  invitationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
  },
  passwordToggle: {
    padding: 16,
    paddingLeft: 8,
  },
  passwordToggleText: {
    fontSize: 18,
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 56,
  },
  locationIcon: {
    marginRight: 12,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
  },
  useLocationButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useLocationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  autocompleteContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
    overflow: 'hidden',
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  autocompleteTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  autocompleteText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
  },
  autocompleteSecondaryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  termsContainer: {
    marginBottom: 16,
    marginTop: 8,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  termsLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    lineHeight: 20,
  },
  termsLink: {
    color: '#8B5CF6',
    fontFamily: 'Inter-SemiBold',
    textDecorationLine: 'underline',
  },
  locationHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#8B5CF6',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 16,
  },
});


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { apiService } from '../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getBackendUrl } from '@/services/config';

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
  const { dispatch, actions } = useApp();
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please enable location permission to use current location.');
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
    } catch (e) {
      Alert.alert('Location error', 'Could not fetch your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
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
            });
          } else {
            // If invitation invalid, fall through to direct registration
            response = await apiService.register({
              name,
              email,
              password,
              bio: bio || undefined,
              location: location || undefined,
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
        });
      }

      if (response.success) {
        // Navigate to login immediately
        router.replace('/login');
        // Show success message after a brief delay to ensure navigation happens
        setTimeout(() => {
          Alert.alert('Success', 'Account created successfully! Please log in to continue.');
        }, 100);
      } else {
        Alert.alert('Error', response.message || 'Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Error', error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
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
                    placeholder="Location (optional)"
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
                      <Text style={styles.useLocationText}>Use current</Text>
                    )}
                  </TouchableOpacity>
                </View>
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

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Text>
                </TouchableOpacity>
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
});


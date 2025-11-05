import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Camera, Instagram, Facebook, Linkedin, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import * as Location from 'expo-location';
import { getBackendUrl } from '@/services/config';
// Use same Google Places-backed flow as Toki create/edit

interface SocialLinks {
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  facebook?: string;
}

export default function EditProfileScreen() {
  const { state, actions } = useApp();
  const [profile, setProfile] = useState(state.currentUser);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [placesPredictions, setPlacesPredictions] = useState<Array<{ description: string; place_id: string; types?: string[]; structured?: { mainText?: string; secondaryText?: string } }>>([]);
  const [placesSessionToken, setPlacesSessionToken] = useState<string | null>(null);

  // Update profile state when currentUser changes (e.g., when data is loaded from backend)
  useEffect(() => {
    setProfile(state.currentUser);
  }, [state.currentUser]);

  // Load user data when component mounts
  useEffect(() => {
    if (state.isConnected && (!state.currentUser.name || state.currentUser.name === 'Maya Cohen')) {
      actions.loadCurrentUser();
    }
  }, [state.isConnected]);

  const updateProfile = (field: string, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateSocialLink = (platform: keyof SocialLinks, value: string) => {
    setProfile(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value.trim() || undefined,
      }
    }));
    setHasChanges(true);
  };

  const handleLocationTextChange = async (value: string) => {
    // Update text and clear stale coords
    updateProfile('location', value);
    updateProfile('latitude', undefined as unknown as number);
    updateProfile('longitude', undefined as unknown as number);

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
      // Bias by user's current stored coordinates if available
      const biasLat = (state.currentUser as any)?.latitude;
      const biasLng = (state.currentUser as any)?.longitude;
      const params = new URLSearchParams({ input: q });
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
        updateProfile('location', pickedLabel);
        updateProfile('latitude', d.location?.lat as number);
        updateProfile('longitude', d.location?.lng as number);
      } else {
        updateProfile('location', prediction.description);
      }
    } catch (error) {
      updateProfile('location', prediction.description);
    } finally {
      setShowAutocomplete(false);
      setPlacesPredictions([]);
    }
  };

  const handleSave = async () => {
    // Validate that at least one social media link is provided
    const hasAtLeastOneSocial = Object.values(profile.socialLinks).some(link => link && link.trim());
    
    if (!hasAtLeastOneSocial) {
      Alert.alert(
        'Social Media Required',
        'Please add at least one social media link (Instagram, TikTok, LinkedIn, or Facebook).'
      );
      return;
    }

    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to save changes. Please check your connection and try again.');
      return;
    }

    setIsSaving(true);

    try {
      const success = await actions.updateProfile({
        name: profile.name,
        bio: profile.bio,
        location: profile.location,
        latitude: profile.latitude,
        longitude: profile.longitude,
        socialLinks: profile.socialLinks,
      });

      if (success) {
        setHasChanges(false);
        router.back();
      } else {
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setIsLocating(true);
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please enable location permission to use current location.');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      // Reverse geocode to a friendly, descriptive label (Google-backed via backend for web reliability)
      let label = profile.location || '';
      try {
        // Prefer our backend Google proxy on all platforms for consistent labels
        const resp = await fetch(`${getBackendUrl()}/api/maps/reverse-geocode?lat=${latitude}&lng=${longitude}`);
        const json = await resp.json();
        if (resp.ok && json?.success) {
          label = json.data?.shortLabel || json.data?.formatted_address || '';
        } else {
          // Fallback to Expo reverse geocode locally
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          const r = results?.[0];
          const neighborhood = r?.district || (r as any)?.subregion || '';
          const city = r?.city || '';
          const region = r?.region || '';
          const streetish = r?.name || r?.street || '';
          label = neighborhood || city || region || streetish || '';
        }
      } catch {}

      updateProfile('location', label);
      updateProfile('latitude', latitude);
      updateProfile('longitude', longitude);
    } catch (e) {
      Alert.alert('Location error', 'Could not fetch your current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleClearLocation = () => {
    updateProfile('location', '');
    updateProfile('latitude', undefined as unknown as number);
    updateProfile('longitude', undefined as unknown as number);
  };



  const getSocialIcon = (platform: keyof SocialLinks) => {
    switch (platform) {
      case 'instagram':
        return <Instagram size={20} color="#E4405F" />;
      case 'tiktok':
        return <User size={20} color="#000000" />; // TikTok icon placeholder
      case 'linkedin':
        return <Linkedin size={20} color="#0077B5" />;
      case 'facebook':
        return <Facebook size={20} color="#1877F2" />;
      default:
        return <User size={20} color="#6B7280" />;
    }
  };

  const getSocialPlaceholder = (platform: keyof SocialLinks) => {
    switch (platform) {
      case 'instagram':
        return '@username';
      case 'tiktok':
        return '@username';
      case 'linkedin':
        return 'username or profile-url';
      case 'facebook':
        return 'username or profile-url';
      default:
        return 'username';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F3E8FF', '#E0E7FF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Edit Profile</Text>
          <TouchableOpacity 
            onPress={handleSave}
            disabled={!hasChanges || isSaving || !state.isConnected}
            style={[
              styles.saveButton, 
              (!hasChanges || isSaving || !state.isConnected) && styles.saveButtonDisabled
            ]}
          >
            <Text style={[
              styles.saveText, 
              (!hasChanges || isSaving || !state.isConnected) && styles.saveTextDisabled
            ]}>
              {isSaving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        {!state.isConnected && (
          <View style={styles.connectionWarning}>
            <Text style={styles.connectionWarningText}>⚠️ Changes will be saved when connection is restored</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Photo Section */}
        <View style={styles.photoSection}>
          <View style={styles.avatarContainer}>
            <ProfileImageUpload
              currentImageUrl={profile.avatar}
              onImageUpdate={(newImageUrl) => {
                updateProfile('avatar', newImageUrl);
                setHasChanges(true);
              }}
              size={100}
              showEditButton={true}
            />
          </View>
          <Text style={styles.changePhotoText}>Tap the camera icon to change photo</Text>
        </View>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={profile.name}
              onChangeText={(value) => updateProfile('name', value)}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={profile.bio}
              onChangeText={(value) => updateProfile('bio', value)}
              placeholder="Tell people about yourself..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                value={profile.location}
                onChangeText={handleLocationTextChange}
                placeholder="Your location"
                placeholderTextColor="#9CA3AF"
              />
              {!!profile.location && (
                <TouchableOpacity
                  onPress={handleClearLocation}
                  style={styles.clearButton}
                  accessibilityRole="button"
                  accessibilityLabel="Clear location"
                  accessibilityHint="Clears the location text"
                >
                  <Text style={styles.clearText}>×</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.locateButton} onPress={useCurrentLocation} disabled={isLocating}
                onFocus={() => setShowAutocomplete(true)}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.locateText}>Use current</Text>
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
                    <Text style={styles.autocompleteText} numberOfLines={1}>
                      {p.structured?.mainText || p.description}
                    </Text>
                    {!!p.structured?.secondaryText && (
                      <Text style={styles.autocompleteSecondaryText} numberOfLines={1}>
                        {p.structured.secondaryText}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Social Media Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media Links</Text>
          <Text style={styles.sectionSubtitle}>
            Add at least one social media link so people can connect with you *
          </Text>
          
          {/* Always show all social platforms */}
          {(['instagram', 'tiktok', 'linkedin', 'facebook'] as Array<keyof SocialLinks>).map((platform) => (
            <View key={platform} style={styles.inputGroup}>
              <View style={styles.socialLabelContainer}>
                {getSocialIcon(platform)}
                <Text style={styles.label}>{platform.charAt(0).toUpperCase() + platform.slice(1)}</Text>
              </View>
              <TextInput
                style={styles.input}
                value={profile.socialLinks[platform] || ''}
                onChangeText={(value) => updateSocialLink(platform, value)}
                placeholder={getSocialPlaceholder(platform)}
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          ))}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  saveText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  saveTextDisabled: {
    color: '#9CA3AF',
  },
  connectionWarning: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  connectionWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },

  changePhotoText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  socialLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addSocialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginBottom: 12,
    gap: 8,
  },
  addSocialText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  bottomSpacing: {
    height: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#E5E7EB',
    width: 32,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  clearText: {
    color: '#6B7280',
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    lineHeight: 18,
  },
  locateButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locateText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
    fontSize: 12,
  },
  autocompleteContainer: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  autocompleteItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  autocompleteText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  autocompleteSecondaryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
});
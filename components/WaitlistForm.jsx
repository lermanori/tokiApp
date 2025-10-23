import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { apiService } from '@/services/api';

const countries = [
  { code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+86', name: 'China', flag: '🇨🇳' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: '+63', name: 'Philippines', flag: '🇵🇭' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: '+58', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+56', name: 'Chile', flag: '🇨🇱' },
  { code: '+57', name: 'Colombia', flag: '🇨🇴' },
  { code: '+51', name: 'Peru', flag: '🇵🇪' },
  { code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: '+98', name: 'Iran', flag: '🇮🇷' },
  { code: '+964', name: 'Iraq', flag: '🇮🇶' },
  { code: '+962', name: 'Jordan', flag: '🇯🇴' },
  { code: '+961', name: 'Lebanon', flag: '🇱🇧' },
  { code: '+963', name: 'Syria', flag: '🇸🇾' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: '+974', name: 'Qatar', flag: '🇶🇦' }
];

const locations = [
  'Amsterdam',
  'Barcelona',
  'Berlin',
  'Copenhagen',
  'Lisbon',
  'London',
  'Los Angeles',
  'Miami',
  'New York',
  'Paris',
  'Tel Aviv'
];

export default function WaitlistForm() {
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');

  // Filter countries and locations based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    country.code.includes(countrySearch)
  );

  const filteredLocations = locations.filter(location =>
    location.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    setMessage('');
    setIsLoading(true);

    try {
      // Use the app's API service to join waitlist
      const formData = {
        email: email.trim(),
        phone: phone ? `${selectedCountry.code} ${phone}` : null,
        location: location || null,
        reason: reason || null,
        platform: Platform.OS,
      };

      await apiService.joinWaitlist(formData);

      // Success
      setSubmitted(true);
      setMessage('Thank you for joining our waitlist! We\'ll notify you when we\'re ready to invite you.');
      setEmail('');
      setPhone('');
      setLocation('');
      setReason('');
      setSelectedCountry(countries[0]);

      // Don't dispatch navigation event - stay on waitlist page
      // Users should see success message and stay on waitlist
    } catch (error) {
      console.error('Submission error:', error);
      setMessage('Something went wrong. Please try again. Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (typeof window !== 'undefined') {
            window.history.back();
          }
        }}
      >
        <ArrowLeft size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <LinearGradient
        colors={['rgb(255, 241, 235)', 'rgb(243, 231, 255)', 'rgb(229, 220, 255)']}
        style={styles.gradient}
      >
        <TouchableOpacity
          style={styles.gradient}
          activeOpacity={1}
          onPress={() => {
            setShowCountryDropdown(false);
            setShowLocationDropdown(false);
          }}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>

              <View style={styles.header}>
                <Text style={styles.title}>Feeling social right now?</Text>
                <Text style={styles.subtitle}>
                You're not the only one.{'\n'}Join the mood map.
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={[styles.form, submitted && styles.formSubmitted]}>
                  {/* Reason textarea - desktop only */}
                  <View style={styles.desktopOnly}>
                    <TextInput
                      style={styles.textarea}
                      placeholder="Think you belong to Toki? Tell us why (optional)"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Email */}
                  <TextInput
                    style={styles.input}
                    placeholder="Your email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#9CA3AF"
                  />

                  {/* Phone Input */}
                  <View style={styles.phoneContainer}>
                    <View style={styles.countryDropdownContainer}>
                      <TouchableOpacity
                        style={styles.countrySelector}
                        onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                      >
                        <Text style={styles.countryText}>
                          {selectedCountry.flag} {selectedCountry.code}
                        </Text>
                        <Text style={styles.dropdownArrow}>▼</Text>
                      </TouchableOpacity>

                      <Modal
                        visible={showCountryDropdown}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => {
                          setShowCountryDropdown(false);
                          setCountrySearch('');
                        }}
                      >
                        <TouchableOpacity
                          style={styles.modalOverlay}
                          activeOpacity={1}
                          onPress={() => {
                            setShowCountryDropdown(false);
                            setCountrySearch('');
                          }}
                        >
                          <TouchableOpacity
                            style={styles.countryDropdown}
                            activeOpacity={1}
                            onPress={() => { }} // Prevent closing when tapping dropdown content
                          >
                            <View style={styles.searchContainer}>
                              <TextInput
                                style={styles.searchInput}
                                placeholder="Search countries..."
                                value={countrySearch}
                                onChangeText={setCountrySearch}
                                placeholderTextColor="#9CA3AF"
                              />
                            </View>
                            <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                              {filteredCountries.map((country) => (
                                <TouchableOpacity
                                  key={country.code}
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setSelectedCountry(country);
                                    setShowCountryDropdown(false);
                                    setCountrySearch('');
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>
                                    {country.flag} {country.code} {country.name}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                              {filteredCountries.length === 0 && (
                                <View style={styles.noResults}>
                                  <Text style={styles.noResultsText}>No countries found</Text>
                                </View>
                              )}
                            </ScrollView>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </Modal>
                    </View>

                    <TextInput
                      style={styles.phoneInput}
                      placeholder="508740985"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Location Dropdown */}
                  <View style={styles.locationDropdownContainer}>
                    <TouchableOpacity
                      style={styles.locationSelector}
                      onPress={() => setShowLocationDropdown(!showLocationDropdown)}
                    >
                      <Text style={[styles.locationText, !location && styles.placeholderText]}>
                        {location || 'Select a location'}
                      </Text>
                      <Text style={styles.dropdownArrow}>▼</Text>
                    </TouchableOpacity>

                    <Modal
                      visible={showLocationDropdown}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => {
                        setShowLocationDropdown(false);
                        setLocationSearch('');
                      }}
                    >
                      <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => {
                          setShowLocationDropdown(false);
                          setLocationSearch('');
                        }}
                      >
                        <TouchableOpacity
                          style={styles.locationDropdown}
                          activeOpacity={1}
                          onPress={() => { }} // Prevent closing when tapping dropdown content
                        >
                          <View style={styles.searchContainer}>
                            <TextInput
                              style={styles.searchInput}
                              placeholder="Search locations..."
                              value={locationSearch}
                              onChangeText={setLocationSearch}
                              placeholderTextColor="#9CA3AF"
                            />
                          </View>
                          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                            {filteredLocations.map((loc) => (
                              <TouchableOpacity
                                key={loc}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setLocation(loc);
                                  setShowLocationDropdown(false);
                                  setLocationSearch('');
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{loc}</Text>
                              </TouchableOpacity>
                            ))}
                            {filteredLocations.length === 0 && (
                              <View style={styles.noResults}>
                                <Text style={styles.noResultsText}>No locations found</Text>
                              </View>
                            )}
                          </ScrollView>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Modal>
                  </View>

                  {/* Reason textarea - mobile only */}
                  <View style={styles.mobileOnly}>
                    <TextInput
                      style={styles.textarea}
                      placeholder="Think you belong to Toki? Tell us why (optional)"
                      value={reason}
                      onChangeText={setReason}
                      multiline
                      numberOfLines={3}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>

                  {/* Button */}
                  <TouchableOpacity
                    style={[styles.button, isLoading && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isLoading ? 'Joining...' : 'Join The Waitlist'}
                    </Text>
                  </TouchableOpacity>

                  {/* Subtext */}
                  <Text style={styles.subtext}>
                    * We're currently in private beta. If you're invited by someone from the community, let us know.
                  </Text>
                </View>

                {/* Success message */}
                {submitted && (
                  <View style={styles.successOverlay}>
                    <Text style={styles.successText}>
                      🎉 You're on the waitlist!{'\n'}We'll notify you when we're ready to invite you.
                    </Text>
                  </View>
                )}

                {/* Error message */}
                {message && !submitted && (
                  <Text style={styles.errorText}>{message}</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 32,
  },
  formContainer: {
    width: '100%',
    maxWidth: 600,
    position: 'relative',
  },
  form: {
    backgroundColor: 'transparent',
    padding: 20,
  },
  formSubmitted: {
    opacity: 0.3,
  },
  desktopOnly: {
    display: 'none',
  },
  mobileOnly: {
    display: 'flex',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  textarea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  phoneContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    alignItems: 'center',
  },
  countryDropdownContainer: {
    position: 'relative',
  },
  countrySelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    minWidth: 120,
    maxWidth: 140,
    flex: 0,
    overflow: 'hidden',
  },
  countryText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    maxHeight: 300,
    width: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
    overflow: 'hidden',
  },
  locationDropdownContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  locationSelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
  },
  locationText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
  locationDropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    maxHeight: 300,
    width: '80%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  button: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  subtext: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
  },
  successText: {
    fontSize: 24,
    fontStyle: 'italic',
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'Inter-Regular',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    fontFamily: 'Inter-Regular',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
    fontFamily: 'Inter-Regular',
  },
});

// Platform-specific styles for web
if (Platform.OS === 'web') {
  styles.desktopOnly = {
    display: 'flex',
  };
  styles.mobileOnly = {
    display: 'none',
  };
}

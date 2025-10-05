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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { apiService } from '../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';

// Dev environment user credentials
const DEV_USERS = [
  { name: 'Alice Johnson', email: 'alice@example.com', password: 'password123' },
  { name: 'Jane Smith', email: 'jane@example.com', password: 'password123' },
  { name: 'John Doe', email: 'john@example.com', password: 'password123' },
  { name: 'Test User', email: 'test@example.com', password: 'password123' },
];

export default function LoginScreen() {
  const [isLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // New state for data loading
  const [errorMessage, setErrorMessage] = useState(''); // New state for error messages
  const [isDevMode, setIsDevMode] = useState(false);
  const { dispatch } = useApp();
  const router = useRouter();
  const { returnTo, code } = useLocalSearchParams<{ returnTo?: string; code?: string }>();

  // Check if we're in dev mode and load saved credentials
  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedCredentials = localStorage.getItem('toki-dev-credentials');
      if (savedCredentials) {
        try {
          const { email: savedEmail, password: savedPassword, name: savedName } = JSON.parse(savedCredentials);
          setEmail(savedEmail || '');
          setPassword(savedPassword || '');
          setName(savedName || '');
        } catch (error) {
          console.log('No saved credentials found');
        }
      }
      
      // Only enable dev mode in development environment
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           process.env.EXPO_PUBLIC_ENV === 'development' ||
                           window.location.hostname === 'localhost' ||
                           window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // Check if we're in dev mode (you can set this in localStorage or URL params)
        const devMode = localStorage.getItem('toki-dev-mode') === 'true' || window.location.search.includes('dev=true');
        setIsDevMode(devMode);
      } else {
        // Always disable dev mode in production
        setIsDevMode(false);
      }
    }
  }, []);

  // Save credentials to localStorage
  const saveCredentials = (email: string, password: string, name?: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('toki-dev-credentials', JSON.stringify({ email, password, name }));
    }
  };

  // Quick login for dev users
  const quickLogin = (user: typeof DEV_USERS[0]) => {
    setEmail(user.email);
    setPassword(user.password);
    if (!isLogin) {
      setName(user.name);
    }
    saveCredentials(user.email, user.password, user.name);
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous error messages
    try {
      {
        const response = await apiService.login({ email, password });
        if (response.success) {
          // Save credentials for dev environment
          saveCredentials(email, password, name);
          
          // Convert API user to frontend user format
          const user = {
            ...response.data.user,
            rating: parseFloat(response.data.user.rating) || 0,
            tokisCreated: 0,
            tokisJoined: 0,
            connections: 0,
          };
          
          // Update the app state with the authenticated user
          dispatch({ type: 'UPDATE_CURRENT_USER', payload: user });
          
          // Load all data BEFORE redirecting for instant experience
          console.log('🚀 Loading data after login...');
          setLoadingData(true); // Show data loading state
          
          try {
            // Load user data in parallel for speed
            const [userData, tokisData] = await Promise.all([
              apiService.getCurrentUser(),
              apiService.getTokis()
            ]);
            
            // Update user with real stats
            const updatedUser = {
              ...user,
              tokisCreated: userData.stats?.tokis_created || 0,
              tokisJoined: userData.stats?.tokis_joined || 0,
              connections: userData.stats?.connections_count || 0,
            };
            
            dispatch({ type: 'UPDATE_CURRENT_USER', payload: updatedUser });
            
            // Transform API Tokis to frontend format
            const transformedTokis = tokisData.tokis.map((apiToki: any) => ({
              id: apiToki.id,
              title: apiToki.title,
              description: apiToki.description,
              location: apiToki.location,
              time: apiToki.timeSlot || 'TBD',
              attendees: apiToki.currentAttendees || 0,
              maxAttendees: apiToki.maxAttendees || 10,
              tags: apiToki.tags || [apiToki.category],
              host: {
                id: apiToki.host.id,
                name: apiToki.host.name,
                avatar: apiToki.host.avatar || '',
              },
              image: apiToki.imageUrl || '',
              distance: apiToki.distance ? `${apiToki.distance.km} km` : '0.0 km',
              isHostedByUser: apiToki.host.id === updatedUser.id,
              joinStatus: apiToki.joinStatus || 'not_joined',
              visibility: apiToki.visibility,
              category: apiToki.category,
              createdAt: apiToki.createdAt,
              latitude: apiToki.latitude,
              longitude: apiToki.longitude,
            }));
            
            dispatch({ type: 'SET_TOKIS', payload: transformedTokis });
            
            console.log('✅ Data loaded successfully, redirecting...');
            // Now redirect with all data loaded
            if (returnTo === 'join' && code) {
              router.replace(`/join/${code}`);
            } else {
              router.replace('/(tabs)');
            }
          } catch (dataError) {
            console.error('⚠️ Data loading failed, redirecting anyway:', dataError);
            // Still redirect even if data loading fails
            if (returnTo === 'join' && code) {
              router.replace(`/join/${code}`);
            } else {
              router.replace('/(tabs)');
            }
          } finally {
            setLoadingData(false);
          }
        } else {
          setErrorMessage(response.message || 'Login failed');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Check if it's a 401 error (incorrect credentials)
      if (error && typeof error === 'object' && 'status' in error && (error as any).status === 401) {
        setErrorMessage('Incorrect email or password. Please check your credentials and try again.');
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Check if the error message indicates authentication failure
        const errorMsg = (error as any).message.toLowerCase();
        if (errorMsg.includes('invalid credentials') || 
            errorMsg.includes('authentication failed') ||
            errorMsg.includes('unauthorized')) {
          setErrorMessage('Incorrect email or password. Please check your credentials and try again.');
        } else {
          setErrorMessage((error as any).message || 'Authentication failed. Please try again.');
        }
      } else {
        setErrorMessage('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <Text style={styles.title}>Toki</Text>
              <Text style={styles.subtitle}>Welcome back!</Text>

              <View style={styles.form}>
                {/* Registration removed */}

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  autoCorrect={false}
                  returnKeyType="next"
                  {...(Platform.OS === 'web' ? { nativeID: 'email', 'data-testid': 'email-input' } : { 'data-testid': 'email-input' })}
                  onSubmitEditing={() => {
                    // Focus on password field when email is submitted
                    // This will be handled by the password input's ref
                  }}
                />

                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    textContentType={isLogin ? "password" : "newPassword"}
                    autoCorrect={false}
                    onSubmitEditing={handleAuth}
                    returnKeyType="done"
                    {...(Platform.OS === 'web' ? { nativeID: 'password', 'data-testid': 'password-input' } : { 'data-testid': 'password-input' })}
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

                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, (loading || loadingData) && styles.buttonDisabled]}
                  onPress={handleAuth}
                  disabled={loading || loadingData}
                  data-testid="login-button"
                >
                  <Text style={styles.buttonText}>{loading ? 'Logging in...' : loadingData ? 'Loading your data...' : 'Login'}</Text>
                </TouchableOpacity>
                
                {loadingData && (
                  <Text style={styles.loadingMessage}>
                    🚀 Loading your Tokis, connections, and profile data...
                  </Text>
                )}

                {/* Switch removed; waitlist CTA is below */}
              </View>

              {/* Dev Mode Quick Login */}
              {isDevMode && (
                <View style={styles.devModeContainer}>
                  <Text style={styles.devModeTitle}>🚀 Dev Mode - Quick Login</Text>
                  <View style={styles.devUsersContainer}>
                    {DEV_USERS.map((user, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.devUserButton}
                        onPress={() => quickLogin(user)}
                      >
                        <Text style={styles.devUserText}>
                          {user.name.split(' ')[0]} ({user.email})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.toggleDevModeButton}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        localStorage.setItem('toki-dev-mode', 'false');
                        setIsDevMode(false);
                      }
                    }}
                  >
                    <Text style={styles.toggleDevModeText}>Hide Dev Mode</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Show Dev Mode Button - Only in development */}
              {!isDevMode && Platform.OS === 'web' && (
                process.env.NODE_ENV === 'development' || 
                process.env.EXPO_PUBLIC_ENV === 'development' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
              ) && (
                <TouchableOpacity
                  style={styles.showDevModeButton}
                  onPress={() => {
                    localStorage.setItem('toki-dev-mode', 'true');
                    setIsDevMode(true);
                  }}
                >
                  <Text style={styles.showDevModeText}>🔧 Show Dev Mode</Text>
                </TouchableOpacity>
              )}

              <View style={styles.footer}>
                <Text style={styles.footerText}>Connect with people around you</Text>
                <TouchableOpacity
                  style={styles.waitlistButton}
                  onPress={() => router.push('/waitlist')}
                >
                  <Text style={styles.waitlistButtonText}>Join the Waitlist</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: 'black',
    opacity: 0.9,
    marginBottom: 40,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 350,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    minHeight: 56,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: 'black',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: 'black',
    opacity: 0.8,
    fontSize: 14,
    textAlign: 'center',
  },
  waitlistButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  waitlistButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  loadingMessage: {
    color: '#8B5CF6',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.8,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  devModeContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  devModeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 12,
  },
  devUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  devUserButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 2,
  },
  devUserText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  toggleDevModeButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  toggleDevModeText: {
    color: '#666',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  showDevModeButton: {
    marginTop: 20,
    alignItems: 'center',
    padding: 8,
  },
  showDevModeText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
}); 
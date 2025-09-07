import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false); // New state for data loading
  const [errorMessage, setErrorMessage] = useState(''); // New state for error messages
  const { dispatch } = useApp();
  const router = useRouter();

  const handleAuth = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    setErrorMessage(''); // Clear any previous error messages
    try {
      if (isLogin) {
        const response = await apiService.login({ email, password });
        if (response.success) {
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
            router.replace('/(tabs)');
          } catch (dataError) {
            console.error('⚠️ Data loading failed, redirecting anyway:', dataError);
            // Still redirect even if data loading fails
            router.replace('/(tabs)');
          } finally {
            setLoadingData(false);
          }
        } else {
          setErrorMessage(response.message || 'Login failed');
        }
      } else {
        const response = await apiService.register({ name, email, password });
        if (response.success) {
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
          
          // For registration, redirect immediately (user won't have data yet)
          router.replace('/(tabs)');
        } else {
          setErrorMessage(response.message || 'Registration failed');
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
              <Text style={styles.subtitle}>
                {isLogin ? 'Welcome back!' : 'Join the community'}
              </Text>

              <View style={styles.form}>
                {!isLogin && (
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />

                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="password"
                />

                {errorMessage ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.button, (loading || loadingData) && styles.buttonDisabled]}
                  onPress={handleAuth}
                  disabled={loading || loadingData}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Logging in...' : 
                     loadingData ? 'Loading your data...' : 
                     (isLogin ? 'Login' : 'Register')}
                  </Text>
                </TouchableOpacity>
                
                {loadingData && (
                  <Text style={styles.loadingMessage}>
                    🚀 Loading your Tokis, connections, and profile data...
                  </Text>
                )}

                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => {
                    setIsLogin(!isLogin);
                    setName('');
                    setEmail('');
                    setPassword('');
                    setErrorMessage(''); // Clear error message when switching modes
                  }}
                >
                  <Text style={styles.switchText}>
                    {isLogin
                      ? "Don't have an account? Register"
                      : 'Already have an account? Login'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Connect with people around you
                </Text>
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
}); 
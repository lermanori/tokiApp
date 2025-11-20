import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { apiService } from '../services/api';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.forgotPassword(email);
      // Always show success for security (don't reveal if email exists)
      setEmailSent(true);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      // Still show success for security
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.content}>
              <View style={styles.card}>
                {emailSent ? (
                  <>
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.subtitle}>
                      If an account exists for {email}, a password reset link has been sent.
                    </Text>
                    <Text style={styles.helpText}>
                      Please check your inbox and follow the instructions to reset your password.
                    </Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => router.replace('/login')}
                    >
                      <Text style={styles.buttonText}>Back to Login</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>Forgot Password?</Text>
                    <Text style={styles.subtitle}>
                      Enter your email address and we'll send you a link to reset your password.
                    </Text>

                    <View style={styles.form}>
                      <Text style={styles.label}>Email</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        textContentType="emailAddress"
                        autoCorrect={false}
                        returnKeyType="send"
                        onSubmitEditing={handleForgotPassword}
                        editable={!loading}
                      />

                      <TouchableOpacity
                        style={[styles.button, (loading || !email || !email.includes('@')) && styles.buttonDisabled]}
                        onPress={handleForgotPassword}
                        disabled={loading || !email || !email.includes('@')}
                      >
                        {loading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text style={styles.buttonText}>Send Reset Link</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                      >
                        <Text style={styles.backButtonText}>Back to Login</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
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
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 40,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    minHeight: 48,
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: '#8B5CF6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  backButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textDecorationLine: 'underline',
  },
});



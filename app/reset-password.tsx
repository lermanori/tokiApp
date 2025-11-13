import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBackendUrl } from '../services/config';

export default function ResetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorState, setErrorState] = useState<{ type: string; message: string } | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const disabled = useMemo(() => {
    return !token || !password || password.length < 6 || password !== confirm || loading;
  }, [token, password, confirm, loading]);

  const onSubmit = async () => {
    if (!token) {
      Alert.alert('Missing token', 'The link is invalid. Please request a new one.');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Please re-enter your password.');
      return;
    }
    try {
      setLoading(true);
      const resp = await fetch(`${getBackendUrl()}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        if (data?.error === 'Reset token expired' || data?.error === 'Invalid reset token' || 
            data?.message?.toLowerCase().includes('expired') || 
            data?.message?.toLowerCase().includes('invalid')) {
          setErrorState({
            type: 'Reset token expired',
            message: data?.message || 'The reset token has expired or is invalid. Please request a new one.'
          });
        } else {
          throw new Error(data?.message || 'Failed to reset password');
        }
        return;
      }
      // Success - automatically redirect to login
      router.replace('/login');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    try {
      setResendLoading(true);
      const resp = await fetch(`${getBackendUrl()}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to send link');
      }
      setResendSuccess(true);
      setErrorState(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send link. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  if (errorState && errorState.type === 'Reset token expired') {
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
                  <Text style={styles.title}>Link Expired</Text>
                  <Text style={styles.subtitle}>
                    {errorState.message}
                  </Text>

                  {resendSuccess ? (
                    <View style={styles.successContainer}>
                      <Text style={styles.successText}>
                        A new password reset link has been sent to your email. Please check your inbox.
                      </Text>
                      <TouchableOpacity
                        style={styles.button}
                        onPress={() => router.replace('/login')}
                      >
                        <Text style={styles.buttonText}>Back to Login</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.label}>Email address</Text>
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        placeholder="Enter your email"
                        style={styles.input}
                      />
                      <TouchableOpacity
                        disabled={resendLoading || !email || !email.includes('@')}
                        onPress={handleResendLink}
                        style={[styles.button, (resendLoading || !email || !email.includes('@')) && styles.buttonDisabled]}
                      >
                        {resendLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.buttonText}>Send New Link</Text>
                        )}
                      </TouchableOpacity>
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
                <Text style={styles.title}>Reset your password</Text>
                <Text style={styles.subtitle}>
                  Choose a strong password with at least 6 characters.
                </Text>

                <View style={styles.form}>
                  <Text style={styles.label}>New password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Enter new password"
                    style={styles.input}
                  />

                  <Text style={styles.label}>Confirm password</Text>
                  <TextInput
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="Re-enter password"
                    style={styles.input}
                  />

                  <TouchableOpacity
                    disabled={disabled}
                    onPress={onSubmit}
                    style={[styles.button, disabled && styles.buttonDisabled]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.buttonText}>Reset Password</Text>
                    )}
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
    marginBottom: 16,
    minHeight: 48,
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  successContainer: {
    marginTop: 16,
  },
  successText: {
    color: '#059669',
    marginBottom: 16,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});


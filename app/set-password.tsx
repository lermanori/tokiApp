import { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { getBackendUrl } from '../services/config';

export default function SetPassword() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

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
        throw new Error(data?.message || 'Failed to set password');
      }
      Alert.alert('Success', 'Your password has been set. Please log in.', [
        { text: 'OK', onPress: () => router.replace('/login') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '600', marginBottom: 12 }}>Set your password</Text>
      <Text style={{ color: '#6B7280', marginBottom: 24 }}>
        Choose a strong password with at least 6 characters.
      </Text>

      <Text style={{ marginBottom: 8 }}>New password</Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Enter new password"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          marginBottom: 16,
        }}
      />

      <Text style={{ marginBottom: 8 }}>Confirm password</Text>
      <TextInput
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="Re-enter password"
        style={{
          borderWidth: 1,
          borderColor: '#D1D5DB',
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          marginBottom: 24,
        }}
      />

      <TouchableOpacity
        disabled={disabled}
        onPress={onSubmit}
        style={{
          backgroundColor: disabled ? '#E5E7EB' : '#111827',
          paddingVertical: 14,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontWeight: '600' }}>Set Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}



import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WaitlistFormWeb from '@/components/WaitlistForm.web';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiService } from '@/services/api';

export default function WaitlistScreen() {
  const [email, setEmail] = useState('');
  const [dialCode, setDialCode] = useState('+972');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !email.includes('@')) { Alert.alert('Invalid email'); return; }
    setLoading(true);
    try {
      await apiService.joinWaitlist({
        email: email.trim(),
        phone: phone ? `${dialCode} ${phone}` : null,
        location: location || null,
        reason: reason || null,
        platform: Platform.OS,
      });
      Alert.alert('Thanks!', 'You are on the waitlist.');
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to submit');
    } finally {
      setLoading(false);
    }
  };

  // On web, reuse the marketing WaitlistForm component directly
  if (Platform.OS === 'web') {
    return <WaitlistFormWeb />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['rgb(255, 241, 235)', 'rgb(243, 231, 255)', 'rgb(229, 220, 255)']} style={styles.gradient}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 6 }}>
              <ArrowLeft size={24} color="#1C1C1C" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Join the Waitlist</Text>
            <View style={{ width: 24 }} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>We’re in private beta. Leave your details and we’ll invite you soon.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@email.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.phoneField}>
          <Text style={styles.label}>Phone</Text>
          <View style={styles.phoneContainer}>
            <TextInput 
              style={styles.countryCodeInput} 
              value={dialCode} 
              onChangeText={setDialCode} 
              placeholder="+972" 
              placeholderTextColor="#9CA3AF" 
            />
            <TextInput 
              style={styles.phoneNumberInput} 
              value={phone} 
              onChangeText={setPhone} 
              placeholder="508740985" 
              keyboardType="phone-pad" 
              placeholderTextColor="#9CA3AF" 
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Tel Aviv, Lisbon, NYC..." placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Why Toki? (optional)</Text>
          <TextInput style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]} value={reason} onChangeText={setReason} multiline placeholder="Tell us why you belong to Toki" placeholderTextColor="#9CA3AF" />
        </View>

        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Join The Waitlist</Text>}
        </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: '#1C1C1C' },
  content: { padding: 20, gap: 16 },
  subtitle: { fontSize: 14, color: '#6B7280', fontFamily: 'Inter-Regular' },
  field: { gap: 6 },
  phoneField: { gap: 6 },
  label: { fontSize: 14, color: '#374151', fontFamily: 'Inter-Medium' },
  input: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#111827', fontFamily: 'Inter-Regular' },
  phoneContainer: { 
    flexDirection: 'row', 
    gap: 8,
    alignItems: 'center',
  },
  countryCodeInput: { 
    backgroundColor: '#F3F4F6', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    color: '#111827', 
    fontFamily: 'Inter-Regular',
    minWidth: 80,
    maxWidth: 100,
    flex: 0,
    overflow: 'hidden',
  },
  phoneNumberInput: { 
    backgroundColor: '#F3F4F6', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    color: '#111827', 
    fontFamily: 'Inter-Regular',
    flex: 1,
    overflow: 'hidden',
  },
  button: { backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter-SemiBold' },
});



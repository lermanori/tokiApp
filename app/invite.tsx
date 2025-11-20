import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { apiService } from '@/services/api';
import { useApp } from '@/contexts/AppContext';
import { ArrowLeft } from 'lucide-react-native';

interface Invitation {
  id: string;
  invitee_email: string;
  invitation_code: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
  accepted_at?: string;
  accepted_user_name?: string;
}

export default function InviteScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState(0);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [loadingInvitations, setLoadingInvitations] = useState(true);
  const { state } = useApp();

  useEffect(() => {
    loadCredits();
    loadInvitations();
  }, []);

  const loadCredits = async () => {
    try {
      setLoadingCredits(true);
      const response = await apiService.getInvitationCredits();
      if (response.success) {
        setCredits(response.data.credits);
      }
    } catch (error: any) {
      console.error('Error loading credits:', error);
    } finally {
      setLoadingCredits(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setLoadingInvitations(true);
      const response = await apiService.getInvitations();
      if (response.success) {
        setInvitations(response.data);
      }
    } catch (error: any) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleSendInvite = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (credits <= 0) {
      Alert.alert('No Credits', 'You have no invitation credits remaining. Contact support for more.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.sendInvitation(email);
      
      if (response.success) {
        Alert.alert('Success', `Invitation sent to ${email}!`);
        setEmail('');
        loadCredits();
        loadInvitations();
      } else {
        Alert.alert('Error', 'Failed to send invitation');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return '#10B981';
      case 'expired':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'accepted':
        return '✓ Accepted';
      case 'expired':
        return '✗ Expired';
      default:
        return 'Pending';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1C1C1C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Friends</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.creditsCard}>
          <Text style={styles.creditsLabel}>Invitation Credits</Text>
          {loadingCredits ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Text style={styles.creditsValue}>{credits}</Text>
          )}
          <Text style={styles.creditsSubtext}>
            {credits === 0 
              ? 'You have no credits remaining'
              : `You can invite ${credits} more ${credits === 1 ? 'person' : 'people'}`
            }
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="friend@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity
            style={[styles.button, (loading || credits <= 0) && styles.buttonDisabled]}
            onPress={handleSendInvite}
            disabled={loading || credits <= 0}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Send Invitation</Text>
            )}
          </TouchableOpacity>
        </View>

        {loadingInvitations ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={styles.loadingText}>Loading invitations...</Text>
          </View>
        ) : invitations.length > 0 ? (
          <View style={styles.invitationsList}>
            <Text style={styles.sectionTitle}>Sent Invitations</Text>
            {invitations.map((inv) => (
              <View key={inv.id} style={styles.invitationItem}>
                <View style={styles.invitationContent}>
                  <Text style={styles.invitationEmail}>{inv.invitee_email}</Text>
                  <Text style={styles.invitationDate}>
                    Sent {formatDate(inv.created_at)}
                  </Text>
                  {inv.status === 'accepted' && inv.accepted_user_name && (
                    <Text style={styles.acceptedText}>
                      Accepted by {inv.accepted_user_name}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inv.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(inv.status) }]}>
                    {getStatusText(inv.status)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No invitations sent yet</Text>
            <Text style={styles.emptySubtext}>Start inviting friends to join Toki!</Text>
          </View>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  creditsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  creditsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  creditsValue: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  creditsSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    color: '#1C1C1C',
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  invitationsList: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  invitationItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invitationContent: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  acceptedText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#10B981',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});


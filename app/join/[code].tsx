import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { Link, Users, MapPin, Clock, User } from 'lucide-react-native';

export default function JoinByCode() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { actions, state } = useApp();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [tokiDetails, setTokiDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  console.log('🔗 JoinByCode component loaded with code:', code);

  useEffect(() => {
    console.log('🔗 useEffect triggered with code:', code, 'user:', state.currentUser?.id);
    loadLinkInfo();
  }, [code, state.currentUser?.id]);

  const normalizeToki = (raw: any) => {
    if (!raw) return null;
    return {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      location: raw.location,
      scheduledTime: raw.scheduledTime ?? raw.scheduled_time ?? raw.time ?? null,
      currentAttendees: raw.currentAttendees ?? raw.current_attendees ?? raw.attendees ?? 0,
      maxAttendees: raw.maxAttendees ?? raw.max_attendees ?? raw.capacity ?? 10,
      imageUrl: raw.imageUrl ?? raw.image_url ?? null,
      host_id: raw.host_id ?? raw.host?.id ?? null,
    };
  };

  const loadLinkInfo = async () => {
    if (!code) {
      setError('Invalid invite code');
      setLoading(false);
      return;
    }

    // If user is not logged in, redirect to login first
    if (!state.currentUser?.id) {
      router.replace(`/login?returnTo=join&code=${code}`);
      return;
    }

    try {
      setLoading(true);
      const info = await actions.getInviteLinkInfo(code);
      
      if (info && info.isActive) {
        const normalized = { ...info, toki: normalizeToki(info.toki) };
        setLinkInfo(normalized);
        setError(null);
        
        // Load full details and check participant status
        try {
          const full = await actions.getTokiById?.(normalized.toki.id);
          if (full) setTokiDetails(normalizeToki(full));
          
          // Check if current user is the host
          if (normalized.toki?.host_id === state.currentUser.id) {
            // Host should go directly to event page
            router.replace(`/toki-details?tokiId=${normalized.toki.id}`);
            return;
          }
          
          // Check if current user is already a participant
          const isAlreadyIn =
            (full && full.joinStatus && (full.joinStatus === 'joined' || full.joinStatus === 'approved')) ||
            (Array.isArray(full?.participants) && full.participants.some((p: any) => (p.user?.id || p.id) === state.currentUser?.id));

          if (isAlreadyIn) {
            // User is already a participant, go to event page
            router.replace(`/toki-details?tokiId=${normalized.toki.id}`);
            return;
          }
        } catch (e: any) {
          if (e?.isAuthError || e?.status === 401) {
            router.replace(`/login?returnTo=join&code=${code}`);
            return;
          }
          console.log('⚠️ Could not load full toki details for join page');
        }
      } else {
        setError('This invite link is no longer active');
      }
    } catch (err: any) {
      // Handle invalid invite codes without redirecting to login
      if (err?.message?.includes('Invalid') || err?.message?.includes('not found') || err?.status === 404) {
        setError('Invalid invite code. Please check the link and try again.');
        setLoading(false);
        return;
      }
      
      if (err?.isAuthError || err?.status === 401) {
        router.replace(`/login?returnTo=join&code=${code}`);
        return;
      }
      console.error('Failed to load invite link info:', err);
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code || !state.currentUser?.id) {
      router.replace(`/login?returnTo=join&code=${code}`);
      return;
    }

    try {
      setJoining(true);
      const success = await actions.joinByInviteCode(code);
      
      if (success) {
        // Redirect directly to event page after successful join
        if (linkInfo?.toki?.id) {
          router.replace(`/toki-details?tokiId=${linkInfo.toki.id}`);
        } else {
          router.replace('/(tabs)');
        }
      } else {
        console.error('Failed to join the event');
      }
    } catch (err: any) {
      if (err?.isAuthError || err?.status === 401) {
        router.replace(`/login?returnTo=join&code=${code}`);
        return;
      }
      console.error('Failed to join event:', err);
    } finally {
      setJoining(false);
    }
  };


  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Join Event</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.backButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!linkInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorMessage}>This invite link is invalid or expired.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
            <Text style={styles.backButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { toki, host, inviteLink } = linkInfo;
  // Prefer richer details from tokiDetails when available
  const display = {
    title: tokiDetails?.title ?? toki?.title,
    description: tokiDetails?.description ?? toki?.description,
    location: tokiDetails?.location ?? toki?.location,
    scheduledTime: tokiDetails?.scheduledTime ?? toki?.scheduledTime,
    currentAttendees: tokiDetails?.currentAttendees ?? toki?.currentAttendees,
    maxAttendees: tokiDetails?.maxAttendees ?? toki?.maxAttendees,
    id: tokiDetails?.id ?? toki?.id,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join Event</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{display.title}</Text>
          
          {display.description && (
            <Text style={styles.eventDescription}>{display.description}</Text>
          )}

          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#666666" />
              <Text style={styles.detailText}>{display.location || 'Location TBD'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Clock size={16} color="#666666" />
              <Text style={styles.detailText}>
                {display.scheduledTime ? new Date(display.scheduledTime).toLocaleString() : 'Time TBD'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Users size={16} color="#666666" />
              <Text style={styles.detailText}>
                {(display.currentAttendees ?? 0)} / {(display.maxAttendees ?? 10)} attendees
              </Text>
            </View>
          </View>

          <View style={styles.hostSection}>
            <Text style={styles.hostLabel}>Hosted by</Text>
            <View style={styles.hostInfo}>
              {host.avatar ? (
                <View style={styles.hostAvatar}>
                  <Text style={styles.hostAvatarText}>
                    {host.name?.charAt(0)?.toUpperCase() || 'H'}
                  </Text>
                </View>
              ) : (
                <User size={20} color="#8B5CF6" />
              )}
              <Text style={styles.hostName}>{host.name}</Text>
            </View>
          </View>

          {inviteLink.customMessage && (
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>Message from host:</Text>
              <Text style={styles.messageText}>"{inviteLink.customMessage}"</Text>
            </View>
          )}

          {inviteLink.maxUses && (
            <View style={styles.usageInfo}>
              <Text style={styles.usageText}>
                {inviteLink.usedCount} of {inviteLink.maxUses} spots used
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.joinButton, joining && styles.joinButtonDisabled]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Link size={20} color="#FFFFFF" />
            )}
            <Text style={styles.joinButtonText}>
              {joining ? 'Joining...' : 'Join Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginLeft: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#8B5CF6',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 12,
  },
  eventDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginBottom: 20,
    lineHeight: 24,
  },
  eventDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    marginLeft: 12,
  },
  hostSection: {
    marginBottom: 20,
  },
  hostLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostAvatarText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  hostName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1C1C1C',
  },
  messageSection: {
    backgroundColor: '#F3F0FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    fontStyle: 'italic',
  },
  usageInfo: {
    alignItems: 'center',
  },
  usageText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  actionSection: {
    paddingTop: 20,
  },
  joinButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonDisabled: {
    opacity: 0.6,
  },
  joinButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

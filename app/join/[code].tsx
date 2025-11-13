import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { apiService } from '@/services/api';
import { getInitials } from '@/utils/tokiUtils';
import { Link, Users, MapPin, Clock } from 'lucide-react-native';

export default function JoinByCode() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { actions, state } = useApp();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [tokiDetails, setTokiDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  console.log('🔗 [JOIN FLOW] Component mounted with code:', code);
  console.log('🔗 [JOIN FLOW] Current user:', state.currentUser?.id ? `ID: ${state.currentUser.id}` : 'Not logged in');
  console.log('🔗 [JOIN FLOW] Current state - loading:', loading, 'joining:', joining, 'hasLinkInfo:', !!linkInfo, 'error:', error);

  useEffect(() => {
    console.log('🔗 [JOIN FLOW] useEffect triggered');
    console.log('🔗 [JOIN FLOW] Dependencies - code:', code, 'user ID:', state.currentUser?.id);
    loadLinkInfo();
  }, [code, state.currentUser?.id]);

  useEffect(() => {
    console.log('🔗 [JOIN FLOW] Component mounted');
    return () => {
      console.log('🔗 [JOIN FLOW] Component unmounting');
    };
  }, []);

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
    console.log('🔗 [JOIN FLOW] loadLinkInfo called');
    console.log('🔗 [JOIN FLOW] Code:', code);
    console.log('🔗 [JOIN FLOW] Current user ID:', state.currentUser?.id);
    console.log('🔗 [JOIN FLOW] Has tokens:', apiService.hasToken());
    
    if (!code) {
      console.log('🔗 [JOIN FLOW] ❌ No code provided, setting error');
      setError('Invalid invite code');
      setLoading(false);
      return;
    }

    // Check both user state and tokens - if tokens exist but user state not loaded yet, wait a bit
    const hasTokens = apiService.hasToken();
    const hasUserData = !!state.currentUser?.id;
    
    console.log('🔗 [JOIN FLOW] Auth check:', { hasTokens, hasUserData });
    
    if (!hasUserData && !hasTokens) {
      console.log('🔗 [JOIN FLOW] ⚠️ User not logged in and no tokens, redirecting to login');
      console.log('🔗 [JOIN FLOW] Redirect URL: /login?returnTo=join&code=' + code);
      router.replace(`/login?returnTo=join&code=${code}`);
      return;
    }
    
    // If we have tokens but user data isn't loaded yet, wait a moment for state to sync
    if (hasTokens && !hasUserData) {
      console.log('🔗 [JOIN FLOW] ⚠️ Has tokens but user data not loaded yet, waiting for state sync...');
      // Give it a moment for the user state to load from storage/API
      setTimeout(() => {
        if (state.currentUser?.id) {
          console.log('🔗 [JOIN FLOW] ✅ User state loaded, proceeding');
        } else {
          console.log('🔗 [JOIN FLOW] ⚠️ User state still not loaded, proceeding with token auth');
        }
        // Proceed anyway - the API call will work with tokens
        proceedWithLoadLinkInfo();
      }, 300);
      return;
    }
    
    proceedWithLoadLinkInfo();
  };
  
  const proceedWithLoadLinkInfo = async () => {
    console.log('🔗 [JOIN FLOW] ✅ User is authenticated (has user data or tokens), proceeding to load link info');
    try {
      setLoading(true);
      console.log('🔗 [JOIN FLOW] Calling getInviteLinkInfo with code:', code);
      const info = await actions.getInviteLinkInfo(code);
      console.log('🔗 [JOIN FLOW] Received invite link info:', {
        hasInfo: !!info,
        isActive: info?.isActive,
        hasToki: !!info?.toki,
        tokiId: info?.toki?.id,
        tokiTitle: info?.toki?.title
      });
      
      if (info && info.isActive) {
        console.log('🔗 [JOIN FLOW] ✅ Invite link is active');
        const normalized = { ...info, toki: normalizeToki(info.toki) };
        console.log('🔗 [JOIN FLOW] Normalized toki:', {
          id: normalized.toki?.id,
          title: normalized.toki?.title,
          host_id: normalized.toki?.host_id
        });
        setLinkInfo(normalized);
        setError(null);
        
        // Load full details and check participant status
        try {
          console.log('🔗 [JOIN FLOW] Loading full toki details for ID:', normalized.toki.id);
          const full = await actions.getTokiById?.(normalized.toki.id);
          console.log('🔗 [JOIN FLOW] Full toki details received:', {
            hasFull: !!full,
            joinStatus: full?.joinStatus,
            participantsCount: Array.isArray(full?.participants) ? full.participants.length : 0
          });
          if (full) setTokiDetails(normalizeToki(full));
          
          // Check if current user is the host
          if (normalized.toki?.host_id === state.currentUser?.id) {
            console.log('🔗 [JOIN FLOW] 🎯 User is the host, redirecting to toki-details');
            console.log('🔗 [JOIN FLOW] Redirect URL: /toki-details?tokiId=' + normalized.toki.id);
            router.replace(`/toki-details?tokiId=${normalized.toki.id}`);
            return;
          }
          
          // Check if current user is already a participant
          const isAlreadyIn =
            (full && full.joinStatus && (full.joinStatus === 'joined' || full.joinStatus === 'approved')) ||
            (Array.isArray(full?.participants) && full.participants.some((p: any) => (p.user?.id || p.id) === state.currentUser?.id));

          console.log('🔗 [JOIN FLOW] Checking if user is already a participant:', {
            isAlreadyIn,
            joinStatus: full?.joinStatus,
            checkedParticipants: Array.isArray(full?.participants) ? full.participants.map((p: any) => ({ id: p.user?.id || p.id, name: p.user?.name || p.name })) : []
          });

          if (isAlreadyIn) {
            console.log('🔗 [JOIN FLOW] ✅ User is already a participant, redirecting to toki-details');
            console.log('🔗 [JOIN FLOW] Redirect URL: /toki-details?tokiId=' + normalized.toki.id);
            router.replace(`/toki-details?tokiId=${normalized.toki.id}`);
            return;
          }
          
          console.log('🔗 [JOIN FLOW] ✅ User is not a participant yet, showing join UI');
        } catch (e: any) {
          console.log('🔗 [JOIN FLOW] ⚠️ Error loading full toki details:', {
            isAuthError: e?.isAuthError,
            status: e?.status,
            message: e?.message
          });
          if (e?.isAuthError || e?.status === 401) {
            console.log('🔗 [JOIN FLOW] ⚠️ Auth error, redirecting to login');
            router.replace(`/login?returnTo=join&code=${code}`);
            return;
          }
          console.log('🔗 [JOIN FLOW] ⚠️ Could not load full toki details for join page, continuing with basic info');
        }
      } else {
        console.log('🔗 [JOIN FLOW] ❌ Invite link is not active or missing');
        setError('This invite link is no longer active');
      }
    } catch (err: any) {
      console.log('🔗 [JOIN FLOW] ❌ Error in proceedWithLoadLinkInfo:', {
        message: err?.message,
        status: err?.status,
        isAuthError: err?.isAuthError,
        error: err
      });
      
      // Handle invalid invite codes without redirecting to login
      if (err?.message?.includes('Invalid') || err?.message?.includes('not found') || err?.status === 404) {
        console.log('🔗 [JOIN FLOW] ❌ Invalid invite code (404 or not found)');
        setError('Invalid invite code. Please check the link and try again.');
        setLoading(false);
        return;
      }
      
      if (err?.isAuthError || err?.status === 401) {
        console.log('🔗 [JOIN FLOW] ⚠️ Auth error (401), redirecting to login');
        router.replace(`/login?returnTo=join&code=${code}`);
        return;
      }
      console.error('🔗 [JOIN FLOW] ❌ Failed to load invite link info:', err);
      setError('Failed to load event details');
    } finally {
      console.log('🔗 [JOIN FLOW] proceedWithLoadLinkInfo completed, setting loading to false');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    console.log('🔗 [JOIN FLOW] handleJoin called');
    console.log('🔗 [JOIN FLOW] Code:', code, 'User ID:', state.currentUser?.id);
    console.log('🔗 [JOIN FLOW] Link info:', {
      hasLinkInfo: !!linkInfo,
      tokiId: linkInfo?.toki?.id
    });
    
    if (!code || !state.currentUser?.id) {
      console.log('🔗 [JOIN FLOW] ❌ Missing code or user ID, redirecting to login');
      router.replace(`/login?returnTo=join&code=${code}`);
      return;
    }

    try {
      console.log('🔗 [JOIN FLOW] Setting joining state to true');
      setJoining(true);
      console.log('🔗 [JOIN FLOW] Calling joinByInviteCode with code:', code);
      const success = await actions.joinByInviteCode(code);
      console.log('🔗 [JOIN FLOW] Join result:', { success });
      
      if (success) {
        console.log('🔗 [JOIN FLOW] ✅ Successfully joined event');
        // Redirect directly to event page after successful join
        if (linkInfo?.toki?.id) {
          console.log('🔗 [JOIN FLOW] Redirecting to toki-details with ID:', linkInfo.toki.id);
          router.replace(`/toki-details?tokiId=${linkInfo.toki.id}`);
        } else {
          console.log('🔗 [JOIN FLOW] ⚠️ No toki ID in linkInfo, redirecting to tabs');
          router.replace('/(tabs)');
        }
      } else {
        console.error('🔗 [JOIN FLOW] ❌ Failed to join the event (success = false)');
      }
    } catch (err: any) {
      console.log('🔗 [JOIN FLOW] ❌ Error in handleJoin:', {
        message: err?.message,
        status: err?.status,
        isAuthError: err?.isAuthError,
        error: err
      });
      if (err?.isAuthError || err?.status === 401) {
        console.log('🔗 [JOIN FLOW] ⚠️ Auth error (401), redirecting to login');
        router.replace(`/login?returnTo=join&code=${code}`);
        return;
      }
      console.error('🔗 [JOIN FLOW] ❌ Failed to join event:', err);
    } finally {
      console.log('🔗 [JOIN FLOW] handleJoin completed, setting joining to false');
      setJoining(false);
    }
  };


  if (loading) {
    console.log('🔗 [JOIN FLOW] Rendering loading state');
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
    console.log('🔗 [JOIN FLOW] Rendering error state:', error);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to Join Event</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            console.log('🔗 [JOIN FLOW] Error screen: Navigating to tabs');
            router.push('/(tabs)');
          }}>
            <Text style={styles.backButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!linkInfo) {
    console.log('🔗 [JOIN FLOW] Rendering no linkInfo state');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Event Not Found</Text>
          <Text style={styles.errorMessage}>This invite link is invalid or expired.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => {
            console.log('🔗 [JOIN FLOW] No linkInfo screen: Navigating to tabs');
            router.push('/(tabs)');
          }}>
            <Text style={styles.backButtonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  console.log('🔗 [JOIN FLOW] Rendering join UI with linkInfo:', {
    hasLinkInfo: !!linkInfo,
    tokiId: linkInfo?.toki?.id,
    tokiTitle: linkInfo?.toki?.title,
    hostName: linkInfo?.host?.name
  });

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
              {host?.avatar ? (
                <Image
                  source={{ uri: host.avatar }}
                  style={styles.hostAvatar}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                  <Text style={styles.hostAvatarInitials}>
                    {getInitials(host?.name || 'Host')}
                  </Text>
                </View>
              )}
              <Text style={styles.hostName}>{host?.name || 'Unknown Host'}</Text>
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
    marginRight: 12,
  },
  hostAvatarFallback: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  hostAvatarInitials: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
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

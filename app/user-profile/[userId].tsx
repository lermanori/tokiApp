import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MapPin, Calendar, Users, Heart, MessageCircle, UserPlus, Clock, Instagram, Linkedin, Facebook } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { apiService } from '@/services/api';
import TokiCard from '@/components/TokiCard';
import AppInstallPrompt from '@/components/AppInstallPrompt';

interface ConnectionStatus {
  status: 'none' | 'pending' | 'accepted' | 'declined';
  isRequester: boolean;
  id?: string;
  createdAt?: string;
}

interface PublicUserProfile {
  id: string;
  name: string;
  bio: string;
  location: string;
  avatar: string;
  verified: boolean;
  memberSince: string;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    facebook?: string;
  };
  tokisJoined: number;
  tokisCreated: number;
  connections: number;
  rating: number;
}

export default function UserProfileScreen() {
  const { state, actions } = useApp();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  
  const [userProfile, setUserProfile] = useState<PublicUserProfile | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [publicActivity, setPublicActivity] = useState<any[]>([]);

  // Helper function to get user initials
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Helper function to get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram size={16} color="#E4405F" />;
      case 'linkedin':
        return <Linkedin size={16} color="#0077B5" />;
      case 'facebook':
        return <Facebook size={16} color="#1877F2" />;
      default:
        return null;
    }
  };

  // Fetch user profile and connection status
  useEffect(() => {
    if (userId) {
      loadUserProfile();
      loadConnectionStatus();
      loadPublicActivity();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Loading profile for userId:', userId);
      const profile = await apiService.getUserProfile(userId);
      console.log('🔍 Profile data received:', profile);
      setUserProfile(profile);
    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      Alert.alert('Error', 'Failed to load user profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPublicActivity = async () => {
    try {
      const list = await apiService.getUserActivity(userId);
      setPublicActivity(list);
    } catch (error) {
      console.error('❌ Failed to load public activity:', error);
    }
  };

  const loadConnectionStatus = async () => {
    try {
      // Only try to get connection status if user is authenticated
      if (state.currentUser) {
        const status = await apiService.getConnectionStatus(userId);
        setConnectionStatus(status);
      } else {
        // For non-authenticated users, set default "none" status
        setConnectionStatus({
          status: 'none',
          isRequester: false,
          createdAt: undefined
        });
      }
    } catch (error) {
      console.error('❌ Failed to load connection status:', error);
      // Set default status on error
      setConnectionStatus({
        status: 'none',
        isRequester: false,
        createdAt: undefined
      });
    }
  };

  const handleRequestConnection = async () => {
    if (!userId) return;
    
    try {
      setIsActionLoading(true);
      await apiService.sendConnectionRequest(userId);
      
      // Update local state
      setConnectionStatus({
        status: 'pending',
        isRequester: true,
        createdAt: new Date().toISOString()
      });
      
      Alert.alert('Connection Request Sent', 'Your connection request has been sent successfully!');
    } catch (error) {
      console.error('❌ Failed to send connection request:', error);
      Alert.alert('Error', 'Failed to send connection request. Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!userProfile) return;
    
    // Check if conversation already exists with this user
    const existingConversation = state.conversations?.find(
      (conv: any) => conv.other_user_id === userId
    );
    
    if (existingConversation) {
      // Navigate to existing conversation
      router.push({
        pathname: '/chat',
        params: { 
          conversationId: existingConversation.id,
          otherUserId: userId,
          otherUserName: userProfile.name,
          isGroup: 'false'
        }
      });
    } else {
      // Navigate to new conversation - let chat screen create conversation on first message
      router.push({
        pathname: '/chat',
        params: { 
          otherUserId: userId,
          otherUserName: userProfile.name,
          isGroup: 'false'
        }
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleBlockUser = () => {
    if (!userProfile) return;
    
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${userProfile.name}? This will:\n\n• Remove them from your connections\n• Hide their content from you\n• Prevent them from messaging you\n\nYou can unblock them later from your settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.blockUser(userId);
              Alert.alert('User Blocked', `${userProfile.name} has been blocked successfully.`);
              router.back();
            } catch (error) {
              console.error('❌ Failed to block user:', error);
              Alert.alert('Error', 'Failed to block user. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderActionButton = () => {
    if (!connectionStatus) return null;

    // Self-profile guard: disable actions when viewing your own public profile
    if (state.currentUser?.id && state.currentUser.id === userId) {
      return (
        <TouchableOpacity 
          style={styles.disabledButton} 
          disabled={true}
        >
          <Clock size={20} color="#9CA3AF" />
          <Text style={styles.disabledButtonText}>Your Profile</Text>
        </TouchableOpacity>
      );
    }

    // For non-authenticated users, show login prompt
    if (!state.currentUser) {
      return (
        <TouchableOpacity 
          style={styles.primaryButton} 
          onPress={() => {
            Alert.alert(
              'Login Required',
              'Please log in to connect with other users or send messages.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Go to Login', onPress: () => router.push('/login') }
              ]
            );
          }}
        >
          <UserPlus size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Login to Connect</Text>
        </TouchableOpacity>
      );
    }

    switch (connectionStatus.status) {
      case 'none':
        return (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleRequestConnection}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Request Connection</Text>
              </>
            )}
          </TouchableOpacity>
        );
        
      case 'pending':
        return (
          <TouchableOpacity 
            style={styles.disabledButton} 
            disabled={true}
          >
            <Clock size={20} color="#9CA3AF" />
            <Text style={styles.disabledButtonText}>
              {connectionStatus.isRequester ? 'Request Sent' : 'Request Pending'}
            </Text>
          </TouchableOpacity>
        );
        
      case 'accepted':
        return (
          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={handleSendMessage}
          >
            <MessageCircle size={20} color="#8B5CF6" />
            <Text style={styles.secondaryButtonText}>Send Message</Text>
          </TouchableOpacity>
        );
        
      case 'declined':
        return (
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={handleRequestConnection}
            disabled={isActionLoading}
          >
            {isActionLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <UserPlus size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Request Connection</Text>
              </>
            )}
          </TouchableOpacity>
        );
        
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorDescription}>
            The user profile you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleBack}>
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Get current URL for app install prompt
  const getCurrentUrl = () => {
    if (typeof window !== 'undefined' && window.location?.href) {
      return window.location.href;
    }
    // Fallback: construct URL from userId if available
    if (userId) {
      const baseUrl = 'https://toki-app.com';
      return `${baseUrl}/user-profile/${userId}`;
    }
    return undefined;
  };

  return (
    <>
      <AppInstallPrompt currentUrl={getCurrentUrl()} />
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
          style={styles.header}
        >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ArrowLeft size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          {/* Removed overflow menu for other user profile */}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {userProfile.avatar ? (
                <Image
                  source={{ uri: userProfile.avatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>
                    {getUserInitials(userProfile.name)}
                  </Text>
                </View>
              )}
              {userProfile.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{userProfile.name}</Text>
              <Text style={styles.userBio}>{userProfile.bio}</Text>

              <View style={styles.locationContainer}>
                <MapPin size={14} color="#666666" />
                <Text style={styles.locationText}>{userProfile.location}</Text>
              </View>
              <Text style={styles.memberSince}>
                Member since {userProfile.memberSince ? 
                  new Date(userProfile.memberSince).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                  }) : 
                  'Recently'
                }
              </Text>

              {/* Social Media Links */}
              {Object.keys(userProfile.socialLinks).length > 0 && (
                <View style={styles.socialLinksContainer}>
                  {Object.entries(userProfile.socialLinks).map(([platform, username]) => (
                    username && (
                      <View key={platform} style={styles.socialLink}>
                        {getPlatformIcon(platform)}
                        <Text style={styles.socialUsername}>{username}</Text>
                      </View>
                    )
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actionButtonContainer}>
            {renderActionButton()}
          </View>

          {/* Statistics */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.tokisJoined}</Text>
              <Text style={styles.statLabel}>Tokis Joined</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.tokisCreated}</Text>
              <Text style={styles.statLabel}>Tokis Created</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userProfile.connections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
          </View>
          {/* Public Activity */}
          <View style={{ paddingHorizontal: 8, marginTop: 8 }}>
            <Text style={{ fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#111827', marginBottom: 8 }}>
              {userProfile.name.split(' ')[0]}'s Activity
            </Text>
            {(() => {
              // Check if user is viewing their own profile
              const isOwnProfile = state.currentUser?.id === userId;
              // Check if users are connected
              const isConnected = connectionStatus?.status === 'accepted';
              
              // Show activity only if connected or viewing own profile
              if (!isOwnProfile && !isConnected) {
                return (
                  <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#6B7280', fontSize: 14, textAlign: 'center' }}>
                      Connect with this user to see their activity
                    </Text>
                  </View>
                );
              }
              
              // Show activity if connected or own profile
              if (publicActivity.length === 0) {
                return <Text style={{ color: '#6B7280' }}>No public activity</Text>;
              }
              
              return (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {publicActivity.map(a => {
                    const km = typeof a.distance_km === 'number' ? Math.round(a.distance_km * 10) / 10 : undefined;
                    const distance = typeof km === 'number' ? { km, miles: Math.round((km * 0.621371) * 10) / 10 } : undefined;
                    return (
                    <View key={a.id} style={{ width: 285, marginRight: 16 }}>
                      <TokiCard
                        toki={{
                          id: a.id,
                          title: a.title,
                          description: a.description || '',
                          image: a.image_url,
                          category: a.category,
                          location: a.location || '',
                          time: a.time_slot || '',
                          attendees: a.current_attendees || 0,
                          maxAttendees: a.max_attendees || 0,
                          scheduledTime: a.scheduled_time,
                          host: { id: a.host_id, name: a.host_name, avatar: a.host_avatar },
                          visibility: a.visibility,
                          tags: a.tags || [],
                          distance,
                        }}
                        onPress={() => router.push({ pathname: '/toki-details', params: { tokiId: a.id } })}
                      />
                    </View>
                  )})}
                </ScrollView>
              );
            })()}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    position: 'absolute',
    left: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  moreButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 22,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 6,
  },
  memberSince: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    gap: 6,
  },
  socialUsername: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  actionButtonContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8B5CF6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  secondaryButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  disabledButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  disabledButtonText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,

  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  bottomSpacing: {
    height: 40,
  },
});

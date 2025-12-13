import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Edit3, MapPin, Calendar, Users, Heart, Share as ShareIcon, Bell, Shield, CircleHelp, LogOut, Instagram, Linkedin, Facebook, User, RefreshCw, Activity, Eye, EyeOff, Trash2 } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { apiService } from '@/services/api';
import ProfileImageUpload from '@/components/ProfileImageUpload';
import TokiCard from '@/components/TokiCard';

export default function ProfileScreen() {
  const { state, actions, dispatch } = useApp();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [myActivity, setMyActivity] = useState<any[]>([]);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleProfileImageUpdate = async (newImageUrl: string) => {
    try {
      console.log('🖼️ Starting profile image update:', newImageUrl);
      console.log('🖼️ Current avatar before update:', state.currentUser.avatar);

      // Update the current user's avatar in the state directly
      dispatch({
        type: 'UPDATE_CURRENT_USER',
        payload: { avatar: newImageUrl }
      });

      console.log('🖼️ Profile image updated in state:', newImageUrl);
      console.log('🖼️ Current avatar after update:', state.currentUser.avatar);

      // Force a re-render by updating local state
      setForceUpdate(prev => prev + 1);

      // Refresh user data from backend to ensure consistency
      console.log('🔄 Refreshing user data from backend...');
      await loadUserData();
      console.log('✅ User data refreshed from backend');

      // Debug: Check what we got from backend
      console.log('🔍 [AFTER REFRESH] Current user avatar:', state.currentUser.avatar);
      console.log('🔍 [AFTER REFRESH] Expected avatar:', newImageUrl);
    } catch (error) {
      console.error('❌ Failed to update profile image in state:', error);
    }
  };

  // Load user data when component mounts
  useEffect(() => {
    console.log('🔄 Profile useEffect triggered - isConnected:', state.isConnected);
    if (state.isConnected) {
      console.log('🔄 Calling loadUserData...');
      loadUserData();
    }
  }, [state.isConnected]);

  // Listen to currentUser changes to update UI
  useEffect(() => {
    console.log('👤 Profile: currentUser changed:', state.currentUser.name);
  }, [state.currentUser, forceUpdate]);

  // Refresh my activity when profile page comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (state.isConnected && state.currentUser?.id) {
        (async () => {
          try {
            const list = await apiService.getMyActivity();
            setMyActivity(list);
          } catch (e) {
            console.error('Failed to load my activity', e);
          }
        })();
      }
    }, [state.isConnected, state.currentUser?.id])
  );

  const toggleActivityVisibility = async (tokiId: string, isHidden: boolean) => {
    try {
      if (isHidden) {
        await apiService.showActivity(tokiId);
      } else {
        await apiService.hideActivity(tokiId);
      }
      const list = await apiService.getMyActivity();
      setMyActivity(list);
    } catch (e) {
      console.error('Failed to toggle activity visibility', e);
    }
  };

  const loadUserData = async () => {
    console.log('🔄 loadUserData called - isConnected:', state.isConnected);
    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to load data. Please check your connection and try again.');
      return;
    }

    setIsRefreshing(true);
    try {
      // Check authentication status first
      console.log('🔐 Checking authentication status...');
      const isAuthenticated = await actions.checkAuthStatus();
      console.log('🔐 Authentication status:', isAuthenticated);

      if (!isAuthenticated) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
        return;
      }

      // Load current user profile and notifications in parallel
      console.log('👤 Loading current user and notifications in parallel...');
      await Promise.all([
        actions.loadCurrentUser(),
        actions.loadNotifications()
      ]);
      console.log('👤 Current user loaded, current state:', state.currentUser.name);
      console.log('📊 Current user stats after load:', {
        tokisCreated: state.currentUser.tokisCreated,
        tokisJoined: state.currentUser.tokisJoined,
        connections: state.currentUser.connections
      });

      // Debug: Log the raw user data to see what we're getting
      console.log('🔍 [PROFILE] Raw user data from backend:', state.currentUser);

      // Then refresh other data
      await refreshUserData();
      console.log('✅ Profile data loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load profile data:', error);
      if (error instanceof Error && error.message?.includes('Authentication failed')) {
        Alert.alert(
          'Authentication Error',
          'Please log in again to continue.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        Alert.alert('Load Error', 'Failed to load profile data. Please try again.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshUserData = async () => {
    if (!state.isConnected) {
      Alert.alert('Connection Error', 'Unable to refresh data. Please check your connection and try again.');
      return;
    }

    setIsRefreshing(true);
    try {
      // User stats are updated via loadCurrentUser() - no need to load all tokis
      // Load connections to update connection count
      await actions.getConnections();
      // Load blocked users
      await actions.loadBlockedUsers();
      // Refresh notifications to update unread count
      await actions.loadNotifications();
      // Refresh saved Tokis to update count
      await actions.getSavedTokis();
      console.log('✅ Profile data refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh profile data:', error);
      Alert.alert('Refresh Error', 'Failed to refresh profile data. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleMyTokis = () => {
    router.push('/my-tokis');
  };

  const handleTokisJoined = () => {
    router.push({
      pathname: '/my-tokis',
      params: { tab: 'joined' }
    });
  };

  const handleTokisCreated = () => {
    router.push({
      pathname: '/my-tokis',
      params: { tab: 'hosting' }
    });
  };

  const handleSavedTokis = () => {
    router.push('/saved-tokis');
  };

  const handleConnections = () => {
    router.push('/connections');
  };

  const handleNotifications = () => {
    router.push('/notifications');
  };

  const handlePrivacySafety = () => {
    Alert.alert(
      '🔒 Privacy & Safety',
      'Choose what you want to manage:',
      [
        {
          text: `Block List (${state.blockedUsers.length})`,
          onPress: () => {
            if (state.blockedUsers.length === 0) {
              Alert.alert(
                'Block List',
                'You haven\'t blocked any users yet.\n\nTo block a user:\n• Go to their profile\n• Tap the three dots menu\n• Select "Block User"'
              );
            } else {
              Alert.alert(
                'Block List',
                `You have ${state.blockedUsers.length} blocked user${state.blockedUsers.length !== 1 ? 's' : ''}:\n\n${state.blockedUsers.map(user => `• ${user.blockedUser.name}`).join('\n')}\n\nTo unblock: Go to their profile and tap "Unblock User"`,
                [
                  { text: 'OK', style: 'default' },
                  {
                    text: 'Refresh Block List',
                    onPress: () => actions.loadBlockedUsers()
                  }
                ]
              );
            }
          }
        },
        {
          text: 'Data & Privacy',
          onPress: () => Alert.alert(
            'Data & Privacy',
            'Control your data sharing and visibility:\n\n• Profile visibility settings\n• Location sharing preferences\n• Data export options\n• Account deletion\n• Third-party app permissions\n\nYour data is encrypted and secure.'
          )
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Clear All Data',
              'This will permanently delete all your local data including Tokis, messages, and profile information. This action cannot be undone.\n\nAre you sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear Data',
                  style: 'destructive',
                  onPress: () => {
                    actions.clearAllData();
                    Alert.alert('Data Cleared', 'All local data has been cleared successfully.');
                  }
                }
              ]
            );
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleInviteFriends = () => {
    router.push('/invite');
  };

  const handleHelpSupport = () => {
    Alert.alert(
      '❓ Help & Support',
      'How can we help you today?',
      [
        {
          text: 'FAQ',
          onPress: () => Alert.alert(
            'Frequently Asked Questions',
            'Common questions and answers:\n\n• How do I create a Toki?\n• How do join requests work?\n• What are the safety guidelines?\n• How do I report someone?\n• How do I change my location?\n• How do I delete my account?\n\nFind detailed answers in our help center.'
          )
        },
        {
          text: 'Contact Support',
          onPress: () => {
            Alert.alert(
              'Contact Support',
              'Choose how you\'d like to reach us:',
              [
                {
                  text: 'Email Support',
                  onPress: () => {
                    const subject = encodeURIComponent('Support Request - Toki App');
                    const body = encodeURIComponent(`Hi Toki Support Team,\n\nI need help with:\n\n[Please describe your issue here]\n\nUser: ${state.currentUser.name}\nEmail: ${state.currentUser.email || 'Not provided'}\nDevice: Web\n\nThanks!`);
                    const emailUrl = `mailto:support@toki.app?subject=${subject}&body=${body}`;
                    Linking.openURL(emailUrl).catch(() => {
                      Alert.alert('Email not available', 'Please contact us directly at: support@toki.app');
                    });
                  }
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ]
            );
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleSignOut = async () => {
    console.log('🔘 Logout button pressed - starting logout process');

    try {
      // Logout using AppContext (clears tokens and data)
      console.log('🔄 Calling actions.logout()...');
      await actions.logout();

      console.log('✅ Logout successful, navigating to login');
      // Navigate to login screen
      router.replace('/login');
    } catch (error) {
      console.error('❌ Error during sign out:', error);
      Alert.alert('Sign Out Error', 'There was an issue signing out. Please try again.');
    }
  };

  const handleDeleteAccount = () => {
    // First confirmation dialog with detailed warning
    Alert.alert(
      '⚠️ Delete Account',
      'Are you sure you want to delete your account? This action is IRREVERSIBLE and will permanently delete:\n\n• Your account and profile\n• All your Tokis and activities\n• All your connections\n• All your messages and conversations\n• All your saved Tokis\n• All your ratings and reviews\n• All your notifications\n\nYou will be able to re-sign up later with the same or different email address.\n\nThis cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Continue',
          onPress: () => {
            // Second confirmation dialog
            Alert.alert(
              '⚠️ Final Confirmation',
              'This is your last chance to cancel. Are you absolutely sure you want to permanently delete your account?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel'
                },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    await performAccountDeletion();
                  }
                }
              ],
              { cancelable: true }
            );
          }
        }
      ],
      { cancelable: true }
    );
  };

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      console.log('🗑️ Starting account deletion...');
      const result = await apiService.deleteAccount();
      
      if (result.success) {
        console.log('✅ Account deleted successfully');
        Alert.alert(
          'Account Deleted',
          'Your account has been permanently deleted. You can re-sign up anytime.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Clear local state and navigate to login
                actions.logout().catch(() => {
                  // Even if logout fails, navigate to login
                });
                router.replace('/login');
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        throw new Error(result.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      
      let errorMessage = 'Failed to delete account. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check if it's a network error
      const isNetworkError = error instanceof TypeError || 
        (error instanceof Error && (
          error.message.includes('Network request failed') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('timeout') ||
          error.message.includes('network')
        ));
      
      if (isNetworkError) {
        Alert.alert(
          'Network Error',
          'Unable to connect to the server. Please check your internet connection and try again.',
          [
            {
              text: 'Cancel',
              style: 'cancel'
            },
            {
              text: 'Retry',
              onPress: () => performAccountDeletion()
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          errorMessage,
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    Alert.alert(
      'Notification Settings Updated',
      value
        ? 'Push notifications are now enabled. You\'ll receive updates about your Tokis, messages, and new connections.'
        : 'Push notifications are now disabled. You can still check updates manually in the app.'
    );
  };

  const handleLocationToggle = (value: boolean) => {
    setLocationEnabled(value);
    Alert.alert(
      'Location Settings Updated',
      value
        ? 'Location services are now enabled. We\'ll show you nearby Tokis and help others discover your events.'
        : 'Location services are now disabled. You can still use Toki, but location-based features will be limited.'
    );
  };

  const getSocialIcon = (platform: keyof typeof state.currentUser.socialLinks) => {
    switch (platform) {
      case 'instagram':
        return <Instagram size={16} color="#E4405F" />;
      case 'tiktok':
        return <User size={16} color="#000000" />;
      case 'linkedin':
        return <Linkedin size={16} color="#0077B5" />;
      case 'facebook':
        return <Facebook size={16} color="#1877F2" />;
      default:
        return <User size={16} color="#666666" />;
    }
  };

  const handleSocialPress = (platform: keyof typeof state.currentUser.socialLinks, username?: string) => {
    if (!username) return;

    let url = '';
    switch (platform) {
      case 'instagram':
        url = `https://instagram.com/${username.replace('@', '')}`;
        break;
      case 'linkedin':
        url = `https://linkedin.com/in/${username}`;
        break;
      case 'facebook':
        url = `https://facebook.com/${username}`;
        break;
      case 'tiktok':
        url = `https://tiktok.com/@${username.replace('@', '')}`;
        break;
    }

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Cannot open link', `Unable to open ${platform} profile. Please check if the app is installed.`);
      });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Profile</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={loadUserData}
              disabled={isRefreshing || state.loading}
            >
              <RefreshCw size={20} color={isRefreshing || state.loading ? "#CCCCCC" : "#1C1C1C"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton} onPress={handleEditProfile} >
              <Edit3 size={20} color="#1C1C1C" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Connection Status */}
        <View style={styles.connectionStatus}>
          <View style={[styles.connectionDot, { backgroundColor: state.isConnected ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.connectionText}>
            {state.isConnected ? 'Online' : 'Offline'} 
          </Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {state.loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading profile data...</Text>
          </View>
        )}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <ProfileImageUpload
                currentImageUrl={state.currentUser.avatar}
                onImageUpdate={handleProfileImageUpdate}
                size={80}
                showEditButton={true}
              />
              {state.currentUser.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓</Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{state.currentUser.name}</Text>
              <Text style={styles.userBio}>{state.currentUser.bio}</Text>

              <View style={styles.locationContainer}>
                <MapPin size={14} color="#666666" />
                <Text style={styles.locationText}>{state.currentUser.location}</Text>
              </View>
              <Text style={styles.memberSince}>
                Member since {state.currentUser.memberSince ?
                  new Date(state.currentUser.memberSince).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long'
                  }) :
                  'Recently'
                }
              </Text>

              {/* Social Media Links */}
              {Object.keys(state.currentUser.socialLinks).length > 0 && (
                <View style={styles.socialLinksContainer}>
                  {(Object.entries(state.currentUser.socialLinks) as Array<[keyof typeof state.currentUser.socialLinks, string]>).map(([platform, username]) => (
                    username && (
                      <TouchableOpacity
                        key={platform}
                        style={styles.socialLink}
                        onPress={() => handleSocialPress(platform, username)}
                      >
                        {getSocialIcon(platform)}
                        <Text style={styles.socialUsername}>{username}</Text>
                      </TouchableOpacity>
                    )
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.statsContainer}>
            <TouchableOpacity style={styles.statItem} onPress={handleTokisJoined}>
              <Text style={styles.statNumber}>{state.currentUser.tokisJoined}</Text>
              <Text style={styles.statLabel}>Tokis Joined</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleTokisCreated}>
              <Text style={styles.statNumber}>{state.currentUser.tokisCreated}</Text>
              <Text style={styles.statLabel}>Tokis Created</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleConnections}>
              <Text style={styles.statNumber}>{state.currentUser.connections}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity style={styles.menuItem} onPress={handleNotifications}>
              <Bell size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Notifications</Text>
              <View style={styles.notificationIndicator}>
                <Text style={styles.notificationCount}>{state.unreadNotificationsCount || 0}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleMyTokis}>
              <Calendar size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>My Tokis</Text>
              <Text style={styles.menuBadge}>{state.currentUser.tokisJoined + state.currentUser.tokisCreated}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleSavedTokis}>
              <Heart size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Saved Tokis</Text>
              <Text style={styles.menuBadge}>
                {state.savedTokis.length > 0 ? state.savedTokis.length : '-'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleConnections}>
              <Users size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Connections</Text>
              <Text style={styles.menuBadge}>{state.currentUser.connections}</Text>
            </TouchableOpacity>
           
          </View>

          {/* My Activity cards + Show as member toggle */}
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>My Activity</Text>
              <TouchableOpacity onPress={() => router.push(`/user-profile/${state.currentUser.id}`)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <Text style={{ marginRight: 8, color: '#6B7280' }}>Show as member</Text>
                <Eye size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {myActivity.length === 0 ? (
              <Text style={{ color: '#6B7280' }}>No recent activity</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {myActivity
                  .map(a => {
                    const km = typeof a.distance_km === 'number' ? Math.round(a.distance_km * 10) / 10 : undefined;
                    const distance = typeof km === 'number' ? { km, miles: Math.round((km * 0.621371) * 10) / 10 } : undefined;
                    return (
                    <View key={a.id} style={{ width: 300, marginRight: 16, opacity: a.is_hidden ? 0.5 : 1 }}>
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
                      {(
                        <TouchableOpacity
                          onPress={() => toggleActivityVisibility(a.id, a.is_hidden)}
                          style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 9999, padding: 6 }}
                        >
                          {a.is_hidden ? <Eye size={18} color="#111827" /> : <EyeOff size={18} color="#111827" />}
                        </TouchableOpacity>
                      )}
                    </View>
                  )})}
              </ScrollView>
            )}
          </View>



          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <View style={styles.menuItem}>
              <Bell size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Push Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={notificationsEnabled ? '#FFFFFF' : '#9CA3AF'}
                style={styles.switch}
              />
            </View>
            <View style={styles.menuItem}>
              <MapPin size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Location Services</Text>
              <Switch
                value={locationEnabled}
                onValueChange={handleLocationToggle}
                trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                thumbColor={locationEnabled ? '#FFFFFF' : '#9CA3AF'}
                style={styles.switch}
              />
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={handlePrivacySafety}>
              <Shield size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Privacy & Safety</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Support</Text>
            <TouchableOpacity style={styles.menuItem} onPress={handleInviteFriends}>
              <ShareIcon size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Invite Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={handleHelpSupport}>
              <CircleHelp size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>Help & Support</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/health')}>
              <Activity size={20} color="#1C1C1C" />
              <Text style={styles.menuText}>System Health</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={handleDeleteAccount}
              disabled={isDeletingAccount || state.loading}
            >
              <Trash2 size={20} color={isDeletingAccount || state.loading ? "#CCCCCC" : "#EF4444"} />
              <Text style={[styles.menuText, { color: isDeletingAccount || state.loading ? "#CCCCCC" : "#EF4444" }]}>
                {isDeletingAccount ? 'Deleting Account...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleSignOut}
            >
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacing} />
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  memberSince: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888888',
    marginBottom: 12,
  },
  socialLinksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  socialLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  socialUsername: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 70,
  },
  statNumber: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#666666',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    marginLeft: 12,
    flex: 1,
  },
  menuBadge: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  notificationIndicator: {
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  notificationCount: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  switch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
  },
});
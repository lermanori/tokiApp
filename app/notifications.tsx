import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, Users, Calendar, MessageCircle, Heart, CircleCheck as CheckCircle, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBackendUrl } from '@/services/config';
import { apiService } from '@/services/api';

interface Notification {
  id: string;
  type: 'join_request' | 'join_approved' | 'join_declined' | 'message' | 'event_reminder' | 'event_update' | 'like';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  avatar?: string;
  tokiTitle?: string;
  actionRequired?: boolean;
  userId?: string;
  userName?: string;
  // For join requests
  tokiId?: string;
  requestId?: string;
  status?: 'pending' | 'approved' | 'declined';
}

// Helper function to format timestamp
const formatTimestamp = (date: string) => {
  const now = new Date();
  const notificationDate = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
  return `${Math.floor(diffInMinutes / 1440)} days ago`;
};

// Save notifications to AsyncStorage
const saveNotifications = async (notifications: Notification[]) => {
  try {
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  } catch (error) {
    console.error('Failed to save notifications:', error);
  }
};

// Load notifications from AsyncStorage
const loadStoredNotifications = async (): Promise<Notification[]> => {
  try {
    const stored = await AsyncStorage.getItem('notifications');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load stored notifications:', error);
    return [];
  }
};

// Convert backend join requests to notifications
const convertJoinRequestsToNotifications = (joinRequests: any[], tokiTitle: string, tokiId: string): Notification[] => {
  return joinRequests.map(request => ({
    id: request.id,
    type: 'join_request' as const,
    title: 'New Join Request',
    message: `${request.user.name} wants to join your ${tokiTitle} event`,
    timestamp: formatTimestamp(request.joinedAt),
    isRead: false,
    avatar: request.user.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
    tokiTitle: tokiTitle,
    actionRequired: true,
    userId: request.user.id,
    userName: request.user.name,
    tokiId: tokiId, // Use the passed tokiId parameter
    requestId: request.id,
    status: request.status || 'pending',
  }));
};

export default function NotificationsScreen() {
  const { state, actions } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notifications from backend API and join requests
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        setLoading(true);
        
        console.log('🔍 Loading notifications and join requests from backend...');
        
        const allNotifications: Notification[] = [];

        // 1. Load notifications from backend notifications API
        try {
          const notificationsResponse = await fetch(`${getBackendUrl()}/api/notifications`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${await apiService.getAccessToken()}`
            }
          });

          if (notificationsResponse.ok) {
            const result = await notificationsResponse.json();
            if (result.success) {
              console.log('✅ Loaded notifications from backend:', result.data.notifications.length);
              allNotifications.push(...result.data.notifications);
            }
          }
        } catch (error) {
          console.error('❌ Failed to load notifications:', error);
        }

        // 2. Load join requests for Tokis hosted by the current user
        for (const toki of state.tokis) {
          if (toki.isHostedByUser && toki.host?.id === state.currentUser?.id) {
            try {
              console.log('🔍 Loading join requests for hosted Toki:', toki.title);
              const joinRequests = await actions.getJoinRequests(toki.id);
              console.log('🔍 Join requests found:', joinRequests.length);
              
              if (joinRequests.length > 0) {
                const joinNotifications = convertJoinRequestsToNotifications(joinRequests, toki.title, toki.id);
                allNotifications.push(...joinNotifications);
              }
            } catch (error) {
              console.error('Failed to load join requests for Toki:', toki.id, error);
            }
          }
        }

        // 3. Load join requests that the current user made (for their own join status)
        for (const toki of state.tokis) {
          if (!toki.isHostedByUser && 
              toki.joinStatus && 
              toki.joinStatus !== 'not_joined' && 
              (toki.joinStatus === 'pending' || toki.joinStatus === 'approved')) {
            try {
              console.log('🔍 Creating user join notification for:', toki.title);
              // Create notification for user's own join request
              const userJoinNotification: Notification = {
                id: `user-join-${toki.id}`,
                type: toki.joinStatus === 'approved' ? 'join_approved' as const : 'join_request' as const,
                title: toki.joinStatus === 'approved' ? 'Join Request Approved' : 'Join Request Sent',
                message: toki.joinStatus === 'approved' ? `You can now join the ${toki.title} event` :
                         `Your request to join ${toki.title} is pending`,
                timestamp: 'Recently',
                isRead: false,
                avatar: toki.host.avatar || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2',
                tokiTitle: toki.title,
                actionRequired: false,
                userId: state.currentUser?.id,
                userName: state.currentUser?.name,
                tokiId: toki.id,
                status: toki.joinStatus as 'pending' | 'approved' | 'declined',
              };
              
              console.log('🔍 Created user notification:', userJoinNotification);
              
              // Add if not already exists
              const existingIndex = allNotifications.findIndex(n => n.id === userJoinNotification.id);
              if (existingIndex === -1) {
                allNotifications.push(userJoinNotification);
              }
            } catch (error) {
              console.error('Failed to create user join notification for Toki:', toki.id, error);
            }
          }
        }

        console.log('📋 Total notifications loaded:', allNotifications.length);
        console.log('📋 All notifications:', allNotifications);

        setNotifications(allNotifications);
        
      } catch (error) {
        console.error('❌ Failed to load notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    if (state.isConnected && state.currentUser?.id) {
      loadNotifications();
    }
  }, [state.tokis, state.isConnected, state.currentUser?.id]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join_request':
        return <Users size={20} color="#B49AFF" />;
      case 'join_approved':
        return <CheckCircle size={20} color="#4DC4AA" />;
      case 'join_declined':
        return <X size={20} color="#EF4444" />;
      case 'message':
        return <MessageCircle size={20} color="#6366F1" />;
      case 'event_reminder':
        return <Calendar size={20} color="#F9E79B" />;
      case 'event_update':
        return <Bell size={20} color="#8B5CF6" />;
      case 'like':
        return <Heart size={20} color="#EC4899" />;
      default:
        return <Bell size={20} color="#666666" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'join_request':
        return '#F3E8FF';
      case 'join_approved':
        return '#F0FDF4';
      case 'join_declined':
        return '#FEF2F2';
      case 'message':
        return '#EEF2FF';
      case 'event_reminder':
        return '#FFFBEB';
      case 'event_update':
        return '#F5F3FF';
      case 'like':
        return '#FDF2F8';
      default:
        return '#F9FAFB';
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n)
    );

    // Navigate based on notification type
    switch (notification.type) {
      case 'join_request':
        // Navigate to join request management
        console.log('Handle join request for:', notification.userName);
        break;
      case 'join_approved':
        // Navigate to the event
        router.push({
          pathname: '/toki-details',
          params: { tokiId: '4' } // Jazz Night
        });
        break;
      case 'message':
        // Navigate to chat
        router.push('/chat');
        break;
      case 'event_reminder':
      case 'like':
        // Navigate to the event
        router.push({
          pathname: '/toki-details',
          params: { tokiId: '1' } // Sunset Beach Volleyball
        });
        break;
    }
  };

  const handleApproveRequest = async (notification: Notification) => {
    console.log('🔄 Approve button pressed for notification:', notification);
    
    if (!notification.tokiId || !notification.requestId) {
      console.error('❌ Missing data:', { tokiId: notification.tokiId, requestId: notification.requestId });
      Alert.alert('Error', 'Missing required data for approval');
      return;
    }

    try {
      console.log('🔄 Calling approveJoinRequest with:', notification.tokiId, notification.requestId);
      const success = await actions.approveJoinRequest(notification.tokiId, notification.requestId);
      
      console.log('🔄 Approve result:', success);
      
      if (success) {
        // Update the notification to show it was approved
        const updatedNotifications = notifications.map(n => 
          n.id === notification.id 
            ? {
                ...n,
                type: 'join_approved' as const,
                title: 'Join Request Approved',
                message: notification.userId === state.currentUser?.id 
                  ? `You can now join the ${notification.tokiTitle} event`
                  : `${notification.userName} can now join your ${notification.tokiTitle} event`,
                actionRequired: false,
                status: 'approved' as const,
                isRead: false,
              }
            : n
        );
        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
        Alert.alert('Success', 'Join request approved successfully');
      } else {
        Alert.alert('Error', 'Failed to approve join request');
      }
    } catch (error) {
      console.error('❌ Error approving join request:', error);
      Alert.alert('Error', 'Failed to approve join request');
    }
  };

  const handleRejectRequest = async (notification: Notification) => {
    if (!notification.tokiId || !notification.requestId) {
      Alert.alert('Error', 'Missing required data for rejection');
      return;
    }

    try {
      const success = await actions.declineJoinRequest(notification.tokiId, notification.requestId);
      
      if (success) {
        // Update the notification to show it was declined
        const updatedNotifications = notifications.map(n => 
          n.id === notification.id 
            ? {
                ...n,
                type: 'join_declined' as const,
                title: 'Join Request Declined',
                message: notification.userId === state.currentUser?.id 
                  ? `Your request to join the ${notification.tokiTitle} event was declined`
                  : `${notification.userName} was declined from joining your ${notification.tokiTitle} event`,
                actionRequired: false,
                status: 'declined' as const,
                isRead: false,
              }
            : n
        );
        setNotifications(updatedNotifications);
        await saveNotifications(updatedNotifications);
        Alert.alert('Success', 'Join request declined successfully');
      } else {
        Alert.alert('Error', 'Failed to decline join request');
      }
    } catch (error) {
      console.error('Error declining join request:', error);
      Alert.alert('Error', 'Failed to decline join request');
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1C1C1C" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead}>
              <Text style={styles.markAllRead}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDescription}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  !notification.isRead && styles.unreadNotification,
                  { backgroundColor: getNotificationColor(notification.type) }
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <View style={styles.iconContainer}>
                      {getNotificationIcon(notification.type)}
                    </View>
                    
                    {notification.avatar && (
                      <Image 
                        source={{ uri: notification.avatar }} 
                        style={styles.notificationAvatar} 
                      />
                    )}
                    
                    <View style={styles.notificationText}>
                      <Text style={[
                        styles.notificationTitle,
                        !notification.isRead && styles.unreadTitle
                      ]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      {notification.tokiTitle && (
                        <Text style={styles.tokiTitle}>
                          📍 {notification.tokiTitle}
                        </Text>
                      )}
                    </View>
                    
                    <View style={styles.notificationMeta}>
                      <Text style={styles.timestamp}>
                        {notification.timestamp}
                      </Text>
                      {!notification.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                  </View>
                  
                  {notification.actionRequired && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={() => handleRejectRequest(notification)}
                      >
                        <X size={16} color="#EF4444" />
                        <Text style={styles.rejectText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={() => handleApproveRequest(notification)}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.approveText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
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
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  markAllRead: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    paddingTop: 8,
  },
  notificationItem: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  unreadNotification: {
    borderColor: '#B49AFF',
    borderWidth: 1,
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#111827',
  },
  notificationMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    lineHeight: 20,
    marginBottom: 4,
  },
  tokiTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#B49AFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 6,
  },
  rejectText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4DC4AA',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 6,
  },
  approveText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 20,
  },
});
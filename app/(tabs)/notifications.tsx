import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Users, Calendar, MessageCircle, Heart, CircleCheck as CheckCircle, X, UserPlus, UserCheck, UserX, Clock, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '@/contexts/AppContext';
// Backend data is loaded via AppContext unified endpoint; no direct API calls here

interface Notification {
  id: string;
  type: 'join_request' | 'join_approved' | 'join_declined' | 'message' | 'event_reminder' | 'event_update' | 'like' | 'invite' | 'invite_accepted' | 'participant_joined' | 'connection_request' | 'connection_accepted';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  avatar?: string;
  tokiTitle?: string;
  actionRequired?: boolean;
  userId?: string;
  userName?: string;
  // For join requests
  tokiId?: string;
  requestId?: string;
  status?: 'pending' | 'approved' | 'declined';
  // For invites
  inviterId?: string;
  inviterName?: string;
  // unified identifiers
  source?: string;
  externalId?: string;
  conversationId?: string;
}

// Helper function to group notifications by time periods
const groupNotificationsByTime = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groups: { [key: string]: Notification[] } = {
    'Today': [],
    'Yesterday': [],
    'Last Week': [],
    'Older': []
  };

  notifications.forEach(notification => {
    const notificationDate = new Date(notification.created_at);
    const notificationDay = new Date(notificationDate.getFullYear(), notificationDate.getMonth(), notificationDate.getDate());

    if (notificationDay.getTime() === today.getTime()) {
      groups['Today'].push(notification);
    } else if (notificationDay.getTime() === yesterday.getTime()) {
      groups['Yesterday'].push(notification);
    } else if (notificationDate >= lastWeek) {
      groups['Last Week'].push(notification);
    } else {
      groups['Older'].push(notification);
    }
  });

  return groups;
};

// Helper function to format timestamp (x minutes ago, hours ago, Yesterday, on dd/mm/yy)
const formatRelativeTime = (input: string): string => {
  // If input is already a friendly string, return as-is
  const parsed = new Date(input);
  if (isNaN(parsed.getTime())) {
    return input || '';
  }

  const now = new Date();
  // Use UTC time for both to avoid timezone issues
  const nowUTC = new Date(now.toISOString());
  const parsedUTC = new Date(parsed.toISOString());
  const diffMs = nowUTC.getTime() - parsedUTC.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  // Check yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    parsed.getFullYear() === yesterday.getFullYear() &&
    parsed.getMonth() === yesterday.getMonth() &&
    parsed.getDate() === yesterday.getDate();
  if (isYesterday) return 'Yesterday';

  // Fallback to date dd/mm/yy
  const dd = String(parsed.getDate()).padStart(2, '0');
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const yy = String(parsed.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

// We rely on the unified backend feed; no local conversion needed

export default function NotificationsScreen() {
  const { state, actions } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load unified notifications via context and keep local mirror in sync
  useEffect(() => {
    const fetchUnified = async () => {
      try {
        setLoading(true);
        await actions.loadNotifications();
      } finally {
        setLoading(false);
      }
    };
    if (state.isConnected && state.currentUser?.id) {
      fetchUnified();
    }
  }, [state.isConnected, state.currentUser?.id]);

  useEffect(() => {
    setNotifications((state.notifications || []) as any);
  }, [state.notifications]);

  // Mark notifications as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 [NOTIFICATIONS SCREEN] Screen focused, marking notifications as read...');
      
      // Mark all notifications as read when screen is viewed
      if (notifications.length > 0) {
        actions.markNotificationsAsRead();
      }
    }, [notifications.length])
  );

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'join_request':
        return <Users size={20} color="#B49AFF" />;
      case 'join_approved':
        return <CheckCircle size={20} color="#B49AFF" />;
      case 'join_declined':
        return <X size={20} color="#B49AFF" />;
      case 'message':
        return <MessageCircle size={20} color="#B49AFF" />;
      case 'event_reminder':
        return <Clock size={20} color="#B49AFF" />;
      case 'event_update':
        return <Bell size={20} color="#B49AFF" />;
      case 'like':
        return <Heart size={20} color="#B49AFF" />;
      case 'invite':
        return <UserPlus size={20} color="#B49AFF" />;
      case 'invite_accepted':
        return <UserCheck size={20} color="#B49AFF" />;
      case 'participant_joined':
        return <Users size={20} color="#B49AFF" />;
      default:
        // Handle connection-related notifications
        if (type?.includes('connection') || type?.includes('request')) {
          return <UserPlus size={20} color="#B49AFF" />;
        }
        return <Bell size={20} color="#B49AFF" />;
    }
  };

  const getNotificationColor = (type: string) => {
    // Use consistent background color for all notifications
    return '#FFFFFF';
  };

  const handleMarkRead = (notification: Notification & { source?: string; externalId?: string }) => {
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
    actions.markNotificationRead(String(notification.id), notification.source, notification.externalId);
  };

  const handleOpen = (notification: Notification) => {
    // Mark read then navigate
    handleMarkRead(notification);

    // Navigate based on notification type and available data
    if (notification.tokiId) {
      // Toki-related notifications - go to toki details
      router.push({ pathname: '/toki-details', params: { tokiId: String(notification.tokiId) } });
      return;
    }
    
    if (notification.type === 'message') {
      // Message notifications - go to chat
      if (notification.userId) {
        router.push({ pathname: '/chat', params: { otherUserId: String(notification.userId), otherUserName: notification.userName || '', isGroup: 'false' } });
      } else {
        router.push('/(tabs)/messages');
      }
      return;
    }
    
    // Connection-related notifications - go to user profile
    if (notification.userId && (
      notification.type === 'connection_request' ||
      notification.type === 'connection_accepted' ||
      notification.source === 'connection_pending' ||
      notification.source === 'connection_accepted' ||
      notification.type === 'invite' ||
      notification.type === 'invite_accepted'
    )) {
      router.push({ pathname: '/user-profile/[userId]', params: { userId: String(notification.userId) } });
      return;
    }
    
    // Default fallback - go to messages tab
    router.push('/(tabs)/messages');
  };

  const handleApproveRequest = async (notification: Notification) => {
    console.log('🔄 Approve button pressed for notification:', notification);
    
    if (!notification.tokiId || !(notification.requestId || notification.externalId)) {
      console.error('❌ Missing data:', { tokiId: notification.tokiId, requestId: notification.requestId, externalId: notification.externalId });
      Alert.alert('Error', 'Missing required data for approval');
      return;
    }

    const requestId = notification.requestId || notification.externalId;

    try {
      console.log('🔄 Calling approveJoinRequest with:', notification.tokiId, requestId);
      const success = await actions.approveJoinRequest(notification.tokiId, requestId!);
      
      console.log('🔄 Approve result:', success);
      
      if (success) {
        // Optimistically persist the item as an approved notification so it doesn't disappear
        setNotifications(prev => prev.map(n =>
          n.id === notification.id
            ? {
                ...n,
                type: 'join_approved' as const,
                title: 'Join Request Approved',
                message: `${notification.userName || 'User'} can now join your ${notification.tokiTitle || 'event'}`,
                actionRequired: false,
                status: 'approved' as const,
                read: false,
              }
            : n
        ));
        // Soft refresh to pull the persisted host_join_approved item first
        await actions.loadNotifications();
        // Now mark the original pending item as read (after the visible change)
        actions.markNotificationRead(
          String(notification.id),
          notification.source,
          notification.requestId || notification.externalId
        );
        console.log('✅ Join request approved successfully');
      } else {
        console.error('❌ Failed to approve join request');
      }
    } catch (error) {
      console.error('❌ Error approving join request:', error);
    }
  };

  const handleRejectRequest = async (notification: Notification) => {
    if (!notification.tokiId || !(notification.requestId || notification.externalId)) {
      console.error('❌ Missing required data for rejection');
      return;
    }

    const requestId = notification.requestId || notification.externalId;

    try {
      const success = await actions.declineJoinRequest(notification.tokiId, requestId!);
      
      if (success) {
        // Optimistically reflect decline in UI
        setNotifications(prev => prev.map(n =>
          n.id === notification.id
            ? {
                ...n,
                type: 'join_declined' as const,
                title: 'Join Request Declined',
                message: `${notification.userName || 'User'} was declined from joining your ${notification.tokiTitle || 'event'}`,
                actionRequired: false,
                status: 'declined' as const,
                read: true,
              }
            : n
        ));
        // Then refresh from backend and mark the original pending as read
        await actions.loadNotifications();
        actions.markNotificationRead(
          String(notification.id),
          notification.source,
          requestId!
        );
        console.log('✅ Join request declined successfully');
      } else {
        console.error('❌ Failed to decline join request');
      }
    } catch (error) {
      console.error('❌ Error declining join request:', error);
    }
  };

  // Connection request handlers (pending connection notifications)
  const handleAcceptConnection = async (notification: Notification) => {
    if (!notification.userId) return;
    const ok = await actions.acceptConnectionRequest(notification.userId);
    if (ok) {
      // Remove the pending item immediately and mark as read
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      actions.markNotificationRead(String(notification.id), notification.source, notification.externalId);
      // Optionally reload unified feed
      await actions.loadNotifications();
    }
  };

  const handleDeclineConnection = async (notification: Notification) => {
    if (!notification.userId) return;
    const ok = await actions.declineConnectionRequest(notification.userId);
    if (ok) {
      // Remove the pending item immediately and mark as read
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      actions.markNotificationRead(String(notification.id), notification.source, notification.externalId);
      await actions.loadNotifications();
    }
  };

  // Invite handlers
  const handleAcceptInvite = async (notification: Notification) => {
    if (!notification.externalId) {
      console.error('❌ Missing notification ID for invite accept');
      return;
    }

    try {
      const success = await actions.respondToInviteViaNotification(notification.externalId, 'accept');
      
      if (success) {
        // Remove the original invite notification and reload to get the new invite_accepted notification
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        await actions.loadNotifications();
        console.log('✅ Invite accepted successfully');
      } else {
        console.error('❌ Failed to accept invite');
      }
    } catch (error) {
      console.error('❌ Error accepting invite:', error);
    }
  };

  const handleDeclineInvite = async (notification: Notification) => {
    if (!notification.externalId) {
      console.error('❌ Missing notification ID for invite decline');
      return;
    }

    try {
      const success = await actions.respondToInviteViaNotification(notification.externalId, 'decline');
      
      if (success) {
        // Remove the notification completely for declined invites
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        console.log('✅ Invite declined successfully');
      } else {
        console.error('❌ Failed to decline invite');
      }
    } catch (error) {
      console.error('❌ Error declining invite:', error);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    actions.markAllNotificationsRead();
  };

  const unreadCount = (state.notifications || []).filter((n: any) => !(n.read || (n as any).isRead)).length;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllReadButton}>
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
            {(() => {
              const groupedNotifications = groupNotificationsByTime(notifications);
              const timeGroups = ['Today', 'Yesterday', 'Last Week', 'Older'];
              
              return timeGroups.map((timeGroup) => {
                const groupNotifications = groupedNotifications[timeGroup];
                if (groupNotifications.length === 0) return null;
                
                return (
                  <View key={timeGroup}>
                    <Text style={styles.timeGroupHeader}>{timeGroup}</Text>
                    {groupNotifications.map((notification) => (
                      <TouchableOpacity
                        key={notification.id}
                        style={[
                          styles.notificationItem,
                          !notification.read && styles.unreadNotification,
                          { backgroundColor: getNotificationColor(notification.type) }
                        ]}
                        onPress={() => handleOpen(notification)}
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
                        !notification.read && styles.unreadTitle
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
                        {formatRelativeTime(notification.created_at)}
                      </Text>
                      {!notification.read && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                  </View>
                  
                  {(((notification.type === 'join_request' || notification.source === 'host_join_request')) && ((notification.externalId || notification.requestId))) && (
                    <View style={styles.actionButtons} onStartShouldSetResponder={() => true}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={(e?: any) => { e?.stopPropagation?.(); handleRejectRequest(notification); }}
                      >
                        <X size={16} color="#EF4444" />
                        <Text style={styles.rejectText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={(e?: any) => { e?.stopPropagation?.(); handleApproveRequest(notification); }}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.approveText}>Approve</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(notification.source === 'connection_pending' && notification.userId) && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={(e?: any) => { e?.stopPropagation?.(); handleDeclineConnection(notification); }}
                      >
                        <X size={16} color="#EF4444" />
                        <Text style={styles.rejectText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={(e?: any) => { e?.stopPropagation?.(); handleAcceptConnection(notification); }}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.approveText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {(notification.type === 'invite' && notification.actionRequired) && (
                    <View style={styles.actionButtons} onStartShouldSetResponder={() => true}>
                      <TouchableOpacity 
                        style={styles.rejectButton}
                        onPress={(e?: any) => { e?.stopPropagation?.(); handleDeclineInvite(notification); }}
                      >
                        <X size={16} color="#EF4444" />
                        <Text style={styles.rejectText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.approveButton}
                        onPress={(e?: any) => { e?.stopPropagation?.(); handleAcceptInvite(notification); }}
                      >
                        <CheckCircle size={16} color="#FFFFFF" />
                        <Text style={styles.approveText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {notification.type === 'invite_accepted' && null}
                </View>
              </TouchableOpacity>
                    ))}
                  </View>
                );
              });
            })()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  markAllReadButton: {
    zIndex: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    flex: 1,
    textAlign: 'center',
  },
  markAllRead: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#B49AFF',
    zIndex: 2,
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
  timeGroupHeader: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    paddingLeft: 4,
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
    backgroundColor: '#F3F4F6',
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
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  openButton: {
    backgroundColor: '#B49AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  markReadButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#B49AFF',
  },
  markReadButtonText: {
    color: '#B49AFF',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
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




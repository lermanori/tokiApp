import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Map, Plus, MessageCircle, User, Compass } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { useEffect, useMemo } from 'react';

export default function TabLayout() {
  const { state } = useApp();

  // Calculate total unread messages using useMemo to ensure recalculation when data changes
  const totalUnreadCount = useMemo(() => {
    const conversationsUnread = (state.conversations || []).reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
    const tokiGroupChatsUnread = (state.tokiGroupChats || []).reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
    const total = conversationsUnread + tokiGroupChatsUnread;
    
    console.log('TabLayout: Calculating totalUnreadCount:', {
      conversationsUnread,
      tokiGroupChatsUnread,
      total
    });
    
    return total;
  }, [state.conversations, state.tokiGroupChats]);

  // Debug: Log when state changes
  useEffect(() => {
    console.log('TabLayout: conversations changed, count:', state.conversations?.length || 0)
  }, [state.conversations])

  useEffect(() => {
    console.log('TabLayout: tokiGroupChats changed, count:', state.tokiGroupChats?.length || 0)
  }, [state.tokiGroupChats])
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#B49AFF',
        tabBarInactiveTintColor: '#9B9B9B',
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ size, color }) => (
            <Compass size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ size, color }) => (
            <Map size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ size, color }) => (
            <Plus size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ size, color }) => (
            <View style={styles.iconContainer}>
              <MessageCircle size={size} color={color} />
              {totalUnreadCount > 0 && (
                <View style={styles.unreadDot} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <User size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    paddingBottom: 8,
    paddingTop: 8,
    height: 60,
  },
  tabBarLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
});
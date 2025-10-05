import { Tabs } from 'expo-router';
import { StyleSheet, View, useWindowDimensions, Text } from 'react-native';
import React, { useMemo } from 'react';
import { Map, Plus, MessageCircle, User, Compass } from 'lucide-react-native';
import { useApp } from '../../contexts/AppContext';

export default function TabLayout() {
  const { state } = useApp();
  const { width } = useWindowDimensions(); // More responsive than Dimensions.get()
  
  // Memoize responsive calculations to prevent re-renders
  const responsiveStyles = useMemo(() => {
    if (width < 600) {
      return {
        tabBarHeight: 80,
        iconSize: 20,
        fontSize: 10,
        padding: 6,
        unreadDotSize: 6,
      };
    } else {
      return {
        tabBarHeight: 70,
        iconSize: 24,
        fontSize: 12,
        padding: 8,
        unreadDotSize: 8,
      };
    }
  }, [width]);
  
  // Memoize unread counts to prevent re-renders
  const totalUnreadCount = useMemo(() => {
    return (state.conversations || []).reduce((sum, conv) => 
      sum + (conv.unread_count || 0), 0
    ) + (state.tokiGroupChats || []).reduce((sum, chat) => 
      sum + (chat.unread_count || 0), 0
    );
  }, [state.conversations, state.tokiGroupChats]);

  // Memoize unread notifications count
  const unreadNotificationsCount = useMemo(() => {
    return Math.min(99, state.unreadNotificationsCount || 0);
  }, [state.unreadNotificationsCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: responsiveStyles.tabBarHeight,
            paddingBottom: responsiveStyles.padding,
            paddingTop: responsiveStyles.padding,
          }
        ],
        tabBarActiveTintColor: '#B49AFF',
        tabBarInactiveTintColor: '#9B9B9B',
        tabBarLabelStyle: [
          styles.tabBarLabel,
          { fontSize: responsiveStyles.fontSize }
        ],
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Compass size={responsiveStyles.iconSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => (
            <Map size={responsiveStyles.iconSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color }) => (
            <Plus size={responsiveStyles.iconSize} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconContainer}>
              <MessageCircle size={responsiveStyles.iconSize} color={color} />
              {totalUnreadCount > 0 && (
                <View style={[styles.unreadDot, { 
                  width: responsiveStyles.unreadDotSize, 
                  height: responsiveStyles.unreadDotSize 
                }]} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <View style={styles.iconContainer}>
              <User size={responsiveStyles.iconSize} color={color} />
              {unreadNotificationsCount > 0 && (
                <View style={[styles.countBadge]}>
                  <Text style={styles.countBadgeText}>
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </View>
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  tabBarLabel: {
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  iconContainer: {
    position: 'relative',
  },
  countBadge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    lineHeight: 12,
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 50,
  },
});
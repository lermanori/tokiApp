import { Tabs } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Map, Plus, MessageCircle, User, Compass } from 'lucide-react-native';
import { useApp } from '../../contexts/AppContext';

export default function TabLayout() {
  const { state } = useApp();
  const { width } = useWindowDimensions(); // More responsive than Dimensions.get()
  
  // Responsive calculations
  const getResponsiveStyles = () => {
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
  };

  const responsiveStyles = getResponsiveStyles();
  
  // Calculate total unread messages
  const totalUnreadCount = (state.conversations || []).reduce((sum, conv) => 
    sum + (conv.unread_count || 0), 0
  ) + (state.tokiGroupChats || []).reduce((sum, chat) => 
    sum + (chat.unread_count || 0), 0
  );

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
          title: 'Discover',
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
            <User size={responsiveStyles.iconSize} color={color} />
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
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 50,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, MessageCircle, Users, Clock, RefreshCw, X } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { socketService } from '@/services/socket';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { getInitials } from '@/utils/tokiUtils';


interface Conversation {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar?: string;
  other_user_bio?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface TokiGroupChat {
  id: string;
  title: string;
  description: string;
  host_name: string;
  category?: string;
  image_urls?: string[];
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
  isGroup: true;
}

export default function MessagesScreen() {
  const { state, actions } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filteredChats, setFilteredChats] = useState<any[]>([]);
  
  // Get conversations and toki group chats from global state
  const conversations = state.conversations || [];
  const tokiGroupChats = state.tokiGroupChats || [];

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      await actions.getConversations();
      await actions.getTokiGroupChats();
    } catch (error) {
      console.error('❌ Failed to load conversations:', error);
      Alert.alert('Error', 'Failed to load conversations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manual refresh function
  const refreshAllData = async () => {
    setIsLoading(true);
    try {
      // Refresh both conversations and toki group chats
      await Promise.all([
        actions.getConversations(),
        actions.getTokiGroupChats()
      ]);
    } catch (error) {
      console.error('❌ [MESSAGES PAGE] Manual refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // Real-time updates for conversations
  useEffect(() => {
    // WebSocket listeners are handled globally in AppContext
  }, [conversations, tokiGroupChats]);

  // Watch for changes in global state to trigger re-renders
  useEffect(() => {
    // This effect ensures the component re-renders when conversations or toki group chats change
  }, [conversations, tokiGroupChats]);

  // Load conversations and toki group chats when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 Messages screen focused, reloading conversations...');
      
      // Check WebSocket connection status
      const socketStatus = socketService.getConnectionStatus();
      const socket = socketService.getSocket();
      console.log('🔌 [MESSAGES] WebSocket status:', socketStatus);
      console.log('🔌 [MESSAGES] Socket instance:', socket ? 'exists' : 'null');
      console.log('🔌 [MESSAGES] Socket connected:', socket?.connected);
      
      // Ensure global message listeners are working
      if (socketStatus && socket) {
        console.log('🔌 Messages screen focused, re-establishing global listeners...');
        actions.reestablishGlobalListeners();
        
        // Test if the listeners are working
        setTimeout(() => {
          console.log('🧪 [MESSAGES] Testing WebSocket listeners after setup...');
          actions.testWebSocketListeners();
        }, 1000);
      } else {
        console.log('⚠️ [MESSAGES] WebSocket not ready, skipping listener setup');
      }
      
      loadConversations();
      actions.getTokiGroupChats();
    }, [])
  );

  // Also reload when component mounts to ensure fresh data
  useEffect(() => {
    loadConversations();
  }, []);

  // Combine and sort all chats by last message timestamp
  const getAllChats = () => {
    try {
      const allChats = [
        // Individual conversations
        ...(conversations || []).map(conv => ({
          ...conv,
          type: 'individual' as const,
          sortKey: conv.last_message_time || conv.updated_at
        })),
        // Toki group chats
        ...(tokiGroupChats || []).map(toki => ({
          ...toki,
          type: 'group' as const,
          sortKey: toki.last_message_time || toki.updated_at
        }))
      ];

      // Sort by last message timestamp (most recent first)
      return allChats.sort((a, b) => {
        const timeA = new Date(a.sortKey || 0).getTime();
        const timeB = new Date(b.sortKey || 0).getTime();
        return timeB - timeA; // Descending order (newest first)
      });
    } catch (error) {
      console.error('❌ Error in getAllChats:', error);
      return [];
    }
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Mark conversation as read (reset unread count)
    if (conversation.unread_count > 0) {
      // Update global state by refreshing conversations
      actions.getConversations();
    }
    
    // Navigate to individual chat
    router.push({
      pathname: '/chat',
      params: { 
        conversationId: conversation.id,
        otherUserId: conversation.other_user_id,
        otherUserName: conversation.other_user_name,
        isGroup: 'false'
      }
    });
  };

  const handleTokiGroupChatPress = (tokiChat: TokiGroupChat) => {
    // Mark Toki group chat as read (reset unread count)
    if (tokiChat.unread_count > 0) {
      // Update global state by refreshing toki group chats
      actions.getTokiGroupChats();
    }
    
    // Navigate to Toki group chat
    router.push({
      pathname: '/chat',
      params: { 
        tokiId: tokiChat.id,
        otherUserName: tokiChat.title,
        isGroup: 'true'
      }
    });
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Search function to filter chats
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredChats([]);
      // setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const filtered = getAllChats().filter(chat => {
        const searchTerm = query.toLowerCase();
        
        if (chat.type === 'individual') {
          const conversation = chat as Conversation;
          return (
            (conversation.other_user_name && conversation.other_user_name.toLowerCase().includes(searchTerm)) ||
            (conversation.last_message && conversation.last_message.toLowerCase().includes(searchTerm))
          );
        } else {
          const tokiChat = chat as TokiGroupChat;
          return (
            (tokiChat.title && tokiChat.title.toLowerCase().includes(searchTerm)) ||
            (tokiChat.description && tokiChat.description.toLowerCase().includes(searchTerm)) ||
            (tokiChat.last_message && tokiChat.last_message.toLowerCase().includes(searchTerm))
          );
        }
      });
      
      setFilteredChats(filtered);
    } catch (error) {
      console.error('❌ Search error:', error);
      console.error('❌ Chat data:', getAllChats());
      setFilteredChats([]);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Get chats to display (either filtered or all)
  const getDisplayChats = () => {
    if (isSearching && searchQuery.trim()) {
      return filteredChats;
    }
    return getAllChats();
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredChats([]);
    setIsSearching(false);
    Keyboard.dismiss();
  };

  // Dismiss search
  const dismissSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    setFilteredChats([]);
    Keyboard.dismiss();
  };

    // Highlight search text in results
  const highlightText = (text: string | null | undefined, query: string) => {
    if (!query.trim() || !text) return text || '';
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <Text key={index} style={styles.highlightedText}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <LinearGradient
        colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Messages</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.refreshButton} onPress={refreshAllData}>
              <RefreshCw size={20} color="#B49AFF" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.searchButton, isSearching && styles.searchButtonActive]} 
              onPress={() => isSearching ? dismissSearch() : setIsSearching(true)}
            >
              <Search size={20} color={isSearching ? "#8B5CF6" : "#B49AFF"} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search Input */}
        {isSearching && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={{outline: 'none',...styles.searchInput}}
                placeholder="Search conversations..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <X size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
            {searchQuery.length > 0 && (
              <Text style={styles.searchResultsCount}>
                {filteredChats.length} result{filteredChats.length !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
        )}
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => {
          if (isSearching) {
            Keyboard.dismiss();
          }
        }}
      >
        {/* Search Summary Header */}
        {isSearching && searchQuery.trim() && filteredChats.length > 0 && (
          <View style={styles.searchSummaryHeader}>
            <Text style={styles.searchSummaryText}>
              Found {filteredChats.length} conversation{filteredChats.length !== 1 ? 's' : ''} for "{searchQuery}"
            </Text>
            <TouchableOpacity onPress={clearSearch} style={styles.clearSearchButton}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isLoading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading conversations...</Text>
          </View>
        ) : isSearching && searchQuery.trim() && filteredChats.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No search results</Text>
            <Text style={styles.emptyDescription}>
              No conversations found for "{searchQuery}"
            </Text>
          </View>
        ) : conversations.length === 0 && tokiGroupChats.length === 0 ? (
          <View style={styles.emptyState}>
            <MessageCircle size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptyDescription}>
              Start chatting with your connections or join Tokis
            </Text>
          </View>
        ) : (
          <View style={styles.conversationsList}>
            {getDisplayChats().map((chat) => (
              <TouchableOpacity
                key={`${chat.type}-${chat.id}`}
                style={styles.conversationItem}
                onPress={() => chat.type === 'individual' 
                  ? handleConversationPress(chat as Conversation)
                  : handleTokiGroupChatPress(chat as TokiGroupChat)
                }
              >
                <View style={styles.conversationAvatar}>
                  {chat.type === 'individual' ? (
                    (chat as Conversation).other_user_avatar ? (
                      <Image
                        source={{ uri: (chat as Conversation).other_user_avatar }}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarInitials}>
                          {getInitials((chat as Conversation).other_user_name || 'Unknown')}
                        </Text>
                      </View>
                    )
                  ) : (
                    // Toki group chat - show image circles
                    (() => {
                      const tokiChat = chat as TokiGroupChat;
                      const images = tokiChat.image_urls && tokiChat.image_urls.length > 0 
                        ? tokiChat.image_urls 
                        : [getActivityPhoto(tokiChat.category)];
                      const isSingleImage = images.length === 1;
                      
                      return (
                        <View style={styles.tokiImageCircles}>
                          {images.slice(0, 3).map((imageUrl, index) => (
                            <View 
                              key={index} 
                              style={[
                                isSingleImage ? styles.tokiImageCircleSingle : styles.tokiImageCircle,
                                index > 0 && styles.tokiImageCircleOverlap
                              ]}
                            >
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.tokiCircleImage}
                                resizeMode="cover"
                              />
                            </View>
                          ))}
                          {images.length > 3 && (
                            <View style={[styles.tokiImageCircle, styles.tokiImageCircleOverlap, styles.tokiMoreCircle]}>
                              <Text style={styles.tokiMoreText}>+{images.length - 3}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })()
                  )}
                </View>

                <View style={styles.conversationContent}>
                  <View style={styles.conversationHeader}>
                    <Text style={styles.conversationTitle} numberOfLines={1}>
                      {isSearching && searchQuery.trim() ? (
                        chat.type === 'individual' 
                          ? highlightText((chat as Conversation).other_user_name, searchQuery)
                          : highlightText((chat as TokiGroupChat).title, searchQuery)
                      ) : (
                        chat.type === 'individual' 
                          ? (chat as Conversation).other_user_name || 'Unknown User'
                          : (chat as TokiGroupChat).title || 'Untitled Toki'
                      )}
                    </Text>
                    <View style={styles.headerRight}>
                      <Text style={styles.timestamp}>
                        {chat.last_message_time ? formatTimestamp(chat.last_message_time) : 'No messages'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.conversationFooter}>
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {isSearching && searchQuery.trim() && chat.last_message ? (
                        highlightText(chat.last_message, searchQuery)
                      ) : (
                        chat.last_message || 'Start a conversation...'
                      )}
                    </Text>
                    <View style={styles.conversationMeta}>
                      {chat.unread_count > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>
                            {chat.unread_count}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
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
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
  searchButton: {
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
  searchButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  searchContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchResultsCount: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  highlightedText: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontWeight: 'bold',
  },
  searchSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchSummaryText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  clearSearchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  clearSearchText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  refreshButton: {
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
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
  },
  conversationsList: {
    backgroundColor: '#FFFFFF',
  },
  conversationItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  conversationItemDisabled: {
    opacity: 0.6,
  },
  conversationAvatar: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarImageDisabled: {
    opacity: 0.5,
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  tokiImageCircles: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 60, // Wider container for larger toki images
    height: 60,
  },
  tokiImageCircleSingle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  tokiImageCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  tokiImageCircleOverlap: {
    marginLeft: -23, // 45 + 45 + 45 - 23 - 23 = 89, constrained to 60px container
  },
  tokiCircleImage: {
    width: '100%',
    height: '100%',
  },
  tokiFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3E7FF',
  },
  tokiMoreCircle: {
    backgroundColor: '#B49AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokiMoreText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#B49AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    flex: 1,
  },
  conversationTitleDisabled: {
    color: '#9CA3AF',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  timestampDisabled: {
    color: '#D1D5DB',
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666666',
    flex: 1,
  },
  lastMessageDisabled: {
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  conversationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  participantsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  participantsCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  participantsCountDisabled: {
    color: '#D1D5DB',
  },
  unreadBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 20,
  },
});
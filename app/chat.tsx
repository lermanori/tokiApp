import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Keyboard, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Users, Image as ImageIcon } from 'lucide-react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import { socketService } from '@/services/socket';
import ParticipantsModal from '@/components/ParticipantsModal';

export default function ChatScreen() {
  const { state, actions } = useApp();
  const params = useLocalSearchParams();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [markAsReadTimeout, setMarkAsReadTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Participants modal state
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [participantsSearch, setParticipantsSearch] = useState('');
  const [tokiParticipants, setTokiParticipants] = useState<Array<{
    id: string;
    name: string;
    avatar?: string;
    isHost?: boolean;
  }>>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [isUserHost, setIsUserHost] = useState(false);

  // Report message function
  const handleReportMessage = async (messageId: string) => {
    try {
      setReportingMessageId(messageId);
      setReportReason('');
      setShowReportModal(true);
    } catch (error) {
      console.error('❌ [CHAT SCREEN] Error reporting message:', error);
      Alert.alert('Error', 'Failed to report message. Please try again.');
    }
  };

  // Submit report
  const submitReport = async () => {
    if (!reportingMessageId || !reportReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for reporting.');
      return;
    }

    try {
      const success = await actions.reportMessage(reportingMessageId, reportReason.trim());
      if (success) {
        Alert.alert('Success', 'Message reported successfully. Thank you for helping keep our community safe.');
        setShowReportModal(false);
        setReportReason('');
        setReportingMessageId(null);
      } else {
        Alert.alert('Error', 'Failed to report message. Please try again.');
      }
    } catch (error) {
      console.error('❌ [CHAT SCREEN] Error submitting report:', error);
      Alert.alert('Error', 'Failed to report message. Please try again.');
    }
  };

  // Cancel report
  const cancelReport = () => {
    setShowReportModal(false);
    setReportReason('');
    setReportingMessageId(null);
  };

  // Load Toki participants for the modal
  const loadTokiParticipants = async () => {
    if (!isGroup || !tokiId) return;
    
    setIsLoadingParticipants(true);
    try {
      const tokiData = await actions.getTokiById(tokiId);
      if (tokiData) {
        // Check if current user is host
        const currentUserId = state.currentUser?.id;
        const hostId = tokiData.host?.id || tokiData.host_id;
        setIsUserHost(currentUserId === hostId);
        
        // Map participants to the format expected by ParticipantsModal
        const participantsList = (tokiData.participants || []).map((p: any) => ({
          id: p.id || p.user?.id || '',
          name: p.name || p.user?.name || 'Unknown',
          avatar: p.avatar || p.user?.avatar_url || undefined,
          isHost: (p.id || p.user?.id) === hostId
        }));
        
        // Check if host is already in participants list
        const hostInParticipants = participantsList.some(p => p.id === hostId);
        
        // If host is not in participants list, add them
        if (!hostInParticipants && tokiData.host) {
          participantsList.push({
            id: hostId,
            name: tokiData.host.name || 'Host',
            avatar: tokiData.host.avatar || undefined,
            isHost: true
          });
        }
        
        // Sort participants: host first, then others
        const sortedParticipants = participantsList.sort((a, b) => {
          if (a.isHost && !b.isHost) return -1;
          if (!a.isHost && b.isHost) return 1;
          return 0;
        });
        
        setTokiParticipants(sortedParticipants);
      } else {
        setTokiParticipants([]);
      }
    } catch (error) {
      console.error('❌ [CHAT SCREEN] Failed to load participants:', error);
      setTokiParticipants([]);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  // Handle removing a participant from the group
  const handleRemoveParticipant = async (participantId: string) => {
    if (!tokiId) return;
    
    Alert.alert(
      'Remove Participant',
      'Are you sure you want to remove this participant from the group chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await actions.removeParticipant(tokiId, participantId);
              if (success) {
                // Reload participants to update the list
                await loadTokiParticipants();
                Alert.alert('Success', 'Participant removed successfully');
              } else {
                Alert.alert('Error', 'Failed to remove participant. Please try again.');
              }
            } catch (error) {
              console.error('❌ [CHAT SCREEN] Error removing participant:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          }
        }
      ]
    );
  };

  // Debounced function to mark chat as read
  const debouncedMarkAsRead = (chatId: string, isToki: boolean) => {
    // Only mark as read if there are messages
    if (messages.length === 0) {
      console.log('⏭️ [CHAT SCREEN] Debounced mark as read skipped - no messages');
      return;
    }
    
    // Clear existing timeout
    if (markAsReadTimeout) {
      clearTimeout(markAsReadTimeout);
    }
    
    // Set new timeout to mark as read after 1 second of inactivity
    const timeout = setTimeout(() => {
      console.log('⏱️ [CHAT SCREEN] Debounced mark as read triggered');
      if (isToki) {
        actions.markTokiAsRead(chatId);
      } else {
        actions.markConversationAsRead(chatId);
      }
    }, 1000);
    
    setMarkAsReadTimeout(timeout);
  };

  const conversationId = params.conversationId as string;
  const tokiId = params.tokiId as string;
  const otherUserId = params.otherUserId as string;
  const otherUserName = params.otherUserName as string;
  const isGroup = params.isGroup === 'true';

  // Support creating conversation only upon first send
  const [dynamicConversationId, setDynamicConversationId] = useState<string | undefined>(conversationId);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleScroll = (event: any) => {
    // Mark as read when user is actively scrolling (indicates engagement)
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    
    // If user is near bottom or actively scrolling, mark as read
    if (isNearBottom || contentOffset.y > 0) {
      console.log('📜 [CHAT SCREEN] User scrolling, marking chat as read...');
      if (isGroup && tokiId) {
        debouncedMarkAsRead(tokiId, true);
      } else if (conversationId) {
        debouncedMarkAsRead(conversationId, false);
      }
    }
  };

  // Format timestamp with proper timezone handling
  const formatMessageTimestamp = (timestamp: string | undefined) => {
    try {
      // Handle undefined or null timestamps
      if (!timestamp) {
        console.error('❌ No timestamp provided');
        return 'No time';
      }
      
      const date = new Date(timestamp);
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.error('❌ Invalid date created from timestamp:', timestamp);
        return 'Invalid time';
      }
      
      // Simple approach: Just use the Date object's built-in local conversion
      // JavaScript automatically converts UTC timestamps to local time
      const localTime = date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
        // Don't specify timeZone - let JS use the system's local timezone
      });
      
      // Also get a more detailed format for comparison
      const detailedTime = date.toLocaleString('en-US', {
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric'
      });
      

      
      return localTime;
    } catch (error) {
      console.error('❌ Error formatting timestamp:', error);
      return 'Error';
    }
  };

  const loadMessages = async () => {
    if (isGroup && tokiId) {
      // Load Toki group messages
      setIsLoading(true);
      try {
        console.log('🔄 Loading messages for Toki:', tokiId);
        const messagesData = await actions.getTokiMessages(tokiId);
        console.log('✅ Toki messages loaded:', messagesData);
        
        // Deep inspection of the raw message data
        if (messagesData && messagesData.length > 0) {
          console.log('🔍 RAW MESSAGE INSPECTION:');
          console.log('📨 Full first message object:', JSON.stringify(messagesData[0], null, 2));
          console.log('📨 created_at field:', {
            value: messagesData[0]?.created_at,
            type: typeof messagesData[0]?.created_at,
            isString: typeof messagesData[0]?.created_at === 'string',
            length: messagesData[0]?.created_at?.length,
            charCodes: messagesData[0]?.created_at && typeof messagesData[0].created_at === 'string' ? Array.from(messagesData[0].created_at as string).map((c: string) => c.charCodeAt(0)) : [],
          });
        }
        
        setMessages(messagesData);
        scrollToBottom();
        
        // Mark Toki as read when messages are loaded (only if there are messages)
        if (messagesData && messagesData.length > 0) {
          try {
            await actions.markTokiAsRead(tokiId);
            console.log('✅ [CHAT SCREEN] Toki marked as read:', tokiId);
          } catch (error) {
            console.error('❌ [CHAT SCREEN] Failed to mark Toki as read:', error);
          }
        } else {
          console.log('⏭️ [CHAT SCREEN] No messages to mark as read for Toki:', tokiId);
        }
      } catch (error) {
        console.error('❌ Failed to load Toki messages:', error);
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else if (conversationId) {
      // Load individual conversation messages
      setIsLoading(true);
      try {
        console.log('🔄 Loading messages for conversation:', conversationId);
        const messagesData = await actions.getConversationMessages(conversationId);
        console.log('✅ Messages loaded:', messagesData);
        
        // Deep inspection of the raw message data
        if (messagesData && messagesData.length > 0) {
          console.log('🔍 RAW MESSAGE INSPECTION:');
          console.log('📨 Full first message object:', JSON.stringify(messagesData[0], null, 2));
          console.log('📨 created_at field:', {
            value: messagesData[0]?.created_at,
            type: typeof messagesData[0]?.created_at,
            isString: typeof messagesData[0]?.created_at === 'string',
            length: messagesData[0]?.created_at?.length,
            charCodes: messagesData[0]?.created_at && typeof messagesData[0].created_at === 'string' ? Array.from(messagesData[0].created_at as string).map((c: string) => c.charCodeAt(0)) : [],
          });
        }
        
        setMessages(messagesData);
        scrollToBottom();
        
        // Mark conversation as read when messages are loaded (only if there are messages)
        if (messagesData && messagesData.length > 0) {
          try {
            await actions.markConversationAsRead(conversationId);
            console.log('✅ [CHAT SCREEN] Conversation marked as read:', conversationId);
          } catch (error) {
            console.error('❌ [CHAT SCREEN] Failed to mark conversation as read:', error);
          }
        } else {
          console.log('⏭️ [CHAT SCREEN] No messages to mark as read for conversation:', conversationId);
        }
      } catch (error) {
        console.error('❌ Failed to load messages:', error);
        Alert.alert('Error', 'Failed to load messages. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // No conversation yet - this is a new conversation
      console.log('🆕 New conversation - no messages to load');
      setIsLoading(false);
      setMessages([]);
    }
  };

  useEffect(() => {
    loadMessages();
    
    // Join appropriate room for real-time messages
    const setupSocketConnection = async () => {
      try {
        if (isGroup && tokiId) {
          // Join Toki group chat room
          console.log('🔌 [CHAT SCREEN] Joining Toki room:', tokiId);
          await socketService.joinToki(tokiId);
          
          // Check WebSocket connection status
          console.log('🔌 [CHAT SCREEN] WebSocket connection status:', socketService.getConnectionStatus());
          console.log('🔌 [CHAT SCREEN] Socket instance:', socketService.getSocket());
          console.log('🔌 [CHAT SCREEN] Current rooms before joining:', socketService.getCurrentRooms());
          
          // Listen for new Toki messages
          console.log('👂 [CHAT SCREEN] Setting up toki-message-received listener for Toki:', tokiId);
          socketService.onTokiMessageReceived((newMessage) => {
            console.log('📨 [CHAT SCREEN] Real-time Toki message received:', newMessage);
            console.log('📨 [CHAT SCREEN] Sender ID:', newMessage.sender_id);
            console.log('📨 [CHAT SCREEN] Current user ID:', state.currentUser?.id);
            console.log('📨 [CHAT SCREEN] Message content:', newMessage.content);
            console.log('🔍 [CHAT SCREEN] WEBSOCKET MESSAGE INSPECTION:');
            console.log('📨 [CHAT SCREEN] Full WebSocket message object:', JSON.stringify(newMessage, null, 2));
            console.log('📨 [CHAT SCREEN] WebSocket created_at field:', {
              value: newMessage.created_at,
              type: typeof newMessage.created_at,
              isString: typeof newMessage.created_at === 'string',
              length: newMessage.created_at?.length,
              charCodes: newMessage.created_at && typeof newMessage.created_at === 'string' ? Array.from(newMessage.created_at as string).map((c: string) => c.charCodeAt(0)) : [],
              formatted: formatMessageTimestamp(newMessage.created_at)
            });
            
            // Auto-mark as read since user is actively viewing this chat
            if (newMessage.sender_id !== state.currentUser?.id) {
              console.log('✅ [CHAT SCREEN] Auto-marking Toki as read (user is actively viewing)');
              debouncedMarkAsRead(tokiId, true);
            }
            
            setMessages(prev => {
              console.log('📨 Current messages count:', prev.length);
              console.log('📨 Current messages:', prev.map(m => ({ id: m.id, content: m.content, sender: m.sender_id, isOptimistic: m.isOptimistic })));
              
              // Check if this message should replace an optimistic message
              const optimisticIndex = prev.findIndex(msg => 
                msg.isOptimistic && 
                msg.content === newMessage.content && 
                msg.sender_id === newMessage.sender_id
              );
              
              // Check if this message already exists (non-optimistic)
              const messageExists = prev.some(msg => 
                !msg.isOptimistic && (
                  msg.id === newMessage.id || 
                  (msg.content === newMessage.content && 
                   msg.sender_id === newMessage.sender_id && 
                   Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 10000) // Within 10 seconds
                )
              );
              
              if (optimisticIndex !== -1) {
                // Replace optimistic message with real message
                console.log('📨 Replacing optimistic Toki message with real message at index:', optimisticIndex);
                const newMessages = [...prev];
                newMessages[optimisticIndex] = newMessage;
                console.log('📨 Replaced optimistic message, count remains:', newMessages.length);
                scrollToBottom();
                return newMessages;
              } else if (!messageExists) {
                console.log('📨 Adding new Toki message to state');
                const newMessages = [...prev, newMessage];
                console.log('📨 Added message to state, new count:', newMessages.length);
                scrollToBottom();
                return newMessages;
              } else {
                console.log('📨 Toki message already exists, skipping duplicate');
                console.log('📨 Duplicate details:', {
                  newMessage: { id: newMessage.id, content: newMessage.content, sender: newMessage.sender_id, time: newMessage.created_at },
                  existingMessages: prev.map(m => ({ id: m.id, content: m.content, sender: m.sender_id, time: m.created_at, isOptimistic: m.isOptimistic }))
                });
                return prev; // Return unchanged state
              }
            });
          });
        } else if (conversationId) {
          // Join individual conversation room
          console.log('🔌 [CHAT SCREEN] Joining conversation room:', conversationId);
          await socketService.joinConversation(conversationId);
          
          // Check WebSocket connection status
          console.log('🔌 [CHAT SCREEN] WebSocket connection status:', socketService.getConnectionStatus());
          console.log('🔌 [CHAT SCREEN] Socket instance:', socketService.getSocket());
          console.log('🔌 [CHAT SCREEN] Current rooms before joining:', socketService.getCurrentRooms());
          
          // Listen for new messages
          socketService.onMessageReceived((newMessage) => {
            console.log('📨 Real-time message received:', newMessage);
            console.log('🔍 WEBSOCKET MESSAGE INSPECTION:');
            console.log('📨 Full WebSocket message object:', JSON.stringify(newMessage, null, 2));
            console.log('📨 WebSocket created_at field:', {
              value: newMessage.created_at,
              type: typeof newMessage.created_at,
              isString: typeof newMessage.created_at === 'string',
              length: newMessage.created_at?.length,
              charCodes: newMessage.created_at && typeof newMessage.created_at === 'string' ? Array.from(newMessage.created_at as string).map((c: string) => c.charCodeAt(0)) : [],
              formatted: formatMessageTimestamp(newMessage.created_at)
            });
            
            // Auto-mark as read since user is actively viewing this chat
            if (newMessage.sender_id !== state.currentUser?.id) {
              console.log('✅ [CHAT SCREEN] Auto-marking conversation as read (user is actively viewing)');
              debouncedMarkAsRead(conversationId, false);
            }
            
            setMessages(prev => {
              console.log('📨 Current messages count:', prev.length);
              console.log('📨 Current messages:', prev.map(m => ({ id: m.id, content: m.content, sender: m.sender_id, isOptimistic: m.isOptimistic })));
              
              // Check if this message should replace an optimistic message
              const optimisticIndex = prev.findIndex(msg => 
                msg.isOptimistic && 
                msg.content === newMessage.content && 
                msg.sender_id === newMessage.sender_id
              );
              
              // Check if this message already exists (non-optimistic)
              const messageExists = prev.some(msg => 
                !msg.isOptimistic && (
                  msg.id === newMessage.id || 
                  (msg.content === newMessage.content && 
                   msg.sender_id === newMessage.sender_id && 
                   Math.abs(new Date(msg.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 10000) // Within 10 seconds
                )
              );
              
              if (optimisticIndex !== -1) {
                // Replace optimistic message with real message
                console.log('📨 Replacing optimistic message with real message at index:', optimisticIndex);
                const newMessages = [...prev];
                newMessages[optimisticIndex] = newMessage;
                console.log('📨 Replaced optimistic message, count remains:', newMessages.length);
                scrollToBottom();
                return newMessages;
              } else if (!messageExists) {
                console.log('📨 Adding new message to state');
                const newMessages = [...prev, newMessage];
                console.log('📨 Added message to state, new count:', newMessages.length);
                scrollToBottom();
                return newMessages;
              } else {
                console.log('📨 Message already exists, skipping duplicate');
                console.log('📨 Duplicate details:', {
                  newMessage: { id: newMessage.id, content: newMessage.content, sender: newMessage.sender_id, time: newMessage.created_at },
                  existingMessages: prev.map(m => ({ id: m.id, content: m.content, sender: m.sender_id, time: m.created_at, isOptimistic: m.isOptimistic }))
                });
                return prev; // Return unchanged state
              }
            });
          });
        } else {
          console.log('❌ No conversationId or tokiId provided');
        }
      } catch (error) {
        console.error('❌ [CHAT SCREEN] Error setting up socket connection:', error);
      }
    };

    // Setup socket connection
    setupSocketConnection();
    
    // Cleanup listeners when component unmounts
    return () => {
      console.log('🔌 Cleaning up WebSocket listeners (keeping rooms active)');
      
      // Clear mark-as-read timeout
      if (markAsReadTimeout) {
        clearTimeout(markAsReadTimeout);
      }
      
      // Remove event listeners but keep rooms active
      // Rooms will only be left when app is closed or connection is lost
      socketService.offMessageReceived();
      socketService.offTokiMessageReceived();
    };
  }, [conversationId, tokiId, isGroup]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Mark chat as read when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 [CHAT SCREEN] Chat screen focused, marking as read...');
      
      // Only mark as read if there are messages
      if (messages.length === 0) {
        console.log('⏭️ [CHAT SCREEN] No messages yet, skipping mark as read');
        return;
      }
      
      // Mark as read based on chat type
      if (isGroup && tokiId) {
        console.log('✅ [CHAT SCREEN] Marking Toki group chat as read on focus');
        debouncedMarkAsRead(tokiId, true);
      } else if (conversationId) {
        console.log('✅ [CHAT SCREEN] Marking conversation as read on focus');
        debouncedMarkAsRead(conversationId, false);
      }
      
      // Set up a timer to mark as read periodically while user is viewing
      const readTimer = setInterval(() => {
        // Only mark as read if there are messages
        if (messages.length === 0) {
          console.log('⏭️ [CHAT SCREEN] No messages in periodic check, skipping mark as read');
          return;
        }
        
        console.log('⏰ [CHAT SCREEN] Periodic read check - marking chat as read...');
        if (isGroup && tokiId) {
          debouncedMarkAsRead(tokiId, true);
        } else if (conversationId) {
          debouncedMarkAsRead(conversationId, false);
        }
      }, 30000); // Every 30 seconds
      
      return () => {
        console.log('🔄 [CHAT SCREEN] Chat screen losing focus, clearing read timer');
        clearInterval(readTimer);
      };
    }, [isGroup, tokiId, conversationId, messages.length])
  );

  const handleSendMessage = async () => {
    if (newMessage.trim() && !isSending) {
      const messageText = newMessage.trim();
      setNewMessage('');
      setIsSending(true);
      
      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: messageText,
        sender_id: state.currentUser?.id || '',
        sender_name: state.currentUser?.name || 'You',
        sender_avatar: state.currentUser?.avatar,
        created_at: new Date().toISOString(), // This is already in UTC
        message_type: 'text',
        isOptimistic: true
      };
      
      // Add optimistic message immediately
      console.log('📤 Adding optimistic message:', optimisticMessage);
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();
      
      try {
        let success = false;
        
        if (isGroup && tokiId) {
          // Send Toki group message
          console.log('📤 Sending message to Toki:', tokiId);
          success = await actions.sendTokiMessage(tokiId, messageText);
        } else if (dynamicConversationId) {
          // Send individual conversation message
          console.log('📤 Sending message to conversation:', dynamicConversationId);
          success = await actions.sendConversationMessage(dynamicConversationId, messageText);
        } else if (otherUserId) {
          // No conversation yet: create on first send
          console.log('🆕 Creating conversation with user:', otherUserId);
          const newConversationId = await actions.startConversation(otherUserId);
          if (newConversationId) {
            setDynamicConversationId(newConversationId);
            try {
              await socketService.joinConversation(newConversationId);
            } catch {}
            console.log('📤 Sending message to newly created conversation:', newConversationId);
            success = await actions.sendConversationMessage(newConversationId, messageText);
            // Refresh conversations so it appears in list
            actions.getConversations();
          } else {
            success = false;
          }
        }
        
        if (success) {
          console.log('📤 Message sent successfully, waiting for server response to replace optimistic message');
        } else {
          // Remove optimistic message and restore input on failure
          console.log('❌ Failed to send message, removing optimistic message');
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          Alert.alert('Error', 'Failed to send message. Please try again.');
          setNewMessage(messageText); // Restore the message if failed
        }
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        // Remove optimistic message and restore input on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', 'An unexpected error occurred.');
        setNewMessage(messageText); // Restore the message if failed
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);
    
    // Mark as read when user starts typing (indicates active engagement)
    if (text.length === 1) { // First character typed
      console.log('⌨️ [CHAT SCREEN] User started typing, marking chat as read...');
      if (isGroup && tokiId) {
        debouncedMarkAsRead(tokiId, true);
      } else if (conversationId) {
        debouncedMarkAsRead(conversationId, false);
      }
    }
    
    // Check if the last character is a newline (Enter key) - handle different line break types
    const hasNewline = text.includes('\n') || text.includes('\r') || text.includes('\r\n');
    if (hasNewline && text.trim() && !isSending) {
      console.log('↵️ [CHAT SCREEN] Newline detected in onChangeText!');
      console.log('↵️ [CHAT SCREEN] Text:', text);
      console.log('↵️ [CHAT SCREEN] Trimmed text:', text.trim());
      console.log('↵️ [CHAT SCREEN] Is sending:', isSending);
      console.log('↵️ [CHAT SCREEN] Text length:', text.length);
      console.log('↵️ [CHAT SCREEN] Contains \\n:', text.includes('\n'));
      console.log('↵️ [CHAT SCREEN] Contains \\r:', text.includes('\r'));
      console.log('↵️ [CHAT SCREEN] Contains \\r\\n:', text.includes('\r\n'));
      
      const messageText = text.trim();
      setNewMessage('');
      handleSendMessageWithText(messageText);
    }
  };

  const handleSendMessageWithText = async (messageText: string) => {
    if (messageText && !isSending) {
      setIsSending(true);
      
      // Create optimistic message
      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: messageText,
        sender_id: state.currentUser?.id || '',
        sender_name: state.currentUser?.name || 'You',
        sender_avatar: state.currentUser?.avatar,
        created_at: new Date().toISOString(), // This is already in UTC
        message_type: 'text',
        isOptimistic: true
      };
      
      // Add optimistic message immediately
      console.log('📤 Adding optimistic message (Enter key):', optimisticMessage);
      setMessages(prev => [...prev, optimisticMessage]);
      scrollToBottom();
      
      try {
        let success = false;
        
        if (isGroup && tokiId) {
          // Send Toki group message
          console.log('📤 Sending message to Toki:', tokiId);
          success = await actions.sendTokiMessage(tokiId, messageText);
        } else if (dynamicConversationId) {
          // Send individual conversation message
          console.log('📤 Sending message to conversation:', dynamicConversationId);
          success = await actions.sendConversationMessage(dynamicConversationId, messageText);
        } else if (otherUserId) {
          // No conversation yet: create on first send
          console.log('🆕 Creating conversation with user (Enter):', otherUserId);
          const newConversationId = await actions.startConversation(otherUserId);
          if (newConversationId) {
            setDynamicConversationId(newConversationId);
            try {
              await socketService.joinConversation(newConversationId);
            } catch {}
            console.log('📤 Sending message to newly created conversation:', newConversationId);
            success = await actions.sendConversationMessage(newConversationId, messageText);
            // Refresh conversations so it appears in list
            actions.getConversations();
          } else {
            success = false;
          }
        }
        
        if (success) {
          console.log('📤 Message sent successfully, waiting for server response to replace optimistic message');
        } else {
          // Remove optimistic message and restore input on failure
          console.log('❌ Failed to send message, removing optimistic message');
          setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
          Alert.alert('Error', 'Failed to send message. Please try again.');
          setNewMessage(messageText); // Restore the message if failed
        }
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        // Remove optimistic message and restore input on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        Alert.alert('Error', 'An unexpected error occurred.');
        setNewMessage(messageText); // Restore the message if failed
      } finally {
        setIsSending(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#F3E8FF', '#E0E7FF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <TouchableOpacity 
              onPress={() => {
                if (isGroup && tokiId) {
                  // For group chats, navigate to toki details
                  router.push({
                    pathname: '/toki-details',
                    params: { tokiId: tokiId }
                  });
                } else if (!isGroup && otherUserId) {
                  // For individual chats, navigate to user profile
                  router.push({
                    pathname: '/user-profile/[userId]',
                    params: { userId: otherUserId }
                  });
                }
              }}
            >
              <Text style={[
                styles.headerTitle,
                { textDecorationLine: 'underline' }
              ]}>
                {otherUserName || 'Chat'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.headerSubtitle}>
              {isGroup ? 'Group chat' : 'Direct message'}
            </Text>
          </View>
          {isGroup && tokiId && (
            <TouchableOpacity
              onPress={() => {
                setShowParticipantsModal(true);
                loadTokiParticipants();
              }}
            >
              <Users size={24} color="#8B5CF6" />
            </TouchableOpacity>
          )}
        </View>
        {!state.isConnected && (
          <View style={styles.connectionWarning}>
            <Text style={styles.connectionWarningText}>⚠️ Messages will be sent when connection is restored</Text>
          </View>
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          ref={scrollViewRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {isLoading ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>Loading messages...</Text>
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>No messages yet. Start the conversation!</Text>
            </View>
          ) : (
            messages.map((message: any) => {
              const isOwnMessage = message.sender_id === state.currentUser?.id;
              
              return (
                <Pressable
                  key={message.id}
                  style={[
                    styles.messageContainer,
                    isOwnMessage ? styles.currentUserMessage : styles.otherUserMessage
                  ]}
                  onLongPress={() => {
                    // Only allow reporting other users' messages
                    if (!isOwnMessage) {
                      handleReportMessage(message.id);
                    }
                  }}
                  android_ripple={{ color: 'rgba(0, 0, 0, 0.1)' }}
                >
                  {message.sender_id !== state.currentUser?.id && (
                    <Text style={styles.otherUserText}>{message.sender_name}</Text>
                  )}
                  <View style={[
                    styles.messageBubble,
                    message.sender_id === state.currentUser?.id ? styles.currentUserBubble : styles.otherUserBubble
                  ]}>
                    <Text style={[
                      styles.messageText,
                      message.sender_id === state.currentUser?.id ? styles.currentUserText : styles.otherUserText
                    ]}>
                      {message.content}
                    </Text>
                  </View>
                  <Text style={[
                    styles.timestamp,
                    message.sender_id === state.currentUser?.id ? styles.currentUserTimestamp : styles.otherUserTimestamp
                  ]}>
                    {formatMessageTimestamp(message.created_at)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={newMessage}
              onChangeText={handleTextChange}
              multiline
              maxLength={500}
              placeholderTextColor="#9CA3AF"
              editable={!isSending}
              returnKeyType="send"
              blurOnSubmit={false}
              textAlignVertical="top"
              numberOfLines={1}
              onSubmitEditing={() => {
                if (newMessage.trim() && !isSending) {
                  console.log('↵️ [CHAT SCREEN] onSubmitEditing triggered!');
                  handleSendMessage();
                }
              }}
              onKeyPress={({ nativeEvent }) => {
                console.log('⌨️ [CHAT SCREEN] Key pressed:', nativeEvent.key);
                if (nativeEvent.key === 'Enter' && newMessage.trim() && !isSending) {
                  console.log('↵️ [CHAT SCREEN] Enter key detected in onKeyPress!');
                  handleSendMessage();
                }
              }}
            />
            <TouchableOpacity style={styles.attachButton}>
              <ImageIcon size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[
              styles.sendButton, 
              (newMessage.trim() && !isSending) && styles.sendButtonActive
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            <Send size={20} color={(newMessage.trim() && !isSending) ? "#FFFFFF" : "#9CA3AF"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Report Message Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelReport}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Message</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for reporting this message. This helps us maintain a safe community.
            </Text>
            
            <TextInput
              style={styles.reportInput}
              placeholder="Enter reason for reporting..."
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              numberOfLines={3}
              maxLength={500}
              placeholderTextColor="#9CA3AF"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelReport}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.submitButton, 
                  !reportReason.trim() && styles.submitButtonDisabled
                ]} 
                onPress={submitReport}
                disabled={!reportReason.trim()}
              >
                <Text style={styles.submitButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Participants Modal - only show for group chats */}
      {isGroup && tokiId && (
        <ParticipantsModal
          visible={showParticipantsModal}
          participants={tokiParticipants}
          search={participantsSearch}
          onChangeSearch={setParticipantsSearch}
          isLoading={isLoadingParticipants}
          isHost={isUserHost}
          onClose={() => {
            setShowParticipantsModal(false);
            setParticipantsSearch('');
          }}
          onRemoveParticipant={handleRemoveParticipant}
        />
      )}
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
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  connectionWarning: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  connectionWarningText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    padding: 20,
    minHeight: '100%',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMessagesText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 16,
  },
  currentUserMessage: {
    alignItems: 'flex-end',
  },
  otherUserMessage: {
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#8B5CF6',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserBubble: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 6,
  },
  otherUserBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  currentUserText: {
    color: '#FFFFFF',
  },
  otherUserText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  currentUserTimestamp: {
    textAlign: 'right',
    marginRight: 12,
  },
  otherUserTimestamp: {
    textAlign: 'left',
    marginLeft: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    maxHeight: 100,
    minHeight: 20,
  },
  attachButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sendButtonActive: {
    backgroundColor: '#8B5CF6',
    shadowOpacity: 0.2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  reportInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
});
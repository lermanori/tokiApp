import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebSocketUrl } from './config';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private currentRooms: Set<string> = new Set(); // Track current rooms
  private connectionPromise: Promise<void> | null = null;

  async connect() {
    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, return immediately
    if (this.isConnected && this.socket?.connected) {
      return Promise.resolve();
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = getWebSocketUrl();
        console.info('🔌 [FRONTEND] Attempting to connect to WebSocket at:', wsUrl);
        
        // For now, connect without authentication to test
        this.socket = io(wsUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
          timeout: 20000,
        });

        this.socket.on('connect', () => {
          console.info('🔌 [FRONTEND] WebSocket connected, socket ID:', this.socket?.id);
          console.debug('🔌 [FRONTEND] Connection URL:', wsUrl);
          console.debug('🔌 [FRONTEND] Connection state:', this.socket?.connected);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Rejoin rooms after reconnection
          this.rejoinRooms();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.info('🔌 [FRONTEND] WebSocket disconnected, reason:', reason);
          console.debug('🔌 [FRONTEND] Current rooms at disconnect:', Array.from(this.currentRooms));
          this.isConnected = false;
          
          if (this.connectionPromise) {
            this.connectionPromise = null;
          }
        });

        this.socket.on('connect_error', (error) => {
          console.error('❌ [FRONTEND] WebSocket connection error:', error);
          this.reconnectAttempts++;
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ [FRONTEND] Max reconnection attempts reached');
            reject(error);
          }
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.info('🔌 [FRONTEND] WebSocket reconnected after', attemptNumber, 'attempts');
          this.isConnected = true;
          // Rejoin rooms after reconnection
          this.rejoinRooms();
        });

        this.socket.on('reconnect_error', (error) => {
          console.error('❌ [FRONTEND] WebSocket reconnection error:', error);
        });

        this.socket.on('reconnect_failed', () => {
          console.error('❌ [FRONTEND] WebSocket reconnection failed');
          this.isConnected = false;
          this.connectionPromise = null;
        });

        // Set a timeout for connection
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        console.error('❌ [FRONTEND] Failed to connect to WebSocket:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  async ensureConnected() {
    if (this.isConnected && this.socket?.connected) {
      return;
    }
    
    await this.connect();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentRooms.clear();
      this.connectionPromise = null;
    }
  }

  // Join user to their personal room
  async joinUser(userId: string) {
    await this.ensureConnected();
    
    if (this.socket && this.isConnected) {
      const roomName = `user-${userId}`;
      this.socket.emit('join-user', userId);
      this.currentRooms.add(roomName);
      console.debug('👤 [FRONTEND] Joined user room:', userId);
    }
  }

  // Join conversation room
  async joinConversation(conversationId: string) {
    await this.ensureConnected();
    
    console.debug('🔌 [FRONTEND] Attempting to join conversation:', conversationId);
    console.debug('🔌 [FRONTEND] Socket connected:', this.isConnected);
    console.debug('🔌 [FRONTEND] Socket instance:', !!this.socket);
    
    if (this.socket && this.isConnected) {
      const roomName = `conversation-${conversationId}`;
      this.socket.emit('join-conversation', conversationId);
      this.currentRooms.add(roomName);
      console.debug('👤 [FRONTEND] Joined conversation room:', roomName);
      console.debug('👤 [FRONTEND] Current rooms:', Array.from(this.currentRooms));
    } else {
      console.warn('❌ [FRONTEND] Cannot join conversation - socket not connected');
    }
  }

  // Join Toki group chat
  async joinToki(tokiId: string) {
    await this.ensureConnected();
    
    console.debug('🏷️ [FRONTEND] Attempting to join Toki:', tokiId);
    console.debug('🏷️ [FRONTEND] Socket connected:', this.isConnected);
    console.debug('🏷️ [FRONTEND] Socket instance:', !!this.socket);
    console.debug('🏷️ [FRONTEND] Socket ID:', this.socket?.id);
    
    if (this.socket && this.isConnected) {
      const roomName = `toki-${tokiId}`;
      console.debug('🏷️ [FRONTEND] Emitting join-toki event for room:', roomName);
      this.socket.emit('join-toki', tokiId);
      this.currentRooms.add(roomName);
      console.debug('🏷️ [FRONTEND] Successfully joined Toki chat room:', roomName);
      console.debug('🏷️ [FRONTEND] Current rooms:', Array.from(this.currentRooms));
    } else {
      console.warn('❌ [FRONTEND] Cannot join Toki - socket not connected');
      console.debug('❌ [FRONTEND] Socket status:', {
        socket: !!this.socket,
        isConnected: this.isConnected,
        socketId: this.socket?.id
      });
    }
  }

  // Leave a specific room
  leaveRoom(roomName: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave-room', roomName);
      this.currentRooms.delete(roomName);
      console.debug('🚪 [FRONTEND] Left room:', roomName);
    }
  }

  // Leave conversation room
  leaveConversation(conversationId: string) {
    const roomName = `conversation-${conversationId}`;
    this.leaveRoom(roomName);
  }

  // Leave Toki group chat
  leaveToki(tokiId: string) {
    const roomName = `toki-${tokiId}`;
    this.leaveRoom(roomName);
  }

  // Rejoin all rooms after reconnection
  private async rejoinRooms() {
    console.debug('🔄 [FRONTEND] Rejoining rooms after reconnection...');
    const roomsToRejoin = Array.from(this.currentRooms);
    
    for (const roomName of roomsToRejoin) {
      if (roomName.startsWith('user-')) {
        const userId = roomName.replace('user-', '');
        await this.joinUser(userId);
      } else if (roomName.startsWith('conversation-')) {
        const conversationId = roomName.replace('conversation-', '');
        await this.joinConversation(conversationId);
      } else if (roomName.startsWith('toki-')) {
        const tokiId = roomName.replace('toki-', '');
        await this.joinToki(tokiId);
      }
    }
  }

  // Listen for new messages in conversation
  onMessageReceived(callback: (message: any) => void) {
    if (this.socket) {
      console.debug('👂 [FRONTEND] Setting up message-received listener');
      console.debug('👂 [FRONTEND] Socket ID when setting up listener:', this.socket.id);
      console.debug('👂 [FRONTEND] Socket connected state when setting up listener:', this.socket.connected);
      
      this.socket.on('message-received', (message) => {
        console.debug('📨 [FRONTEND] RECEIVED EVENT: message-received');
        console.debug('📨 [FRONTEND] Message data:', message);
        console.debug('📨 [FRONTEND] Current rooms:', Array.from(this.currentRooms));
        callback(message);
      });
    } else {
      console.warn('❌ [FRONTEND] Cannot set up message-received listener - no socket');
    }
  }

  // Listen for new messages in Toki group
  onTokiMessageReceived(callback: (message: any) => void) {
    if (this.socket) {
      console.debug('👂 [FRONTEND] Setting up toki-message-received listener');
      console.debug('👂 [FRONTEND] Socket ID when setting up listener:', this.socket.id);
      console.debug('👂 [FRONTEND] Socket connected state when setting up listener:', this.socket.connected);
      
      this.socket.on('toki-message-received', (message) => {
        console.debug('📨 [FRONTEND] RECEIVED EVENT: toki-message-received');
        console.debug('📨 [FRONTEND] Message data:', message);
        console.debug('📨 [FRONTEND] Current rooms:', Array.from(this.currentRooms));
        callback(message);
      });
    } else {
      console.warn('❌ [FRONTEND] Cannot set up toki-message-received listener - no socket');
    }
  }

  // Remove message listeners
  offMessageReceived() {
    if (this.socket) {
      this.socket.off('message-received');
    }
  }

  offTokiMessageReceived() {
    if (this.socket) {
      this.socket.off('toki-message-received');
    }
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Get current rooms for debugging
  getCurrentRooms(): string[] {
    return Array.from(this.currentRooms);
  }
}

// Export singleton instance
export const socketService = new SocketService(); 
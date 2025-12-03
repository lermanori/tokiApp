import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Heart, Share } from 'lucide-react-native';
import { router } from 'expo-router';
import { getActivityPhoto } from '@/utils/activityPhotos';
import FriendsGoingOverlay, { Friend } from './FriendsGoingOverlay';

interface TokiHeaderProps {
  toki: {
    id: string;
    image: string;
    category: string;
  };
  fromEdit?: boolean;
  isLiked: boolean;
  isSaving: boolean;
  onSaveToggle: () => void;
  onShare: () => void;
  onBack: () => void;
  friendsAttending?: Friend[];
  onFriendsPress?: () => void;
}

export default function TokiHeader({
  toki,
  fromEdit,
  isLiked,
  isSaving,
  onSaveToggle,
  onShare,
  onBack,
  friendsAttending,
  onFriendsPress
}: TokiHeaderProps) {
  return (
    <View style={styles.imageContainer}>
      <Image
        source={{
          uri: toki.image || getActivityPhoto(toki.category || 'social')
        }}
        style={styles.headerImage}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'transparent']}
        style={styles.headerGradient}
      />
      
      {/* Friends Going Overlay - Top Left */}
      {friendsAttending && friendsAttending.length > 0 && (
        <FriendsGoingOverlay friends={friendsAttending} onPress={onFriendsPress} />
      )}
      
      {/* Back Button */}
      <TouchableOpacity style={styles.backButtonHeader} onPress={onBack}>
        <ArrowLeft size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      {/* Action Buttons */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[styles.actionButton, isLiked && styles.likedButton]}
          onPress={onSaveToggle}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.loadingSpinner}>
              <Text style={styles.loadingText}>...</Text>
            </View>
          ) : (
            <Heart
              size={20}
              color={isLiked ? "#8B5CF6" : "#FFFFFF"}
              fill={isLiked ? "#8B5CF6" : "transparent"}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onShare}>
          <Share size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: 1200,
    alignSelf: 'center',
  },
  headerImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    resizeMode: 'cover',
    maxHeight: 600,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  backButtonHeader: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerActions: {
    position: 'absolute',
    top: 50,
    right: 20,
    flexDirection: 'row',
    gap: 10,
    zIndex: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likedButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  loadingSpinner: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

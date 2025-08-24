import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Star, X, Send, CheckCircle } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

interface RatingPromptProps {
  visible: boolean;
  tokiId: string;
  tokiTitle: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
    isHost: boolean;
  }>;
  onClose: () => void;
  onRatingsSubmitted?: () => void; // Callback when ratings are successfully submitted
  onNavigateToExplore?: () => void; // Callback to navigate to explore page
}

interface UserRating {
  userId: string;
  rating: number;
  reviewText: string;
}

const RatingPrompt: React.FC<RatingPromptProps> = ({
  visible,
  tokiId,
  tokiTitle,
  participants,
  onClose,
  onRatingsSubmitted,
  onNavigateToExplore,
}) => {
  const { actions, state } = useApp();
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [currentUserIndex, setCurrentUserIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alreadyRatedUsers, setAlreadyRatedUsers] = useState<Set<string>>(new Set());
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submittedRatingCount, setSubmittedRatingCount] = useState(0);
  const [progressWidth, setProgressWidth] = useState(0);

  // Check if users are already rated
  const checkAlreadyRatedUsers = async () => {
    try {
      if (state.currentUser?.id) {
        console.log('🚀 Checking for already rated users...');
        
        // Use the new API endpoint to check which users are already rated
        const response = await actions.checkRatingsForToki(tokiId);
        if (response && response.data) {
          const alreadyRatedIds = response.data.alreadyRatedUserIds || [];
          setAlreadyRatedUsers(new Set(alreadyRatedIds));
          console.log('🚀 Already rated users:', alreadyRatedIds);
        }
      }
    } catch (error) {
      console.error('❌ Error checking already rated users:', error);
    }
  };

  // Initialize ratings for all participants
  useEffect(() => {
    if (visible && participants.length > 0) {
      // Check for already rated users
      checkAlreadyRatedUsers();
      
      // Filter out the current user (no self-rating)
      const currentUserId = state.currentUser?.id;
      const participantsToRate = participants.filter(p => p.id !== currentUserId);
      
      // If no participants to rate (only host), skip rating and complete event
      if (participantsToRate.length === 0) {
        console.log('🚀 No participants to rate, skipping rating flow');
        if (onRatingsSubmitted) {
          console.log('🚀 Calling onRatingsSubmitted callback...');
          // Use setTimeout to ensure the callback executes before closing
          setTimeout(() => {
            onRatingsSubmitted();
            onClose();
          }, 100);
        } else {
          onClose();
        }
        return;
      }
      
      const initialRatings = participantsToRate.map(participant => ({
        userId: participant.id,
        rating: 0,
        reviewText: '',
      }));
      setRatings(initialRatings);
      setCurrentUserIndex(0);
    }
  }, [visible, participants, state.currentUser?.id, onRatingsSubmitted, onClose]);

  const handleRatingChange = (rating: number) => {
    setRatings(prev => 
      prev.map((r, index) => 
        index === currentUserIndex ? { ...r, rating } : r
      )
    );
  };

  const handleReviewTextChange = (text: string) => {
    setRatings(prev => 
      prev.map((r, index) => 
        index === currentUserIndex ? { ...r, reviewText: text } : r
      )
    );
  };

  const handleNext = () => {
    if (currentUserIndex < participants.length - 1) {
      setCurrentUserIndex(currentUserIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentUserIndex > 0) {
      setCurrentUserIndex(currentUserIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentUserIndex < participants.length - 1) {
      handleNext();
    } else {
      // If this is the last user, close the rating prompt
      onClose();
    }
  };

  const skipToNextUnratedUser = () => {
    let nextIndex = currentUserIndex + 1;
    
    // Find the next user that hasn't been rated
    while (nextIndex < participants.length) {
      const nextUser = participants[nextIndex];
      if (nextUser.id !== state.currentUser?.id && !alreadyRatedUsers.has(nextUser.id)) {
        setCurrentUserIndex(nextIndex);
        return;
      }
      nextIndex++;
    }
    
    // If no more unrated users, close the rating prompt
    onClose();
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      // Filter out ratings with no stars and already rated users
      const validRatings = ratings.filter(r => r.rating > 0 && !alreadyRatedUsers.has(r.userId));
      
      if (validRatings.length === 0) {
        Alert.alert('No Ratings', 'Please provide at least one rating before submitting.');
        return;
      }

      console.log('🚀 Submitting ratings:', validRatings);
      console.log('🚀 Toki ID:', tokiId);
      console.log('🚀 Actions available:', Object.keys(actions));

      // Submit all ratings
      const ratingPromises = validRatings.map(rating => {
        console.log('🚀 Submitting rating for user:', rating.userId, 'with', rating.rating, 'stars');
        return actions.submitRating(rating.userId, tokiId, rating.rating, rating.reviewText);
      });

      const results = await Promise.all(ratingPromises);
      const successCount = results.filter(result => result).length;

      console.log('📊 Rating submission results:', { results, successCount });

      if (successCount > 0) {
        // Store the count for the modal
        setSubmittedRatingCount(successCount);
        
        // Show custom success modal instead of alert
        setShowSuccessModal(true);
        
        // Animate progress bar
        setProgressWidth(0);
        const progressInterval = setInterval(() => {
          setProgressWidth(prev => {
            if (prev >= 100) {
              clearInterval(progressInterval);
              return 100;
            }
            return prev + 3.33; // 100% over 3 seconds (30 * 3.33 = 100)
          });
        }, 100);
        
        // Auto-close modal after 3 seconds and execute callbacks
        setTimeout(() => {
          setShowSuccessModal(false);
          
          // Notify parent that ratings were submitted successfully
          if (onRatingsSubmitted) {
            console.log('🚀 Calling onRatingsSubmitted callback...');
            onRatingsSubmitted();
          }
          onClose();
          
          // Also navigate directly to ensure navigation happens
          if (onNavigateToExplore) {
            console.log('🚀 Navigating to explore page directly...');
            onNavigateToExplore();
          }
        }, 3000);
      } else {
        Alert.alert(
          'Submission Failed',
          'Failed to submit ratings. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error submitting ratings:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentParticipant = participants[currentUserIndex];
  const currentRating = ratings[currentUserIndex];

  if (!currentParticipant || !currentRating) {
    return null;
  }

  // If no participants to rate, show message and close
  if (ratings.length === 0) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.title}>No Participants to Rate</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.noParticipantsContainer}>
            <Text style={styles.noParticipantsText}>
              There are no other participants to rate for this event.
            </Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => {
                onClose();
                // Navigate to explore page if callback is provided
                if (onNavigateToExplore) {
                  onNavigateToExplore();
                }
              }}
            >
              <Text style={styles.closeButtonText}>Go to Explore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const hasRating = currentRating.rating > 0;
  const isLastUser = currentUserIndex === participants.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>Rate Your Experience</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentUserIndex + 1} of {participants.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentUserIndex + 1) / participants.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Toki Info */}
        <View style={styles.tokiInfo}>
          <Text style={styles.tokiTitle}>{tokiTitle}</Text>
          <Text style={styles.tokiSubtitle}>How was your experience with:</Text>
        </View>

        {/* User to Rate */}
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {currentParticipant.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{currentParticipant.name}</Text>
              <Text style={styles.userRole}>
                {currentParticipant.isHost ? 'Host' : 'Participant'}
              </Text>
              {alreadyRatedUsers.has(currentParticipant.id) && (
                <Text style={styles.alreadyRatedText}>Already Rated ✓</Text>
              )}
            </View>
          </View>
        </View>

        {/* Rating Stars */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Rate this user:</Text>
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRatingChange(star)}
                style={styles.starButton}
              >
                <Star
                  size={32}
                  color={star <= currentRating.rating ? '#FFD700' : '#E5E7EB'}
                  fill={star <= currentRating.rating ? '#FFD700' : 'transparent'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingText}>
            {currentRating.rating > 0 ? `${currentRating.rating} star${currentRating.rating > 1 ? 's' : ''}` : 'Select rating'}
          </Text>
        </View>

        {/* Review Text */}
        <View style={styles.reviewSection}>
          <Text style={styles.reviewLabel}>Optional Review (max 500 characters):</Text>
          <TextInput
            style={styles.reviewInput}
            multiline
            numberOfLines={4}
            placeholder="Share your experience with this user..."
            value={currentRating.reviewText}
            onChangeText={handleReviewTextChange}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>
            {currentRating.reviewText.length}/500
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <View style={styles.navigationButtons}>
            {currentUserIndex > 0 && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={handlePrevious}
              >
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {/* Show "Skip User" if current user is already rated, otherwise show regular Skip */}
            {alreadyRatedUsers.has(currentParticipant.id) ? (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={skipToNextUnratedUser}
              >
                <Text style={styles.skipButtonText}>Skip User</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
              >
                <Text style={styles.skipButtonText}>
                  {isLastUser ? 'Skip All' : 'Skip'}
                </Text>
              </TouchableOpacity>
            )}

            {currentUserIndex < participants.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, !hasRating && styles.navButtonDisabled]}
                onPress={handleNext}
                disabled={!hasRating}
              >
                <Text style={[styles.navButtonText, !hasRating && styles.navButtonTextDisabled]}>
                  Next
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          {isLastUser && hasRating && (
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Send size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Submitting...' : 'Submit Ratings'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <CheckCircle size={60} color="#10B981" />
            </View>
            
            <Text style={styles.successTitle}>Ratings Submitted!</Text>
            <Text style={styles.successMessage}>
              Successfully submitted {submittedRatingCount} rating{submittedRatingCount > 1 ? 's' : ''}!
            </Text>
            
            <View style={styles.successProgressContainer}>
              <View style={styles.successProgressBar}>
                <View style={[styles.successProgressFill, { width: `${progressWidth}%` }]} />
              </View>
              <Text style={styles.successProgressText}>Redirecting to explore page...</Text>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  tokiInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tokiTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  tokiSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  userSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  alreadyRatedText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    marginTop: 4,
  },
  ratingSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  reviewSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  reviewLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 12,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#10B981',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  skipButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  noParticipantsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noParticipantsText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  successModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 25,
  },
  successProgressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 10,
  },
  successProgressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  successProgressText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
});

export default RatingPrompt;

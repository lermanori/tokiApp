import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { CalloutSubview } from 'react-native-maps';

type EventItem = {
  id: string;
  title: string;
  category: string;
  location: string;
  attendees?: number;
  maxAttendees?: number;
  coordinate?: { latitude: number; longitude: number };
};

interface ClusterCalloutProps {
  events: EventItem[];
  onEventPress: (event: EventItem) => void;
}

const CALLOUT_WIDTH = 200;

export default function ClusterCallout({ events, onEventPress }: ClusterCalloutProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const itemWidth = CALLOUT_WIDTH - 24; // Account for container padding

  const goToNext = () => {
    if (currentIndex < events.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({ x: nextIndex * itemWidth, animated: true });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      scrollViewRef.current?.scrollTo({ x: prevIndex * itemWidth, animated: true });
    }
  };

  const handleScroll = (event: any) => {
    // Don't update index during scroll to prevent jumping
    // Only update on scroll end
  };

  const handleScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / itemWidth);
    if (index >= 0 && index < events.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  return (
    <View style={styles.calloutContainer}>
      <View style={styles.header}>
        <Text style={styles.calloutTitle}>{events.length} events here</Text>
        <Text style={styles.pageIndicator}>{currentIndex + 1} / {events.length}</Text>
      </View>

      <View style={styles.galleryContainer}>
        {/* Gallery ScrollView */}
         <ScrollView
           ref={scrollViewRef}
           horizontal
           pagingEnabled
           showsHorizontalScrollIndicator={false}
           onMomentumScrollEnd={handleScrollEnd}
           onScrollEndDrag={handleScrollEnd}
           decelerationRate="fast"
           style={styles.galleryScroll}
           contentContainerStyle={styles.galleryContent}
         >
          {events.map((ev, index) => (
            <View key={ev.id} style={styles.galleryItem}>
              <CalloutSubview
                onPress={() => {
                  console.log('🧭 [MAP] Callout gallery item pressed → onEventPress()', {
                    eventId: ev.id,
                    title: ev.title,
                    index,
                  });
                  onEventPress(ev);
                }}
              >
                <Text
                  style={styles.calloutLink}
                  numberOfLines={2}
                >
                  {ev.title}
                </Text>
              </CalloutSubview>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{ev.category}</Text>
                </View>
                {typeof ev.attendees === 'number' && typeof ev.maxAttendees === 'number' && (
                  <Text style={styles.metaText}>{`${ev.attendees}/${ev.maxAttendees} people`}</Text>
                )}
              </View>
              {!!ev.location && (
                <Text style={styles.locationText} numberOfLines={2}>{ev.location}</Text>
              )}
            </View>
          ))}
        </ScrollView>

      </View>

       {/* Page Dots Indicator with Navigation */}
       {events.length > 1 && (
         <View style={styles.dotsAndNavContainer}>
           <View style={[
             styles.navButton,
             currentIndex === 0 && styles.navButtonDisabled
           ]}>
             {currentIndex > 0 ? (
               <CalloutSubview
                 onPress={() => {
                   console.log('🧭 [MAP] Left nav button pressed');
                   goToPrevious();
                 }}
               >
                 <Text style={styles.navButtonText}>‹</Text>
               </CalloutSubview>
             ) : (
               <Text style={[styles.navButtonText, styles.navButtonTextDisabled]}>‹</Text>
             )}
           </View>

           <View style={styles.dotsContainer}>
             {events.map((_, index) => (
               <View
                 key={index}
                 style={[
                   styles.dot,
                   index === currentIndex && styles.dotActive
                 ]}
               />
             ))}
           </View>

           <View style={[
             styles.navButton,
             currentIndex === events.length - 1 && styles.navButtonDisabled
           ]}>
             {currentIndex < events.length - 1 ? (
               <CalloutSubview
                 onPress={() => {
                   console.log('🧭 [MAP] Right nav button pressed');
                   goToNext();
                 }}
               >
                 <Text style={styles.navButtonText}>›</Text>
               </CalloutSubview>
             ) : (
               <Text style={[styles.navButtonText, styles.navButtonTextDisabled]}>›</Text>
             )}
           </View>
         </View>
       )}
    </View>
  );
}

const styles = StyleSheet.create({
  calloutContainer: {
    width: CALLOUT_WIDTH,
    padding: 12,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1C1C1C',
    flex: 1,
  },
  pageIndicator: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  galleryContainer: {
    position: 'relative',
    height: 100,
    marginBottom: 8,
    marginTop: 4,
  },
  galleryScroll: {
    flex: 1,
    width: CALLOUT_WIDTH - 24, // Match item width for proper paging
  },
  galleryContent: {
    alignItems: 'center',
  },
  galleryItem: {
    width: CALLOUT_WIDTH - 24, // Account for container padding, must match galleryScroll width
    paddingHorizontal: 4,
  },
  dotsAndNavContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
    flexShrink: 0,
    marginHorizontal: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 20,
    color: '#4F46E5',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  navButtonTextDisabled: {
    color: '#9CA3AF',
  },
  calloutLink: {
    fontSize: 13,
    color: '#4F46E5',
    textDecorationLine: 'underline',
    flexShrink: 1,
    fontWeight: '600',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 999,
    marginRight: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#6D28D9',
    fontSize: 10,
    fontWeight: '600'
  },
  metaText: {
    color: '#6B7280',
    fontSize: 11,
    marginRight: 8
  },
  locationText: {
    color: '#6B7280',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#8B5CF6',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});


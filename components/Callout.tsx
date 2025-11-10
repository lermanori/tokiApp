import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type EventItem = {
  id: string;
  title: string;
  category: string;
  location: string;
  attendees?: number;
  maxAttendees?: number;
  coordinate?: { latitude: number; longitude: number };
};

interface CalloutProps {
  event: EventItem;
}

const formatAttendees = (attendees?: number, maxAttendees?: number) => {
  const a = attendees ?? 0;
  const m = maxAttendees ?? 0;
  return `${a}/${m} people`;
};

export default function Callout({ event }: CalloutProps) {
  return (
    <View style={styles.calloutContainer}>
      <Text style={styles.calloutTitle}>{event.title}</Text>
      <Text style={styles.calloutCategory}>{event.category}</Text>
      <Text style={styles.calloutLocation}>{event.location}</Text>
      <Text style={styles.calloutAttendees}>{formatAttendees(event.attendees, event.maxAttendees)}</Text>
      <View style={styles.calloutButton}>
        <Text style={styles.calloutButtonText}>View Details</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calloutContainer: { width: 200, padding: 12 },
  calloutTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: '#1C1C1C', marginBottom: 4 },
  calloutCategory: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#B49AFF', marginBottom: 4 },
  calloutLocation: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#666666', marginBottom: 4 },
  calloutAttendees: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#666666', marginBottom: 8 },
  calloutButton: { backgroundColor: '#B49AFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  calloutButtonText: { fontSize: 12, fontFamily: 'Inter-Medium', color: '#FFFFFF' },
});


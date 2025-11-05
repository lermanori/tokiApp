import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function JoinTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Join Test Route Works!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  text: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1C1C1C',
  },
});


















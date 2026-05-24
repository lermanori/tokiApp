import React, { forwardRef } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  imageUri?: string;
}

export const BG_WIDTH = 1080;
export const BG_HEIGHT = 1920;

const TokiStoryBackground = forwardRef<View, Props>(({ imageUri }, ref) => {
  return (
    <View ref={ref} collapsable={false} style={styles.container}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          blurRadius={28}
          resizeMode="cover"
        />
      ) : null}
      <LinearGradient
        colors={imageUri
          ? ['rgba(91,33,182,0.55)', 'rgba(17,24,39,0.85)']
          : ['#8B5CF6', '#5B21B6', '#111827']}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
});

TokiStoryBackground.displayName = 'TokiStoryBackground';

const styles = StyleSheet.create({
  container: {
    width: BG_WIDTH,
    height: BG_HEIGHT,
    backgroundColor: '#5B21B6',
    overflow: 'hidden',
  },
});

export default TokiStoryBackground;

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { 
  Coffee, 
  Briefcase, 
  Music, 
  Heart, 
  Palette, 
  Utensils, 
  TreePine, 
  Wine, 
  PartyPopper,
  Users,
  Dumbbell,
  Camera,
  BookOpen,
  Gamepad2,
  ShoppingBag,
  Plane
} from 'lucide-react-native';

interface TokiIconProps {
  category: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: any;
}

export const TokiIcon: React.FC<TokiIconProps> = ({ 
  category, 
  size = 24, 
  color = '#FFFFFF', 
  backgroundColor = '#B49AFF',
  style 
}) => {
  const getIcon = () => {
    switch (category.toLowerCase()) {
      case 'coffee':
        return <Coffee size={size} color={color} />;
      case 'work':
      case 'coworking':
        return <Briefcase size={size} color={color} />;
      case 'music':
      case 'jazz':
        return <Music size={size} color={color} />;
      case 'wellness':
      case 'yoga':
        return <Heart size={size} color={color} />;
      case 'art':
      case 'culture':
        return <Palette size={size} color={color} />;
      case 'food':
      case 'dinner':
        return <Utensils size={size} color={color} />;
      case 'nature':
      case 'picnic':
        return <TreePine size={size} color={color} />;
      case 'drinks':
      case 'wine':
        return <Wine size={size} color={color} />;
      case 'party':
        return <PartyPopper size={size} color={color} />;
      case 'gathering':
      case 'social':
        return <Users size={size} color={color} />;
      case 'sports':
      case 'fitness':
        return <Dumbbell size={size} color={color} />;
      case 'photography':
        return <Camera size={size} color={color} />;
      case 'reading':
      case 'book':
        return <BookOpen size={size} color={color} />;
      case 'gaming':
        return <Gamepad2 size={size} color={color} />;
      case 'shopping':
        return <ShoppingBag size={size} color={color} />;
      case 'travel':
        return <Plane size={size} color={color} />;
      default:
        return <Users size={size} color={color} />;
    }
  };

  return (
    <View style={[
      styles.iconContainer,
      {
        backgroundColor,
        width: size + 16,
        height: size + 16,
        borderRadius: (size + 16) / 2,
      },
      style
    ]}>
      {getIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default TokiIcon;
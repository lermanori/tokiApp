import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { SearchUser } from '@/hooks/useDiscoverFilters';

interface UserSearchCardProps {
    user: SearchUser;
}

const DEFAULT_AVATAR = 'https://res.cloudinary.com/dsq1ocdl1/image/upload/v1770670984/wanderercreative-blank-profile-picture-973460_1920_smqcnp.jpg';

export default function UserSearchCard({ user }: UserSearchCardProps) {
    const handlePress = () => {
        router.push({
            pathname: '/user-profile/[userId]',
            params: { userId: user.id },
        });
    };

    return (
        <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
            <Image
                source={{ uri: user.avatar || DEFAULT_AVATAR }}
                style={styles.avatar}
            />
            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                        {user.name}
                    </Text>
                    {user.verified && (
                        <CheckCircle size={14} color="#B49AFF" style={{ marginLeft: 4 }} />
                    )}
                </View>
                {user.bio ? (
                    <Text style={styles.bio} numberOfLines={1}>
                        {user.bio}
                    </Text>
                ) : null}
                {user.location ? (
                    <View style={styles.locationRow}>
                        <MapPin size={10} color="#9CA3AF" />
                        <Text style={styles.locationText} numberOfLines={1}>
                            {user.location}
                        </Text>
                    </View>
                ) : null}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 10,
        marginRight: 10,
        width: 200,
        borderWidth: 1,
        borderColor: '#F0EAFF',
        shadowColor: '#B49AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#F3F4F6',
    },
    info: {
        flex: 1,
        marginLeft: 10,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#1C1C1C',
        flexShrink: 1,
    },
    bio: {
        fontSize: 12,
        fontFamily: 'Inter-Regular',
        color: '#6B7280',
        marginTop: 2,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
        gap: 3,
    },
    locationText: {
        fontSize: 11,
        fontFamily: 'Inter-Regular',
        color: '#9CA3AF',
        flexShrink: 1,
    },
});

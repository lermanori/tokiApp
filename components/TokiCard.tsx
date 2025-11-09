import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { MapPin, Users, Heart, Clock, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import TokiIcon from './TokiIcon';
import { useApp } from '@/contexts/AppContext';
import { getActivityPhoto } from '@/utils/activityPhotos';
import { formatDistanceDisplay } from '@/utils/distance';
import { getCategoryColor, getCategoryEmoji, getCategoryLabel } from '@/utils/categories';

export interface TokiCardProps {
    toki: {
        id: string;
        title: string;
        description: string;
        location: string;
        time: string;
        attendees: number;
        maxAttendees: number;
        category: string;
        image: string;
        images?: Array<{ url: string; publicId: string }>; // Add support for multiple images
        host: {
            id: string;
            name: string;
            avatar: string;
        };
        distance?: {
            km: number;
            miles: number;
        } | string; // Support both new distance object and legacy string
        tags?: string[];
        isHostedByUser?: boolean; // Added for status badge
        joinStatus?: 'not_joined' | 'pending' | 'approved' | 'joined'; // Added for status badge
        scheduledTime?: string; // Added for actual scheduled time display
        visibility?: 'public' | 'private' | 'connections' | 'friends';
        isSaved?: boolean;
    };
    onPress: () => void;
    onHostPress?: () => void;
}

// Helper functions now imported from centralized categories
const getActivityEmoji = getCategoryEmoji;
const getActivityLabel = getCategoryLabel;

// Helper function to determine text color based on background brightness
const getTextColorForBackground = (backgroundColor: string) => {
    // Convert hex to RGB
    const hex = backgroundColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate brightness (YIQ formula)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    // Return white for dark backgrounds, dark for light backgrounds
    return brightness > 128 ? '#1C1C1C' : '#FFFFFF';
};

// Helper function to get join status color
const getJoinStatusColor = (toki: TokiCardProps['toki']) => {
    if (toki.isHostedByUser) return '#B49AFF'; // Hosting - soft purple

    switch (toki.joinStatus) {
        case 'not_joined': return '#4DC4AA'; // I want to join - pastel green
        case 'pending': return '#F9E79B'; // Request pending - soft yellow
        case 'approved': return '#A7F3D0'; // Approved - light pastel green
        case 'joined': return '#EC4899'; // You're in - friendly pink
        default: return '#4DC4AA';
    }
};

// Helper function to get join status text
const getJoinStatusText = (toki: TokiCardProps['toki']) => {
    if (toki.isHostedByUser) return 'Hosting';

    switch (toki.joinStatus) {
        case 'not_joined': return 'Join';
        case 'pending': return 'Pending';
        case 'approved': return 'Chat';
        case 'joined': return 'You\'re in!';
        default: return 'Join';
    }
};

// Helper function to get user initials from name
const getInitials = (name: string): string => {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
};


// Helper function to format attendees display
const formatAttendees = (attendees: number, maxAttendees: number) => {
    if (attendees === 0) return '0';
    if (attendees === 1) return '1';
    return `${attendees}/${maxAttendees}`;
};

// Helper function to format location for compact display
const formatLocationDisplay = (fullLocation: string): string => {
    if (!fullLocation) return '';

    // Split by commas and clean up
    const parts = fullLocation.split(',').map(part => part.trim());

    if (parts.length >= 2) {
        // Try to extract city and landmark/area name
        const city = parts[5]; // Usually the city is second to last
        const landmark = parts[0]; // First part is usually the landmark/area name

        // If we have a city and landmark, format as "City, Landmark"
        if (city && landmark && city !== landmark) {
            return `${landmark}, ${city}`;
        }

        // Fallback: just show first two meaningful parts
        const meaningfulParts = parts.filter(part =>
            part &&
            !part.includes('Subdistrict') &&
            !part.includes('District') &&
            part.length > 2
        );

        if (meaningfulParts.length >= 2) {
            return `${meaningfulParts[0]}, ${meaningfulParts[1]}`;
        }
    }

    // If all else fails, just show the first meaningful part
    return parts[0] || fullLocation;
};

// Helper function to format time display
const formatTimeDisplay = (time: string | undefined, scheduledTime?: string): string => {
    // If we have scheduled time, use it for smart display
    if (scheduledTime) {
        try {
            const date = new Date(scheduledTime);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            // Format time as HH:MM
            const timeString = date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            // Check if it's today, tomorrow, or later
            if (eventDate.getTime() === today.getTime()) {
                return `today at ${timeString}`;
            } else if (eventDate.getTime() === tomorrow.getTime()) {
                return `tomorrow at ${timeString}`;
            } else {
                // Format as DD/MM/YY HH:MM
                const day = date.getDate().toString().padStart(2, '0');
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const year = date.getFullYear().toString().slice(-2);
                return `${day}/${month}`;
            }
        } catch (error) {
            // Fallback to original time if parsing fails
            return time || 'Time TBD';
        }
    }

    // If no scheduled time, handle the time parameter safely
    if (!time) {
        return 'Time TBD';
    }

    // For relative time slots, show as is
    if (['Now', '30 min', '1 hour', '2 hours', '3 hours', 'Tonight', 'Tomorrow'].includes(time)) {
        return time;
    }

    // For specific time slots like "9:00 AM", show as is
    if (time.includes(':')) {
        return time;
    }

    // For generic slots like "morning", "afternoon", "evening"
    return time;
};

export default function TokiCard({ toki, onPress, onHostPress }: TokiCardProps) {
    const { actions } = useApp();
    const [isSaved, setIsSaved] = useState(toki.isSaved || false);
    const [isSaving, setIsSaving] = useState(false);

    // Update saved status when prop changes
    useEffect(() => {
        if (toki.isSaved !== undefined) {
            setIsSaved(toki.isSaved);
        }
    }, [toki.isSaved]);

    const handleSaveToggle = async () => {
        if (isSaving) return;

        try {
            setIsSaving(true);
            if (isSaved) {
                const success = await actions.unsaveToki(toki.id);
                if (success) {
                    setIsSaved(false);
                }
            } else {
                const success = await actions.saveToki(toki.id);
                if (success) {
                    setIsSaved(true);
                }
            }
        } catch (error) {
            console.error('Error toggling save status:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <TouchableOpacity
            style={styles.eventCard}
            onPress={onPress}
        >
            {/* Header Image - Pexels photo based on activity type */}
            <View style={styles.headerImageContainer}>
                <Image
                    source={{
                        uri: toki.image || getActivityPhoto(toki.category)
                    }}
                    style={styles.headerImage}
                />
                {/* <View style={styles.headerImageOverlay} /> */}
            </View>

            <View style={styles.eventContent}>
                <View style={styles.eventHeader}>
                    <View style={styles.titleRow}>
                        {/* <TokiIcon
                            category={toki.category}
                            size={20}
                            backgroundColor={getCategoryColor(toki.category)}
                            style={styles.tokiIcon}
                        /> */}
                        <Text style={styles.eventTitle}>{toki.title}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        {toki.visibility === 'private' && (
                            <View style={[styles.categoryBadge, { backgroundColor: '#111827' }] }>
                                <Lock size={12} color="#FFFFFF" />
                                <Text style={[styles.categoryBadgeText, { color: '#FFFFFF' }]}>Private</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSaveToggle}
                            disabled={isSaving}
                        >
                            <Heart
                                size={16}
                                color={isSaved ? "#8B5CF6" : "#9CA3AF"}
                                fill={isSaved ? "#8B5CF6" : "none"}
                            />
                        </TouchableOpacity>
                    </View>
                </View>


                <View style={styles.eventInfo}>
                    <View style={[styles.infoItem, styles.locationContainer]}>
                        {/* <MapPin size={14} color="#666666" /> */}
                        <Text 
                            style={styles.infoText} 
                            numberOfLines={1} 
                            ellipsizeMode="tail"
                        >
                            {formatLocationDisplay(toki.location)}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Clock size={14} color="#666666" />
                        <Text style={styles.infoText}>
                            {formatTimeDisplay(toki.time, toki.scheduledTime)}
                        </Text>
                    </View>
                </View>



                <View style={styles.eventInfo}>


                </View>

                <View style={styles.eventFooter}>



                </View>

                <View style={styles.eventInfo}>

                    <View style={styles.tagsRow}>
                        {toki.tags && toki.tags.slice(0, 3).map((tag: string, index: number) => (
                            <View key={`${tag}-${index}`} style={styles.tag}>
                                <Text style={styles.tagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.distance}>
                            {toki.distance ? formatDistanceDisplay(toki.distance) : ''} away
                        </Text>
                    </View>


                </View>
                <View style={styles.eventInfo}>
                    <View style={styles.hostInfo}>
                        {toki.host.avatar ? (
                            <Image
                                source={{ uri: toki.host.avatar }}
                                style={styles.hostAvatar}
                            />
                        ) : (
                            <View style={[styles.hostAvatar, styles.fallbackAvatar]}>
                                <Text style={styles.fallbackInitials}>
                                    {getInitials(toki.host.name)}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                if (!toki.isHostedByUser) {
                                    router.push({
                                        pathname: '/user-profile/[userId]',
                                        params: { userId: toki.host.id }
                                    });
                                }
                            }}
                            disabled={toki.isHostedByUser}
                        >
                            <Text style={[
                                styles.hostName,
                                !toki.isHostedByUser && { textDecorationLine: 'underline' }
                            ]}>
                                by {toki.host.name}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ justifyContent: 'center' }}>

                        {/* Status Badge - Show user's relationship to this Toki */}
                        {toki.isHostedByUser || toki.joinStatus ? (
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: getJoinStatusColor(toki) }
                            ]}>
                                <Text style={styles.statusBadgeText}>
                                    {getJoinStatusText(toki)}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    eventCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        marginBottom: 16,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
        position: 'relative', // Added for status badge positioning
    },
    headerImageContainer: {
        position: 'relative',
        width: '100%',
    },
    headerImage: {
        width: '100%',
        // height: '100%',
        aspectRatio: 16/9,
        resizeMode: 'cover',
    },
    headerImageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    eventContent: {
        padding: 16,
    },
    eventHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    tokiIcon: {
        marginRight: 12,
    },
    eventTitle: {
        fontSize: 22,
        fontFamily: 'Inter-SemiBold',
        color: '#1C1C1C',
        flex: 1,
        marginRight: 8,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    categoryBadgeText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        // color is now set dynamically based on background brightness
    },
    statusBadge: {
        // position: 'absolute',
        // bottom: 16,
        // right: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
    },
    statusBadgeText: {
        fontSize: 12,
        fontFamily: 'Inter-SemiBold',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    eventDescription: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#666666',
        marginBottom: 12,
        lineHeight: 20,
    },
    imagesContainer: {
        marginBottom: 12,
    },
    tokiImage: {
        width: 80,
        height: 60,
        borderRadius: 8,
        marginRight: 8,
        backgroundColor: '#F3F4F6',
    },
    fallbackImageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderStyle: 'dashed',
    },
    fallbackImageText: {
        fontSize: 24,
        marginBottom: 4,
    },
    fallbackImageLabel: {
        fontSize: 10,
        fontFamily: 'Inter-Medium',
        color: '#6B7280',
        textAlign: 'center',
    },
    eventInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationContainer: {
        flex: 1,
        minWidth: 0, // Important for flex truncation
    },
    infoText: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#666666',
    },
    eventFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: "baseline", // Changed from 'center' to 'flex-start' for better alignment
        // marginBottom: 12,
        // paddingTop: 12,
    },
    hostInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    hostAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    fallbackAvatar: {
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        borderColor: '#D1D5DB',
    },
    fallbackInitials: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#6B7280',
        textAlign: 'center',
    },
    hostName: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#B49AFF',
        textDecorationLine: 'underline',
    },
    distance: {
        fontSize: 12,
        fontFamily: 'Inter-Medium',
        color: '#B49AFF',
        fontWeight: '600',
    },
    eventActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
        gap: 6,
        flex: 1,
        minHeight: 26,
        maxHeight: 26,
        overflow: 'hidden',
        alignItems: 'center',
    },
    tag: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 10,
        fontFamily: 'Inter-Medium',
        color: '#666666',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    saveButton: {
        padding: 8,
    },
});

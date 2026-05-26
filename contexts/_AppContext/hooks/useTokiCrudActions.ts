// Phase-2 hook extraction. Slice from contexts/AppContext.tsx lines 838-1026.
// Cross-hook calls via actionsRef: syncData (ConnectionSync), loadCurrentUser (Connections).
// Inlines getImageForActivity (was lines 2197-2211, only used here).

import { Dispatch, MutableRefObject } from 'react';
import { apiService } from '../../../services/api';
import type { AppState, AppAction, Toki } from '../types';
import { formatDistanceString } from '../state';

const getImageForActivity = (activity: string) => {
  const activityImages: { [key: string]: string } = {
    sports: 'https://images.pexels.com/photos/1263348/pexels-photo-1263348.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    coffee: 'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    music: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    dinner: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    work: 'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    culture: 'https://images.pexels.com/photos/1570264/pexels-photo-1570264.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    nature: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    drinks: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    wellness: 'https://images.pexels.com/photos/317157/pexels-photo-317157.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
    chill: 'https://images.pexels.com/photos/7988215/pexels-photo-7988215.jpeg?auto=compress&cs=tinysrgb&w=400&h=250&dpr=2',
  };
  return activityImages[activity] || activityImages.sports;
};

export function useTokiCrudActions(
  state: AppState,
  dispatch: Dispatch<AppAction>,
  actionsRef: MutableRefObject<any>,
) {
  const createToki = async (tokiData: any): Promise<string | null> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // Convert time slot to scheduled time (returns UTC ISO string)
      const getScheduledTimeFromSlot = (timeSlot: string): string => {
        const now = new Date();

        switch (timeSlot) {
          case 'Now':
            return now.toISOString();
          case '30 min':
            return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
          case '1 hour':
            return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
          case '2 hours':
            return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
          case '3 hours':
            return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
          case 'Tonight':
            const tonight = new Date(now);
            tonight.setHours(19, 0, 0, 0); // 7:00 PM local
            return tonight.toISOString();
          case 'Tomorrow':
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0); // 10:00 AM local
            return tomorrow.toISOString();
          default:
            // Handle specific time slots like "9:00 AM", "2:00 PM"
            if (timeSlot.includes(':')) {
              const [time, period] = timeSlot.split(' ');
              const [hours, minutes] = time.split(':').map(Number);
              let hour24 = hours;

              if (period === 'PM' && hours !== 12) hour24 += 12;
              if (period === 'AM' && hours === 12) hour24 = 0;

              const scheduledTime = new Date(now);
              scheduledTime.setHours(hour24, minutes, 0, 0);

              // If the time has passed today, schedule for tomorrow
              if (scheduledTime <= now) {
                scheduledTime.setDate(scheduledTime.getDate() + 1);
              }

              return scheduledTime.toISOString();
            }
            return now.toISOString();
        }
      };

      const apiTokiData = {
        title: tokiData.title,
        description: tokiData.description,
        location: tokiData.location,
        latitude: tokiData.latitude || null,
        longitude: tokiData.longitude || null,
        placeId: tokiData.placeId || null,
        timeSlot: tokiData.time,
        // Convert to UTC: custom datetime needs conversion, preset slots already return ISO
        scheduledTime: tokiData.customDateTime
          ? new Date(tokiData.customDateTime).toISOString()
          : getScheduledTimeFromSlot(tokiData.time),
        category: tokiData.activity,
        maxAttendees: tokiData.maxAttendees !== undefined ? tokiData.maxAttendees : 10,
        visibility: tokiData.visibility || 'public',
        tags: tokiData.tags || [],
        externalLink: tokiData.externalLink || null,
        images: tokiData.images || [],
        userLatitude: tokiData.userLatitude ?? state.currentUser?.latitude ?? null,
        userLongitude: tokiData.userLongitude ?? state.currentUser?.longitude ?? null,
        autoApprove: tokiData.autoApprove !== undefined ? tokiData.autoApprove : false,
        isPaid: tokiData.isPaid || false,
      };

      const apiToki = await apiService.createToki(apiTokiData);

      const newToki: Toki = {
        id: apiToki.id,
        title: apiToki.title,
        description: apiToki.description,
        location: apiToki.location,
        time: apiToki.timeSlot || 'Time TBD',
        attendees: apiToki.currentAttendees,
        currentAttendees: apiToki.currentAttendees,
        maxAttendees: apiToki.maxAttendees,
        tags: apiToki.tags,
        host: {
          id: apiToki.host.id,
          name: apiToki.host.name,
          avatar: apiToki.host.avatar || '',
        },
        image: apiToki.imageUrl || getImageForActivity(tokiData.activity),
        distance: formatDistanceString(apiToki.distance),
        isHostedByUser: true,
        joinStatus: 'not_joined',
        visibility: apiToki.visibility,
        category: apiToki.category,
        createdAt: apiToki.createdAt,
        latitude: apiToki.latitude ? Number(apiToki.latitude) : undefined,
        longitude: apiToki.longitude ? Number(apiToki.longitude) : undefined,
        scheduledTime: apiToki.scheduledTime,
        isSaved: (apiToki as any).isSaved ?? false,
      };

      dispatch({ type: 'ADD_TOKI', payload: newToki });

      console.log('✅ Toki created successfully:', newToki.title);
      return newToki.id;
    } catch (error) {
      console.error('❌ Failed to create Toki:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create activity' });
      // Re-throw the error so the calling screen can handle it with ErrorModal
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateToki = async (id: string, updates: any): Promise<boolean> => {
    try {
      dispatch({ type: 'UPDATE_TOKI', payload: { id, updates } });

      // Update sync time
      setTimeout(() => actionsRef.current.syncData(), 100);

      console.log('✅ Toki updated successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to update Toki:', error);
      return false;
    }
  };

  const deleteToki = async (id: string): Promise<boolean> => {
    try {
      dispatch({ type: 'DELETE_TOKI', payload: id });

      // Update sync time
      setTimeout(() => actionsRef.current.syncData(), 100);

      console.log('✅ Toki deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to delete Toki:', error);
      return false;
    }
  };

  const joinToki = async (id: string): Promise<boolean> => {
    try {
      const toki = state.tokis.find(t => t.id === id);
      if (!toki) return false;

      console.log('🔄 Sending join request to backend for Toki:', id);

      // Call the actual backend API using the existing apiService method
      const result = await apiService.joinToki(id);

      if (!result.success) {
        console.error('❌ Backend join request failed:', result.message);
        throw new Error(result.message || 'Failed to join Toki');
      }

      console.log('✅ Backend join request successful:', result);

      // Update local state with the actual backend response
      dispatch({
        type: 'UPDATE_TOKI',
        payload: {
          id,
          updates: {
            joinStatus: result.data.status, // Use actual backend status
          },
        },
      });

      // Refresh user data to get updated tokisJoined count
      await actionsRef.current.loadCurrentUser();

      console.log('✅ Joined Toki successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to join Toki:', error);
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to join Toki' });
      return false;
    }
  };

  return { createToki, updateToki, deleteToki, joinToki };
}

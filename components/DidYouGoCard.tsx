import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '@/services/api';

type PendingPrompt = {
  promptId: string;
  tokiId: string;
  title: string;
  category: string;
  location: string;
  scheduledTime?: string;
  imageUrl?: string;
  host?: {
    name: string;
    avatar?: string;
  };
  createdAt: string;
};

interface DidYouGoCardProps {
  compact?: boolean;
}

export default function DidYouGoCard({ compact = false }: DidYouGoCardProps) {
  const [prompt, setPrompt] = useState<PendingPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const shownPromptIds = useRef<Set<string>>(new Set());

  const loadPrompt = useCallback(async () => {
    if (!apiService.hasToken()) {
      setPrompt(null);
      return;
    }

    try {
      setLoading(true);
      const prompts = await apiService.getPendingDidYouGo();
      const nextPrompt = (prompts?.[0] as PendingPrompt | undefined) || null;
      setPrompt(nextPrompt);

      if (nextPrompt && !shownPromptIds.current.has(nextPrompt.promptId)) {
        shownPromptIds.current.add(nextPrompt.promptId);
        apiService.markDidYouGoShown(nextPrompt.tokiId).catch((error) => {
          console.warn('⚠️ Failed to mark did-you-go prompt as shown:', error);
        });
      }
    } catch (error) {
      console.warn('⚠️ Failed to load did-you-go prompts:', error);
      setPrompt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  useFocusEffect(
    useCallback(() => {
      loadPrompt();
    }, [loadPrompt])
  );

  const handleRespond = async (response: boolean) => {
    if (!prompt || submitting) return;

    try {
      setSubmitting(true);
      await apiService.respondDidYouGo(prompt.tokiId, response);
      setPrompt(null);
      setTimeout(() => {
        loadPrompt();
      }, 100);
    } catch (error) {
      console.warn('⚠️ Failed to submit did-you-go response:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !prompt) {
    return (
      <View style={[styles.card, compact && styles.cardCompact]}>
        <ActivityIndicator size="small" color="#B49AFF" />
      </View>
    );
  }

  if (!prompt) {
    return null;
  }

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <Text style={styles.eyebrow}>Did you go?</Text>
      <Text style={styles.title}>
        We’re learning what types of Tokis you enjoy so we can show you better ones next time.
      </Text>

      <View style={styles.previewRow}>
        {prompt.imageUrl ? (
          <Image source={{ uri: prompt.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.imageFallbackText}>T</Text>
          </View>
        )}
        <View style={styles.previewText}>
          <Text style={styles.eventTitle} numberOfLines={1}>{prompt.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>{prompt.location}</Text>
          {prompt.host?.name ? (
            <Text style={styles.meta} numberOfLines={1}>Hosted by {prompt.host.name}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => handleRespond(false)}
          disabled={submitting}
        >
          <Text style={styles.secondaryButtonText}>{submitting ? 'Saving...' : 'No'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => handleRespond(true)}
          disabled={submitting}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Saving...' : 'Yes'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardCompact: {
    marginTop: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1F2937',
    fontFamily: 'Inter-Medium',
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    alignItems: 'center',
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackText: {
    fontSize: 20,
    color: '#8B5CF6',
    fontFamily: 'Inter-Bold',
  },
  previewText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    color: '#111827',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#374151',
    fontFamily: 'Inter-Bold',
    fontSize: 14,
  },
});

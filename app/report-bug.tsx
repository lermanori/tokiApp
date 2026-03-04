import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, AlertTriangle, Info, Zap, Smartphone, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { apiService } from '../services/api';

const CATEGORIES = [
    { id: 'UI/Design', label: 'UI/Design', icon: Smartphone },
    { id: 'Crash', label: 'App Crash', icon: AlertTriangle },
    { id: 'Performance', label: 'Performance', icon: Zap },
    { id: 'Feature Not Working', label: 'Feature Not Working', icon: Info },
    { id: 'Other', label: 'Other', icon: Info },
];

const SEVERITIES = ['Low', 'Medium', 'High'];

export default function ReportBugScreen() {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('UI/Design');
    const [severity, setSeverity] = useState('Medium');
    const [description, setDescription] = useState('');
    const [steps, setSteps] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('Missing Fields', 'Please provide at least a title and a description.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await apiService.reportBug({
                title: title.trim(),
                description: description.trim(),
                category,
                severity,
                steps: steps.trim() || undefined
            });

            if (response && response.success) {
                setIsSuccess(true);
            } else {
                throw new Error(response?.message || 'Failed to submit bug report');
            }
        } catch (error: any) {
            Alert.alert('Submission Failed', error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <LinearGradient
            colors={['#FFF1EB', '#F3E7FF', '#E5DCFF']}
            style={styles.gradient}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color="#1C1C1C" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Report a Bug</Text>
                    <View style={styles.headerSpacer} />
                </View>

                {isSuccess ? (
                    <View style={styles.successContainer}>
                        <View style={styles.successIconContainer}>
                            <CheckCircle size={64} color="#10B981" />
                        </View>
                        <Text style={styles.successTitle}>Got it!</Text>
                        <Text style={styles.successText}>
                            Thank you for your feedback. Our team has received your bug report and we will look into it shortly.
                        </Text>
                        <TouchableOpacity
                            style={styles.backToAppButton}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.backToAppButtonText}>Back to App</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        style={styles.keyboardAvoid}
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    >
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.content}>
                                <Text style={styles.introText}>
                                    Found a bug? Help us improve Toki by reporting it here.
                                </Text>

                                {/* Title Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Summary of the issue"
                                        placeholderTextColor="#9CA3AF"
                                        value={title}
                                        onChangeText={setTitle}
                                        maxLength={100}
                                    />
                                </View>

                                {/* Category Picker */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                                        {CATEGORIES.map((c) => {
                                            const Icon = c.icon;
                                            const isSelected = category === c.id;
                                            return (
                                                <TouchableOpacity
                                                    key={c.id}
                                                    style={[styles.chip, isSelected && styles.chipSelected]}
                                                    onPress={() => setCategory(c.id)}
                                                >
                                                    <Icon size={16} color={isSelected ? "#FFF" : "#6B7280"} style={styles.chipIcon} />
                                                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                                                        {c.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </View>

                                {/* Severity Segmented Control */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Severity</Text>
                                    <View style={styles.segmentedControl}>
                                        {SEVERITIES.map((s) => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.segment, severity === s && styles.segmentSelected]}
                                                onPress={() => setSeverity(s)}
                                            >
                                                <Text style={[styles.segmentText, severity === s && styles.segmentTextSelected]}>
                                                    {s}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Description Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={styles.textArea}
                                        placeholder="What went wrong? Please be as detailed as possible."
                                        placeholderTextColor="#9CA3AF"
                                        value={description}
                                        onChangeText={setDescription}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                </View>

                                {/* Steps to Reproduce Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Steps to Reproduce</Text>
                                    <TextInput
                                        style={[styles.textArea, { minHeight: 80 }]}
                                        placeholder="1. Go to...\n2. Click on...\n3. See error..."
                                        placeholderTextColor="#9CA3AF"
                                        value={steps}
                                        onChangeText={setSteps}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                </View>

                            </View>
                        </ScrollView>

                        {/* Submit Button */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.submitButton, (!title.trim() || !description.trim() || isSubmitting) && styles.submitButtonDisabled]}
                                onPress={handleSubmit}
                                disabled={!title.trim() || !description.trim() || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <>
                                        <Send size={20} color="#FFF" />
                                        <Text style={styles.submitButtonText}>Submit Bug Report</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                )}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    gradient: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        padding: 6,
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: 'Inter-Bold',
        color: '#1C1C1C',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 36,
    },
    keyboardAvoid: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    content: {
        padding: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        margin: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    introText: {
        fontSize: 14,
        fontFamily: 'Inter-Regular',
        color: '#6B7280',
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontFamily: 'Inter-SemiBold',
        color: '#374151',
        marginBottom: 8,
    },
    required: {
        color: '#EF4444',
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#1C1C1C',
    },
    textArea: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#1C1C1C',
        minHeight: 120,
    },
    chipsContainer: {
        gap: 8,
        paddingVertical: 4,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        marginRight: 8,
    },
    chipSelected: {
        backgroundColor: '#1C1C1C',
        borderColor: '#1C1C1C',
    },
    chipIcon: {
        marginRight: 6,
    },
    chipText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#4B5563',
    },
    chipTextSelected: {
        color: '#FFFFFF',
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 4,
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    segmentSelected: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    segmentText: {
        fontSize: 14,
        fontFamily: 'Inter-Medium',
        color: '#6B7280',
    },
    segmentTextSelected: {
        color: '#111827',
    },
    footer: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    submitButton: {
        backgroundColor: '#1C1C1C',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 12,
    },
    submitButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'Inter-Bold',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    successIconContainer: {
        width: 120,
        height: 120,
        backgroundColor: '#D1FAE5',
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successTitle: {
        fontSize: 28,
        fontFamily: 'Inter-Bold',
        color: '#1C1C1C',
        marginBottom: 12,
        textAlign: 'center',
    },
    successText: {
        fontSize: 16,
        fontFamily: 'Inter-Regular',
        color: '#4B5563',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 40,
    },
    backToAppButton: {
        backgroundColor: '#1C1C1C',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    backToAppButtonText: {
        fontSize: 16,
        fontFamily: 'Inter-Bold',
        color: '#FFFFFF',
    },
});

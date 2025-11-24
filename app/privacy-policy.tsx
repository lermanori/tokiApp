import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';

const PRIVACY_POLICY_CONTENT = `Privacy Policy - Toki

Last updated: November 24, 2025

Toki ("we", "us", "our") provides a social map platform that allows users to discover and share real-time events and activities.

This Privacy Policy explains how we collect, use, and protect personal information. By using Toki, you agree to this Privacy Policy and acknowledge that you use the app at your own risk.

1. Information We Collect

1.1 Information You Provide
- Account details (name, username, profile photo)
- Content you create (event names, descriptions, photos, chosen locations)
- Messages you send within the app
- You decide what information to make public.

1.2 Automatically Collected Data
- Location data (precise or approximate if you grant permission)
- Device information (model, OS, version)
- Usage analytics
- Crash reports and diagnostics

1.3 User-Generated Content
- Toki hosts user-generated content and does not verify the accuracy, safety, legality, or reliability of any content posted by users.

2. How We Use Your Information
- Provide the app’s core functionality
- Display nearby events
- Personalize your experience
- Enable communication between users
- Improve performance and fix bugs
- Ensure platform safety where possible
- We do not sell personal data.

3. Sharing Your Information

3.1 Service Providers
- We may share limited information with third-party services for analytics, crash reporting, infrastructure, or content moderation support. They may access data only to perform services for us.

3.2 Legal and Safety
- We may disclose information if required by law or necessary to prevent harm or illegal activity.

3.3 Public Visibility
- Information you choose to make public (such as events you host) will be visible to other users.

4. Location
- Toki uses your device location to show nearby events.
- You may withdraw permission at any time in your device settings.
- We do not track your background location without permission.

5. Cookies & Web Tracking
- If you use our website, we may use cookies or similar technologies for analytics and functionality.

6. User Responsibility & Platform Disclaimer

6.1 User Responsibility for Content
- Users are solely responsible for the content they upload, the accuracy and safety of events, interactions with other users, and complying with local laws when hosting or attending events.

6.2 No Verification or Guarantee
- We do not verify the identity of users, verify event details, screen hosts or attendees, guarantee the accuracy or safety of any content, or guarantee that events are real, safe, or appropriate.

6.3 No Liability for Offline Interactions
- Toki is not responsible for the behavior of users, events hosted by third parties, any injury, harm, loss, or damage resulting from interactions or attendance, or scams, misinformation, or inappropriate content posted by users. All participation in events is at your own risk.

6.4 No Duty to Monitor
- We do not have an obligation to monitor all content, pre-screen users, or actively verify event safety. We may moderate content when notified but are not required to proactively monitor the platform.

7. Data Retention
- We retain data only as long as needed for providing the service or complying with legal obligations. Users may request deletion of their data at any time.

8. Children's Privacy
- Toki is intended for users aged 16 and older. We do not knowingly collect data from children under 16. If such data is discovered, it will be deleted.

9. Your Rights
- Depending on your region, you may have rights to access your data, correct inaccuracies, request deletion, or withdraw consent.
- Data Deletion Requests: You may request full deletion of your account and associated data at futurecreatorsclub@gmail.com.

10. Data Security
- We implement reasonable safeguards to protect data, but no system is completely secure. You use Toki at your own risk.

11. International Transfers
- Your data may be stored or processed in countries outside your region. We take steps to ensure appropriate protections are in place.

12. Changes to This Policy
- We may update this Privacy Policy at any time. If changes are significant, we will notify you in the app or on our website.

13. Contact Us
- For questions or data requests, contact futurecreatorsclub@gmail.com.`;

export default function PrivacyPolicyScreen() {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.content}>
            <Text style={styles.policyText}>{PRIVACY_POLICY_CONTENT}</Text>
          </View>
        </ScrollView>
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
    width: '100%',
    height: '100%',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  policyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    lineHeight: 22,
  },
});

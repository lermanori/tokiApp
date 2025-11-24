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

const TERMS_CONTENT = `Toki - Terms of Use

Last Updated: November 17, 2025

READ THESE TERMS CAREFULLY. THEY CONTAIN IMPORTANT LIMITATIONS ON TOKI'S LIABILITY AND REQUIRE BINDING ARBITRATION OF DISPUTES.

These Terms of Use ("Terms") constitute a binding legal agreement between you ("User", "you", "your") and Toki App Ltd. ("Toki", "we", "us", "our"). By accessing, browsing, or using the Toki application or any related services (collectively, the "Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms and our Privacy Policy.

For legal purposes, the Service is currently owned and operated by Daniela Krol as a sole proprietor, doing business under the name "Toki" (also referred to in these Terms as "Toki App Ltd." or "Toki"). All references to "Toki", "we", "us", or "our" shall be understood to refer to Daniela Krol in her capacity as the owner and operator of the Service.

IF YOU DO NOT AGREE TO THESE TERMS, YOU MUST IMMEDIATELY STOP USING THE SERVICE AND DELETE YOUR ACCOUNT.

1. Eligibility and Acceptance

1.1 Age Requirement
• You must be at least 18 years old to use the Service.
• By using the Service, you represent and warrant that you are 18 years of age or older.
• Toki does not verify user age. You are solely responsible for ensuring you meet the age requirement.
• If you are discovered to be under 18, your account will be immediately terminated without notice.

1.2 Legal Capacity
• You represent that you have the legal capacity to enter into this binding agreement.
• You may not use the Service if you are prohibited from doing so under applicable law.

1.3 Acceptance
• By creating an account, accessing the Service, or using any feature of the platform, you accept these Terms in full.
• These Terms apply to all users, including event hosts, attendees, browsers, and any other visitors.
• If you do not agree to any provision of these Terms, you are not authorized to use the Service.

2. Nature of the Service

2.1 Platform Only
Toki is solely a technology platform that provides a digital space where users can post, discover, and share information about real-world gatherings ("Events" or "Tokis").

TOKI IS NOT:
• An event organizer, coordinator, or manager
• A host, co-host, or producer of any Event
• A promoter, marketer, or booking service
• A venue provider or operator
• An insurance provider
• A safety or security service
• A verification or background check service
• A party to any agreement, transaction, or interaction between users
• Responsible for anything that happens at, before, during, or after any Event

2.2 User-Generated Content
• ALL content on the platform is created, posted, and controlled by users, not Toki.
• Toki does not create, verify, endorse, guarantee, or take responsibility for any Event, information, profile, message, photo, description, or other content posted by users.
• Event information is provided by users and may be inaccurate, outdated, misleading, false, or fraudulent.

2.3 No Verification or Screening
Toki does not:
• Verify the identity, age, background, criminal history, or character of any user
• Conduct background checks or screenings of any kind
• Verify Event details, locations, times, or descriptions
• Confirm the legality, safety, or legitimacy of any Event
• Monitor, moderate, supervise, or attend Events
• Investigate users or Events unless legally required to do so

2.4 No Endorsement
• The fact that an Event or user appears on Toki does not constitute any form of endorsement, recommendation, or approval by Toki.
• Toki makes no representations about the quality, safety, legality, or suitability of any Event or user.

2.5 Service Modifications and Availability
• We may modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, for any reason or no reason.
• We do not guarantee uninterrupted, timely, secure, or error-free operation of the Service.
• We are not liable for any modifications, suspensions, or discontinuations.

3. User Accounts

3.1 Account Registration
• You must provide accurate, current, and complete information when creating an account.
• You may not create an account using false information or impersonate any person or entity.
• You may not create multiple accounts or transfer your account to another person.
• You are solely and fully responsible for all activities conducted under your account, whether authorized by you or not.

3.2 Account Security
• You are responsible for maintaining the confidentiality and security of your login credentials.
• You agree to immediately notify Toki of any unauthorized use of your account or any other security breach.
• Toki is not responsible for any loss, damage, or liability arising from unauthorized access to your account, whether or not you were negligent.

3.3 Account Suspension and Termination
• Toki may suspend, restrict, or terminate your account at any time, with or without cause, with or without notice.
• Reasons for termination may include, but are not limited to: violation of these Terms, suspicious activity, complaints from other users, or any conduct that Toki deems inappropriate or harmful.
• You may delete your account at any time, but you will remain bound by these Terms for any actions taken prior to deletion.
• Termination does not entitle you to any refund, compensation, or damages.

4. User Content

4.1 Definition
"User Content" means any and all content, information, materials, data, text, photos, videos, audio, messages, Event postings, profiles, reviews, comments, and any other materials that you or any other user submits, posts, uploads, or transmits through the Service.

4.2 User Responsibility for Content
• You are solely and entirely responsible for all User Content you post or share.
• You represent and warrant that:
  ○ You own or have all necessary rights, licenses, and permissions to post your User Content
  ○ Your User Content does not violate any law, regulation, or third-party rights
  ○ Your User Content is accurate and not misleading
• You acknowledge that Toki has no obligation to monitor, review, or verify User Content.

4.3 Prohibited Content
You may not post User Content that:
• Is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or hateful
• Violates any intellectual property rights or other proprietary rights
• Contains viruses, malware, or other harmful code
• Promotes violence, discrimination, or illegal activity
• Contains private or confidential information about others without consent
• Is false, misleading, or fraudulent
• Violates these Terms or any applicable law

4.4 License to Toki
• By posting User Content, you grant Toki a perpetual, irrevocable, worldwide, royalty-free, non-exclusive, transferable, sublicensable license to use, reproduce, distribute, modify, adapt, publicly display, publicly perform, and otherwise exploit your User Content solely for the purpose of operating, providing, improving, and promoting the Service.
• This license survives termination of your account.

4.5 Content Moderation
• Toki has the right, but not the obligation, to monitor, review, remove, or restrict any User Content at any time, for any reason, without notice.
• Toki's decision to monitor, remove, or not remove content does not constitute an endorsement or verification of such content.
• The fact that Toki removes some content does not create an obligation to remove other content.
• You may report inappropriate content through the Service, but Toki is under no obligation to take action.

5. Hosting Events

5.1 Host Responsibilities
If you post or host an Event, you acknowledge and agree that:
• You are solely and entirely responsible for the Event, including but not limited to:
  ○ All planning, organization, and execution
  ○ The accuracy of all Event information
  ○ The safety and legality of the Event
  ○ Compliance with all applicable laws, regulations, permits, licenses, and insurance requirements
  ○ The conduct and behavior of all attendees
  ○ Any injuries, damages, losses, or harm that occur at or in connection with the Event
  ○ Any disputes arising from the Event

5.2 Legal Compliance
• You are responsible for determining and complying with all applicable laws, including but not limited to:
  ○ Local event permits and licenses
  ○ Health and safety regulations
  ○ Capacity and venue restrictions
  ○ Age restrictions (e.g., for alcohol or adult content)
  ○ Accessibility requirements
  ○ Tax obligations
• Toki provides no guidance or assistance regarding legal compliance and is not responsible for your failure to comply with any laws.

5.3 No Toki Involvement
• Toki has no role in, control over, or responsibility for your Event.
• Toki does not review, approve, monitor, attend, or supervise Events.
• Toki is not a party to any agreements, arrangements, or interactions between you and attendees.

5.4 Assumption of All Risk
• You host Events entirely at your own risk.
• You assume all liability for anything that happens at, before, during, or after your Event.

6. Attending Events

6.1 Voluntary Assumption of All Risks
By using the Service to find or attend Events, you expressly acknowledge, understand, and agree that:
• Attending Events involves inherent and significant risks, including but not limited to:
  ○ Personal injury, illness, disability, or death
  ○ Physical or emotional harm
  ○ Assault, harassment, or unwanted contact
  ○ Theft, loss, or damage to property
  ○ Fraud, scams, or misrepresentation
  ○ Exposure to dangerous, illegal, or inappropriate activities
  ○ Interaction with individuals who may be dangerous, unstable, or have malicious intent
  ○ Unsafe or unsuitable venues or locations
  ○ COVID-19 or other communicable diseases
• You voluntarily and knowingly assume ALL risks associated with attending any Event, whether those risks are known or unknown, foreseeable or unforeseeable.
• Toki has no control over and is not responsible for:
  ○ The conduct, behavior, identity, or intentions of any host or attendee
  ○ The safety, suitability, legality, or conditions of any Event or venue
  ○ The accuracy or truthfulness of any Event information
  ○ Anything that happens before, during, or after any Event

6.2 Personal Safety Responsibility
• You are solely responsible for your own safety and wellbeing.
• You must exercise your own judgment, caution, and common sense.
• You should independently verify Event information and assess whether an Event is appropriate and safe for you.
• You should take appropriate precautions, including meeting in public places, informing others of your plans, and trusting your instincts.
• Toki strongly recommends that you do not attend Events alone and that you take all necessary safety precautions.

6.3 No Guarantees
• Toki makes no representations or warranties about the safety, legality, or quality of any Event.
• Event details may be incorrect, outdated, or fraudulent.
• Hosts may cancel or change Events without notice.

6.4 User Conduct at Events
• You agree to behave lawfully, respectfully, and safely at all times.
• You will not engage in any illegal, harmful, or disruptive conduct.
• Violation of this provision may result in immediate account termination.

7. Interactions with Other Users

7.1 User Interactions
• You are solely responsible for all interactions with other users, including hosts, attendees, and any other individuals you communicate with through the Service.
• Toki is not a party to, and has no responsibility for, any interactions, communications, agreements, disputes, or relationships between users.

7.2 No Screening or Verification
• Toki does not screen, verify, or investigate users in any way.
• Users may misrepresent their identity, intentions, or background.
• Users may have criminal histories, malicious intent, or pose risks to your safety.
• You interact with other users entirely at your own risk.

7.3 Disputes Between Users
• Toki is not responsible for and will not mediate any disputes between users.
• Any disputes are solely between you and the other user(s) involved.
• You release Toki from any and all claims, demands, or damages arising from disputes with other users.

8. Disclaimers and No Warranties

8.1 "AS IS" and "AS AVAILABLE"
THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITH ALL FAULTS, AND WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. TO THE FULLEST EXTENT PERMITTED BY LAW, TOKI DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:
• Warranties of merchantability, fitness for a particular purpose, and non-infringement
• Warranties regarding accuracy, reliability, completeness, or timeliness of any content or information
• Warranties that the Service will be uninterrupted, secure, or error-free
• Warranties that defects will be corrected
• Warranties regarding the results of using the Service

8.2 No Guarantee of Safety or Accuracy
• Toki does not guarantee the safety, legality, accuracy, or quality of any Event, user, or content on the platform.
• Information on the platform may be incorrect, outdated, misleading, or fraudulent.
• Users may misrepresent themselves or their Events.
• Events may be unsafe, illegal, or inappropriate.

8.3 No Responsibility for User Actions
• Toki is not responsible for the actions, omissions, conduct, or content of any user.
• Toki does not endorse, support, or approve any user or Event.

8.4 Internet and Technology Risks
• Use of the Service involves risks inherent to internet and technology use, including but not limited to:
  ○ Service interruptions, delays, or failures
  ○ Data loss or corruption
  ○ Unauthorized access or security breaches
  ○ Malware or viruses
• You assume all such risks.

9. Limitation of Liability

9.1 Maximum Liability Cap
TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, TOKI'S TOTAL LIABILITY TO YOU FOR ANY AND ALL CLAIMS ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE OR THESE TERMS IS LIMITED TO THE GREATER OF: (A) THE AMOUNT YOU PAID TO TOKI IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) 100 ILS (ONE HUNDRED ISRAELI SHEKELS).

9.2 No Liability for Damages
TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, TOKI SHALL NOT BE LIABLE FOR ANY:
• Indirect, incidental, special, consequential, punitive, or exemplary damages, including but not limited to:
  ○ Loss of profits, revenue, data, or business opportunities
  ○ Loss of goodwill or reputation
  ○ Emotional distress or pain and suffering
• Direct damages, including but not limited to:
  ○ Personal injury, illness, disability, or death
  ○ Property damage, theft, or loss
  ○ Financial loss or fraud
  ○ Assault, harassment, or any harm caused by other users
  ○ Unsafe, illegal, or inappropriate Events
  ○ Inaccurate or misleading information
  ○ Service interruptions, errors, or data loss
  ○ Unauthorized access to your account
  ○ Failure to remove harmful content
  ○ Any other damages whatsoever

THIS LIMITATION APPLIES REGARDLESS OF THE LEGAL THEORY (CONTRACT, TORT, NEGLIGENCE, STRICT LIABILITY, OR OTHERWISE) AND EVEN IF TOKI HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

9.3 No Liability for Third Parties
• Toki is not liable for the actions, omissions, or conduct of any user, host, attendee, venue, or third party.
• Toki is not liable for any content, products, services, or websites provided by third parties.

9.4 Sole Remedy
• Your sole and exclusive remedy for dissatisfaction with the Service is to stop using the Service and delete your account.

9.5 Essential Basis of Bargain
• You acknowledge that these limitations of liability are essential elements of the agreement between you and Toki and that Toki would not provide the Service without these limitations.

10. Indemnification

10.1 Your Indemnification Obligation
You agree to indemnify, defend, and hold harmless Toki, its owner Daniela Krol, and its officers, directors, employees, agents, affiliates, successors, and assigns from and against any and all claims, demands, actions, damages, losses, costs, liabilities, and expenses (including reasonable attorneys' fees and court costs) arising from or related to:
• Your use or misuse of the Service
• Your User Content
• Your hosting of any Event
• Your attendance at any Event
• Your interactions with any other user
• Your violation of these Terms
• Your violation of any law, regulation, or third-party rights
• Any harm, injury, death, or damage caused by you or occurring at your Event
• Any inaccurate, misleading, or fraudulent information you provide
• Any negligent or wrongful act or omission by you

10.2 Defense of Claims
• Toki reserves the right to assume the exclusive defense and control of any matter subject to indemnification by you, and you agree to cooperate with Toki's defense of such claims.
• You may not settle any claim without Toki's prior written consent.

11. Prohibited Conduct

You agree that you will NOT:

11.1 Content-Related Prohibitions
• Post any content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, hateful, violent, or discriminatory
• Post false, misleading, or fraudulent information
• Post private or confidential information about others without authorization
• Impersonate any person or entity or misrepresent your affiliation with any person or entity
• Post content that violates any intellectual property or proprietary rights

11.2 Conduct-Related Prohibitions
• Use the Service to harm, threaten, harass, stalk, intimidate, or defraud others
• Create fake Events or accounts
• Organize or promote illegal activities or Events
• Use the Service for any commercial purpose without Toki's prior written consent
• Solicit money, donations, or personal information from other users
• Engage in any conduct that Toki deems inappropriate or harmful

11.3 Technical Prohibitions
• Interfere with, disrupt, or damage the Service or servers
• Use any automated system (bots, scrapers, spiders) to access the Service
• Reverse engineer, decompile, or disassemble any part of the Service
• Attempt to gain unauthorized access to any part of the Service or other users' accounts
• Circumvent any security features or restrictions
• Use the Service in any way that could harm, disable, overburden, or impair the Service

11.4 Consequences
• Violation of these prohibitions may result in immediate account termination, legal action, and liability for damages.

12. Intellectual Property

12.1 Toki's Ownership
• Toki owns all rights, title, and interest in the Service, including all software, designs, graphics, text, logos, trademarks, service marks, trade names, and other intellectual property.
• You may not use, copy, reproduce, modify, distribute, display, perform, or create derivative works from any part of the Service without Toki's prior written consent.

12.2 Limited License
• Toki grants you a limited, non-exclusive, non-transferable, revocable license to access and use the Service solely for personal, non-commercial purposes in accordance with these Terms.
• This license may be revoked at any time without notice.

12.3 Feedback
• If you provide feedback, suggestions, or ideas to Toki, you grant Toki a perpetual, irrevocable, worldwide, royalty-free license to use such feedback without any obligation or compensation to you.

13. Dispute Resolution and Arbitration

13.1 Mandatory Binding Arbitration
YOU AND TOKI AGREE THAT ANY DISPUTE, CLAIM, OR CONTROVERSY ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE (COLLECTIVELY, "DISPUTES") WILL BE RESOLVED EXCLUSIVELY THROUGH BINDING ARBITRATION, EXCEPT AS PROVIDED BELOW.

BY AGREEING TO ARBITRATION, YOU ARE WAIVING YOUR RIGHT TO GO TO COURT, INCLUDING YOUR RIGHT TO A JURY TRIAL.

13.2 Arbitration Procedure
• Arbitration shall be conducted in Tel Aviv, Israel, in accordance with the rules of the Israeli Arbitration Law.
• The arbitration shall be conducted by a single arbitrator agreed upon by both parties, or if no agreement is reached, appointed in accordance with Israeli law.
• The arbitrator's decision shall be final and binding.
• Each party shall bear its own costs and fees, unless the arbitrator determines otherwise.

13.3 Exceptions to Arbitration
The following Disputes are NOT subject to arbitration:
• Claims brought in small claims court, if they qualify
• Claims seeking injunctive or equitable relief to protect intellectual property rights
• Any claim that cannot be arbitrated under applicable law

13.4 Class Action Waiver
YOU AND TOKI AGREE THAT DISPUTES MUST BE BROUGHT ON AN INDIVIDUAL BASIS ONLY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING.

YOU AND TOKI WAIVE ANY RIGHT TO A CLASS ACTION, CLASS ARBITRATION, OR REPRESENTATIVE ACTION.

13.5 Informal Resolution
• Before initiating arbitration, you agree to first contact Toki at support@tokiapp.com to attempt to resolve the Dispute informally.
• You must wait at least 30 days before initiating arbitration.

13.6 Time Limitation
• Any Dispute must be brought within one (1) year of the date the cause of action arose, or it is permanently barred.

14. Governing Law and Jurisdiction

14.1 Governing Law
• These Terms and any Disputes shall be governed by and construed in accordance with the laws of the State of Israel, without regard to its conflict of law principles.

14.2 Jurisdiction
• To the extent any Dispute is not subject to arbitration, you agree that such Dispute shall be resolved exclusively in the competent courts of Tel Aviv, Israel.
• You irrevocably consent to the personal jurisdiction of such courts and waive any objection to venue.

15. Modifications to Terms

15.1 Right to Modify
• Toki reserves the right to modify, update, or replace these Terms at any time, in its sole discretion, with or without notice.
• Updated Terms will be posted on the Service with a new "Last Updated" date.

15.2 Acceptance of Modifications
• Your continued use of the Service after any changes constitutes your acceptance of the modified Terms.
• If you do not agree to the modified Terms, you must stop using the Service immediately.

15.3 Material Changes
• For material changes, Toki may (but is not obligated to) provide additional notice, such as an in-app notification or email.

16. General Provisions

16.1 Entire Agreement
• These Terms, together with the Privacy Policy, constitute the entire agreement between you and Toki and supersede all prior agreements, understandings, and representations.

16.2 Severability
• If any provision of these Terms is found to be invalid, illegal, or unenforceable, the remaining provisions shall remain in full force and effect.
• The invalid provision shall be modified to the minimum extent necessary to make it enforceable, or if that is not possible, severed from these Terms.

16.3 No Waiver
• Toki's failure to enforce any provision of these Terms does not constitute a waiver of that provision or any other provision.
• Any waiver must be in writing and signed by Toki.

16.4 Assignment
• You may not assign or transfer these Terms or any rights or obligations hereunder without Toki's prior written consent.
• Toki may assign these Terms at any time without notice or consent.

16.5 No Partnership
• Nothing in these Terms creates any partnership, joint venture, agency, employment, or fiduciary relationship between you and Toki.

16.6 Force Majeure
• Toki shall not be liable for any failure or delay in performance due to causes beyond its reasonable control, including but not limited to acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, floods, accidents, pandemics, strikes, or shortages of transportation, fuel, energy, labor, or materials.

16.7 Survival
• Provisions that by their nature should survive termination shall survive, including but not limited to: Sections 4 (User Content), 8 (Disclaimers), 9 (Limitation of Liability), 10 (Indemnification), 13 (Dispute Resolution), and 14 (Governing Law).

16.8 Language
• These Terms may be translated into other languages for convenience. In the event of any conflict, the English version shall prevail.

16.9 Headings
• Section headings are for convenience only and do not affect the interpretation of these Terms.

17. Contact Information

For questions, concerns, or notices regarding these Terms, please contact:

Toki App Ltd.
Email: support@tokiapp.com

PLEASE NOTE: This email is for questions about these Terms only. Toki does not provide support, mediation, or assistance regarding Events, disputes between users, or safety concerns. You are solely responsible for your own safety and interactions.

18. Acknowledgment

BY USING THE SERVICE, YOU ACKNOWLEDGE THAT:

1. You have read, understood, and agree to be bound by these Terms in their entirety.
2. Toki is only a technology platform and has no responsibility for Events, users, or anything that happens on or off the platform.
3. You use the Service entirely at your own risk.
4. You are solely responsible for your own safety and the safety of any Events you host.
5. Toki makes no warranties or guarantees of any kind and provides the Service "AS IS."
6. Toki's liability is strictly limited as described in these Terms.
7. You agree to binding arbitration and waive your right to a jury trial.
8. You agree to indemnify and hold Toki harmless from any claims arising from your use of the Service.
9. If you do not agree to these Terms, you must not use the Service.

Last Updated: November 17, 2025

© 2025 Toki App Ltd. All rights reserved.`;

export default function TermsOfUseScreen() {
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
          <Text style={styles.headerTitle}>Terms of Use</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.content}>
            <Text style={styles.termsText}>{TERMS_CONTENT}</Text>
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
  termsText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#1C1C1C',
    lineHeight: 22,
  },
});



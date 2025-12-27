# File: TermsAgreementModal.tsx

### Summary
This component displays a modal requiring users to accept the Terms of Use and Privacy Policy. It shows a summary of key terms points (No Tolerance policy, user responsibilities), includes a checkbox for acceptance, and handles the terms acceptance flow with loading states and error handling.

### Fixes Applied log
- problem: Needed a user-friendly modal to display and collect Terms of Use acceptance
- solution: Created reusable modal component with scrollable content area
- solution: Added checkbox UI for explicit consent
- solution: Implemented accept/cancel handlers with loading states
- solution: Matched app's design aesthetic with gradient backgrounds and styled components

### How Fixes Were Implemented
- problem: Users who haven't accepted current terms version need to be prompted
- solution: Modal uses presentationStyle="pageSheet" for native iOS feel
- solution: Scrollable content displays key terms summaries and bullet points
- solution: Accept button disabled until checkbox is checked
- solution: Async onAccept handler allows login flow to complete after acceptance
- solution: View Full Terms button allows navigation to complete terms page

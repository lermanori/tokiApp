// Web-only wrapper that renders the existing WaitlistForm.jsx exactly as-is
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
// @ts-ignore - allow importing .jsx without types
import WaitlistFormImpl from './WaitlistForm.jsx';

export default function WaitlistForm() {
  const router = useRouter();

  // No automatic redirect - users stay on waitlist page after submission
  // They can use the back button to navigate away if needed

  return <WaitlistFormImpl />;
}



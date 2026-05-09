import React, { useEffect } from 'react';
import { Asset } from 'expo-asset';
import { Link } from 'expo-router';

const APP_STORE_URL = 'https://apps.apple.com/il/app/toki-social-map/id6754792262';
const INSTAGRAM_URL = 'https://www.instagram.com/toki.map/';

const assetUrl = (asset: number) => Asset.fromModule(asset).uri;

const logoHeader = assetUrl(require('../assets/landing/logo-header.png'));
const avatarOne = assetUrl(require('../assets/landing/av1.png'));
const avatarTwo = assetUrl(require('../assets/landing/av2.png'));
const avatarThree = assetUrl(require('../assets/landing/av3.png'));
const cultureImage = assetUrl(require('../assets/landing/culture.png'));
const dinnerImage = assetUrl(require('../assets/landing/dinner.png'));
const filmImage = assetUrl(require('../assets/landing/film.png'));
const hostCrowdImage = assetUrl(require('../assets/landing/host-crowd.png'));
const hostPrimaryImage = assetUrl(require('../assets/landing/host-primary.png'));
const mapArtImage = assetUrl(require('../assets/landing/map-art.png'));
const mapPreviewImage = assetUrl(require('../assets/landing/map-preview.png'));
const musicImage = assetUrl(require('../assets/landing/music.png'));
const partyImage = assetUrl(require('../assets/landing/party.png'));
const chillImage = assetUrl(require('../assets/landing/chill.png'));
const wellnessImage = assetUrl(require('../assets/landing/wellness.png'));

const sceneCards = [
  { image: musicImage, category: 'Saturday Night', title: 'Live Show', tall: true },
  { image: wellnessImage, category: 'Sunday Morning', title: 'Meditation Circle' },
  { image: partyImage, category: 'Friday Night', title: 'Club Night' },
  { image: cultureImage, category: 'Thursday Eve', title: 'Art Opening' },
  { image: dinnerImage, category: 'Wednesday', title: 'Pop-up Dinner' },
];

const stepCards = [
  {
    image: mapPreviewImage,
    title: 'Open the Map',
    description: "See what's happening in the city. Filter by mood or neighborhood. Every dot is a real event.",
  },
  {
    image: chillImage,
    title: 'Pick Your Vibe',
    description: "Tap an event, join the chat, and get to know the people that are going. You're already part of the scene before you leave home.",
  },
  {
    image: filmImage,
    title: 'Just Show Up',
    description: "You know the place, the time, and some of the people. All that's left is walking through the door.",
  },
];

const vibePills = ['Music', 'Wellness', 'Food', 'Art', 'Night', 'Morning', 'Education', 'Sports', 'Film'];

const testimonials = [
  {
    quote:
      "I open Toki every Thursday before I decide anything. It's the first time I've actually felt like I know what's happening in this city.",
    name: 'Maya R.',
    meta: 'Tel Aviv · moved here 6 months ago',
    initial: 'M',
    accent: 'accent-purple',
  },
  {
    quote:
      "I posted my first pop-up dinner and 14 people showed up. Zero ads. Toki just brought them. I've never had that with anything else.",
    name: 'Oren K.',
    meta: 'Chef & pop-up host',
    initial: 'O',
    accent: 'accent-green',
  },
  {
    quote:
      'The event chat is underrated. I knew 3 people going before I even left home. Walked in and it already felt like my place.',
    name: 'Sophie T.',
    meta: 'Digital nomad · Tel Aviv',
    initial: 'S',
    accent: 'accent-orange',
  },
];

const tickerItems = [
  'Pop-up Markets',
  'Jazz Nights',
  'Rooftop Parties',
  'Morning Yoga',
  'Art Openings',
  'Intimate Dinners',
  'Live Shows',
  'Reading Circles',
  'Beach Clubs',
  'Film Nights',
  'Wellness Sessions',
  'Tech Meetups',
];

const LANDING_STYLES = `
  :root {
    --landing-p1: #4a2e88;
    --landing-p2: #6a4bb6;
    --landing-p3: #9068d0;
    --landing-peach: #ddb0a0;
    --landing-green: #28c870;
    --landing-green-d: #1ea858;
    --landing-bg: #f2eef9;
    --landing-white: #ffffff;
    --landing-ink: #140c28;
    --landing-muted: #8070a0;
    --landing-grad: linear-gradient(148deg, #4a2e88 0%, #6a4bb6 32%, #9a6ac8 60%, #c898c0 80%, #ddb0a0 100%);
  }

  body[data-toki-landing='true'] {
    background: var(--landing-bg);
  }

  .landing-page,
  .landing-page * {
    box-sizing: border-box;
  }

  .landing-page {
    font-family: Inter, sans-serif;
    color: var(--landing-ink);
    background: var(--landing-bg);
    overflow-x: hidden;
  }

  .landing-page a {
    color: inherit;
    text-decoration: none;
  }

  .landing-nav {
    position: absolute;
    inset: 0 0 auto;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 36px 0;
  }

  .landing-logo img {
    display: block;
    height: 56px;
    width: auto;
  }

  .landing-pill-button,
  .landing-pill-link,
  .landing-outline-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 46px;
    border-radius: 999px;
    font-weight: 700;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, border-color 0.2s ease;
  }

  .landing-pill-button {
    background: var(--landing-green);
    color: #fff;
    padding: 10px 20px;
    box-shadow: 0 10px 24px rgba(40, 200, 112, 0.28);
  }

  .landing-pill-button:hover {
    background: var(--landing-green-d);
    transform: translateY(-1px);
  }

  .landing-hero {
    position: relative;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background: var(--landing-grad);
    overflow: hidden;
  }

  .landing-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 70% 55% at 15% 45%, rgba(255, 255, 255, 0.07) 0%, transparent 60%),
      radial-gradient(ellipse 55% 70% at 85% 65%, rgba(180, 100, 255, 0.1) 0%, transparent 60%);
    pointer-events: none;
  }

  .landing-hero-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 35%;
    opacity: 0.14;
    mix-blend-mode: screen;
  }

  .landing-hero-body {
    position: relative;
    z-index: 2;
    display: flex;
    flex: 1;
    align-items: center;
    padding: 120px 44px 60px;
  }

  .landing-hero-content {
    max-width: 660px;
  }

  .landing-badge,
  .landing-cta-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 7px 15px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.82);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    backdrop-filter: blur(12px);
  }

  .landing-live-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--landing-green);
    animation: landing-live-pulse 1.9s ease-in-out infinite;
  }

  .landing-hero-title,
  .landing-section-title,
  .landing-cta-title,
  .landing-card-title,
  .landing-step-title {
    font-family: "Barlow Condensed", Impact, sans-serif;
    text-transform: uppercase;
  }

  .landing-hero-title {
    margin: 20px 0 16px;
    color: #fff;
    font-size: clamp(54px, 8vw, 98px);
    font-weight: 900;
    line-height: 0.88;
    letter-spacing: -2px;
  }

  .landing-hero-lead {
    max-width: 480px;
    margin: 0 0 40px;
    color: rgba(255, 255, 255, 0.72);
    font-size: clamp(16px, 2vw, 20px);
    line-height: 1.65;
  }

  .landing-hero-lead strong {
    color: #fff;
  }

  .landing-button-row,
  .landing-cta-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .landing-store-button,
  .landing-store-button-large {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 13px 22px;
    border-radius: 999px;
    background: #fff;
    color: var(--landing-ink);
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
  }

  .landing-store-button:hover,
  .landing-store-button-large:hover {
    transform: translateY(-2px);
  }

  .landing-store-text-top {
    font-size: 10px;
    opacity: 0.56;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }

  .landing-store-text-bottom {
    font-size: 17px;
    font-weight: 800;
    line-height: 1.1;
  }

  .landing-outline-link {
    padding: 13px 22px;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    color: #fff;
    font-size: 14px;
  }

  .landing-outline-link:hover {
    border-color: rgba(255, 255, 255, 0.85);
    background: rgba(255, 255, 255, 0.08);
  }

  .landing-social-proof {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 36px;
    color: rgba(255, 255, 255, 0.74);
  }

  .landing-avatar-row {
    display: flex;
    align-items: center;
  }

  .landing-avatar {
    width: 34px;
    height: 34px;
    margin-right: -10px;
    border: 2px solid rgba(255, 255, 255, 0.32);
    border-radius: 999px;
    overflow: hidden;
  }

  .landing-avatar:last-child {
    margin-right: 0;
  }

  .landing-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .landing-ticker {
    overflow: hidden;
    background: #0e0820;
    border-top: 1.5px solid rgba(255, 255, 255, 0.24);
    border-bottom: 1.5px solid rgba(255, 255, 255, 0.24);
  }

  .landing-ticker-track {
    display: inline-flex;
    min-width: max-content;
    animation: landing-roll 32s linear infinite;
  }

  .landing-ticker-item {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.8px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .landing-ticker-sep {
    opacity: 0.28;
    font-size: 8px;
  }

  .landing-section {
    padding: 68px 44px;
  }

  .landing-section.section-white {
    background: #fff;
  }

  .landing-section.section-soft {
    background: var(--landing-bg);
  }

  .landing-section.section-gradient {
    background: var(--landing-grad);
    color: #fff;
  }

  .landing-eyebrow {
    margin: 0 0 12px;
    color: var(--landing-p2);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .section-gradient .landing-eyebrow {
    color: rgba(255, 255, 255, 0.58);
  }

  .landing-section-title {
    margin: 0 0 12px;
    font-size: clamp(36px, 4.5vw, 60px);
    font-weight: 900;
    line-height: 0.95;
    letter-spacing: -1px;
  }

  .landing-section-subtitle {
    max-width: 500px;
    margin: 0 0 52px;
    color: var(--landing-muted);
    font-size: 16px;
    line-height: 1.65;
  }

  .section-gradient .landing-section-subtitle {
    color: rgba(255, 255, 255, 0.7);
  }

  .landing-scene-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: 280px 260px;
    gap: 12px;
  }

  .landing-scene-card {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    min-height: 220px;
  }

  .landing-scene-card.tall {
    grid-row: span 2;
  }

  .landing-scene-card img,
  .landing-step-image img,
  .landing-host-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .landing-scene-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 22px;
    background: linear-gradient(to top, rgba(24, 8, 60, 0.88) 0%, rgba(24, 8, 60, 0.12) 55%, transparent 100%);
  }

  .landing-scene-category {
    color: rgba(255, 255, 255, 0.65);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .landing-scene-title {
    color: #fff;
    font-family: "Barlow Condensed", Impact, sans-serif;
    font-size: 24px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .landing-steps {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
    margin-top: 56px;
  }

  .landing-step-image {
    position: relative;
    height: 200px;
    margin-bottom: 20px;
    border-radius: 16px;
    overflow: hidden;
  }

  .landing-step-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 2;
    width: 30px;
    height: 30px;
    border-radius: 999px;
    background: var(--landing-grad);
    color: #fff;
    font-size: 13px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 14px rgba(74, 46, 136, 0.45);
  }

  .landing-step-title {
    margin: 0 0 8px;
    font-size: 23px;
    font-weight: 900;
    letter-spacing: -0.3px;
  }

  .landing-step-description {
    margin: 0;
    color: var(--landing-muted);
    font-size: 15px;
    line-height: 1.65;
  }

  .landing-bento {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }

  .landing-card {
    position: relative;
    overflow: hidden;
    border-radius: 20px;
    min-height: 200px;
  }

  .landing-card.card-dark {
    background: var(--landing-grad);
    color: #fff;
  }

  .landing-card.card-light {
    background: var(--landing-bg);
  }

  .landing-card.tall {
    grid-row: span 2;
    min-height: 260px;
  }

  .landing-card-content {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 28px;
  }

  .landing-card-tag {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .card-dark .landing-card-tag {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .card-light .landing-card-tag {
    color: var(--landing-p2);
    background: rgba(74, 46, 136, 0.08);
    border: 1px solid rgba(74, 46, 136, 0.14);
  }

  .landing-card-title {
    margin: 18px 0 10px;
    font-size: clamp(20px, 2.2vw, 28px);
    font-weight: 900;
    line-height: 1;
  }

  .landing-card-description {
    margin: 0;
    font-size: 14px;
    line-height: 1.65;
  }

  .card-dark .landing-card-description {
    color: rgba(255, 255, 255, 0.78);
  }

  .card-light .landing-card-description {
    color: var(--landing-muted);
  }

  .landing-map-art {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.85;
  }

  .landing-map-scrim {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 40%, rgba(10, 5, 30, 0.72) 75%, rgba(10, 5, 30, 0.88) 100%);
  }

  .landing-map-overlay {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(120, 190, 255, 0.12) 0 16%, transparent 16%),
      linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
    background-size: 100% 100%, 100% 24px, 26px 100%;
    opacity: 0.45;
  }

  .landing-pulse {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 999px;
  }

  .landing-pulse::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    border: 1px solid currentColor;
    animation: landing-ping 2.6s ease-out infinite;
  }

  .landing-pulse.pulse-green {
    color: #28c870;
    background: #28c870;
    left: 34%;
    top: 49%;
  }

  .landing-pulse.pulse-purple {
    color: #c090e8;
    background: #c090e8;
    left: 66%;
    top: 28%;
    width: 10px;
    height: 10px;
    animation-delay: 0.4s;
  }

  .landing-pulse.pulse-orange {
    color: #e09a50;
    background: #e09a50;
    left: 24%;
    top: 76%;
    width: 9px;
    height: 9px;
    animation-delay: 0.8s;
  }

  .landing-pill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 14px;
  }

  .landing-vibe-pill {
    padding: 6px 13px;
    border-radius: 999px;
    border: 1.5px solid rgba(106, 75, 182, 0.24);
    color: var(--landing-p2);
    background: rgba(144, 104, 208, 0.08);
    font-size: 12px;
    font-weight: 700;
  }

  .landing-chat {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }

  .landing-chat-bubble {
    max-width: 82%;
    padding: 9px 13px;
    border-radius: 12px;
    font-size: 12.5px;
    font-weight: 500;
    line-height: 1.4;
  }

  .landing-chat-bubble.incoming {
    background: rgba(255, 255, 255, 0.12);
    border-bottom-left-radius: 4px;
  }

  .landing-chat-bubble.outgoing {
    margin-left: auto;
    color: #fff;
    background: var(--landing-green);
    border-bottom-right-radius: 4px;
  }

  .landing-chat-meta {
    color: rgba(255, 255, 255, 0.42);
    font-size: 10px;
    font-weight: 500;
    margin-top: 4px;
  }

  .landing-card-number {
    margin-top: auto;
    font-family: "Barlow Condensed", Impact, sans-serif;
    font-size: 80px;
    font-weight: 900;
    line-height: 1;
  }

  .landing-card-caption {
    color: rgba(255, 255, 255, 0.56);
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  .landing-hosts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 72px;
    align-items: center;
  }

  .landing-host-images {
    position: relative;
    height: 460px;
  }

  .landing-host-image {
    position: absolute;
    overflow: hidden;
    border-radius: 18px;
    box-shadow: 0 24px 64px rgba(74, 46, 136, 0.18);
  }

  .landing-host-image.primary {
    width: 68%;
    height: 360px;
    top: 0;
    left: 0;
  }

  .landing-host-image.secondary {
    width: 52%;
    height: 240px;
    right: 0;
    bottom: 0;
  }

  .landing-perks {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin: 0 0 36px;
  }

  .landing-perk {
    display: flex;
    gap: 13px;
    align-items: flex-start;
  }

  .landing-perk-icon {
    width: 38px;
    height: 38px;
    border-radius: 11px;
    background: linear-gradient(135deg, var(--landing-p2), var(--landing-p3));
    color: #fff;
    font-size: 14px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .landing-perk-title {
    margin: 0 0 2px;
    font-size: 14.5px;
    font-weight: 700;
  }

  .landing-perk-description {
    margin: 0;
    color: var(--landing-muted);
    font-size: 14px;
    line-height: 1.55;
  }

  .landing-testimonial-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
    margin-top: 52px;
  }

  .landing-testimonial {
    padding: 28px;
    border-radius: 20px;
    background: var(--landing-bg);
    border: 1px solid rgba(74, 46, 136, 0.07);
  }

  .landing-stars {
    color: #f5a800;
    font-size: 15px;
    letter-spacing: 1px;
    margin-bottom: 16px;
  }

  .landing-quote {
    margin: 0 0 22px;
    color: var(--landing-ink);
    font-size: 14.5px;
    line-height: 1.7;
    font-style: italic;
  }

  .landing-testimonial-author {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .landing-testimonial-avatar {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 800;
  }

  .landing-testimonial-avatar.accent-purple {
    background: linear-gradient(135deg, var(--landing-p2), var(--landing-p3));
  }

  .landing-testimonial-avatar.accent-green {
    background: linear-gradient(135deg, var(--landing-green), var(--landing-green-d));
  }

  .landing-testimonial-avatar.accent-orange {
    background: linear-gradient(135deg, #e09050, #c07030);
  }

  .landing-testimonial-name {
    font-size: 13.5px;
    font-weight: 700;
  }

  .landing-testimonial-meta {
    color: var(--landing-muted);
    font-size: 11.5px;
  }

  .landing-cta {
    position: relative;
    overflow: hidden;
    padding: 120px 44px;
    background: var(--landing-grad);
    text-align: center;
  }

  .landing-cta::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url('${musicImage}');
    background-size: cover;
    background-position: center;
    mix-blend-mode: screen;
    opacity: 0.09;
  }

  .landing-cta-inner {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .landing-cta-title {
    margin: 24px 0 22px;
    color: #fff;
    font-size: clamp(56px, 8vw, 108px);
    font-weight: 900;
    line-height: 0.88;
    letter-spacing: -3px;
  }

  .landing-cta-copy {
    max-width: 420px;
    margin: 0 0 46px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 17px;
    line-height: 1.65;
  }

  .landing-cta-note {
    margin-top: 18px;
    color: rgba(255, 255, 255, 0.42);
    font-size: 12.5px;
  }

  .landing-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 18px;
    padding: 40px 44px;
    background: #0d0820;
    color: #fff;
  }

  .landing-footer-logo {
    height: 44px;
    width: auto;
    display: block;
  }

  .landing-footer-subtitle {
    margin-top: 3px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 12px;
  }

  .landing-footer-links {
    display: flex;
    gap: 22px;
    flex-wrap: wrap;
  }

  .landing-footer-links a {
    color: rgba(255, 255, 255, 0.42);
    font-size: 13px;
    font-weight: 500;
  }

  .landing-footer-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    color: rgba(255, 255, 255, 0.3);
    font-size: 11.5px;
  }

  @keyframes landing-roll {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }

  @keyframes landing-live-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.45; transform: scale(1.5); }
  }

  @keyframes landing-ping {
    from { transform: scale(1); opacity: 0.55; }
    to { transform: scale(3); opacity: 0; }
  }

  @media (max-width: 980px) {
    .landing-bento,
    .landing-scene-grid {
      grid-template-columns: 1fr 1fr;
    }

    .landing-card.tall,
    .landing-scene-card.tall {
      grid-row: span 1;
    }

    .landing-scene-grid {
      grid-template-rows: 220px 200px;
    }

    .landing-steps,
    .landing-testimonial-grid,
    .landing-hosts-grid {
      grid-template-columns: 1fr;
    }

    .landing-host-images {
      height: 300px;
    }

    .landing-host-image.primary {
      width: 70%;
      height: 220px;
    }

    .landing-host-image.secondary {
      width: 55%;
      height: 170px;
    }
  }

  @media (max-width: 600px) {
    .landing-nav {
      justify-content: center;
      padding: 18px 20px 0;
    }

    .landing-nav .landing-pill-button {
      display: none;
    }

    .landing-logo img {
      height: 72px;
    }

    .landing-hero-body {
      padding: 126px 22px 56px;
    }

    .landing-hero-title {
      font-size: clamp(48px, 13vw, 62px);
      letter-spacing: -1.5px;
    }

    .landing-hero-lead,
    .landing-section-subtitle,
    .landing-cta-copy {
      max-width: none;
      font-size: 16px;
    }

    .landing-button-row,
    .landing-cta-actions {
      flex-direction: column;
    }

    .landing-store-button,
    .landing-store-button-large,
    .landing-outline-link {
      width: 100%;
    }

    .landing-section,
    .landing-cta,
    .landing-footer {
      padding-left: 22px;
      padding-right: 22px;
    }

    .landing-section {
      padding-top: 60px;
      padding-bottom: 60px;
    }

    .landing-scene-grid,
    .landing-bento {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .landing-scene-grid {
      grid-template-rows: none;
    }

    .landing-scene-card {
      height: 210px;
    }

    .landing-scene-card.tall {
      height: 270px;
    }

    .landing-steps {
      margin-top: 28px;
    }

    .landing-step-image {
      height: 170px;
    }

    .landing-card-content,
    .landing-testimonial {
      padding: 22px;
    }

    .landing-host-images {
      height: 270px;
      order: 2;
    }

    .landing-cta {
      padding-top: 80px;
      padding-bottom: 80px;
    }

    .landing-cta-title {
      font-size: clamp(44px, 12vw, 60px);
      letter-spacing: -1.5px;
    }

    .landing-footer {
      flex-direction: column;
      align-items: flex-start;
      gap: 24px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .landing-live-dot,
    .landing-ticker-track,
    .landing-pulse::after {
      animation: none;
    }
  }
`;

function useLandingDocument() {
  useEffect(() => {
    const previousTitle = document.title;
    const metaDescription = document.querySelector('meta[name="description"]');
    const previousDescription = metaDescription?.getAttribute('content') ?? null;

    document.title = 'Toki - Find Your Scene in Tel Aviv';
    document.body.setAttribute('data-toki-landing', 'true');
    metaDescription?.setAttribute(
      'content',
      'Toki is the social map of Tel Aviv. Real-time events filtered by vibe. From massive raves to reading circles - find what is yours.'
    );

    const style = document.createElement('style');
    style.setAttribute('data-toki-landing-style', 'true');
    style.textContent = LANDING_STYLES;
    document.head.appendChild(style);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Barlow+Condensed:wght@700;800;900&display=swap';
    link.setAttribute('data-toki-landing-fonts', 'true');
    document.head.appendChild(link);

    return () => {
      document.title = previousTitle;
      document.body.removeAttribute('data-toki-landing');
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute('content', previousDescription);
      }
      style.remove();
      link.remove();
    };
  }, []);
}

function AppleMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
        fill="black"
      />
    </svg>
  );
}

export default function LandingPage() {
  useLandingDocument();

  const landingHref = '/landing' as any;

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link href={landingHref} className="landing-logo" aria-label="Toki landing page">
          <img src={logoHeader} alt="Toki" />
        </Link>
        <Link href="/register" className="landing-pill-button">
          Join Toki
        </Link>
      </nav>

      <section className="landing-hero">
        <img className="landing-hero-image" src={partyImage} alt="" aria-hidden="true" />
        <div className="landing-hero-body">
          <div className="landing-hero-content">
            <div className="landing-badge">
              <span className="landing-live-dot" />
              Live in Tel Aviv
            </div>

            <h1 className="landing-hero-title">
              Everything Happening.
              <br />
              One Map.
            </h1>

            <p className="landing-hero-lead">
              Toki is the cultural map of Tel Aviv. <strong>Find events that match your vibe</strong> from
              underground raves to reading circles and connect with people who are going.
            </p>

            <div className="landing-button-row">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noreferrer"
                className="landing-store-button"
              >
                <AppleMark />
                <span>
                  <div className="landing-store-text-top">Download on the</div>
                  <div className="landing-store-text-bottom">App Store</div>
                </span>
              </a>
              <Link href="/login" className="landing-outline-link">
                Open Web App
              </Link>
            </div>

            <div className="landing-social-proof">
              <div className="landing-avatar-row" aria-hidden="true">
                {[avatarOne, avatarTwo, avatarThree].map((avatar, index) => (
                  <div className="landing-avatar" key={index}>
                    <img src={avatar} alt="" />
                  </div>
                ))}
              </div>
              <p>
                <strong>1,500+ people</strong> from Tel Aviv already on Toki
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="landing-ticker" aria-hidden="true">
        <div className="landing-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <span className="landing-ticker-item" key={`${item}-${index}`}>
              {item}
              <span className="landing-ticker-sep">+</span>
            </span>
          ))}
        </div>
      </div>

      <section className="landing-section section-gradient">
        <p className="landing-eyebrow">What&apos;s on Toki</p>
        <h2 className="landing-section-title">
          From Massive Raves
          <br />
          to Reading Circles.
        </h2>
        <p className="landing-section-subtitle">Whatever your scene, it&apos;s on the map.</p>

        <div className="landing-scene-grid">
          {sceneCards.map((scene) => (
            <article className={`landing-scene-card${scene.tall ? ' tall' : ''}`} key={scene.title}>
              <img src={scene.image} alt={scene.title} />
              <div className="landing-scene-overlay">
                <div className="landing-scene-category">{scene.category}</div>
                <div className="landing-scene-title">{scene.title}</div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section section-white">
        <p className="landing-eyebrow">How It Works</p>
        <h2 className="landing-section-title">
          Three Taps To
          <br />
          Your Next Great Night.
        </h2>

        <div className="landing-steps">
          {stepCards.map((step, index) => (
            <article key={step.title}>
              <div className="landing-step-image">
                <div className="landing-step-badge">{index + 1}</div>
                <img src={step.image} alt={step.title} />
              </div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-description">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section section-white">
        <p className="landing-eyebrow">How Toki Works</p>
        <h2 className="landing-section-title">
          Built For
          <br />
          Your Scene.
        </h2>
        <p className="landing-section-subtitle">
          Every feature designed for one thing: getting you to the right place at the right time.
        </p>

        <div className="landing-bento">
          <article className="landing-card card-dark tall">
            <img className="landing-map-art" src={mapArtImage} alt="" aria-hidden="true" />
            <div className="landing-map-overlay" />
            <div className="landing-pulse pulse-green" />
            <div className="landing-pulse pulse-purple" />
            <div className="landing-pulse pulse-orange" />
            <div className="landing-map-scrim" />
            <div className="landing-card-content">
              <div className="landing-card-tag">Live Map</div>
              <div style={{ marginTop: 'auto' }}>
                <h3 className="landing-card-title">
                  See What&apos;s
                  <br />
                  Happening Now
                </h3>
                <p className="landing-card-description">
                  Everything in Tel Aviv plotted live. In a list or directly on the map.
                </p>
              </div>
            </div>
          </article>

          <article className="landing-card card-light">
            <div className="landing-card-content">
              <div className="landing-card-tag">Filters</div>
              <h3 className="landing-card-title">
                Filter by Vibe,
                <br />
                Not Category
              </h3>
              <p className="landing-card-description">
                Pick your mood. Only what actually matches shows up, with no noise.
              </p>
              <div className="landing-pill-list">
                {vibePills.map((pill) => (
                  <span className="landing-vibe-pill" key={pill}>
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="landing-card card-dark">
            <div className="landing-card-content">
              <div className="landing-card-tag">Group Chat</div>
              <h3 className="landing-card-title">
                Meet People
                <br />
                Before You Arrive
              </h3>
              <div className="landing-chat">
                <div>
                  <div className="landing-chat-bubble incoming">heading over now! coming?</div>
                  <div className="landing-chat-meta">Alex · 10:30</div>
                </div>
                <div>
                  <div className="landing-chat-bubble outgoing">anyone want to share a taxi? I&apos;m on my way</div>
                  <div className="landing-chat-meta" style={{ textAlign: 'right' }}>
                    Ben · 10:32
                  </div>
                </div>
                <div>
                  <div className="landing-chat-bubble incoming">Me too. Where are we meeting?</div>
                  <div className="landing-chat-meta">Sarah · 10:33</div>
                </div>
              </div>
            </div>
          </article>

          <article className="landing-card card-light">
            <div className="landing-card-content">
              <div className="landing-card-tag">Discover</div>
              <h3 className="landing-card-title">
                Plan Ahead
                <br />
                or Go Now
              </h3>
              <p className="landing-card-description">
                Browse upcoming events, save what calls to you, and get reminders so you never miss a
                thing.
              </p>
            </div>
          </article>

          <article className="landing-card card-dark">
            <div className="landing-card-content">
              <div className="landing-card-tag">Hosting</div>
              <div className="landing-card-number">Free.</div>
              <div className="landing-card-caption">Always, for hosts</div>
              <p className="landing-card-description" style={{ marginTop: 14 }}>
                Post events, workshops, and pop-ups in under 2 minutes. Zero fees, zero commissions.
              </p>
            </div>
          </article>
        </div>
      </section>

      <section className="landing-section section-soft">
        <div className="landing-hosts-grid">
          <div className="landing-host-images">
            <div className="landing-host-image primary">
              <img src={hostPrimaryImage} alt="Event host" />
            </div>
            <div className="landing-host-image secondary">
              <img src={hostCrowdImage} alt="Event crowd" />
            </div>
          </div>

          <div>
            <p className="landing-eyebrow">For Hosts &amp; Creators</p>
            <h2 className="landing-section-title">
              Host The Vibe.
              <br />
              Find Your Crowd.
            </h2>
            <p className="landing-section-subtitle" style={{ marginBottom: 36 }}>
              Whether you&apos;re a DJ, chef, yoga teacher, or artist, Toki is your stage. Post your event
              for free and let the right people find it.
            </p>

            <div className="landing-perks">
              <div className="landing-perk">
                <div className="landing-perk-icon">01</div>
                <div>
                  <p className="landing-perk-title">Post for free, always</p>
                  <p className="landing-perk-description">
                    No listing fees and no commissions. Create your Toki in under 2 minutes.
                  </p>
                </div>
              </div>
              <div className="landing-perk">
                <div className="landing-perk-icon">02</div>
                <div>
                  <p className="landing-perk-title">Show up on the live map</p>
                  <p className="landing-perk-description">
                    Your event is pinned on the city map the moment you publish it.
                  </p>
                </div>
              </div>
              <div className="landing-perk">
                <div className="landing-perk-icon">03</div>
                <div>
                  <p className="landing-perk-title">Built-in community chat</p>
                  <p className="landing-perk-description">
                    Every Toki gets a group chat to build excitement before the event.
                  </p>
                </div>
              </div>
            </div>

            <Link href="/register" className="landing-pill-button">
              Start Hosting Free
            </Link>
          </div>
        </div>
      </section>

      <section className="landing-section section-white">
        <p className="landing-eyebrow">People Say</p>
        <h2 className="landing-section-title">
          The City Suddenly
          <br />
          Feels Interesting Again.
        </h2>

        <div className="landing-testimonial-grid">
          {testimonials.map((testimonial) => (
            <article className="landing-testimonial" key={testimonial.name}>
              <div className="landing-stars">★★★★★</div>
              <p className="landing-quote">"{testimonial.quote}"</p>
              <div className="landing-testimonial-author">
                <div className={`landing-testimonial-avatar ${testimonial.accent}`}>{testimonial.initial}</div>
                <div>
                  <div className="landing-testimonial-name">{testimonial.name}</div>
                  <div className="landing-testimonial-meta">{testimonial.meta}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div className="landing-cta-inner">
          <div className="landing-cta-badge">
            <span className="landing-live-dot" />
            Free to Download
          </div>
          <h2 className="landing-cta-title">
            Find What&apos;s
            <br />
            Yours in
            <br />
            Tel Aviv.
          </h2>
          <p className="landing-cta-copy">
            Tel Aviv never stops. Discover events that match your vibe and never miss what was made for
            you.
          </p>
          <div className="landing-cta-actions">
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noreferrer"
              className="landing-store-button-large"
            >
              <AppleMark />
              <span>
                <div className="landing-store-text-top">Download on the</div>
                <div className="landing-store-text-bottom">App Store</div>
              </span>
            </a>
            <Link href="/login" className="landing-outline-link">
              Open Web App
            </Link>
          </div>
          <p className="landing-cta-note">Free for users and hosts · iOS · Tel Aviv</p>
        </div>
      </section>

      <footer className="landing-footer">
        <div>
          <img className="landing-footer-logo" src={logoHeader} alt="Toki" />
          <div className="landing-footer-subtitle">The social map of Tel Aviv</div>
        </div>

        <div className="landing-footer-links">
          <a href={APP_STORE_URL} target="_blank" rel="noreferrer">
            Download
          </a>
          <Link href="/login">Web App</Link>
          <Link href="/register">For Hosts</Link>
        </div>

        <div className="landing-footer-meta">
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" aria-label="Instagram">
            Instagram
          </a>
          <span>© 2026 Toki · Tel Aviv</span>
        </div>
      </footer>
    </div>
  );
}

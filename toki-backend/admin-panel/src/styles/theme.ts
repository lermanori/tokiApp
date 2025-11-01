// Theme configuration for Toki Admin Panel
// Futuristic design system matching main app

export const theme = {
  colors: {
    primary: {
      purple: '#8B5CF6',
      purpleLight: '#B49AFF',
      purpleDark: '#7C3AED',
    },
    secondary: {
      teal: '#4DC4AA',
      green: '#10B981',
    },
    accents: {
      pink: '#EC4899',
      amber: '#F59E0B',
      red: '#EF4444',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      secondary: 'linear-gradient(135deg, #4DC4AA 0%, #10B981 100%)',
      hero: 'linear-gradient(135deg, #FFF1EB 0%, #F3E7FF 50%, #E5DCFF 100%)',
      card: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(243,231,255,0.9) 100%)',
    },
    glass: {
      bg: 'rgba(255, 255, 255, 0.1)',
      border: 'rgba(255, 255, 255, 0.2)',
      blur: 'blur(10px)',
    },
  },
  shadows: {
    sm: '0 2px 4px rgba(139, 92, 246, 0.1)',
    md: '0 4px 12px rgba(139, 92, 246, 0.15)',
    lg: '0 8px 24px rgba(139, 92, 246, 0.2)',
    glow: '0 0 20px rgba(139, 92, 246, 0.3)',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontWeight: {
      regular: 400,
      medium: 500,
      semiBold: 600,
      bold: 700,
    },
  },
};



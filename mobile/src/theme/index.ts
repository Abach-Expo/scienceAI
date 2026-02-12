// Cosmos.so inspired theme - Dark minimalist design
export const theme = {
  colors: {
    // Primary background colors
    background: {
      primary: '#0A0A0F',
      secondary: '#12121A',
      tertiary: '#1A1A24',
      card: '#16161F',
      elevated: '#1E1E28',
    },
    // Text colors
    text: {
      primary: '#FFFFFF',
      secondary: '#A0A0B0',
      tertiary: '#6B6B7B',
      muted: '#4A4A58',
    },
    // Accent colors - purple/blue gradient like Cosmos
    accent: {
      primary: '#8B5CF6',
      secondary: '#6366F1',
      tertiary: '#A78BFA',
      gradient: ['#8B5CF6', '#6366F1', '#4F46E5'],
    },
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    // Border colors
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.1)',
      focus: 'rgba(139, 92, 246, 0.5)',
    },
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semibold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 40,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    glow: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  },
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
    spring: {
      damping: 15,
      stiffness: 150,
    },
  },
};

export type Theme = typeof theme;

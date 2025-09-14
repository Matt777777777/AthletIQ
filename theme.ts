// theme.ts - Thème centralisé pour AthletIQ
export const theme = {
  colors: {
    // Couleurs principales
    primary: '#0070F3', // Bleu des boutons du chat
    primaryLight: '#3B82F6',
    primaryDark: '#1E40AF',
    
    // Couleurs de fond
    background: '#000000',
    surface: '#111111',
    surfaceElevated: '#1a1a1a',
    surfaceHover: '#1d1d1d',
    
    // Couleurs de texte
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    textTertiary: '#808080',
    textDisabled: '#4d4d4d',
    
    // Couleurs d'accent
    accent: '#0070F3',
    success: '#00d4aa',
    warning: '#ffa94d',
    error: '#ff4444',
    
    // Couleurs des macronutriments
    carbs: '#ff6b9d',
    protein: '#4dabf7',
    fat: '#ffa94d',
    
    // Bordures et séparateurs
    border: '#2a2a2a',
    borderLight: '#333333',
    separator: '#1d1d1d',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.8)',
    overlayLight: 'rgba(0, 0, 0, 0.6)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  typography: {
    // Titres
    h1: {
      fontSize: 28,
      fontWeight: '800' as const,
      lineHeight: 34,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 30,
    },
    h3: {
      fontSize: 20,
      fontWeight: '700' as const,
      lineHeight: 26,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    
    // Corps de texte
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    
    // Labels et boutons
    label: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  },
  
  // Styles réutilisables
  card: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
  },
  
  button: {
    primary: {
      backgroundColor: '#0070F3',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: '#333333',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    minimal: {
      backgroundColor: 'transparent',
      borderRadius: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
  },
  
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#ffffff',
  },
};

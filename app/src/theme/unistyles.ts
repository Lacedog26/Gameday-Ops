import { UnistylesRegistry } from 'react-native-unistyles';

const darkTheme = {
  colors: {
    gold: '#F5C842',
    green: '#A8E6CF',
    bg: '#0C0C0C',
    text: '#F2EDE4',
    dim: 'rgba(242,237,228,0.65)',
    faint: 'rgba(242,237,228,0.40)',
    surf: 'rgba(255,255,255,0.04)',
    bord: 'rgba(255,255,255,0.08)',
    navBg: 'rgba(10,10,10,0.97)',
    navBord: 'rgba(255,255,255,0.10)',
    inputBg: 'rgba(255,255,255,0.05)',
    inputBord: 'rgba(255,255,255,0.08)',
    goldCardBg: 'rgba(245,200,66,0.08)',
    goldCardBord: 'rgba(245,200,66,0.22)',
    ruleBoxBg: 'rgba(245,200,66,0.06)',
    ruleBoxBord: 'rgba(245,200,66,0.20)',
    exampleBg: 'rgba(255,255,255,0.04)',
    exampleBord: 'rgba(255,255,255,0.08)',
    whyBg: 'rgba(255,255,255,0.03)',
    greenBadgeBg: 'rgba(168,230,207,0.10)',
    greenBadgeBord: 'rgba(168,230,207,0.20)',
    proBannerBg: 'rgba(245,200,66,0.12)',
    proBannerBord: 'rgba(245,200,66,0.35)',
    dangerText: 'rgba(255,100,100,0.55)',
    dangerBord: 'rgba(255,80,80,0.18)',
  },
  fonts: {
    serif: 'System',
    mono: 'Poppins_400Regular',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 16,
    xl: 20,
    full: 99,
  },
} as const;

const lightTheme = {
  ...darkTheme,
  colors: {
    ...darkTheme.colors,
    bg: '#FEFDF8',
    text: '#1A1A1A',
    dim: 'rgba(26,26,26,0.62)',
    faint: 'rgba(26,26,26,0.42)',
    surf: 'rgba(0,0,0,0.04)',
    bord: 'rgba(0,0,0,0.10)',
    navBg: 'rgba(254,253,248,0.95)',
    navBord: 'rgba(0,0,0,0.08)',
    inputBg: 'rgba(0,0,0,0.04)',
    inputBord: 'rgba(0,0,0,0.14)',
    goldCardBg: 'rgba(245,200,66,0.10)',
    goldCardBord: 'rgba(245,200,66,0.28)',
    ruleBoxBg: 'rgba(245,200,66,0.08)',
    ruleBoxBord: 'rgba(245,200,66,0.22)',
    exampleBg: 'rgba(0,0,0,0.04)',
    exampleBord: 'rgba(0,0,0,0.09)',
    whyBg: 'rgba(0,0,0,0.03)',
    greenBadgeBg: 'rgba(168,230,207,0.08)',
    greenBadgeBord: 'rgba(168,230,207,0.22)',
    proBannerBg: 'rgba(245,200,66,0.10)',
    proBannerBord: 'rgba(245,200,66,0.35)',
    dangerText: 'rgba(255,100,100,0.55)',
    dangerBord: 'rgba(255,80,80,0.18)',
  },
} as const;

type AppThemes = {
  dark: typeof darkTheme;
  light: typeof darkTheme;
};

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
}

UnistylesRegistry.addThemes({
  dark: darkTheme,
  light: darkTheme,
}).addConfig({
  initialTheme: 'dark',
});
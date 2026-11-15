import { Platform } from 'react-native';

export const colors = {
  bg: '#F7F5F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F1EDE7',
  ink: '#1C1917',
  inkSoft: '#44403C',
  muted: '#78716C',
  faint: '#A8A29E',
  border: '#E7E1D8',
  primary: '#0F766E',
  primaryDark: '#115E59',
  primarySoft: '#D7EEEA',
  accent: '#E07A5F',
  accentSoft: '#FBEAE3',
  gold: '#C9A227',
  success: '#15803D',
  successSoft: '#DCFCE7',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
  warning: '#B45309',
  warningSoft: '#FEF3C7',
  info: '#1D4ED8',
  infoSoft: '#DBEAFE',
  white: '#FFFFFF',
  overlay: 'rgba(28, 25, 23, 0.45)',
};

export const statusColors: Record<string, { bg: string; fg: string }> = {
  Pending: { bg: colors.warningSoft, fg: colors.warning },
  Confirmed: { bg: colors.infoSoft, fg: colors.info },
  Processing: { bg: '#EDE9FE', fg: '#6D28D9' },
  Shipped: { bg: colors.primarySoft, fg: colors.primaryDark },
  Completed: { bg: colors.successSoft, fg: colors.success },
  Delivered: { bg: colors.successSoft, fg: colors.success },
  Cancelled: { bg: colors.dangerSoft, fg: colors.danger },
  Refunded: { bg: colors.surfaceAlt, fg: colors.inkSoft },
  Requested: { bg: colors.warningSoft, fg: colors.warning },
  Approved: { bg: colors.infoSoft, fg: colors.info },
  Received: { bg: colors.primarySoft, fg: colors.primaryDark },
  Rejected: { bg: colors.dangerSoft, fg: colors.danger },
  Paid: { bg: colors.successSoft, fg: colors.success },
  Unpaid: { bg: colors.warningSoft, fg: colors.warning },
  Failed: { bg: colors.dangerSoft, fg: colors.danger },
  AwaitingVerification: { bg: colors.warningSoft, fg: colors.warning },
  Active: { bg: colors.successSoft, fg: colors.success },
  Inactive: { bg: colors.surfaceAlt, fg: colors.muted },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const type = {
  display: { fontSize: 40, lineHeight: 46, fontWeight: '700' as const, letterSpacing: -1.2 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.8 },
  h2: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.5 },
  h3: { fontSize: 19, lineHeight: 25, fontWeight: '700' as const, letterSpacing: -0.2 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 14, lineHeight: 21, fontWeight: '400' as const },
  small: { fontSize: 12.5, lineHeight: 18, fontWeight: '400' as const },
  tiny: { fontSize: 11, lineHeight: 15, fontWeight: '500' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.4 },
};

export const shadow = Platform.select({
  web: { boxShadow: '0 12px 32px rgba(28, 25, 23, 0.08)' } as any,
  default: {
    shadowColor: '#1C1917',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
});

export const fonts = Platform.select({
  web: {
    body: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    display: "'Fraunces', 'Georgia', serif",
  },
  default: { body: undefined as string | undefined, display: undefined as string | undefined },
});

export const maxContentWidth = 1240;

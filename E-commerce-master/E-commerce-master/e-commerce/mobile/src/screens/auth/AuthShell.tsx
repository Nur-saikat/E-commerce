import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from '../../navigation/Router';
import { useSettings } from '../../state/SettingsContext';
import { colors, radius, spacing } from '../../theme';
import { AppText, Card } from '../../components/ui';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { settings } = useSettings();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  return (
    <View style={styles.wrap}>
      {wide ? (
        <View style={styles.brandPanel}>
          <AppText variant="label" color="rgba(255,255,255,0.72)" style={{ letterSpacing: 2 }}>
            SA FWAN · MIRPUR
          </AppText>
          <AppText variant="display" color={colors.white} style={{ marginTop: spacing.lg }}>
            {settings.storeName}
          </AppText>
          <AppText variant="body" color="rgba(255,255,255,0.78)" style={{ marginTop: spacing.md, maxWidth: 380 }}>
            {settings.tagline ??
              'Everyday pieces chosen with care — for little ones, and the people who love them.'}
          </AppText>
          <View style={styles.brandPoints}>
            {['Thoughtfully curated essentials', 'Secure checkout and verified payments', 'Delivery across Bangladesh'].map(
              point => (
                <View key={point} style={styles.brandPoint}>
                  <View style={styles.dot} />
                  <AppText variant="small" color="rgba(255,255,255,0.85)">{point}</AppText>
                </View>
              ),
            )}
          </View>
          <AppText
            variant="small"
            color="rgba(255,255,255,0.6)"
            style={{ marginTop: 'auto' }}
            onPress={() => router.navigate('home')}
          >
            ← Back to the shop
          </AppText>
        </View>
      ) : null}
      <View style={styles.formPanel}>
        <View style={{ width: '100%', maxWidth: 440, gap: spacing.lg }}>
          {!wide ? (
            <AppText variant="label" color={colors.primary} onPress={() => router.navigate('home')}>
              ← {settings.storeName}
            </AppText>
          ) : null}
          <View>
            <AppText variant="h1">{title}</AppText>
            {subtitle ? (
              <AppText variant="small" color={colors.muted} style={{ marginTop: spacing.xs }}>{subtitle}</AppText>
            ) : null}
          </View>
          <Card style={{ padding: spacing.xl, gap: spacing.lg }}>{children}</Card>
          {footer ? <View style={{ alignItems: 'center' }}>{footer}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg, minHeight: '100%' },
  brandPanel: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    padding: 56,
    justifyContent: 'flex-start',
    maxWidth: 560,
  },
  brandPoints: { gap: spacing.md, marginTop: spacing.xxl },
  brandPoint: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  formPanel: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    borderRadius: radius.lg,
  },
});

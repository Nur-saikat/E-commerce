import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { AppText, Card, Page, PageHeader } from '../../components/ui';
import { compactMoney } from '../../format';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

export function AdminPage({
  title,
  subtitle,
  actions,
  children,
  gap = spacing.xl,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  gap?: number;
}) {
  return (
    <Page gap={gap}>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </Page>
  );
}

export function RowCard({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card onPress={onPress} style={[{ padding: spacing.lg, gap: spacing.sm }, style]}>
      {children}
    </Card>
  );
}

export function ListHeader({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={styles.listHeader}>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
      {right ? <View style={styles.listHeaderRight}>{right}</View> : null}
    </View>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <View style={styles.toolbar}>{children}</View>;
}

export function MiniBars({ points, valueKey }: { points: { label: string; revenue?: number; value?: number }[]; valueKey?: 'revenue' | 'value' }) {
  const { symbol } = useSettings();
  const values = points.map(point => (valueKey === 'value' ? point.value ?? 0 : point.revenue ?? 0));
  const max = Math.max(1, ...values);
  return (
    <View style={styles.bars}>
      {points.map((point, index) => (
        <View key={`${point.label}-${index}`} style={styles.barColumn}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { height: `${Math.max(2, (values[index] / max) * 100)}%` },
                index === points.length - 1 && { backgroundColor: colors.accent },
              ]}
            />
          </View>
          <AppText variant="tiny" color={colors.faint} numberOfLines={1} style={{ fontSize: 9 }}>
            {point.label}
          </AppText>
        </View>
      ))}
      {points.length === 0 ? (
        <AppText variant="small" color={colors.faint} style={{ padding: spacing.md }}>
          No activity in this period.
        </AppText>
      ) : null}
      <AppText variant="tiny" color={colors.faint} style={{ position: 'absolute', top: 0, right: 0 }}>
        peak {compactMoney(max, symbol)}
      </AppText>
    </View>
  );
}

export function SummaryGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.summaryGrid}>{children}</View>;
}

export function EmptyRow({ message }: { message: string }) {
  return (
    <View style={styles.emptyRow}>
      <AppText variant="small" color={colors.muted}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  listHeaderRight: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'center' },
  toolbar: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', alignItems: 'flex-end' },
  bars: {
    height: 140,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    paddingTop: spacing.lg,
    position: 'relative',
  },
  barColumn: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: colors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  summaryGrid: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  emptyRow: { paddingVertical: spacing.xl, alignItems: 'center' },
});

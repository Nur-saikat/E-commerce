import React from 'react';
import { StyleSheet, View } from 'react-native';
import { voucherApi } from '../../api';
import { RequireAuth } from '../../components/RequireAuth';
import {
  AppText,
  Badge,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  Spinner,
  StatCard,
} from '../../components/ui';
import { dateTime, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useAuth } from '../../state/AuthContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

export function RewardsScreen() {
  useDocumentTitle('Rewards');
  return (
    <RequireAuth title="Sign in to see your rewards" message="Voucher points earned from completed orders live here.">
      <RewardsContent />
    </RequireAuth>
  );
}

function RewardsContent() {
  const { user } = useAuth();
  const { fmt, settings } = useSettings();
  const wallet = useAsync(() => voucherApi.wallet(), [user?.id]);

  return (
    <Page gap={spacing.xl}>
      <PageHeader back title="Rewards" subtitle="Voucher points you can spend on future orders." />

      {wallet.loading && !wallet.data ? (
        <Spinner label="Loading your rewards…" />
      ) : wallet.error ? (
        <ErrorState message={wallet.error} onRetry={() => wallet.reload()} />
      ) : wallet.data ? (
        <>
          <Card style={{ padding: spacing.xl, gap: spacing.md, backgroundColor: colors.ink }}>
            <AppText variant="tiny" color={colors.faint} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Available balance
            </AppText>
            <AppText variant="display" color={colors.white}>
              {wallet.data.balance} pts
            </AppText>
            <AppText variant="small" color={colors.faint}>
              Worth {fmt(wallet.data.balance * wallet.data.pointValue)} at checkout
            </AppText>
            {!wallet.data.enabled ? (
              <Badge label={settings.voucherPointsEnabled ? 'Points paused' : 'Points disabled'} tone={{ bg: colors.warningSoft, fg: colors.warning }} />
            ) : null}
          </Card>

          <View style={styles.stats}>
            <StatCard label="Lifetime earned" value={`${wallet.data.lifetimeEarned} pts`} hint="From completed orders" />
            <StatCard label="Lifetime redeemed" value={`${wallet.data.lifetimeRedeemed} pts`} hint="Spent at checkout" accent={colors.accent} />
            <StatCard label="Point value" value={fmt(wallet.data.pointValue)} hint="Per point" accent={colors.gold} />
          </View>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">How rewards work</AppText>
            <AppText variant="small" color={colors.muted}>
              Earn {wallet.data.earnPercent}% of your order value back as points once an order is completed and paid. Up to{' '}
              {settings.voucherMaxRedeemPercent}% of an order can be paid with points, and points stay in your wallet until
              you spend them.
            </AppText>
          </Card>

          <View style={{ gap: spacing.md }}>
            <AppText variant="h3">Points history</AppText>
            {wallet.data.transactions.length === 0 ? (
              <EmptyState title="No point activity yet" message="Points appear here as soon as you earn or redeem them." compact />
            ) : (
              <Card padded={false}>
                {wallet.data.transactions.map((entry, index) => (
                  <View key={entry.id}>
                    <View style={styles.txRow}>
                      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                        <AppText variant="title">{titleCase(entry.type)}</AppText>
                        <AppText variant="tiny" color={colors.muted}>
                          {dateTime(entry.createdAt)}
                          {entry.orderNumber ? ` · ${entry.orderNumber}` : ''}
                          {entry.note ? ` · ${entry.note}` : ''}
                        </AppText>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <AppText variant="title" color={entry.points >= 0 ? colors.success : colors.danger}>
                          {entry.points >= 0 ? '+' : ''}
                          {entry.points} pts
                        </AppText>
                        <AppText variant="tiny" color={colors.faint}>Balance {entry.balanceAfter}</AppText>
                      </View>
                    </View>
                    {index < wallet.data!.transactions.length - 1 ? <Divider /> : null}
                  </View>
                ))}
              </Card>
            )}
          </View>
        </>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, flexWrap: 'wrap' },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { businessApi } from '../../api';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  KeyValue,
  Section,
  Spinner,
  StatCard,
} from '../../components/ui';
import { date, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, EmptyRow, MiniBars, SummaryGrid } from './AdminKit';

export function AdminBusinessOverviewScreen() {
  useDocumentTitle('Business');
  const router = useRouter();
  const { fmt } = useSettings();
  const overview = useAsync(() => businessApi.overview(), []);

  const data = overview.data;

  return (
    <AdminPage
      title="Business overview"
      subtitle="A live picture of trading, stock and team costs."
      actions={
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Button label="Profit & loss" variant="outline" size="sm" onPress={() => router.navigate('admin-profit-loss')} />
          <Button label="New purchase" size="sm" onPress={() => router.navigate('admin-purchases')} />
        </View>
      }
    >
      {overview.loading && !data ? (
        <Spinner label="Loading business data…" />
      ) : overview.error ? (
        <ErrorState message={overview.error} onRetry={() => overview.reload()} />
      ) : data ? (
        <>
          <SummaryGrid>
            <StatCard label="Revenue this month" value={fmt(data.thisMonth.revenue)} hint={`${data.thisMonth.orders} paid orders`} />
            <StatCard label="Net profit this month" value={fmt(data.thisMonth.netProfit)} hint={`${data.thisMonth.margin.toFixed(1)}% margin`} accent={colors.accent} />
            <StatCard label="Inventory value" value={fmt(data.inventoryValue)} hint={`${data.lowStockCount} low stock`} accent={colors.gold} />
            <StatCard label="Net capital" value={fmt(data.netCapital)} hint={`${fmt(data.capitalInvested)} in · ${fmt(data.capitalWithdrawn)} out`} accent={colors.info} />
            <StatCard label="Team" value={`${data.activeStaff}/${data.totalStaff}`} hint="active staff" accent={colors.success} />
            <StatCard label="Lifetime revenue" value={fmt(data.lifetime.revenue)} hint={`${data.totalPaidOrders} paid orders`} accent={colors.inkSoft} />
          </SummaryGrid>

          <Section
            title="Monthly trading"
            subtitle="Revenue, cost of goods and net profit across the year."
            actionLabel="Open report"
            onAction={() => router.navigate('admin-profit-loss')}
          >
            <Card style={{ padding: spacing.lg, gap: spacing.md }}>
              <MiniBars points={data.monthlySeries.map(point => ({ label: point.label, revenue: point.revenue }))} />
              <View style={styles.legendRow}>
                <AppText variant="tiny" color={colors.muted}>Peak month highlighted · BDT</AppText>
                <AppText variant="tiny" color={colors.muted}>
                  Lifetime net {fmt(data.lifetime.netProfit)}
                </AppText>
              </View>
            </Card>
          </Section>

          <View style={styles.twoColumn}>
            <Card style={{ padding: spacing.lg, gap: spacing.sm, flex: 1, minWidth: 280 }}>
              <AppText variant="h3">This month</AppText>
              <KeyValue label="Revenue" value={fmt(data.thisMonth.revenue)} />
              <KeyValue label="Cost of goods" value={fmt(data.thisMonth.costOfGoods)} />
              <KeyValue label="Gross profit" value={fmt(data.thisMonth.grossProfit)} strong />
              <KeyValue label="Operating expenses" value={fmt(data.thisMonth.expenses)} />
              <KeyValue label="Net profit" value={fmt(data.thisMonth.netProfit)} strong />
              <KeyValue label="Margin" value={`${data.thisMonth.margin.toFixed(1)}%`} />
            </Card>
            <Card style={{ padding: spacing.lg, gap: spacing.sm, flex: 1, minWidth: 280 }}>
              <AppText variant="h3">Purchasing</AppText>
              <KeyValue label="Stock purchases" value={fmt(data.totalPurchases)} />
              <KeyValue label="Supplier returns" value={fmt(data.totalPurchaseReturns)} />
              <KeyValue label="Today revenue" value={fmt(data.today.revenue)} />
              <KeyValue label="Today profit" value={fmt(data.today.netProfit)} />
              <KeyValue label="Lifetime COGS" value={fmt(data.lifetime.costOfGoods)} />
              <KeyValue label="Lifetime expenses" value={fmt(data.lifetime.expenses)} />
            </Card>
          </View>

          <View style={styles.twoColumn}>
            <View style={{ flex: 1, minWidth: 280, gap: spacing.md }}>
              <Section title="Recent purchases" actionLabel="All purchases" onAction={() => router.navigate('admin-purchases')}>
                <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
                  {data.recentPurchases.length === 0 ? (
                    <EmptyRow message="No purchases recorded yet." />
                  ) : (
                    data.recentPurchases.slice(0, 4).map(purchase => (
                      <View key={purchase.id} style={styles.rowLine}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText variant="small" weight="600" numberOfLines={1}>{purchase.supplier ?? 'Stock purchase'}</AppText>
                          <AppText variant="tiny" color={colors.muted}>
                            {date(purchase.purchaseDate)} · {purchase.items.length} line(s)
                          </AppText>
                        </View>
                        <AppText variant="small" weight="600">{fmt(purchase.totalAmount)}</AppText>
                      </View>
                    ))
                  )}
                </Card>
              </Section>

              <Section title="Recent expenses" actionLabel="Manage" onAction={() => router.navigate('admin-expenses')}>
                <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
                  {data.recentExpenses.length === 0 ? (
                    <EmptyRow message="No expenses recorded yet." />
                  ) : (
                    data.recentExpenses.slice(0, 4).map(expense => (
                      <View key={expense.id} style={styles.rowLine}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText variant="small" weight="600" numberOfLines={1}>{expense.title}</AppText>
                          <AppText variant="tiny" color={colors.muted}>{titleCase(expense.category)} · {date(expense.expenseDate)}</AppText>
                        </View>
                        <AppText variant="small" weight="600">{fmt(expense.amount)}</AppText>
                      </View>
                    ))
                  )}
                </Card>
              </Section>
            </View>

            <View style={{ flex: 1, minWidth: 280, gap: spacing.md }}>
              <Section title="Low stock" actionLabel="Inventory" onAction={() => router.navigate('admin-inventory')}>
                <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
                  {data.lowStockProducts.length === 0 ? (
                    <EmptyRow message="Every product is above its threshold." />
                  ) : (
                    data.lowStockProducts.slice(0, 5).map(item => (
                      <View key={item.productId} style={styles.rowLine}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText variant="small" weight="600" numberOfLines={1}>{item.name}</AppText>
                          <AppText variant="tiny" color={colors.muted}>{item.sku}</AppText>
                        </View>
                        <Badge
                          label={`${item.stock} left`}
                          tone={item.stock === 0 ? { bg: colors.dangerSoft, fg: colors.danger } : { bg: colors.warningSoft, fg: colors.warning }}
                        />
                      </View>
                    ))
                  )}
                </Card>
              </Section>

              <Section title="Team by department" actionLabel="Staff" onAction={() => router.navigate('admin-staff')}>
                <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
                  {data.staffByDepartment.length === 0 ? (
                    <EmptyRow message="No staff records yet." />
                  ) : (
                    data.staffByDepartment.map(dept => (
                      <View key={dept.department} style={styles.rowLine}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="small" weight="600">{dept.department}</AppText>
                          <AppText variant="tiny" color={colors.muted}>{dept.count} member(s)</AppText>
                        </View>
                        <AppText variant="small">{fmt(dept.monthlySalary)}/mo</AppText>
                      </View>
                    ))
                  )}
                </Card>
              </Section>
            </View>
          </View>

          <Section title="Recent stock arrivals" actionLabel="All arrivals" onAction={() => router.navigate('admin-arrivals')}>
            <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
              {data.recentArrivals.length === 0 ? (
                <EmptyRow message="No stock arrivals recorded yet." />
              ) : (
                data.recentArrivals.slice(0, 5).map(arrival => (
                  <View key={arrival.id} style={styles.rowLine}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="small" weight="600" numberOfLines={1}>{arrival.productName}</AppText>
                      <AppText variant="tiny" color={colors.muted}>
                        {arrival.variantName ? `${arrival.variantName} · ` : ''}{date(arrival.arrivalDate)}
                        {arrival.supplier ? ` · ${arrival.supplier}` : ''}
                      </AppText>
                    </View>
                    <AppText variant="small" color={colors.muted}>× {arrival.quantity}</AppText>
                    <AppText variant="small" weight="600">{fmt(arrival.totalCost)}</AppText>
                  </View>
                ))
              )}
            </Card>
          </Section>
        </>
      ) : null}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  twoColumn: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  rowLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
});

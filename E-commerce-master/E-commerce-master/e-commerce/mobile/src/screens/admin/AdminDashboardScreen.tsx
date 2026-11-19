import React from 'react';
import { StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  ProductImage,
  Spinner,
  StatCard,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, MiniBars, SummaryGrid } from './AdminKit';

export function AdminDashboardScreen() {
  useDocumentTitle('Admin dashboard');
  const router = useRouter();
  const { user } = useAuth();
  const { fmt } = useSettings();
  const dashboard = useAsync(() => adminApi.dashboard(), [user?.id]);

  return (
    <AdminPage
      title={`Good to see you, ${user?.firstName ?? 'team'}`}
      subtitle="Live pulse of the Safwan storefront and operations."
      actions={<Button label="Refresh" variant="outline" onPress={() => dashboard.reload()} />}
    >
      {dashboard.loading && !dashboard.data ? (
        <Spinner label="Loading your dashboard…" />
      ) : dashboard.error ? (
        <ErrorState message={dashboard.error} onRetry={() => dashboard.reload()} />
      ) : dashboard.data ? (
        <>
          <SummaryGrid>
            <StatCard label="Revenue today" value={fmt(dashboard.data.stats.revenueToday)} hint={`${dashboard.data.stats.ordersToday} orders today`} />
            <StatCard label="Revenue this month" value={fmt(dashboard.data.stats.revenueThisMonth)} hint="Paid orders" accent={colors.accent} />
            <StatCard label="Pending orders" value={String(dashboard.data.stats.pendingOrders)} hint="Awaiting processing" accent={colors.warning} />
            <StatCard label="Low stock" value={String(dashboard.data.stats.lowStockProducts)} hint="Need restocking" accent={colors.danger} />
          </SummaryGrid>

          <View style={styles.columns}>
            <Card style={{ flex: 2, minWidth: 320, padding: spacing.xl, gap: spacing.md }}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="h3">Sales trend</AppText>
                  <AppText variant="tiny" color={colors.muted}>Recent revenue by day</AppText>
                </View>
                <Button label="Reports" variant="ghost" size="sm" onPress={() => router.navigate('admin-reports')} />
              </View>
              <MiniBars points={dashboard.data.salesChart.map(point => ({ label: point.date.slice(5), revenue: point.revenue }))} />
            </Card>

            <Card style={{ flex: 1, minWidth: 260, padding: spacing.xl, gap: spacing.md }}>
              <AppText variant="h3">Top products</AppText>
              {dashboard.data.topProducts.length === 0 ? (
                <AppText variant="small" color={colors.faint}>No sales recorded yet.</AppText>
              ) : (
                dashboard.data.topProducts.slice(0, 5).map((product, index) => (
                  <View key={product.productId} style={styles.topRow}>
                    <AppText variant="tiny" color={colors.faint} style={{ width: 16 }}>{index + 1}</AppText>
                    <ProductImage url={product.thumbnailUrl} name={product.name} height={38} radiusValue={8} style={{ width: 38 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="small" numberOfLines={1}>{product.name}</AppText>
                      <AppText variant="tiny" color={colors.faint}>{product.soldCount} sold</AppText>
                    </View>
                    <AppText variant="small" weight="600">{fmt(product.revenue)}</AppText>
                  </View>
                ))
              )}
            </Card>
          </View>

          <View style={styles.columns}>
            <Card style={{ flex: 2, minWidth: 320, padding: spacing.xl, gap: spacing.md }}>
              <View style={styles.cardHeader}>
                <AppText variant="h3" style={{ flex: 1 }}>Latest orders</AppText>
                <Button label="All orders" variant="ghost" size="sm" onPress={() => router.navigate('admin-orders')} />
              </View>
              {dashboard.data.recentOrders.length === 0 ? (
                <AppText variant="small" color={colors.faint}>No orders yet.</AppText>
              ) : (
                dashboard.data.recentOrders.slice(0, 6).map((order, index) => (
                  <View key={order.id}>
                    <View style={styles.orderRow}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="small" weight="600">{order.orderNumber}</AppText>
                        <AppText variant="tiny" color={colors.muted}>
                          {order.customerName} · {dateTime(order.createdAt)}
                        </AppText>
                      </View>
                      <Badge label={order.status} />
                      <AppText variant="small" weight="600" style={{ minWidth: 70, textAlign: 'right' }}>{fmt(order.total)}</AppText>
                    </View>
                    {index < Math.min(6, dashboard.data!.recentOrders.length) - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
                  </View>
                ))
              )}
            </Card>

            <Card style={{ flex: 1, minWidth: 260, padding: spacing.xl, gap: spacing.md }}>
              <View style={styles.cardHeader}>
                <AppText variant="h3" style={{ flex: 1 }}>Low stock</AppText>
                <Button label="Inventory" variant="ghost" size="sm" onPress={() => router.navigate('admin-inventory')} />
              </View>
              {dashboard.data.lowStockProducts.length === 0 ? (
                <AppText variant="small" color={colors.faint}>Everything is comfortably stocked.</AppText>
              ) : (
                dashboard.data.lowStockProducts.slice(0, 6).map(item => (
                  <View key={item.productId} style={styles.orderRow}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="small" numberOfLines={1}>{item.name}</AppText>
                      <AppText variant="tiny" color={colors.faint}>{item.sku}</AppText>
                    </View>
                    <Badge label={`${item.stock} left`} tone={{ bg: colors.dangerSoft, fg: colors.danger }} />
                  </View>
                ))
              )}
            </Card>
          </View>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Sales by category</AppText>
            {dashboard.data.salesByCategory.length === 0 ? (
              <EmptyState title="No category sales yet" message="Category performance appears once orders are paid." compact />
            ) : (
              dashboard.data.salesByCategory.map(category => {
                const max = Math.max(1, ...dashboard.data!.salesByCategory.map(item => item.revenue));
                return (
                  <View key={category.categoryName} style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <AppText variant="small">{category.categoryName}</AppText>
                      <AppText variant="small" weight="600">{fmt(category.revenue)}</AppText>
                    </View>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
                      <View style={{ width: `${(category.revenue / max) * 100}%`, height: '100%', backgroundColor: colors.primary }} />
                    </View>
                  </View>
                );
              })
            )}
          </Card>
        </>
      ) : null}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-start' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4, flexWrap: 'wrap' },
});

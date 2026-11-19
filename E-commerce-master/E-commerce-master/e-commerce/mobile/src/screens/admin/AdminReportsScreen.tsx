import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { adminApi } from '../../api';
import {
  AppText,
  Button,
  Card,
  Divider,
  ErrorState,
  Spinner,
  StatCard,
  TextField,
} from '../../components/ui';
import { isoDate } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, MiniBars, SummaryGrid } from './AdminKit';

function defaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return isoDate(date.toISOString());
}

export function AdminReportsScreen() {
  useDocumentTitle('Reports');
  const { fmt } = useSettings();
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(() => isoDate(new Date().toISOString()));
  const [applied, setApplied] = useState({ from: defaultFrom(), to: isoDate(new Date().toISOString()) });

  const sales = useAsync(() => adminApi.salesReport(applied.from, applied.to), [applied.from, applied.to]);
  const orders = useAsync(() => adminApi.orderReport(applied.from, applied.to), [applied.from, applied.to]);

  return (
    <AdminPage
      title="Reports"
      subtitle="Revenue, order flow and category performance for any period."
      actions={
        <Button
          label="Apply range"
          onPress={() => {
            setApplied({ from, to });
            sales.reload(true);
            orders.reload(true);
          }}
        />
      }
    >
      <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' }}>
        <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ width: 170 }} />
        <TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ width: 170 }} />
      </View>

      {sales.loading && !sales.data ? (
        <Spinner label="Building your report…" />
      ) : sales.error ? (
        <ErrorState message={sales.error} onRetry={() => sales.reload()} />
      ) : sales.data ? (
        <>
          <SummaryGrid>
            <StatCard label="Revenue" value={fmt(sales.data.revenue)} hint={`${sales.data.orders} orders`} />
            <StatCard label="Average order" value={fmt(sales.data.averageOrderValue)} hint="Per order" accent={colors.accent} />
            <StatCard
              label="Orders in range"
              value={String(orders.data?.totalOrders ?? sales.data.orders)}
              hint={`Value ${fmt(orders.data?.totalValue ?? sales.data.revenue)}`}
              accent={colors.gold}
            />
          </SummaryGrid>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Daily revenue</AppText>
            <MiniBars points={sales.data.points.map(point => ({ label: point.date.slice(5), revenue: point.revenue }))} />
          </Card>

          <View style={styles.columns}>
            <Card style={{ flex: 1, minWidth: 300, padding: spacing.xl, gap: spacing.md }}>
              <AppText variant="h3">Top products</AppText>
              {sales.data.topProducts.length === 0 ? (
                <AppText variant="small" color={colors.faint}>No product sales in this range.</AppText>
              ) : (
                sales.data.topProducts.map((product, index) => (
                  <View key={product.productId}>
                    <View style={styles.lineRow}>
                      <AppText variant="tiny" color={colors.faint} style={{ width: 18 }}>{index + 1}</AppText>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText variant="small" numberOfLines={1}>{product.name}</AppText>
                        <AppText variant="tiny" color={colors.faint}>{product.soldCount} sold</AppText>
                      </View>
                      <AppText variant="small" weight="600">{fmt(product.revenue)}</AppText>
                    </View>
                    {index < sales.data!.topProducts.length - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
                  </View>
                ))
              )}
            </Card>

            <Card style={{ flex: 1, minWidth: 300, padding: spacing.xl, gap: spacing.md }}>
              <AppText variant="h3">By category</AppText>
              {sales.data.byCategory.length === 0 ? (
                <AppText variant="small" color={colors.faint}>No category sales in this range.</AppText>
              ) : (
                sales.data.byCategory.map(category => {
                  const max = Math.max(1, ...sales.data!.byCategory.map(item => item.revenue));
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
          </View>

          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="h3">Orders by status</AppText>
            {orders.data ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {Object.entries(orders.data.byStatus).map(([status, count]) => (
                  <View key={status} style={styles.statusChip}>
                    <AppText variant="tiny" color={colors.muted}>{status}</AppText>
                    <AppText variant="title">{count}</AppText>
                  </View>
                ))}
                {Object.keys(orders.data.byStatus).length === 0 ? (
                  <AppText variant="small" color={colors.faint}>No orders in this period.</AppText>
                ) : null}
              </View>
            ) : (
              <Spinner />
            )}
          </Card>
        </>
      ) : null}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', alignItems: 'flex-start' },
  lineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statusChip: {
    minWidth: 110,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 2,
  },
});

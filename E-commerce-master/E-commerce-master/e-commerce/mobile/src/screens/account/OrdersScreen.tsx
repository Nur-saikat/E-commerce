import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ordersApi } from '../../api';
import { RequireAuth } from '../../components/RequireAuth';
import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Page,
  PageHeader,
  Pagination,
  ProductImage,
  Spinner,
  Tabs,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Processing', label: 'Processing' },
  { key: 'Shipped', label: 'Shipped' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
  { key: 'Refunded', label: 'Refunded' },
];

export function OrdersScreen() {
  useDocumentTitle('My orders');
  return (
    <RequireAuth title="Sign in to see your orders" message="Your order history and tracking live in your account.">
      <OrdersContent />
    </RequireAuth>
  );
}

function OrdersContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { fmt } = useSettings();
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const orders = useAsync(
    () =>
      ordersApi.myOrders({
        page,
        pageSize: 10,
        status: status === 'all' ? undefined : status,
      }),
    [user?.id, status, page],
  );

  return (
    <Page gap={spacing.xl}>
      <PageHeader back title="My orders" subtitle="Track deliveries, download invoices and start returns." />
      <Tabs
        tabs={statusTabs}
        active={status}
        onChange={key => {
          setStatus(key);
          setPage(1);
        }}
      />
      {orders.loading && !orders.data ? (
        <Spinner label="Loading your orders…" />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={() => orders.reload()} />
      ) : (orders.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No orders here yet"
          message="When you place an order it will appear here with live status updates."
          actionLabel="Start shopping"
          onAction={() => router.navigate('shop')}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {orders.data?.items.map(order => (
              <Card key={order.id} onPress={() => router.navigate('order', { id: order.id })} style={{ padding: spacing.lg }}>
                <View style={styles.row}>
                  <View style={{ width: 64 }}>
                    <ProductImage url={order.firstItemImage} name={order.orderNumber} height={64} radiusValue={10} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <AppText variant="title">{order.orderNumber}</AppText>
                      <Badge label={order.status} />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      {dateTime(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                    </AppText>
                    <AppText variant="tiny" color={colors.faint}>
                      {order.paymentMethod} · payment {order.paymentStatus.toLowerCase()}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <AppText variant="h3">{fmt(order.total)}</AppText>
                    <AppText variant="tiny" color={colors.primary}>View details →</AppText>
                  </View>
                </View>
              </Card>
            ))}
          </View>
          {orders.data ? (
            <Pagination
              page={orders.data.pagination.page}
              totalPages={orders.data.pagination.totalPages}
              totalItems={orders.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', flexWrap: 'wrap' },
});

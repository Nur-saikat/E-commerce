import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ordersApi } from '../../api';
import type { OrderSummary } from '../../api/types';
import {
  AppText,
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  ProductImage,
  SearchInput,
  SelectField,
  Spinner,
  Tabs,
  TextField,
} from '../../components/ui';
import { dateTime } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';
import { AdminPage, Toolbar } from './AdminKit';

const statusTabs = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Confirmed', label: 'Confirmed' },
  { key: 'Processing', label: 'Processing' },
  { key: 'Shipped', label: 'Shipped' },
  { key: 'Completed', label: 'Completed' },
  { key: 'Cancelled', label: 'Cancelled' },
  { key: 'Refunded', label: 'Refunded' },
];

const paymentOptions = [
  { label: 'Any payment', value: '' },
  { label: 'Unpaid', value: 'Unpaid' },
  { label: 'Paid', value: 'Paid' },
  { label: 'Awaiting verification', value: 'AwaitingVerification' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Refunded', value: 'Refunded' },
];

export function AdminOrdersScreen() {
  useDocumentTitle('Orders');
  const router = useRouter();
  const { fmt } = useSettings();
  const [status, setStatus] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  const orders = useAsync(
    () =>
      ordersApi.adminList({
        page,
        pageSize: 12,
        status: status === 'all' ? undefined : status,
        paymentStatus: paymentStatus || undefined,
        search: submitted || undefined,
        from: from || undefined,
        to: to || undefined,
      }),
    [status, paymentStatus, submitted, from, to, page],
  );

  return (
    <AdminPage title="Orders" subtitle="Every purchase, from placement to delivery.">
      <Tabs
        tabs={statusTabs}
        active={status}
        onChange={key => {
          setStatus(key);
          setPage(1);
        }}
      />
      <Toolbar>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          onSubmit={() => {
            setSubmitted(search.trim());
            setPage(1);
          }}
          placeholder="Order number, customer or email…"
          style={{ maxWidth: 380 }}
        />
        <SelectField
          value={paymentStatus}
          options={paymentOptions}
          onChange={value => {
            setPaymentStatus(value);
            setPage(1);
          }}
          style={{ minWidth: 200 }}
        />
        <TextField label="From" value={from} onChangeText={setFrom} placeholder="YYYY-MM-DD" style={{ width: 150 }} />
        <TextField label="To" value={to} onChangeText={setTo} placeholder="YYYY-MM-DD" style={{ width: 150 }} />
      </Toolbar>

      {orders.loading && !orders.data ? (
        <Spinner label="Loading orders…" />
      ) : orders.error ? (
        <ErrorState message={orders.error} onRetry={() => orders.reload()} />
      ) : (orders.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No orders match" message="Adjust the filters or search term to see more results." />
      ) : (
        <>
          <View style={{ gap: spacing.sm }}>
            {orders.data?.items.map((order: OrderSummary) => (
              <Card key={order.id} onPress={() => router.navigate('admin-order', { id: order.id })} style={{ padding: spacing.lg }}>
                <View style={styles.row}>
                  <View style={{ width: 48 }}>
                    <ProductImage url={order.firstItemImage} name={order.orderNumber} height={48} radiusValue={9} />
                  </View>
                  <View style={{ flex: 1, minWidth: 180, gap: 2 }}>
                    <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                      <AppText variant="title">{order.orderNumber}</AppText>
                      <Badge label={order.status} />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>{order.customerName} · {order.customerEmail}</AppText>
                    <AppText variant="tiny" color={colors.faint}>
                      {dateTime(order.createdAt)} · {order.itemCount} item{order.itemCount === 1 ? '' : 's'} · {order.paymentMethod}
                    </AppText>
                  </View>
                  <Badge label={order.paymentStatus} />
                  <AppText variant="h3" style={{ minWidth: 90, textAlign: 'right' }}>{fmt(order.total)}</AppText>
                  <AppText variant="tiny" color={colors.primary}>Open →</AppText>
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
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
});

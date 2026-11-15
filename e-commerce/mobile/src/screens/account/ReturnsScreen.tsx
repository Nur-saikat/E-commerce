import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { returnsApi } from '../../api';
import { RequireAuth } from '../../components/RequireAuth';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  KeyValue,
  Page,
  PageHeader,
  Pagination,
  Spinner,
} from '../../components/ui';
import { dateTime, titleCase } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useSettings } from '../../state/SettingsContext';
import { colors, spacing } from '../../theme';

export function ReturnsScreen() {
  useDocumentTitle('Returns');
  return (
    <RequireAuth title="Sign in to manage returns" message="Return requests and refunds are tracked in your account.">
      <ReturnsContent />
    </RequireAuth>
  );
}

function ReturnsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { fmt } = useSettings();
  const [page, setPage] = useState(1);
  const returns = useAsync(() => returnsApi.my({ page, pageSize: 10 }), [user?.id, page]);

  return (
    <Page gap={spacing.xl}>
      <PageHeader
        back
        title="Returns & refunds"
        subtitle="Follow every return from request to refund."
        actions={<Button label="My orders" variant="outline" onPress={() => router.navigate('orders')} />}
      />

      {returns.loading && !returns.data ? (
        <Spinner label="Loading your returns…" />
      ) : returns.error ? (
        <ErrorState message={returns.error} onRetry={() => returns.reload()} />
      ) : (returns.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No return requests"
          message="Returns can be started from a completed and paid order within your account."
          actionLabel="View orders"
          onAction={() => router.navigate('orders')}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {returns.data?.items.map(request => (
              <Card key={request.id} style={{ padding: spacing.lg, gap: spacing.md }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 180, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <AppText variant="title">Return for {request.orderNumber}</AppText>
                      <Badge label={request.status} />
                    </View>
                    <AppText variant="tiny" color={colors.muted}>
                      Requested {dateTime(request.createdAt)}
                      {request.processedAt ? ` · Processed ${dateTime(request.processedAt)}` : ''}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <AppText variant="tiny" color={colors.muted}>Refund value</AppText>
                    <AppText variant="h3">{fmt(request.refundAmount)}</AppText>
                  </View>
                </View>

                <Divider />

                <View style={{ gap: 6 }}>
                  {request.items.map(item => (
                    <View key={`${item.productId}-${item.variantId ?? ''}`} style={styles.itemRow}>
                      <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                        {item.productName}
                        {item.variantName ? ` · ${item.variantName}` : ''}
                      </AppText>
                      <AppText variant="tiny" color={colors.muted}>× {item.quantity}</AppText>
                    </View>
                  ))}
                </View>

                <KeyValue label="Reason" value={request.reason} />
                <KeyValue label="Refund method" value={titleCase(request.refundPreference)} />
                {request.refundReference ? <KeyValue label="Reference" value={request.refundReference} /> : null}
                {request.adminNote ? (
                  <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 12, padding: spacing.md, gap: 2 }}>
                    <AppText variant="label" color={colors.muted}>Note from our team</AppText>
                    <AppText variant="small">{request.adminNote}</AppText>
                  </View>
                ) : null}

                <Button
                  label="View order"
                  variant="ghost"
                  size="sm"
                  onPress={() => router.navigate('order', { id: request.orderId })}
                  style={{ alignSelf: 'flex-start' }}
                />
              </Card>
            ))}
          </View>
          {returns.data ? (
            <Pagination
              page={returns.data.pagination.page}
              totalPages={returns.data.pagination.totalPages}
              totalItems={returns.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
});

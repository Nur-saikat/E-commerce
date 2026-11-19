import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { reviewsApi } from '../../api';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  RatingStars,
  Spinner,
  Tabs,
} from '../../components/ui';
import { date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useFeedback } from '../../state/FeedbackContext';
import { colors, spacing } from '../../theme';
import { AdminPage } from './AdminKit';

export function AdminReviewsScreen() {
  useDocumentTitle('Reviews');
  const { toast, confirm } = useFeedback();
  const [tab, setTab] = useState<'pending' | 'published' | 'all'>('pending');
  const [page, setPage] = useState(1);
  const reviews = useAsync(
    () =>
      reviewsApi.adminList({
        page,
        pageSize: 10,
        approved: tab === 'all' ? undefined : tab === 'published',
      }),
    [tab, page],
  );

  const act = async (action: 'approve' | 'reject' | 'remove', id: string) => {
    if (action === 'remove') {
      const ok = await confirm({ title: 'Delete this review?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true });
      if (!ok) return;
    }
    try {
      if (action === 'approve') await reviewsApi.approve(id);
      else if (action === 'reject') await reviewsApi.reject(id);
      else await reviewsApi.remove(id);
      toast(action === 'remove' ? 'Review deleted.' : action === 'approve' ? 'Review published.' : 'Review rejected.', 'success');
      reviews.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update this review.', 'error');
    }
  };

  return (
    <AdminPage title="Reviews" subtitle="Moderate customer feedback before it goes live.">
      <Tabs
        tabs={[
          { key: 'pending', label: 'Awaiting approval' },
          { key: 'published', label: 'Published' },
          { key: 'all', label: 'All reviews' },
        ]}
        active={tab}
        onChange={key => {
          setTab(key as typeof tab);
          setPage(1);
        }}
      />

      {reviews.loading && !reviews.data ? (
        <Spinner label="Loading reviews…" />
      ) : reviews.error ? (
        <ErrorState message={reviews.error} onRetry={() => reviews.reload()} />
      ) : (reviews.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="Nothing to moderate" message="New customer reviews will appear here for approval." />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {reviews.data?.items.map(review => (
              <Card key={review.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 200, gap: 3 }}>
                    <AppText variant="title">{review.productName ?? 'Product review'}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <RatingStars rating={review.rating} showValue />
                      <AppText variant="tiny" color={colors.muted}>
                        {review.userName} · {date(review.createdAt)}
                        {review.isVerifiedPurchase ? ' · verified purchase' : ''}
                      </AppText>
                    </View>
                  </View>
                  <Badge
                    label={review.isApproved ? 'Published' : 'Pending'}
                    tone={review.isApproved ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
                  />
                </View>
                {review.title ? <AppText variant="title">{review.title}</AppText> : null}
                <AppText variant="small" color={colors.inkSoft}>{review.comment}</AppText>
                <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                  {!review.isApproved ? (
                    <>
                      <Button label="Approve" size="sm" onPress={() => act('approve', review.id)} />
                      <Button label="Reject" size="sm" variant="outline" onPress={() => act('reject', review.id)} />
                    </>
                  ) : (
                    <Button label="Unpublish" size="sm" variant="outline" onPress={() => act('reject', review.id)} />
                  )}
                  <Button label="Delete" size="sm" variant="ghost" textStyle={{ color: colors.danger }} onPress={() => act('remove', review.id)} />
                </View>
              </Card>
            ))}
          </View>
          {reviews.data ? (
            <Pagination
              page={reviews.data.pagination.page}
              totalPages={reviews.data.pagination.totalPages}
              totalItems={reviews.data.pagination.totalItems}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </AdminPage>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
});

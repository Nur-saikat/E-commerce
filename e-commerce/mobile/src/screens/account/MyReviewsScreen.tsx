import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { reviewsApi } from '../../api';
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
  RatingStars,
  Spinner,
} from '../../components/ui';
import { date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing } from '../../theme';

export function MyReviewsScreen() {
  useDocumentTitle('My reviews');
  return (
    <RequireAuth title="Sign in to see your reviews" message="Reviews you write for purchased products appear here.">
      <MyReviewsContent />
    </RequireAuth>
  );
}

function MyReviewsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const reviews = useAsync(() => reviewsApi.my({ page, pageSize: 10 }), [user?.id, page]);

  return (
    <Page gap={spacing.xl}>
      <PageHeader back title="My reviews" subtitle="Your feedback helps other Safwan shoppers." />

      {reviews.loading && !reviews.data ? (
        <Spinner label="Loading your reviews…" />
      ) : reviews.error ? (
        <ErrorState message={reviews.error} onRetry={() => reviews.reload()} />
      ) : (reviews.data?.items.length ?? 0) === 0 ? (
        <EmptyState
          title="No reviews yet"
          message="Once your order is delivered you can review every product from its page."
          actionLabel="Browse products"
          onAction={() => router.navigate('shop')}
        />
      ) : (
        <>
          <View style={{ gap: spacing.md }}>
            {reviews.data?.items.map(review => (
              <Card key={review.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                <View style={styles.headerRow}>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText
                      variant="title"
                      numberOfLines={1}
                      onPress={() => router.navigate('product', { slug: review.productId })}
                    >
                      {review.productName ?? 'Product review'}
                    </AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
                      <RatingStars rating={review.rating} showValue />
                      <AppText variant="tiny" color={colors.faint}>{date(review.createdAt)}</AppText>
                    </View>
                  </View>
                  <Badge
                    label={review.isApproved ? 'Published' : 'Awaiting review'}
                    tone={review.isApproved ? { bg: colors.successSoft, fg: colors.success } : { bg: colors.warningSoft, fg: colors.warning }}
                  />
                </View>
                {review.title ? <AppText variant="title">{review.title}</AppText> : null}
                <AppText variant="small" color={colors.inkSoft}>{review.comment}</AppText>
                {review.isVerifiedPurchase ? (
                  <AppText variant="tiny" color={colors.primary}>Verified purchase</AppText>
                ) : null}
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
    </Page>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
});

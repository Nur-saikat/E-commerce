import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { catalogApi, reviewsApi } from '../../api';
import type { ProductVariant } from '../../api/types';
import { ProductRail } from '../../components/ProductCard';
import {
  AlertBox,
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  KeyValue,
  Page,
  RatingStars,
  Section,
  SelectField,
  Spinner,
  Tabs,
  TextField,
} from '../../components/ui';
import { assetUrl, date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useParams, useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { useWishlist } from '../../state/WishlistContext';
import { STORAGE_KEYS } from '../../config';
import { storage } from '../../storage';
import { colors, radius, spacing } from '../../theme';

export function ProductScreen() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { fmt } = useSettings();
  const cart = useCart();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const { toast } = useFeedback();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const product = useAsync(() => catalogApi.product(slug), [slug]);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState('description');
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const reviews = useAsync(
    () => (product.data ? reviewsApi.forProduct(product.data.id, reviewPage, 6) : Promise.resolve(null)),
    [product.data?.id, reviewPage],
  );

  useDocumentTitle(product.data?.name ?? 'Product');

  const selectedVariant: ProductVariant | undefined = useMemo(
    () => product.data?.variants.find(v => v.id === selectedVariantId),
    [product.data, selectedVariantId],
  );

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
    setSelectedVariantId(null);
    setTab('description');
    setReviewPage(1);
    if (product.data?.id) {
      (async () => {
        const current = (await storage.getJSON<string[]>(STORAGE_KEYS.recentlyViewed)) ?? [];
        const next = [product.data!.id, ...current.filter(id => id !== product.data!.id)].slice(0, 12);
        await storage.setJSON(STORAGE_KEYS.recentlyViewed, next);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.data?.id]);

  if (product.loading && !product.data) {
    return (
      <Page>
        <Spinner label="Loading product…" />
      </Page>
    );
  }
  if (product.error || !product.data) {
    return (
      <Page>
        <ErrorState message={product.error ?? 'Product not found.'} onRetry={() => product.reload()} />
      </Page>
    );
  }

  const data = product.data;
  const images = [data.thumbnailUrl, ...(data.images ?? [])].filter(Boolean) as string[];
  const uniqueImages = Array.from(new Set(images.map(image => assetUrl(image) ?? image)));
  const activeImage = uniqueImages[Math.min(imageIndex, uniqueImages.length - 1)];
  const price = selectedVariant?.price ?? data.effectivePrice;
  const basePrice = selectedVariant ? selectedVariant.price : data.price;
  const stock = selectedVariant?.stock ?? data.totalStock;
  const discountPercent = selectedVariant
    ? 0
    : data.discountPercent;
  const maxQty = Math.max(stock, 0);
  const wished = wishlist.ids.has(data.id);

  const addToCart = async (buyNow = false) => {
    try {
      await cart.add(data.id, quantity, selectedVariant?.id ?? null);
      toast(`${data.name} added to your cart.`, 'success');
      if (buyNow) router.navigate('cart');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to add this product.', 'error');
    }
  };

  const toggleWish = async () => {
    if (!user) {
      toast('Sign in to save products to your wishlist.', 'info');
      router.navigate('login');
      return;
    }
    try {
      const added = await wishlist.toggle(data.id);
      toast(added ? 'Saved to your wishlist.' : 'Removed from your wishlist.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update your wishlist.', 'error');
    }
  };

  const submitReview = async () => {
    if (!user) {
      toast('Sign in to write a review.', 'info');
      router.navigate('login');
      return;
    }
    if (reviewComment.trim().length < 4) {
      toast('Write a few words about the product.', 'error');
      return;
    }
    setReviewBusy(true);
    try {
      await reviewsApi.create(data.id, {
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        comment: reviewComment.trim(),
      });
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
      toast('Thank you — your review is awaiting moderation.', 'success');
      reviews.reload(true);
    } catch (error: any) {
      toast(error?.message ?? 'Unable to submit your review.', 'error');
    } finally {
      setReviewBusy(false);
    }
  };

  const gallery = (
    <View style={{ gap: spacing.md }}>
      <View style={styles.mainImage}>
        {activeImage ? (
          <Image source={{ uri: activeImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <AppText variant="display" color={colors.faint}>{data.name.slice(0, 1)}</AppText>
          </View>
        )}
        {discountPercent > 0 ? (
          <View style={{ position: 'absolute', top: spacing.md, left: spacing.md }}>
            <Badge label={`Save ${discountPercent}%`} tone={{ bg: colors.accent, fg: colors.white }} />
          </View>
        ) : null}
      </View>
      {uniqueImages.length > 1 ? (
        <View style={styles.thumbRow}>
          {uniqueImages.map((image, index) => (
            <Pressable
              key={`${image}-${index}`}
              onPress={() => setImageIndex(index)}
              style={[
                styles.thumb,
                index === imageIndex && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <Image source={{ uri: image }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  const purchase = (
    <View style={{ gap: spacing.lg }}>
      <View>
        {data.brandName ? (
          <AppText variant="tiny" color={colors.primary} style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {data.brandName}
          </AppText>
        ) : null}
        <AppText variant="h1" style={{ marginTop: 2 }}>{data.name}</AppText>
        {data.shortDescription ? (
          <AppText variant="body" color={colors.muted} style={{ marginTop: spacing.sm }}>
            {data.shortDescription}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' }}>
        <RatingStars rating={data.ratingAverage} size={16} showValue />
        <AppText variant="tiny" color={colors.muted}>{data.reviewCount} reviews</AppText>
        <AppText variant="tiny" color={colors.faint}>·</AppText>
        <AppText variant="tiny" color={colors.muted}>{data.soldCount} sold</AppText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
        <AppText variant="h1" color={colors.primaryDark}>{fmt(price)}</AppText>
        {discountPercent > 0 ? (
          <AppText variant="title" color={colors.faint} style={{ textDecorationLine: 'line-through' }}>
            {fmt(basePrice)}
          </AppText>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        {stock <= 0 ? (
          <Badge label="Out of stock" tone={{ bg: colors.dangerSoft, fg: colors.danger }} />
        ) : stock <= (data.lowStockThreshold || 5) ? (
          <Badge label={`Only ${stock} left`} tone={{ bg: colors.warningSoft, fg: colors.warning }} />
        ) : (
          <Badge label="In stock" tone={{ bg: colors.successSoft, fg: colors.success }} />
        )}
        {data.categoryName ? <Badge label={data.categoryName} /> : null}
      </View>

      {data.variants.length ? (
        <SelectField
          label="Choose an option"
          value={selectedVariantId ?? ''}
          placeholder="Select a variant"
          options={data.variants.map(variant => ({
            label: `${variant.name} · ${fmt(variant.price)}`,
            value: variant.id,
            hint: variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock',
          }))}
          onChange={value => {
            setSelectedVariantId(value || null);
            setQuantity(1);
          }}
        />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' }}>
        <View style={styles.qty}>
          <Pressable
            onPress={() => setQuantity(q => Math.max(1, q - 1))}
            style={styles.qtyButton}
            accessibilityRole="button"
            accessibilityLabel="Decrease quantity"
          >
            <AppText variant="h3">−</AppText>
          </Pressable>
          <AppText variant="title" style={{ minWidth: 28, textAlign: 'center' }}>{quantity}</AppText>
          <Pressable
            onPress={() => setQuantity(q => Math.min(maxQty || 1, q + 1))}
            style={styles.qtyButton}
            accessibilityRole="button"
            accessibilityLabel="Increase quantity"
          >
            <AppText variant="h3">+</AppText>
          </Pressable>
        </View>
        <AppText variant="tiny" color={colors.faint}>{maxQty} available</AppText>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Button label="Add to cart" size="lg" onPress={() => addToCart(false)} disabled={stock <= 0} style={{ flex: 1, minWidth: 160 }} />
        <Button
          label="Buy now"
          size="lg"
          variant="secondary"
          onPress={() => addToCart(true)}
          disabled={stock <= 0}
          style={{ flex: 1, minWidth: 140 }}
        />
        <Button
          label={wished ? '♥ Saved' : '♡ Save'}
          size="lg"
          variant="outline"
          onPress={toggleWish}
        />
      </View>
      <View style={{ gap: 6 }}>
        <AppText variant="tiny" color={colors.muted}>
          Secure checkout · Cash on delivery, cards and mobile banking
        </AppText>
        <AppText variant="tiny" color={colors.muted}>
          Dispatch from Mirpur, Dhaka · Easy returns within 7 days of delivery
        </AppText>
      </View>
    </View>
  );

  return (
    <Page gap={spacing.xxl}>
      <Button label="Back" variant="link" onPress={router.goBack} />
      <View style={[styles.top, !wide && { flexDirection: 'column' }]}>
        <View style={{ flex: 1.05, minWidth: 0 }}>{gallery}</View>
        <View style={{ flex: 1, minWidth: 0 }}>{purchase}</View>
      </View>

      <View style={{ gap: spacing.lg }}>
        <Tabs
          tabs={[
            { key: 'description', label: 'Description' },
            { key: 'specifications', label: 'Specifications', badge: Object.keys(data.specifications ?? {}).length },
            { key: 'reviews', label: 'Reviews', badge: data.reviewCount },
          ]}
          active={tab}
          onChange={setTab}
        />
        {tab === 'description' ? (
          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            <AppText variant="body" color={colors.inkSoft} style={{ lineHeight: 24 }}>
              {data.description || data.shortDescription || 'No description has been added yet.'}
            </AppText>
            {data.tags.length ? (
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: spacing.sm }}>
                {data.tags.map(tag => <Badge key={tag} label={tag} />)}
              </View>
            ) : null}
          </Card>
        ) : null}
        {tab === 'specifications' ? (
          <Card style={{ padding: spacing.xl, gap: spacing.md }}>
            {Object.keys(data.specifications ?? {}).length ? (
              Object.entries(data.specifications).map(([key, value]) => (
                <KeyValue key={key} label={key} value={String(value)} />
              ))
            ) : (
              <AppText variant="small" color={colors.muted}>No specifications listed for this product.</AppText>
            )}
            <Divider style={{ marginVertical: spacing.sm }} />
            <KeyValue label="SKU" value={data.sku} />
            {data.brandName ? <KeyValue label="Brand" value={data.brandName} /> : null}
            {data.categoryName ? <KeyValue label="Category" value={data.categoryName} /> : null}
          </Card>
        ) : null}
        {tab === 'reviews' ? (
          <View style={{ gap: spacing.lg }}>
            <Card style={{ padding: spacing.xl, gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', gap: spacing.xl, alignItems: 'center', flexWrap: 'wrap' }}>
                <View style={{ alignItems: 'center', minWidth: 120 }}>
                  <AppText variant="display">{(reviews.data?.summary.average ?? data.ratingAverage).toFixed(1)}</AppText>
                  <RatingStars rating={reviews.data?.summary.average ?? data.ratingAverage} size={16} />
                  <AppText variant="tiny" color={colors.muted} style={{ marginTop: 4 }}>
                    {reviews.data?.summary.total ?? data.reviewCount} reviews
                  </AppText>
                </View>
                <View style={{ flex: 1, minWidth: 220, gap: 6 }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const total = reviews.data?.summary.total ?? 0;
                    const count = Number(reviews.data?.summary.distribution?.[String(star)] ?? 0);
                    const ratio = total > 0 ? count / total : 0;
                    return (
                      <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <AppText variant="tiny" color={colors.muted} style={{ width: 24 }}>{star}★</AppText>
                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${Math.round(ratio * 100)}%` }]} />
                        </View>
                        <AppText variant="tiny" color={colors.faint} style={{ width: 28, textAlign: 'right' }}>{count}</AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            </Card>

            <Card style={{ padding: spacing.xl, gap: spacing.md }}>
              <AppText variant="h3">Write a review</AppText>
              {!user ? (
                <AlertBox
                  tone="info"
                  message="Sign in to share your experience. Reviews from verified buyers help other families shop with confidence."
                />
              ) : null}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Pressable key={star} onPress={() => setReviewRating(star)} accessibilityRole="button" accessibilityLabel={`${star} stars`}>
                    <AppText variant="h2" color={star <= reviewRating ? colors.gold : colors.border}>★</AppText>
                  </Pressable>
                ))}
              </View>
              <TextField
                label="Title (optional)"
                value={reviewTitle}
                onChangeText={setReviewTitle}
                placeholder="Lovely quality"
              />
              <TextField
                label="Your review"
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder="What did you like or dislike?"
                multiline
              />
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button label="Submit review" onPress={submitReview} loading={reviewBusy} disabled={!user} />
                {!user ? (
                  <Button label="Sign in" variant="outline" onPress={() => router.navigate('login')} />
                ) : null}
              </View>
            </Card>

            <View style={{ gap: spacing.md }}>
              {reviews.loading && !reviews.data ? <Spinner /> : null}
              {(reviews.data?.reviews ?? []).map(review => (
                <Card key={review.id} style={{ padding: spacing.lg, gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="title">{review.title || 'Customer review'}</AppText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 }}>
                        <RatingStars rating={review.rating} />
                        <AppText variant="tiny" color={colors.muted}>{review.userName}</AppText>
                        {review.isVerifiedPurchase ? <Badge label="Verified" tone={{ bg: colors.successSoft, fg: colors.success }} /> : null}
                      </View>
                    </View>
                    <AppText variant="tiny" color={colors.faint}>{date(review.createdAt)}</AppText>
                  </View>
                  <AppText variant="small" color={colors.inkSoft}>{review.comment}</AppText>
                </Card>
              ))}
              {(reviews.data?.reviews ?? []).length === 0 && !reviews.loading ? (
                <EmptyState compact title="No reviews yet" message="Be the first to share your thoughts." />
              ) : null}
              {reviews.data?.pagination && reviews.data.pagination.totalPages > 1 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
                  <Button label="Previous" size="sm" variant="outline" disabled={reviewPage <= 1} onPress={() => setReviewPage(p => p - 1)} />
                  <AppText variant="small" color={colors.muted}>
                    Page {reviewPage} of {reviews.data.pagination.totalPages}
                  </AppText>
                  <Button
                    label="Next"
                    size="sm"
                    variant="outline"
                    disabled={reviewPage >= reviews.data.pagination.totalPages}
                    onPress={() => setReviewPage(p => p + 1)}
                  />
                </View>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      {data.relatedProducts.length ? (
        <Section title="You may also like" subtitle="Completing the collection.">
          <ProductRail
            products={data.relatedProducts}
            wishedIds={wishlist.ids}
            onToggleWishlist={async productItem => {
              if (!user) {
                toast('Sign in to save products to your wishlist.', 'info');
                router.navigate('login');
                return;
              }
              try {
                await wishlist.toggle(productItem.id);
              } catch (error: any) {
                toast(error?.message ?? 'Unable to update your wishlist.', 'error');
              }
            }}
          />
        </Section>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', gap: spacing.xxl, alignItems: 'flex-start' },
  mainImage: {
    height: 480,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
  },
  qtyButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold, borderRadius: 3 },
});

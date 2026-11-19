import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ProductSummary } from '../api/types';
import { useRouter } from '../navigation/Router';
import { useSettings } from '../state/SettingsContext';
import { colors, radius, spacing } from '../theme';
import { AppText, Badge, Button, Card, EmptyState, ProductImage, RatingStars } from './ui';

export function ProductCard({
  product,
  wished,
  onToggleWishlist,
  onAdd,
  compact,
}: {
  product: ProductSummary;
  wished?: boolean;
  onToggleWishlist?: () => void;
  onAdd?: () => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const { fmt } = useSettings();
  const soldOut = product.totalStock <= 0 && product.stock <= 0;
  return (
    <Card padded={false} style={styles.card}>
      <Pressable
        onPress={() => router.navigate('product', { slug: product.slug })}
        style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
      >
        <View style={styles.imageWrap}>
          <ProductImage url={product.thumbnailUrl} name={product.name} height={compact ? 150 : 196} radiusValue={0} />
          {product.discountPercent > 0 ? (
            <View style={styles.discount}>
              <Badge label={`-${product.discountPercent}%`} tone={{ bg: colors.accent, fg: colors.white }} />
            </View>
          ) : null}
          {soldOut ? (
            <View style={styles.soldOut}>
              <Badge label="Sold out" tone={{ bg: colors.ink, fg: colors.white }} />
            </View>
          ) : null}
          {onToggleWishlist ? (
            <Pressable
              onPress={onToggleWishlist}
              accessibilityRole="button"
              accessibilityLabel={wished ? 'Remove from wishlist' : 'Save to wishlist'}
              style={({ pressed }) => [styles.heart, pressed && { opacity: 0.7 }]}
            >
              <AppText variant="title" color={wished ? colors.accent : colors.inkSoft}>
                {wished ? '♥' : '♡'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
      <View style={styles.body}>
        {product.brandName ? (
          <AppText variant="tiny" color={colors.faint} numberOfLines={1} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>
            {product.brandName}
          </AppText>
        ) : null}
        <AppText
          variant="title"
          numberOfLines={2}
          style={{ minHeight: 44 }}
          onPress={() => router.navigate('product', { slug: product.slug })}
        >
          {product.name}
        </AppText>
        <View style={styles.ratingRow}>
          <RatingStars rating={product.ratingAverage} />
          <AppText variant="tiny" color={colors.faint}>
            {product.reviewCount > 0 ? `(${product.reviewCount})` : 'New'}
          </AppText>
        </View>
        <View style={styles.priceRow}>
          <AppText variant="title" color={colors.ink}>
            {fmt(product.effectivePrice)}
          </AppText>
          {product.discountPercent > 0 ? (
            <AppText variant="tiny" color={colors.faint} style={{ textDecorationLine: 'line-through' }}>
              {fmt(product.price)}
            </AppText>
          ) : null}
        </View>
        {onAdd ? (
          <Button
            label={soldOut ? 'Sold out' : 'Add to cart'}
            size="sm"
            variant="secondary"
            disabled={soldOut}
            onPress={onAdd}
            style={{ marginTop: 2 }}
          />
        ) : null}
      </View>
    </Card>
  );
}

export function ProductGrid({
  products,
  wishedIds,
  onToggleWishlist,
  onAdd,
  emptyTitle = 'No products yet',
  emptyMessage,
}: {
  products: ProductSummary[];
  wishedIds?: Set<string>;
  onToggleWishlist?: (product: ProductSummary) => void;
  onAdd?: (product: ProductSummary) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  const { width } = useWindowDimensions();
  const columns = width >= 1080 ? 4 : width >= 780 ? 3 : 2;
  if (!products.length) {
    return <EmptyState title={emptyTitle} message={emptyMessage} compact />;
  }
  return (
    <View style={styles.grid}>
      {products.map(product => (
        <View key={product.id} style={[styles.gridItem, columns === 2 ? { width: '48%' } : columns === 3 ? { width: '31.5%' } : { width: '23.5%' }]}>
          <ProductCard
            product={product}
            wished={wishedIds?.has(product.id)}
            onToggleWishlist={onToggleWishlist ? () => onToggleWishlist(product) : undefined}
            onAdd={onAdd ? () => onAdd(product) : undefined}
            compact={columns >= 3}
          />
        </View>
      ))}
    </View>
  );
}

export function ProductRail({
  products,
  onAdd,
  wishedIds,
  onToggleWishlist,
}: {
  products: ProductSummary[];
  onAdd?: (product: ProductSummary) => void;
  wishedIds?: Set<string>;
  onToggleWishlist?: (product: ProductSummary) => void;
}) {
  if (!products.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingVertical: 2 }}>
      {products.map(product => (
        <View key={product.id} style={{ width: 220 }}>
          <ProductCard
            product={product}
            compact
            wished={wishedIds?.has(product.id)}
            onToggleWishlist={onToggleWishlist ? () => onToggleWishlist(product) : undefined}
            onAdd={onAdd ? () => onAdd(product) : undefined}
          />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', flex: 1 },
  imageWrap: { position: 'relative' },
  discount: { position: 'absolute', top: spacing.sm, left: spacing.sm },
  soldOut: { position: 'absolute', bottom: spacing.sm, left: spacing.sm },
  heart: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: spacing.md, gap: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  gridItem: { minWidth: 0 },
});

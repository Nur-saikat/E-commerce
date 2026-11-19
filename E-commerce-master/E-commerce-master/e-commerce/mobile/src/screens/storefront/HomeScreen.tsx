import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { siteApi } from '../../api';
import type { Banner, ProductSummary } from '../../api/types';
import { ProductGrid, ProductRail } from '../../components/ProductCard';
import {
  AppText,
  Badge,
  Button,
  Card,
  ErrorState,
  Page,
  RatingStars,
  Section,
  Spinner,
  TextField,
} from '../../components/ui';
import { assetUrl, date } from '../../format';
import { useAsync, useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { openUrl } from '../../navigation/url';
import { useAuth } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useSettings } from '../../state/SettingsContext';
import { useWishlist } from '../../state/WishlistContext';
import { STORAGE_KEYS } from '../../config';
import { storage } from '../../storage';
import { colors, radius, spacing } from '../../theme';

export function HomeScreen() {
  useDocumentTitle('Home');
  const router = useRouter();
  const { settings, fmt } = useSettings();
  const cart = useCart();
  const { toast } = useFeedback();
  const { user } = useAuth();
  const wishlist = useWishlist();
  const { width } = useWindowDimensions();
  const [newsletter, setNewsletter] = useState('');
  const [subscribeBusy, setSubscribeBusy] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  const feed = useAsync(async () => {
    const recent = await storage.getJSON<string[]>(STORAGE_KEYS.recentlyViewed);
    return siteApi.home(recent?.slice(0, 12).join(','));
  }, []);

  const add = async (product: ProductSummary) => {
    try {
      await cart.add(product.id, 1);
      toast(`${product.name} added to your cart.`, 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to add this product.', 'error');
    }
  };

  const wish = async (product: ProductSummary) => {
    if (!user) {
      toast('Sign in to save products to your wishlist.', 'info');
      router.navigate('login');
      return;
    }
    try {
      const added = await wishlist.toggle(product.id);
      toast(added ? 'Saved to your wishlist.' : 'Removed from your wishlist.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to update your wishlist.', 'error');
    }
  };

  const subscribe = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newsletter.trim())) {
      toast('Enter a valid email address.', 'error');
      return;
    }
    setSubscribeBusy(true);
    try {
      await siteApi.newsletter(newsletter.trim());
      setNewsletter('');
      toast('You are on the list. Welcome to Safwan.', 'success');
    } catch (error: any) {
      toast(error?.message ?? 'Unable to subscribe right now.', 'error');
    } finally {
      setSubscribeBusy(false);
    }
  };

  if (feed.loading && !feed.data) {
    return (
      <Page>
        <Spinner label="Preparing the shop…" />
      </Page>
    );
  }
  if (feed.error && !feed.data) {
    return (
      <Page>
        <ErrorState message={feed.error} onRetry={() => feed.reload()} />
      </Page>
    );
  }
  const data = feed.data;
  if (!data) return null;

  const banners: Banner[] = (data.banners ?? []).filter(b => b.isActive);
  const banner = banners[Math.min(bannerIndex, Math.max(banners.length - 1, 0))];
  const gridWide = width >= 780;

  return (
    <Page gap={spacing.xxxl}>
      <HeroBanner
        banner={banner}
        bannerCount={banners.length}
        index={bannerIndex}
        onPrev={() => setBannerIndex(i => (i - 1 + banners.length) % banners.length)}
        onNext={() => setBannerIndex(i => (i + 1) % banners.length)}
        onCta={() => openUrl(router, banner?.linkUrl ?? '/shop')}
        storeName={settings.storeName}
        tagline={settings.tagline ?? undefined}
      />

      <Section
        title="Shop by category"
        subtitle="Find exactly what your little one needs."
        actionLabel="Browse all"
        onAction={() => router.navigate('shop')}
      >
        <View style={styles.categoryGrid}>
          {(data.categories ?? []).filter(c => c.isActive).slice(0, 8).map(category => (
            <CategoryTile
              key={category.id}
              name={category.name}
              imageUrl={category.imageUrl}
              count={category.productCount}
              wide={gridWide}
              onPress={() => router.navigate('category', { slug: category.slug })}
            />
          ))}
        </View>
      </Section>

      {(data.deals ?? []).length ? (
        <Section
          title="Today's deals"
          subtitle="Limited-time prices on family favourites."
          actionLabel="See all deals"
          onAction={() => router.navigate('shop', { onSale: 'true', sortBy: 'popularity' })}
        >
          <ProductRail
            products={data.deals}
            onAdd={add}
            wishedIds={wishlist.ids}
            onToggleWishlist={wish}
          />
        </Section>
      ) : null}

      <Section
        title="Featured picks"
        subtitle="Hand-selected pieces our families love."
        actionLabel="Shop all"
        onAction={() => router.navigate('shop')}
      >
        <ProductGrid
          products={data.featuredProducts ?? []}
          onAdd={add}
          wishedIds={wishlist.ids}
          onToggleWishlist={wish}
          emptyTitle="Featured products are being curated"
        />
      </Section>

      <View style={[styles.split, !gridWide && { flexDirection: 'column' }]}>
        <View style={styles.storyPanel}>
          <Badge label="Made for families" tone={{ bg: 'rgba(255,255,255,0.16)', fg: colors.white }} />
          <AppText variant="h2" color={colors.white} style={{ marginTop: spacing.md }}>
            Thoughtful essentials, delivered with care.
          </AppText>
          <AppText variant="small" color="rgba(255,255,255,0.78)" style={{ marginTop: spacing.sm }}>
            {settings.footerAbout ??
              'From first outfits to nursery must-haves, every product is chosen for comfort, safety and everyday joy.'}
          </AppText>
          <Button
            label="Explore new arrivals"
            variant="primary"
            onPress={() => router.navigate('shop', { sortBy: 'latest' })}
            style={{ marginTop: spacing.lg, alignSelf: 'flex-start', backgroundColor: colors.white }}
            textStyle={{ color: colors.primaryDark }}
          />
        </View>
        <View style={styles.storySide}>
          <Card style={{ padding: spacing.xl, gap: spacing.sm }}>
            <AppText variant="label" color={colors.primary}>DELIVERY</AppText>
            <AppText variant="h3">
              {settings.freeShippingThreshold > 0
                ? `Free shipping over ${fmt(settings.freeShippingThreshold)}`
                : 'Fast delivery across Dhaka'}
            </AppText>
            <AppText variant="small" color={colors.muted}>
              Order today and we will dispatch from our Mirpur studio.
            </AppText>
            <AppText
              variant="small"
              weight="600"
              color={colors.primary}
              onPress={() => router.navigate('track-order')}
              style={{ marginTop: spacing.xs }}
            >
              Track an order →
            </AppText>
          </Card>
          <Card style={{ padding: spacing.xl, gap: spacing.sm }}>
            <AppText variant="label" color={colors.primary}>PAYMENTS</AppText>
            <AppText variant="h3">Pay your way</AppText>
            <AppText variant="small" color={colors.muted}>
              Cash on delivery, card, bKash, Nagad, Rocket or voucher points — all verified securely.
            </AppText>
          </Card>
        </View>
      </View>

      <Section
        title="New arrivals"
        subtitle="Fresh from the studio."
        actionLabel="See what's new"
        onAction={() => router.navigate('shop', { sortBy: 'latest' })}
      >
        <ProductRail
          products={data.newArrivals ?? []}
          onAdd={add}
          wishedIds={wishlist.ids}
          onToggleWishlist={wish}
        />
      </Section>

      <Section title="Best sellers" subtitle="The pieces everyone is taking home.">
        <ProductGrid
          products={data.bestSellers ?? []}
          onAdd={add}
          wishedIds={wishlist.ids}
          onToggleWishlist={wish}
        />
      </Section>

      {(data.trendingProducts ?? []).length ? (
        <Section title="Trending now" subtitle="What is moving this week.">
          <ProductRail
            products={data.trendingProducts}
            onAdd={add}
            wishedIds={wishlist.ids}
            onToggleWishlist={wish}
          />
        </Section>
      ) : null}

      {(data.recentlyViewed ?? []).length ? (
        <Section title="Recently viewed" subtitle="Pick up where you left off.">
          <ProductRail products={data.recentlyViewed} onAdd={add} wishedIds={wishlist.ids} onToggleWishlist={wish} />
        </Section>
      ) : null}

      {(data.testimonials ?? []).length ? (
        <Section title="Kind words" subtitle="Notes from families in our community.">
          <View style={styles.testimonialGrid}>
            {data.testimonials.filter(t => t.isActive).map(testimonial => (
              <Card key={testimonial.id} style={{ flex: 1, minWidth: 260, gap: spacing.md, padding: spacing.xl }}>
                <RatingStars rating={testimonial.rating} size={14} />
                <AppText variant="body" color={colors.inkSoft} style={{ lineHeight: 23 }}>
                  “{testimonial.quote}”
                </AppText>
                <View>
                  <AppText variant="title">{testimonial.name}</AppText>
                  {testimonial.role ? <AppText variant="tiny" color={colors.faint}>{testimonial.role}</AppText> : null}
                </View>
              </Card>
            ))}
          </View>
        </Section>
      ) : null}

      <View style={styles.newsletter}>
        <View style={{ flex: 1, minWidth: 260 }}>
          <AppText variant="h2" color={colors.white}>Stay in the loop</AppText>
          <AppText variant="small" color="rgba(255,255,255,0.75)" style={{ marginTop: 4 }}>
            New arrivals, gentle reminders and subscriber-only offers. No noise.
          </AppText>
        </View>
        <View style={styles.newsletterForm}>
          <TextField
            value={newsletter}
            onChangeText={setNewsletter}
            placeholder="Your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ flex: 1, minWidth: 220 }}
            inputStyle={{ backgroundColor: colors.white, borderColor: 'transparent' }}
            onSubmitEditing={subscribe}
          />
          <Button label="Subscribe" onPress={subscribe} loading={subscribeBusy} />
        </View>
      </View>
    </Page>
  );
}

function HeroBanner({
  banner,
  bannerCount,
  index,
  onPrev,
  onNext,
  onCta,
  storeName,
  tagline,
}: {
  banner?: Banner;
  bannerCount: number;
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onCta: () => void;
  storeName: string;
  tagline?: string;
}) {
  const image = assetUrl(banner?.imageUrl);
  const content = (
    <View style={styles.heroContent}>
      <AppText variant="label" color="rgba(255,255,255,0.7)" style={{ letterSpacing: 2 }}>
        SA FWAN · MIRPUR, DHAKA
      </AppText>
      <AppText variant="display" color={colors.white} style={{ marginTop: spacing.md, maxWidth: 640 }}>
        {banner?.title ?? storeName}
      </AppText>
      <AppText variant="body" color="rgba(255,255,255,0.8)" style={{ marginTop: spacing.md, maxWidth: 520 }}>
        {banner?.subtitle ?? tagline ?? 'Everyday essentials for little ones and their grown-ups.'}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, flexWrap: 'wrap' }}>
        <Button
          label={banner?.buttonText ?? 'Shop the collection'}
          onPress={onCta}
          size="lg"
          style={{ backgroundColor: colors.white }}
          textStyle={{ color: colors.primaryDark }}
        />
        {bannerCount > 1 ? (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label="<" variant="outline" onPress={onPrev} style={{ borderColor: 'rgba(255,255,255,0.4)' }} textStyle={{ color: colors.white }} />
            <Button label=">" variant="outline" onPress={onNext} style={{ borderColor: 'rgba(255,255,255,0.4)' }} textStyle={{ color: colors.white }} />
          </View>
        ) : null}
      </View>
      {bannerCount > 1 ? (
        <AppText variant="tiny" color="rgba(255,255,255,0.6)" style={{ marginTop: spacing.lg }}>
          {index + 1} / {bannerCount}
          {banner?.endAt ? ` · until ${date(banner.endAt)}` : ''}
        </AppText>
      ) : null}
    </View>
  );
  return (
    <View style={styles.hero}>
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primaryDark }]}>
          <View style={styles.heroOrbA} />
          <View style={styles.heroOrbB} />
        </View>
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: image ? 'rgba(17, 56, 53, 0.55)' : 'transparent' }]} />
      {content}
    </View>
  );
}

function CategoryTile({
  name,
  imageUrl,
  count,
  onPress,
  wide,
}: {
  name: string;
  imageUrl?: string | null;
  count: number;
  onPress: () => void;
  wide: boolean;
}) {
  const image = assetUrl(imageUrl);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.categoryTile, { minWidth: wide ? 180 : 140 }, pressed && { opacity: 0.9 }]}
    >
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceAlt }]} />
      )}
      <View style={styles.categoryOverlay} />
      <View style={{ padding: spacing.md }}>
        <AppText variant="title" color={colors.white}>{name}</AppText>
        <AppText variant="tiny" color="rgba(255,255,255,0.75)">{count} products</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 420,
    borderRadius: radius.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.primaryDark,
  },
  heroContent: { padding: spacing.xxxl, paddingTop: spacing.xxxl * 2 },
  heroOrbA: {
    position: 'absolute',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: 'rgba(224, 122, 95, 0.28)',
    top: -80,
    right: -60,
  },
  heroOrbB: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(201, 162, 39, 0.22)',
    bottom: -90,
    left: '35%',
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  categoryTile: {
    flex: 1,
    height: 130,
    borderRadius: radius.lg,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: colors.surfaceAlt,
  },
  categoryOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(28,25,23,0.32)' },
  split: { flexDirection: 'row', gap: spacing.lg },
  storyPanel: {
    flex: 1.4,
    backgroundColor: colors.primaryDark,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    justifyContent: 'center',
    minHeight: 260,
  },
  storySide: { flex: 1, gap: spacing.lg, minWidth: 260 },
  testimonialGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  newsletter: {
    backgroundColor: colors.primaryDark,
    borderRadius: radius.xl,
    padding: spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    flexWrap: 'wrap',
  },
  newsletterForm: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 280, flexWrap: 'wrap' },
});

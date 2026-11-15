import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, Button, SearchInput } from '../components/ui';
import { useSettings } from '../state/SettingsContext';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useWishlist } from '../state/WishlistContext';
import { colors, maxContentWidth, spacing } from '../theme';
import { useRouter } from './Router';

const navLinks: { label: string; route: string }[] = [
  { label: 'Home', route: 'home' },
  { label: 'Shop', route: 'shop' },
  { label: 'About', route: 'about' },
  { label: 'Contact', route: 'contact' },
  { label: 'Track order', route: 'track-order' },
];

export function StoreLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { user, isStaff } = useAuth();
  const cart = useCart();
  const wishlist = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wide = width >= 960;

  const go = (route: string) => {
    setMenuOpen(false);
    router.navigate(route);
  };

  const submitSearch = () => {
    const term = search.trim();
    setMenuOpen(false);
    router.navigate('shop', term ? { q: term } : {});
  };

  return (
    <View style={styles.root}>
      <View style={[styles.announcement, { paddingTop: insets.top }]}>
        <View style={styles.announcementInner}>
          <AppText variant="tiny" color={colors.white}>
            {settings.freeShippingThreshold > 0
              ? `Free delivery on orders over ${settings.currencySymbol}${settings.freeShippingThreshold.toLocaleString()} · Mirpur, Dhaka`
              : `Curated essentials, delivered across Bangladesh · Mirpur, Dhaka`}
          </AppText>
          {wide ? (
            <Pressable onPress={() => go('rewards')} accessibilityRole="link">
              <AppText variant="tiny" color={colors.primarySoft}>
                {user ? 'Reward points →' : 'Join & earn points →'}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.header}>
        <View style={styles.headerInner}>
          <Pressable onPress={() => go('home')} style={styles.brand} accessibilityRole="link" accessibilityLabel="Safwan Shop home">
            <AppText variant="h2" style={{ letterSpacing: -0.5 }}>{settings.storeName}</AppText>
            <AppText variant="tiny" color={colors.faint} style={{ letterSpacing: 2, textTransform: 'uppercase' }}>
              Mirpur · Dhaka
            </AppText>
          </Pressable>

          {wide ? (
            <View style={styles.nav}>
              {navLinks.map(link => (
                <Button key={link.route} label={link.label} variant="ghost" size="sm" onPress={() => go(link.route)} />
              ))}
            </View>
          ) : null}

          {wide ? (
            <View style={{ width: 280 }}>
              <SearchInput value={search} onChangeText={setSearch} onSubmit={submitSearch} placeholder="Search Safwan…" />
            </View>
          ) : null}

          <View style={styles.actions}>
            {!wide ? (
              <IconButton label="Search" glyph="⌕" onPress={() => go('shop')} />
            ) : null}
            <IconButton label="Wishlist" glyph="♡" badge={user ? wishlist.items.length : 0} onPress={() => go('wishlist')} />
            <IconButton label="Cart" glyph="⛊" badge={cart.count} onPress={() => go('cart')} />
            <IconButton label={user ? 'Account' : 'Sign in'} glyph="☺" onPress={() => go(user ? 'account' : 'login')} />
            {isStaff ? <IconButton label="Admin" glyph="⚙" onPress={() => go('admin')} /> : null}
            {!wide ? <IconButton label="Menu" glyph="☰" onPress={() => setMenuOpen(open => !open)} /> : null}
          </View>
        </View>

        {menuOpen && !wide ? (
          <View style={styles.mobileMenu}>
            {navLinks.map(link => (
              <Button
                key={link.route}
                label={link.label}
                variant="ghost"
                full
                onPress={() => go(link.route)}
                style={{ justifyContent: 'flex-start', paddingHorizontal: spacing.lg }}
                textStyle={{ color: colors.ink }}
              />
            ))}
            <View style={{ padding: spacing.md }}>
              <SearchInput value={search} onChangeText={setSearch} onSubmit={submitSearch} placeholder="Search Safwan…" />
            </View>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, width: '100%' }}>{children}</View>

      <View style={styles.footer}>
        <View style={styles.footerInner}>
          <View style={{ flex: 1.4, minWidth: 240, gap: spacing.sm }}>
            <AppText variant="h3">{settings.storeName}</AppText>
            <AppText variant="small" color={colors.faint}>
              {settings.footerAbout ??
                'Thoughtful essentials for the home and family, curated in Mirpur, Dhaka and delivered across Bangladesh.'}
            </AppText>
            {settings.address ? <AppText variant="tiny" color={colors.muted}>{settings.address}</AppText> : null}
            {settings.phone ? <AppText variant="tiny" color={colors.muted}>Call {settings.phone}</AppText> : null}
            {settings.email ? <AppText variant="tiny" color={colors.muted}>{settings.email}</AppText> : null}
          </View>

          <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
            <AppText variant="label" color={colors.white}>Shop</AppText>
            {['shop', 'wishlist', 'cart', 'track-order'].map(route => (
              <Button
                key={route}
                label={{ shop: 'All products', wishlist: 'Wishlist', cart: 'Your bag', 'track-order': 'Track an order' }[route]!}
                variant="ghost"
                size="sm"
                onPress={() => go(route)}
                style={{ justifyContent: 'flex-start', paddingHorizontal: 0, height: 30 }}
                textStyle={{ color: colors.faint }}
              />
            ))}
          </View>

          <View style={{ flex: 1, minWidth: 160, gap: 2 }}>
            <AppText variant="label" color={colors.white}>Account</AppText>
            {[
              { label: 'My orders', route: 'orders' },
              { label: 'Returns', route: 'returns' },
              { label: 'Rewards', route: 'rewards' },
              { label: 'Contact', route: 'contact' },
              { label: 'About', route: 'about' },
            ].map(link => (
              <Button
                key={link.route}
                label={link.label}
                variant="ghost"
                size="sm"
                onPress={() => go(link.route)}
                style={{ justifyContent: 'flex-start', paddingHorizontal: 0, height: 30 }}
                textStyle={{ color: colors.faint }}
              />
            ))}
          </View>
        </View>
        <View style={styles.footerBottom}>
          <AppText variant="tiny" color={colors.muted}>
            {settings.copyrightText ?? `© ${new Date().getFullYear()} ${settings.storeName}. All rights reserved.`}
          </AppText>
          <AppText variant="tiny" color={colors.muted}>
            Secure payments · Mobile banking · Cash on delivery
          </AppText>
        </View>
      </View>
    </View>
  );
}

function IconButton({
  label,
  glyph,
  badge,
  onPress,
}: {
  label: string;
  glyph: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.65 }]}
    >
      <AppText variant="title" color={colors.ink}>{glyph}</AppText>
      {badge && badge > 0 ? (
        <View style={styles.badgeDot}>
          <AppText variant="tiny" color={colors.white} style={{ fontSize: 9 }}>{badge > 99 ? '99+' : badge}</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const sticky = Platform.OS === 'web' ? ({ position: 'sticky', top: 0, zIndex: 30 } as any) : null;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  announcement: { backgroundColor: colors.ink },
  announcementInner: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  header: {
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...sticky,
  },
  headerInner: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  brand: { gap: 0, cursor: 'pointer' as any },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: 'auto' },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer' as any,
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileMenu: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    width: '100%',
  },
  footer: {
    backgroundColor: colors.ink,
    marginTop: spacing.xxl,
    paddingTop: spacing.xxl,
  },
  footerInner: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    gap: spacing.xl,
    flexWrap: 'wrap',
    paddingBottom: spacing.xl,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: '#2E2925',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
});

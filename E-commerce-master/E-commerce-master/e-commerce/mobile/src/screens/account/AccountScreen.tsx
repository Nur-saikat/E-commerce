import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Badge, Button, Card, Divider, Page, PageHeader, Avatar } from '../../components/ui';
import { useDocumentTitle } from '../../hooks/useAsync';
import { useRouter } from '../../navigation/Router';
import { useAuth } from '../../state/AuthContext';
import { useCart } from '../../state/CartContext';
import { useFeedback } from '../../state/FeedbackContext';
import { useWishlist } from '../../state/WishlistContext';
import { colors, radius, spacing } from '../../theme';

export function AccountScreen() {
  useDocumentTitle('Account');
  const router = useRouter();
  const { user, isStaff, logout, busy } = useAuth();
  const { toast } = useFeedback();
  const wishlist = useWishlist();
  const cart = useCart();

  const links: { label: string; hint: string; route: string; badge?: string }[] = [
    { label: 'Orders', hint: 'Track deliveries and reorder favourites', route: 'orders' },
    { label: 'Returns', hint: 'Request and follow up on returns', route: 'returns' },
    { label: 'Wishlist', hint: 'Pieces you have saved', route: 'wishlist', badge: wishlist.items.length ? String(wishlist.items.length) : undefined },
    { label: 'Addresses', hint: 'Delivery details for faster checkout', route: 'addresses' },
    { label: 'Rewards', hint: 'Voucher points and history', route: 'rewards' },
    { label: 'My reviews', hint: 'Reviews you have written', route: 'my-reviews' },
    { label: 'Profile & security', hint: 'Name, phone and password', route: 'profile' },
  ];

  return (
    <Page gap={spacing.xl}>
      <PageHeader title="Account" subtitle="Everything about your Safwan orders, saved pieces and rewards." />

      <Card style={{ padding: spacing.xl, gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, flexWrap: 'wrap' }}>
          <Avatar name={user?.fullName ?? user?.email} url={user?.avatarUrl} size={64} />
          <View style={{ flex: 1, minWidth: 200 }}>
            <AppText variant="h2">{user?.fullName || 'Welcome back'}</AppText>
            <AppText variant="small" color={colors.muted}>{user?.email}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 6, flexWrap: 'wrap' }}>
              <Badge label={user?.role ?? 'Customer'} />
              {user?.emailVerified ? <Badge label="Verified" tone={{ bg: colors.successSoft, fg: colors.success }} /> : null}
              {user?.phone ? <Badge label={user.phone} /> : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {isStaff ? (
              <Button label="Admin console" variant="secondary" onPress={() => router.navigate('admin')} />
            ) : null}
            <Button label="Edit profile" variant="outline" onPress={() => router.navigate('profile')} />
          </View>
        </View>
      </Card>

      <View style={styles.quickStats}>
        <Stat label="Cart items" value={String(cart.count)} onPress={() => router.navigate('cart')} />
        <Stat label="Saved pieces" value={String(wishlist.items.length)} onPress={() => router.navigate('wishlist')} />
        <Stat label="Orders" value="View all" onPress={() => router.navigate('orders')} />
      </View>

      <Card padded={false}>
        {links.map((link, index) => (
          <View key={link.route}>
            <Button
              label={`${link.label}${link.badge ? `  (${link.badge})` : ''}   →`}
              variant="ghost"
              full
              onPress={() => router.navigate(link.route)}
              style={{ borderRadius: 0, height: 52, justifyContent: 'flex-start', paddingHorizontal: spacing.xl }}
              textStyle={{ color: colors.ink }}
            />
            {index < links.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Button
          label={busy ? 'Signing out…' : 'Sign out'}
          variant="outline"
          onPress={async () => {
            await logout();
            toast('You have been signed out.', 'success');
            router.reset('home');
          }}
          loading={busy}
        />
        <AppText variant="tiny" color={colors.faint} align="center">
          Signed in as {user?.email}. Sessions use short-lived access tokens with rotating refresh tokens.
        </AppText>
      </View>
    </Page>
  );
}

function Stat({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} style={{ flex: 1, minWidth: 140, padding: spacing.lg, gap: 4 }}>
      <AppText variant="tiny" color={colors.muted} style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</AppText>
      <AppText variant="h3">{value}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  quickStats: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
});

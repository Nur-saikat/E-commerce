import React from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Avatar, Badge, Button, EmptyState, Spinner } from '../components/ui';
import { useRouter } from './Router';
import { useAuth } from '../state/AuthContext';
import { useFeedback } from '../state/FeedbackContext';
import { useSettings } from '../state/SettingsContext';
import { colors, maxContentWidth, radius, spacing } from '../theme';
import { PERMISSIONS } from '../api/types';

interface NavItem {
  label: string;
  route: string;
  permission?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const groups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', route: 'admin', permission: PERMISSIONS.dashboardView }],
  },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', route: 'admin-products', permission: PERMISSIONS.productsView },
      { label: 'Categories', route: 'admin-categories', permission: PERMISSIONS.productsView },
      { label: 'Brands', route: 'admin-brands', permission: PERMISSIONS.productsView },
      { label: 'Inventory', route: 'admin-inventory', permission: PERMISSIONS.inventoryManage },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', route: 'admin-orders', permission: PERMISSIONS.ordersView },
      { label: 'Returns', route: 'admin-returns', permission: PERMISSIONS.ordersView },
      { label: 'Customers', route: 'admin-customers', permission: PERMISSIONS.customersView },
      { label: 'Coupons', route: 'admin-coupons', permission: PERMISSIONS.couponsManage },
      { label: 'Reviews', route: 'admin-reviews', permission: PERMISSIONS.reviewsManage },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Storefront content', route: 'admin-content', permission: PERMISSIONS.contentManage },
      { label: 'Settings', route: 'admin-settings', permission: PERMISSIONS.settingsManage },
      { label: 'Roles & audit logs', route: 'admin-roles', permission: PERMISSIONS.settingsManage },
      { label: 'Reports', route: 'admin-reports', permission: PERMISSIONS.reportsView },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Overview', route: 'admin-business', permission: PERMISSIONS.businessView },
      { label: 'Purchases', route: 'admin-purchases', permission: PERMISSIONS.businessView },
      { label: 'Stock arrivals', route: 'admin-arrivals', permission: PERMISSIONS.businessView },
      { label: 'Supplier returns', route: 'admin-supplier-returns', permission: PERMISSIONS.businessView },
      { label: 'Profit & loss', route: 'admin-profit-loss', permission: PERMISSIONS.businessView },
      { label: 'Staff', route: 'admin-staff', permission: PERMISSIONS.businessView },
      { label: 'Capital', route: 'admin-capital', permission: PERMISSIONS.businessView },
      { label: 'Expenses', route: 'admin-expenses', permission: PERMISSIONS.businessView },
      { label: 'Owner profile', route: 'admin-profile', permission: PERMISSIONS.businessView },
    ],
  },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, ready, isStaff, hasPermission, busy, logout } = useAuth();
  const { settings } = useSettings();
  const { toast } = useFeedback();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const route = router.route.name;

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <Spinner label="Checking your access…" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.deniedWrap}>
          <EmptyState
            title="Staff sign-in required"
            message="The admin console is only available to Safwan staff accounts."
            actionLabel="Sign in"
            onAction={() => router.navigate('login', { redirect: 'admin' })}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!isStaff) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.deniedWrap}>
          <EmptyState
            title="You do not have admin access"
            message="This area is restricted to staff roles. If you believe this is a mistake, contact the store owner."
            actionLabel="Back to the store"
            onAction={() => router.navigate('home')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const requiredPermission =
    [...groups.flatMap(group => group.items), { label: 'Order detail', route: 'admin-order', permission: PERMISSIONS.ordersView }]
      .find(item => item.route === route)?.permission;

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.deniedWrap}>
          <EmptyState
            title="You do not have permission for this page"
            message="Your role does not include access to this part of the admin console. Ask the store owner to delegate it if you need it."
            actionLabel="Back to dashboard"
            onAction={() => router.navigate('admin')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const visibleGroups = groups
    .map(group => ({ ...group, items: group.items.filter(item => !item.permission || hasPermission(item.permission)) }))
    .filter(group => group.items.length > 0);

  const navLink = (item: NavItem, compact = false) => {
    const active = route === item.route || (item.route !== 'admin' && route.startsWith(`${item.route}`));
    return (
      <Pressable
        key={item.route}
        onPress={() => router.navigate(item.route)}
        style={({ pressed }) => [
          styles.navLink,
          compact && styles.navLinkCompact,
          active && styles.navLinkActive,
          pressed && { opacity: 0.75 },
        ]}
      >
        <AppText variant="small" weight={active ? '700' : '500'} color={active ? colors.white : colors.inkSoft}>
          {item.label}
        </AppText>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topbar}>
        <View style={styles.topbarInner}>
          <Pressable onPress={() => router.navigate('admin')} style={{ gap: 0 }}>
            <AppText variant="h3">{settings.storeName}</AppText>
            <AppText variant="tiny" color={colors.faint} style={{ letterSpacing: 1.6, textTransform: 'uppercase' }}>
              Admin console
            </AppText>
          </Pressable>
          <View style={styles.topbarActions}>
            <Avatar name={user.fullName} url={user.avatarUrl} size={30} />
            <Badge label={user.role} tone={{ bg: colors.primarySoft, fg: colors.primaryDark }} />
            <Button label="View store" variant="ghost" size="sm" onPress={() => router.navigate('home')} />
            <Button
              label={busy ? 'Signing out…' : 'Sign out'}
              variant="outline"
              size="sm"
              loading={busy}
              onPress={async () => {
                await logout();
                toast('Signed out of the admin console.', 'success');
                router.reset('home');
              }}
            />
          </View>
        </View>
      </View>

      <View style={[styles.body, wide ? styles.bodyWide : null]}>
        {wide ? (
          <ScrollView style={styles.sidebar} contentContainerStyle={styles.sidebarContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.sm, paddingBottom: spacing.md }}>
              <Avatar name={user.fullName} url={user.avatarUrl} size={38} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="title" numberOfLines={1}>{user.fullName}</AppText>
                <AppText variant="tiny" color={colors.muted} numberOfLines={1}>{user.email}</AppText>
              </View>
            </View>
            {visibleGroups.map(group => (
              <View key={group.title} style={{ gap: 2 }}>
                <AppText variant="label" color={colors.faint} style={{ paddingHorizontal: spacing.sm, paddingTop: spacing.md, paddingBottom: 4, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {group.title}
                </AppText>
                {group.items.map(item => navLink(item))}
              </View>
            ))}
            <View style={{ height: spacing.xxl }} />
          </ScrollView>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalNav} contentContainerStyle={{ gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
            {visibleGroups.flatMap(group => group.items).map(item => navLink(item, true))}
          </ScrollView>
        )}

        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topbar: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  topbarInner: {
    width: '100%',
    maxWidth: maxContentWidth + 260,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  topbarActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  body: { flex: 1 },
  bodyWide: { flexDirection: 'row', width: '100%', maxWidth: maxContentWidth + 260, alignSelf: 'center' },
  sidebar: {
    width: 248,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
  },
  sidebarContent: { padding: spacing.md, gap: 2 },
  horizontalNav: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexGrow: 0,
  },
  content: { flex: 1, minWidth: 0 },
  navLink: {
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  navLinkCompact: { paddingVertical: 7, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  navLinkActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  deniedWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
});

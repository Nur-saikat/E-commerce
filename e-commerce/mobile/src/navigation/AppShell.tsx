import React from 'react';
import { View } from 'react-native';
import { EmptyState, Page } from '../components/ui';
import { useRouter } from './Router';
import { StoreLayout } from './StoreLayout';
import { AdminLayout } from './AdminLayout';
import { HomeScreen } from '../screens/storefront/HomeScreen';
import { ShopScreen } from '../screens/storefront/ShopScreen';
import { ProductScreen } from '../screens/storefront/ProductScreen';
import { CartScreen } from '../screens/storefront/CartScreen';
import { CheckoutScreen } from '../screens/storefront/CheckoutScreen';
import { ConfirmationScreen } from '../screens/storefront/ConfirmationScreen';
import { TrackOrderScreen } from '../screens/storefront/TrackOrderScreen';
import { ContactScreen } from '../screens/storefront/ContactScreen';
import { AboutScreen } from '../screens/storefront/AboutScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { AccountScreen } from '../screens/account/AccountScreen';
import { OrdersScreen } from '../screens/account/OrdersScreen';
import { OrderDetailScreen } from '../screens/account/OrderDetailScreen';
import { ReturnsScreen } from '../screens/account/ReturnsScreen';
import { AddressesScreen } from '../screens/account/AddressesScreen';
import { ProfileScreen } from '../screens/account/ProfileScreen';
import { RewardsScreen } from '../screens/account/RewardsScreen';
import { MyReviewsScreen } from '../screens/account/MyReviewsScreen';
import { WishlistScreen } from '../screens/account/WishlistScreen';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminProductsScreen } from '../screens/admin/AdminProductsScreen';
import { AdminCategoriesScreen } from '../screens/admin/AdminCategoriesScreen';
import { AdminBrandsScreen } from '../screens/admin/AdminBrandsScreen';
import { AdminOrdersScreen } from '../screens/admin/AdminOrdersScreen';
import { AdminOrderDetailScreen } from '../screens/admin/AdminOrderDetailScreen';
import { AdminCustomersScreen } from '../screens/admin/AdminCustomersScreen';
import { AdminInventoryScreen } from '../screens/admin/AdminInventoryScreen';
import { AdminCouponsScreen } from '../screens/admin/AdminCouponsScreen';
import { AdminReviewsScreen } from '../screens/admin/AdminReviewsScreen';
import { AdminContentScreen } from '../screens/admin/AdminContentScreen';
import { AdminSettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { AdminRolesScreen } from '../screens/admin/AdminRolesScreen';
import { AdminReturnsScreen } from '../screens/admin/AdminReturnsScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { AdminBusinessOverviewScreen } from '../screens/admin/AdminBusinessOverviewScreen';
import { AdminProfitLossScreen } from '../screens/admin/AdminProfitLossScreen';
import { AdminPurchasesScreen } from '../screens/admin/AdminPurchasesScreen';
import { AdminArrivalsScreen } from '../screens/admin/AdminArrivalsScreen';
import { AdminSupplierReturnsScreen } from '../screens/admin/AdminSupplierReturnsScreen';
import { AdminStaffScreen } from '../screens/admin/AdminStaffScreen';
import { AdminCapitalScreen } from '../screens/admin/AdminCapitalScreen';
import { AdminExpensesScreen } from '../screens/admin/AdminExpensesScreen';
import { AdminOwnerProfileScreen } from '../screens/admin/AdminOwnerProfileScreen';

const storeScreens: Record<string, () => React.ReactElement> = {
  home: () => <HomeScreen />,
  shop: () => <ShopScreen />,
  category: () => <ShopScreen />,
  product: () => <ProductScreen />,
  cart: () => <CartScreen />,
  checkout: () => <CheckoutScreen />,
  confirmation: () => <ConfirmationScreen />,
  wishlist: () => <WishlistScreen />,
  account: () => <AccountScreen />,
  orders: () => <OrdersScreen />,
  order: () => <OrderDetailScreen />,
  returns: () => <ReturnsScreen />,
  addresses: () => <AddressesScreen />,
  profile: () => <ProfileScreen />,
  rewards: () => <RewardsScreen />,
  'my-reviews': () => <MyReviewsScreen />,
  'track-order': () => <TrackOrderScreen />,
  contact: () => <ContactScreen />,
  about: () => <AboutScreen />,
};

const authScreens: Record<string, () => React.ReactElement> = {
  login: () => <LoginScreen />,
  register: () => <RegisterScreen />,
  'forgot-password': () => <ForgotPasswordScreen />,
  'reset-password': () => <ResetPasswordScreen />,
};

const adminScreens: Record<string, () => React.ReactElement> = {
  admin: () => <AdminDashboardScreen />,
  'admin-products': () => <AdminProductsScreen />,
  'admin-categories': () => <AdminCategoriesScreen />,
  'admin-brands': () => <AdminBrandsScreen />,
  'admin-orders': () => <AdminOrdersScreen />,
  'admin-order': () => <AdminOrderDetailScreen />,
  'admin-customers': () => <AdminCustomersScreen />,
  'admin-inventory': () => <AdminInventoryScreen />,
  'admin-coupons': () => <AdminCouponsScreen />,
  'admin-reviews': () => <AdminReviewsScreen />,
  'admin-content': () => <AdminContentScreen />,
  'admin-settings': () => <AdminSettingsScreen />,
  'admin-roles': () => <AdminRolesScreen />,
  'admin-returns': () => <AdminReturnsScreen />,
  'admin-reports': () => <AdminReportsScreen />,
  'admin-business': () => <AdminBusinessOverviewScreen />,
  'admin-profit-loss': () => <AdminProfitLossScreen />,
  'admin-purchases': () => <AdminPurchasesScreen />,
  'admin-arrivals': () => <AdminArrivalsScreen />,
  'admin-supplier-returns': () => <AdminSupplierReturnsScreen />,
  'admin-staff': () => <AdminStaffScreen />,
  'admin-capital': () => <AdminCapitalScreen />,
  'admin-expenses': () => <AdminExpensesScreen />,
  'admin-profile': () => <AdminOwnerProfileScreen />,
};

function NotFound() {
  const router = useRouter();
  return (
    <Page>
      <View style={{ paddingVertical: 80 }}>
        <EmptyState
          title="Page not found"
          message="The page you were looking for does not exist or has moved."
          actionLabel="Back to the shop"
          onAction={() => router.reset('home')}
        />
      </View>
    </Page>
  );
}

export function AppShell() {
  const { route } = useRouter();
  const name = route.name;

  const store = storeScreens[name];
  if (store) return <StoreLayout>{store()}</StoreLayout>;

  const auth = authScreens[name];
  if (auth) return auth();

  const admin = adminScreens[name];
  if (admin) return <AdminLayout>{admin()}</AdminLayout>;

  return (
    <StoreLayout>
      <NotFound />
    </StoreLayout>
  );
}

import { Routes } from '@angular/router';
import { StorefrontLayout } from './layouts/storefront/storefront-layout';
import { AdminLayout } from './layouts/admin/admin-layout';
import { authGuard, adminGuard, guestGuard, permissionGuard } from './core/guards/auth.guards';

export const routes: Routes = [
  {
    path: '',
    component: StorefrontLayout,
    children: [
      {
        path: '',
        title: 'Safwan — Curated essentials for modern living',
        loadComponent: () => import('./features/home/home-page').then((m) => m.HomePage)
      },
      {
        path: 'products',
        title: 'Shop all — Safwan',
        loadComponent: () => import('./features/products/product-list-page').then((m) => m.ProductListPage)
      },
      {
        path: 'category/:slug',
        title: 'Collection — Safwan',
        loadComponent: () => import('./features/products/product-list-page').then((m) => m.ProductListPage)
      },
      {
        path: 'products/:slug',
        title: 'Product — Safwan',
        loadComponent: () => import('./features/products/product-detail-page').then((m) => m.ProductDetailPage)
      },
      {
        path: 'cart',
        title: 'Shopping bag — Safwan',
        loadComponent: () => import('./features/cart/cart-page').then((m) => m.CartPage)
      },
      {
        path: 'wishlist',
        title: 'Wishlist — Safwan',
        canActivate: [authGuard],
        loadComponent: () => import('./features/wishlist/wishlist-page').then((m) => m.WishlistPage)
      },
      {
        path: 'checkout',
        title: 'Checkout — Safwan',
        loadComponent: () => import('./features/checkout/checkout-page').then((m) => m.CheckoutPage)
      },
      {
        path: 'order-confirmation/:id',
        title: 'Order confirmation — Safwan',
        loadComponent: () => import('./features/checkout/order-confirmation-page').then((m) => m.OrderConfirmationPage)
      },
      {
        path: 'track-order',
        title: 'Track your order — Safwan',
        loadComponent: () => import('./features/checkout/track-order-page').then((m) => m.TrackOrderPage)
      },
      {
        path: 'account',
        canActivate: [authGuard],
        loadComponent: () => import('./features/account/account-layout').then((m) => m.AccountLayout),
        children: [
          {
            path: '',
            title: 'My account — Safwan',
            loadComponent: () => import('./features/account/account-overview').then((m) => m.AccountOverview)
          },
          {
            path: 'orders',
            title: 'My orders — Safwan',
            loadComponent: () => import('./features/account/account-orders').then((m) => m.AccountOrders)
          },
          {
            path: 'orders/:id',
            title: 'Order details — Safwan',
            loadComponent: () => import('./features/account/account-order-detail').then((m) => m.AccountOrderDetail)
          },
          {
            path: 'addresses',
            title: 'My addresses — Safwan',
            loadComponent: () => import('./features/account/account-addresses').then((m) => m.AccountAddresses)
          },
          {
            path: 'profile',
            title: 'Profile — Safwan',
            loadComponent: () => import('./features/account/account-profile').then((m) => m.AccountProfile)
          },
          {
            path: 'reviews',
            title: 'My reviews — Safwan',
            loadComponent: () => import('./features/account/account-reviews').then((m) => m.AccountReviews)
          }
        ]
      },
      {
        path: 'about',
        title: 'Our story — Safwan',
        data: { page: 'about' },
        loadComponent: () => import('./features/pages/info-page').then((m) => m.InfoPage)
      },
      {
        path: 'faq',
        title: 'FAQ — Safwan',
        data: { page: 'faq' },
        loadComponent: () => import('./features/pages/info-page').then((m) => m.InfoPage)
      },
      {
        path: 'privacy',
        title: 'Privacy policy — Safwan',
        data: { page: 'privacy' },
        loadComponent: () => import('./features/pages/info-page').then((m) => m.InfoPage)
      },
      {
        path: 'terms',
        title: 'Terms of service — Safwan',
        data: { page: 'terms' },
        loadComponent: () => import('./features/pages/info-page').then((m) => m.InfoPage)
      },
      {
        path: 'shipping-returns',
        title: 'Shipping & returns — Safwan',
        data: { page: 'shipping' },
        loadComponent: () => import('./features/pages/info-page').then((m) => m.InfoPage)
      },
      {
        path: 'contact',
        title: 'Contact — Safwan',
        loadComponent: () => import('./features/pages/contact-page').then((m) => m.ContactPage)
      }
    ]
  },
  {
    path: 'login',
    title: 'Sign in — Safwan',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login-page').then((m) => m.LoginPage)
  },
  {
    path: 'register',
    title: 'Create account — Safwan',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register-page').then((m) => m.RegisterPage)
  },
  {
    path: 'forgot-password',
    title: 'Forgot password — Safwan',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/forgot-password-page').then((m) => m.ForgotPasswordPage)
  },
  {
    path: 'reset-password',
    title: 'Reset password — Safwan',
    loadComponent: () => import('./features/auth/reset-password-page').then((m) => m.ResetPasswordPage)
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./layouts/admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      {
        path: '',
        title: 'Dashboard — Safwan Admin',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard').then((m) => m.AdminDashboard)
      },
      {
        path: 'products',
        title: 'Products — Safwan Admin',
        canActivate: [permissionGuard('products.view')],
        loadComponent: () => import('./features/admin/products/admin-products').then((m) => m.AdminProducts)
      },
      {
        path: 'products/new',
        title: 'New product — Safwan Admin',
        canActivate: [permissionGuard('products.manage')],
        loadComponent: () => import('./features/admin/products/product-form').then((m) => m.ProductForm)
      },
      {
        path: 'products/:id',
        title: 'Edit product — Safwan Admin',
        canActivate: [permissionGuard('products.manage')],
        loadComponent: () => import('./features/admin/products/product-form').then((m) => m.ProductForm)
      },
      {
        path: 'categories',
        title: 'Categories — Safwan Admin',
        canActivate: [permissionGuard('categories.manage')],
        loadComponent: () => import('./features/admin/catalog/admin-categories').then((m) => m.AdminCategories)
      },
      {
        path: 'brands',
        title: 'Brands — Safwan Admin',
        canActivate: [permissionGuard('brands.manage')],
        loadComponent: () => import('./features/admin/catalog/admin-brands').then((m) => m.AdminBrands)
      },
      {
        path: 'inventory',
        title: 'Inventory — Safwan Admin',
        canActivate: [permissionGuard('inventory.manage')],
        loadComponent: () => import('./features/admin/inventory/admin-inventory').then((m) => m.AdminInventory)
      },
      {
        path: 'orders',
        title: 'Orders — Safwan Admin',
        canActivate: [permissionGuard('orders.view')],
        loadComponent: () => import('./features/admin/orders/admin-orders').then((m) => m.AdminOrders)
      },
      {
        path: 'orders/:id',
        title: 'Order details — Safwan Admin',
        canActivate: [permissionGuard('orders.view')],
        loadComponent: () => import('./features/admin/orders/admin-order-detail').then((m) => m.AdminOrderDetail)
      },
      {
        path: 'customers',
        title: 'Customers — Safwan Admin',
        canActivate: [permissionGuard('customers.view')],
        loadComponent: () => import('./features/admin/customers/admin-customers').then((m) => m.AdminCustomers)
      },
      {
        path: 'coupons',
        title: 'Coupons — Safwan Admin',
        canActivate: [permissionGuard('coupons.manage')],
        loadComponent: () => import('./features/admin/marketing/admin-coupons').then((m) => m.AdminCoupons)
      },
      {
        path: 'reviews',
        title: 'Reviews — Safwan Admin',
        canActivate: [permissionGuard('reviews.manage')],
        loadComponent: () => import('./features/admin/marketing/admin-reviews').then((m) => m.AdminReviews)
      },
      {
        path: 'content',
        title: 'Content — Safwan Admin',
        canActivate: [permissionGuard('content.manage')],
        loadComponent: () => import('./features/admin/content/admin-content').then((m) => m.AdminContent)
      },
      {
        path: 'settings',
        title: 'Settings — Safwan Admin',
        canActivate: [permissionGuard('settings.manage')],
        loadComponent: () => import('./features/admin/settings/admin-settings').then((m) => m.AdminSettings)
      },
      {
        path: 'reports',
        title: 'Reports — Safwan Admin',
        canActivate: [permissionGuard('reports.view')],
        loadComponent: () => import('./features/admin/reports/admin-reports').then((m) => m.AdminReports)
      },
      {
        path: 'audit',
        title: 'Audit logs — Safwan Admin',
        canActivate: [permissionGuard('settings.manage')],
        loadComponent: () => import('./features/admin/reports/admin-audit').then((m) => m.AdminAudit)
      }
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./features/pages/not-found-page').then((m) => m.NotFoundPage)
  }
];

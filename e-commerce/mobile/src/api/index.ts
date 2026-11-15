import { request, requestBlob, requestPaged } from './client';
import type {
  Address,
  AddressInput,
  AuditLog,
  AuthResponse,
  Banner,
  BannerRequest,
  Brand,
  BrandRequest,
  BusinessOverview,
  BusinessProductOption,
  CapitalEntry,
  CapitalEntryRequest,
  Cart,
  Category,
  CategoryRequest,
  CheckoutConfig,
  CheckoutRequest,
  ContactMessage,
  Coupon,
  CouponRequest,
  CouponValidationResult,
  CreateReturnRequest,
  Customer,
  Dashboard,
  ExpenseEntry,
  ExpenseEntryRequest,
  FilterOptions,
  ForgotPasswordResponse,
  HomeFeed,
  InventoryItem,
  InventoryTransaction,
  MobilePaymentSubmitRequest,
  Notification,
  Order,
  OrderQuery,
  OrderReport,
  OrderSummary,
  OwnerProfile,
  OwnerProfileRequest,
  Payment,
  PaymentInitiateResponse,
  Permission,
  ProductDetail,
  ProductQuery,
  ProductRequest,
  ProductSummary,
  ProfitLoss,
  ReturnRequest,
  Review,
  ReviewList,
  Role,
  SalesReport,
  SearchSuggestion,
  Settings,
  ShippingMethod,
  ShippingMethodRequest,
  StaffMember,
  StaffRequest,
  StockArrival,
  StockArrivalRequest,
  StockAdjustmentRequest,
  StockPurchase,
  StockPurchaseRequest,
  SupplierReturn,
  SupplierReturnRequest,
  Testimonial,
  TestimonialRequest,
  UpdateCustomerRequest,
  UpdateReturnStatusRequest,
  UploadResult,
  User,
  VoucherWallet,
  Wishlist,
  BusinessDocument,
} from './types';

type Query = Record<string, any>;

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (body: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body }),
  me: () => request<User>('/auth/me'),
  refresh: (refreshToken: string) =>
    request<AuthResponse>('/auth/refresh-token', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken?: string | null) =>
    request<unknown>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  updateProfile: (body: { firstName: string; lastName: string; phone?: string | null; avatarUrl?: string | null }) =>
    request<User>('/auth/profile', { method: 'PUT', body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<unknown>('/auth/change-password', { method: 'POST', body }),
  forgotPassword: (email: string) =>
    request<ForgotPasswordResponse>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<unknown>('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

export const siteApi = {
  home: (recentlyViewed?: string) => request<HomeFeed>('/home', { query: { recentlyViewed } }),
  settings: () => request<Settings>('/settings'),
  banners: (position?: string) => request<Banner[]>('/banners', { query: { position } }),
  testimonials: () => request<Testimonial[]>('/testimonials'),
  shippingMethods: () => request<ShippingMethod[]>('/shipping-methods'),
  checkoutConfig: () => request<CheckoutConfig>('/checkout/config'),
  contact: (body: { name: string; email: string; phone?: string; subject: string; message: string }) =>
    request<unknown>('/contact', { method: 'POST', body }),
  newsletter: (email: string) => request<unknown>('/newsletter', { method: 'POST', body: { email } }),
  notifications: (limit = 20) => request<Notification[]>('/notifications', { query: { limit } }),
  readNotification: (id: string) => request<unknown>(`/notifications/${id}/read`, { method: 'POST' }),
  readAllNotifications: () => request<unknown>('/notifications/read-all', { method: 'POST' }),
};

export const catalogApi = {
  products: (query: ProductQuery = {}) => requestPaged<ProductSummary>('/products', { query }),
  product: (idOrSlug: string, includeInactive = false) =>
    request<ProductDetail>(`/products/${encodeURIComponent(idOrSlug)}`, { query: { includeInactive } }),
  featured: (limit = 8) => request<ProductSummary[]>('/products/featured', { query: { limit } }),
  latest: (limit = 8) => request<ProductSummary[]>('/products/latest', { query: { limit } }),
  bestsellers: (limit = 8) => request<ProductSummary[]>('/products/bestsellers', { query: { limit } }),
  trending: (limit = 8) => request<ProductSummary[]>('/products/trending', { query: { limit } }),
  deals: (limit = 8) => request<ProductSummary[]>('/products/deals', { query: { limit } }),
  search: (query: ProductQuery) => requestPaged<ProductSummary>('/products/search', { query }),
  suggest: (term: string) => request<SearchSuggestion>('/products/suggest', { query: { term } }),
  filters: (query: { categoryId?: string; categorySlug?: string }) =>
    request<FilterOptions>('/products/filters', { query }),
  byIds: (ids: string[]) => request<ProductSummary[]>('/products/by-ids', { query: { ids: ids.join(',') } }),
  createProduct: (body: ProductRequest) => request<ProductDetail>('/products', { method: 'POST', body }),
  updateProduct: (id: string, body: ProductRequest) =>
    request<ProductDetail>(`/products/${id}`, { method: 'PUT', body }),
  deleteProduct: (id: string) => request<unknown>(`/products/${id}`, { method: 'DELETE' }),
  categories: (includeInactive = false) => request<Category[]>('/categories', { query: { includeInactive } }),
  category: (idOrSlug: string) => request<Category>(`/categories/${encodeURIComponent(idOrSlug)}`),
  createCategory: (body: CategoryRequest) => request<Category>('/categories', { method: 'POST', body }),
  updateCategory: (id: string, body: CategoryRequest) =>
    request<Category>(`/categories/${id}`, { method: 'PUT', body }),
  deleteCategory: (id: string) => request<unknown>(`/categories/${id}`, { method: 'DELETE' }),
  brands: (includeInactive = false) => request<Brand[]>('/brands', { query: { includeInactive } }),
  brand: (idOrSlug: string) => request<Brand>(`/brands/${encodeURIComponent(idOrSlug)}`),
  createBrand: (body: BrandRequest) => request<Brand>('/brands', { method: 'POST', body }),
  updateBrand: (id: string, body: BrandRequest) => request<Brand>(`/brands/${id}`, { method: 'PUT', body }),
  deleteBrand: (id: string) => request<unknown>(`/brands/${id}`, { method: 'DELETE' }),
};

export const cartApi = {
  get: () => request<Cart>('/cart'),
  add: (productId: string, quantity = 1, variantId?: string | null) =>
    request<Cart>('/cart/items', { method: 'POST', body: { productId, variantId, quantity } }),
  update: (itemId: string, quantity: number) =>
    request<Cart>(`/cart/items/${itemId}`, { method: 'PUT', body: { quantity } }),
  remove: (itemId: string) => request<Cart>(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clear: () => request<Cart>('/cart/clear', { method: 'DELETE' }),
  applyCoupon: (couponCode: string) =>
    request<Cart>('/cart/apply-coupon', { method: 'POST', body: { couponCode } }),
  removeCoupon: () => request<Cart>('/cart/coupon', { method: 'DELETE' }),
  merge: (guestId: string) => request<Cart>('/cart/merge', { method: 'POST', query: { guestId } }),
};

export const wishlistApi = {
  get: () => request<Wishlist>('/wishlist'),
  contains: (productId: string) => request<boolean>(`/wishlist/contains/${productId}`),
  add: (productId: string) => request<Wishlist>('/wishlist', { method: 'POST', body: { productId, quantity: 1 } }),
  remove: (productId: string) => request<Wishlist>(`/wishlist/${productId}`, { method: 'DELETE' }),
};

export const addressesApi = {
  list: () => request<Address[]>('/account/addresses'),
  create: (body: AddressInput & { isDefault: boolean }) =>
    request<Address>('/account/addresses', { method: 'POST', body }),
  update: (id: string, body: AddressInput & { isDefault: boolean }) =>
    request<Address>(`/account/addresses/${id}`, { method: 'PUT', body }),
  remove: (id: string) => request<unknown>(`/account/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id: string) => request<Address>(`/account/addresses/${id}/default`, { method: 'POST' }),
};

export const ordersApi = {
  checkout: (body: CheckoutRequest) => request<Order>('/orders', { method: 'POST', body }),
  myOrders: (query: OrderQuery = {}) => requestPaged<OrderSummary>('/orders/my-orders', { query }),
  track: (orderNumber: string, email: string) =>
    request<Order>('/orders/track', { query: { orderNumber, email } }),
  get: (id: string) => request<Order>(`/orders/${id}`),
  cancel: (id: string, reason?: string) =>
    request<Order>(`/orders/${id}/cancel`, { method: 'POST', body: { reason, restoreStock: true } }),
  payments: (id: string) => request<Payment[]>(`/orders/${id}/payments`),
  invoiceBlob: (id: string) => requestBlob(`/orders/${id}/invoice`, { query: { download: true } }),
  adminList: (query: OrderQuery = {}) => requestPaged<OrderSummary>('/admin/orders', { query }),
  updateStatus: (id: string, body: { status: string; note?: string | null; trackingNumber?: string | null }) =>
    request<Order>(`/orders/${id}/status`, { method: 'PUT', body }),
  refund: (
    id: string,
    body: {
      destination: string;
      accountName?: string | null;
      accountNumber?: string | null;
      bankName?: string | null;
      reference?: string | null;
      note?: string | null;
    },
  ) => request<Order>(`/orders/${id}/refund`, { method: 'POST', body }),
};

export const paymentsApi = {
  providers: () => request<{ providers: string[] }>('/payments/providers'),
  initiate: (body: { orderId: string; provider: string; successUrl: string; cancelUrl: string; guestEmail?: string | null }) =>
    request<PaymentInitiateResponse>('/payments/initiate', { method: 'POST', body }),
  verify: (body: { orderId: string; transactionId?: string | null; guestEmail?: string | null }) =>
    request<Order>('/payments/verify', { method: 'POST', body }),
  submitMobile: (body: MobilePaymentSubmitRequest) =>
    request<Payment>('/payments/mobile/submit', { method: 'POST', body }),
  verifyMobile: (orderId: string, body: { approve: boolean; reference?: string | null; note?: string | null }) =>
    request<Payment>(`/payments/mobile/${orderId}/verify`, { method: 'POST', body }),
};

export const returnsApi = {
  create: (body: CreateReturnRequest) => request<ReturnRequest>('/returns', { method: 'POST', body }),
  my: (query: Query = {}) => requestPaged<ReturnRequest>('/returns/my', { query }),
  get: (id: string) => request<ReturnRequest>(`/returns/${id}`),
  adminList: (query: Query = {}) => requestPaged<ReturnRequest>('/admin/returns', { query }),
  adminGet: (id: string) => request<ReturnRequest>(`/admin/returns/${id}`),
  updateStatus: (id: string, body: UpdateReturnStatusRequest) =>
    request<ReturnRequest>(`/admin/returns/${id}/status`, { method: 'PUT', body }),
};

export const reviewsApi = {
  forProduct: (productId: string, page = 1, pageSize = 10) =>
    request<ReviewList>(`/products/${productId}/reviews`, { query: { page, pageSize } }),
  create: (productId: string, body: { rating: number; title?: string | null; comment: string }) =>
    request<Review>(`/products/${productId}/reviews`, { method: 'POST', body }),
  my: (query: Query = {}) => requestPaged<Review>('/reviews/my', { query }),
  adminList: (query: Query = {}) => requestPaged<Review>('/admin/reviews', { query }),
  approve: (id: string) => request<Review>(`/reviews/${id}/approve`, { method: 'POST' }),
  reject: (id: string) => request<Review>(`/reviews/${id}/reject`, { method: 'POST' }),
  remove: (id: string) => request<unknown>(`/reviews/${id}`, { method: 'DELETE' }),
};

export const couponsApi = {
  validate: (code: string, subtotal: number) =>
    request<CouponValidationResult>('/coupons/validate', { method: 'POST', body: { code, subtotal } }),
  list: (query: Query = {}) => requestPaged<Coupon>('/coupons', { query }),
  create: (body: CouponRequest) => request<Coupon>('/coupons', { method: 'POST', body }),
  update: (id: string, body: CouponRequest) => request<Coupon>(`/coupons/${id}`, { method: 'PUT', body }),
  remove: (id: string) => request<unknown>(`/coupons/${id}`, { method: 'DELETE' }),
};

export const adminApi = {
  dashboard: () => request<Dashboard>('/admin/dashboard'),
  salesReport: (from?: string, to?: string) =>
    request<SalesReport>('/admin/reports/sales', { query: { from, to } }),
  orderReport: (from?: string, to?: string) =>
    request<OrderReport>('/admin/reports/orders', { query: { from, to } }),
  customers: (query: Query = {}) => requestPaged<Customer>('/admin/customers', { query }),
  updateCustomer: (id: string, body: UpdateCustomerRequest) =>
    request<Customer>(`/admin/customers/${id}`, { method: 'PUT', body }),
  inventory: (query: Query = {}) => requestPaged<InventoryItem>('/admin/inventory', { query }),
  adjustStock: (productId: string, body: StockAdjustmentRequest) =>
    request<InventoryItem>(`/admin/inventory/${productId}/adjust`, { method: 'POST', body }),
  inventoryTransactions: (query: Query = {}) =>
    requestPaged<InventoryTransaction>('/admin/inventory/transactions', { query }),
  auditLogs: (query: Query = {}) => requestPaged<AuditLog>('/admin/audit-logs', { query }),
  roles: () => request<Role[]>('/admin/roles'),
  permissions: () => request<Permission[]>('/admin/permissions'),
  updateRole: (roleName: string, permissions: string[]) =>
    request<Role>(`/admin/roles/${encodeURIComponent(roleName)}/permissions`, {
      method: 'PUT',
      body: { permissions },
    }),
  banners: (position?: string) => request<Banner[]>('/admin/banners', { query: { position } }),
  createBanner: (body: BannerRequest) => request<Banner>('/admin/banners', { method: 'POST', body }),
  updateBanner: (id: string, body: BannerRequest) =>
    request<Banner>(`/admin/banners/${id}`, { method: 'PUT', body }),
  deleteBanner: (id: string) => request<unknown>(`/admin/banners/${id}`, { method: 'DELETE' }),
  testimonials: () => request<Testimonial[]>('/admin/testimonials'),
  createTestimonial: (body: TestimonialRequest) =>
    request<Testimonial>('/admin/testimonials', { method: 'POST', body }),
  updateTestimonial: (id: string, body: TestimonialRequest) =>
    request<Testimonial>(`/admin/testimonials/${id}`, { method: 'PUT', body }),
  deleteTestimonial: (id: string) => request<unknown>(`/admin/testimonials/${id}`, { method: 'DELETE' }),
  contactMessages: (query: Query = {}) => requestPaged<ContactMessage>('/admin/contact-messages', { query }),
  markContactRead: (id: string) => request<unknown>(`/admin/contact-messages/${id}/read`, { method: 'POST' }),
  deleteContactMessage: (id: string) =>
    request<unknown>(`/admin/contact-messages/${id}`, { method: 'DELETE' }),
  subscribers: (query: Query = {}) =>
    requestPaged<{ id: string; email: string; isActive: boolean; createdAt: string }>(
      '/admin/newsletter-subscribers',
      { query },
    ),
  deleteSubscriber: (id: string) =>
    request<unknown>(`/admin/newsletter-subscribers/${id}`, { method: 'DELETE' }),
  updateSettings: (body: Settings) => request<Settings>('/admin/settings', { method: 'PUT', body }),
  shippingMethods: () => request<ShippingMethod[]>('/admin/shipping-methods'),
  createShippingMethod: (body: ShippingMethodRequest) =>
    request<ShippingMethod>('/admin/shipping-methods', { method: 'POST', body }),
  updateShippingMethod: (id: string, body: ShippingMethodRequest) =>
    request<ShippingMethod>(`/admin/shipping-methods/${id}`, { method: 'PUT', body }),
  deleteShippingMethod: (id: string) =>
    request<unknown>(`/admin/shipping-methods/${id}`, { method: 'DELETE' }),
};

export const voucherApi = {
  wallet: () => request<VoucherWallet>('/vouchers/wallet'),
};

export const businessApi = {
  overview: () => request<BusinessOverview>('/admin/business/overview'),
  profile: () => request<OwnerProfile>('/admin/business/profile'),
  saveProfile: (body: OwnerProfileRequest) =>
    request<OwnerProfile>('/admin/business/profile', { method: 'PUT', body }),
  staff: (query: Query = {}) => requestPaged<StaffMember>('/admin/business/staff', { query }),
  staffMember: (id: string) => request<StaffMember>(`/admin/business/staff/${id}`),
  createStaff: (body: StaffRequest) => request<StaffMember>('/admin/business/staff', { method: 'POST', body }),
  updateStaff: (id: string, body: StaffRequest) =>
    request<StaffMember>(`/admin/business/staff/${id}`, { method: 'PUT', body }),
  deleteStaff: (id: string) => request<unknown>(`/admin/business/staff/${id}`, { method: 'DELETE' }),
  capital: (query: Query = {}) => requestPaged<CapitalEntry>('/admin/business/capital', { query }),
  createCapital: (body: CapitalEntryRequest) =>
    request<CapitalEntry>('/admin/business/capital', { method: 'POST', body }),
  updateCapital: (id: string, body: CapitalEntryRequest) =>
    request<CapitalEntry>(`/admin/business/capital/${id}`, { method: 'PUT', body }),
  deleteCapital: (id: string) => request<unknown>(`/admin/business/capital/${id}`, { method: 'DELETE' }),
  expenses: (query: Query = {}) => requestPaged<ExpenseEntry>('/admin/business/expenses', { query }),
  createExpense: (body: ExpenseEntryRequest) =>
    request<ExpenseEntry>('/admin/business/expenses', { method: 'POST', body }),
  updateExpense: (id: string, body: ExpenseEntryRequest) =>
    request<ExpenseEntry>(`/admin/business/expenses/${id}`, { method: 'PUT', body }),
  deleteExpense: (id: string) => request<unknown>(`/admin/business/expenses/${id}`, { method: 'DELETE' }),
  arrivals: (query: Query = {}) => requestPaged<StockArrival>('/admin/business/arrivals', { query }),
  createArrival: (body: StockArrivalRequest) =>
    request<StockArrival>('/admin/business/arrivals', { method: 'POST', body }),
  deleteArrival: (id: string) => request<unknown>(`/admin/business/arrivals/${id}`, { method: 'DELETE' }),
  purchases: (query: Query = {}) => requestPaged<StockPurchase>('/admin/business/purchases', { query }),
  createPurchase: (body: StockPurchaseRequest) =>
    request<StockPurchase>('/admin/business/purchases', { method: 'POST', body }),
  deletePurchase: (id: string) => request<unknown>(`/admin/business/purchases/${id}`, { method: 'DELETE' }),
  supplierReturns: (query: Query = {}) =>
    requestPaged<SupplierReturn>('/admin/business/supplier-returns', { query }),
  createSupplierReturn: (body: SupplierReturnRequest) =>
    request<SupplierReturn>('/admin/business/supplier-returns', { method: 'POST', body }),
  deleteSupplierReturn: (id: string) =>
    request<unknown>(`/admin/business/supplier-returns/${id}`, { method: 'DELETE' }),
  products: (search?: string) =>
    request<BusinessProductOption[]>('/admin/business/products', { query: { search } }),
  profitLoss: (query: { from?: string; to?: string; groupBy?: string }) =>
    request<ProfitLoss>('/admin/business/profit-loss', { query }),
  uploadDocument: async (file: File | { uri: string; name: string; type: string }, title: string, category: string) => {
    const form = new FormData();
    if (typeof File !== 'undefined' && file instanceof File) form.append('file', file);
    else form.append('file', file as any);
    form.append('title', title);
    form.append('category', category);
    return request<BusinessDocument>('/admin/business/documents', { method: 'POST', body: form });
  },
};

export const uploadsApi = {
  upload: (file: File | { uri: string; name: string; type: string }) => {
    const form = new FormData();
    if (typeof File !== 'undefined' && file instanceof File) form.append('file', file);
    else form.append('file', file as any);
    return request<UploadResult>('/uploads', { method: 'POST', body: form });
  },
};

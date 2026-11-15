export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success?: boolean;
  data: T;
  message?: string | null;
  pagination?: PaginationMeta | null;
  errors?: string[] | null;
}

export interface PagedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  role: string;
  permissions: string[];
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  street?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string | null;
  resetUrl?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  children: Category[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  imageUrl?: string | null;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  thumbnailUrl?: string | null;
  price: number;
  discountPrice?: number | null;
  effectivePrice: number;
  discountPercent: number;
  ratingAverage: number;
  reviewCount: number;
  stock: number;
  totalStock: number;
  soldCount: number;
  isFeatured: boolean;
  isActive: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
  brandId?: string | null;
  brandName?: string | null;
  tags: string[];
  createdAt: string;
}

export interface ProductDetail extends ProductSummary {
  costPrice: number;
  shortDescription?: string | null;
  description: string;
  images: string[];
  specifications: Record<string, string>;
  variants: ProductVariant[];
  relatedProducts: ProductSummary[];
  lowStockThreshold: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  updatedAt?: string | null;
}

export interface ProductQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  descending?: boolean;
  categoryId?: string;
  categorySlug?: string;
  brandId?: string;
  brandSlug?: string;
  minPrice?: number;
  maxPrice?: number;
  colors?: string[];
  sizes?: string[];
  minRating?: number;
  inStock?: boolean;
  onSale?: boolean;
  isFeatured?: boolean;
  includeInactive?: boolean;
}

export interface ProductVariantRequest {
  id?: string | null;
  name: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  imageUrl?: string | null;
}

export interface ProductRequest {
  name: string;
  sku: string;
  shortDescription?: string | null;
  description: string;
  categoryId: string;
  brandId?: string | null;
  price: number;
  costPrice: number;
  discountPrice?: number | null;
  stock: number;
  lowStockThreshold: number;
  images: string[];
  thumbnailUrl?: string | null;
  specifications: Record<string, string>;
  variants: ProductVariantRequest[];
  tags: string[];
  isFeatured: boolean;
  isActive: boolean;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface CategoryRequest {
  name: string;
  description?: string | null;
  parentId?: string | null;
  imageUrl?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface BrandRequest {
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string | null;
  userName: string;
  rating: number;
  title?: string | null;
  comment: string;
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  total: number;
  distribution: Record<string, number>;
}

export interface ReviewList {
  summary: ReviewSummary;
  reviews: Review[];
  pagination?: PaginationMeta | null;
}

export interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  colors: string[];
  sizes: string[];
  brands: Brand[];
  categories: Category[];
  ratings: number[];
}

export interface SearchSuggestion {
  products: ProductSummary[];
  categories: Category[];
  brands: Brand[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  productName: string;
  slug: string;
  variantName?: string | null;
  sku: string;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  stockAvailable: number;
  isAvailable: boolean;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  couponCode?: string | null;
  shipping: number;
  tax: number;
  total: number;
  itemCount: number;
  freeShippingThreshold: number;
  amountToFreeShipping: number;
}

export interface Cart {
  id?: string | null;
  guestId?: string | null;
  items: CartItem[];
  summary: CartSummary;
}

export interface WishlistItem {
  productId: string;
  product?: ProductSummary | null;
  addedAt: string;
}

export interface Wishlist {
  items: WishlistItem[];
}

export interface AddressInput {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Address extends AddressInput {
  id: string;
  isDefault: boolean;
}

export interface OrderItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  imageUrl?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderStatusHistory {
  status: string;
  note?: string | null;
  changedAt: string;
  changedBy?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  shippingAddress: AddressInput;
  billingAddress?: AddressInput | null;
  shippingMethodName: string;
  shippingCost: number;
  couponCode?: string | null;
  subtotal: number;
  discount: number;
  taxAmount: number;
  total: number;
  pointsRedeemed: number;
  pointsDiscount: number;
  pointsEarned: number;
  refundedAmount: number;
  refundMethod?: string | null;
  refundReference?: string | null;
  refundedAt?: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentTransactionId?: string | null;
  trackingNumber?: string | null;
  notes?: string | null;
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  shippedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  canCancel: boolean;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  itemCount: number;
  firstItemImage?: string | null;
  createdAt: string;
}

export interface OrderQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  descending?: boolean;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
}

export interface CheckoutRequest {
  shippingAddress: AddressInput;
  billingAddress?: AddressInput | null;
  shippingMethodId?: string | null;
  couponCode?: string | null;
  paymentMethod: string;
  notes?: string | null;
  guestEmail?: string | null;
  saveAddress: boolean;
  useVoucherPoints: boolean;
}

export interface OrderTracking {
  id?: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  total?: number;
  createdAt?: string;
  trackingNumber?: string | null;
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: string;
  value: number;
  minimumPurchase: number;
  maximumDiscount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  perUserLimit: number;
  usedCount: number;
  userIds: string[];
  isActive: boolean;
  isValid: boolean;
  createdAt: string;
}

export interface CouponRequest {
  code: string;
  description: string;
  type: string;
  value: number;
  minimumPurchase: number;
  maximumDiscount?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  usageLimit?: number | null;
  perUserLimit: number;
  userIds: string[];
  isActive: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  code?: string | null;
  discount: number;
  message?: string | null;
  coupon?: Coupon | null;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description?: string | null;
  cost: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  isDefault: boolean;
}

export interface ShippingMethodRequest {
  name: string;
  description?: string | null;
  cost: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  isActive: boolean;
  isDefault: boolean;
}

export interface MobileBankingOption {
  provider: string;
  accountNumber: string;
  instructions: string;
}

export interface CheckoutConfig {
  shippingMethods: ShippingMethod[];
  taxRate: number;
  freeShippingThreshold: number;
  flatShippingRate: number;
  enabledPaymentMethods: string[];
  mobileBanking: MobileBankingOption[];
  voucherPointsEnabled: boolean;
  voucherPointValue: number;
  voucherEarnPercent: number;
  voucherMaxRedeemPercent: number;
  currency: string;
  currencySymbol: string;
}

export interface PaymentInitiateResponse {
  orderId: string;
  paymentId: string;
  provider: string;
  transactionId?: string | null;
  redirectUrl?: string | null;
  clientSecret?: string | null;
  status: string;
}

export interface Payment {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  transactionId?: string | null;
  senderNumber?: string | null;
  failureReason?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export interface MobilePaymentSubmitRequest {
  orderId: string;
  provider: string;
  senderNumber: string;
  transactionId: string;
  guestEmail?: string | null;
}

export interface MenuItem {
  label: string;
  url: string;
  sortOrder: number;
}

export interface Settings {
  storeName: string;
  tagline?: string | null;
  logoUrl?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  currency: string;
  currencySymbol: string;
  taxRate: number;
  flatShippingRate: number;
  freeShippingThreshold: number;
  codEnabled: boolean;
  stripeEnabled: boolean;
  sslCommerzEnabled: boolean;
  bkashEnabled: boolean;
  bkashMerchantNumber?: string | null;
  nagadEnabled: boolean;
  nagadMerchantNumber?: string | null;
  rocketEnabled: boolean;
  rocketMerchantNumber?: string | null;
  voucherPointsEnabled: boolean;
  voucherPointValue: number;
  voucherEarnPercent: number;
  voucherMaxRedeemPercent: number;
  socialLinks: Record<string, string>;
  footerAbout?: string | null;
  copyrightText?: string | null;
  menuItems: MenuItem[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface BannerRequest {
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonText?: string | null;
  position: string;
  sortOrder: number;
  isActive: boolean;
  startAt?: string | null;
  endAt?: string | null;
}

export interface Testimonial {
  id: string;
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  rating: number;
  quote: string;
  isActive: boolean;
  sortOrder: number;
}

export interface TestimonialRequest {
  name: string;
  role?: string | null;
  avatarUrl?: string | null;
  rating: number;
  quote: string;
  isActive: boolean;
  sortOrder: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface HomeFeed {
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  featuredProducts: ProductSummary[];
  newArrivals: ProductSummary[];
  bestSellers: ProductSummary[];
  trendingProducts: ProductSummary[];
  deals: ProductSummary[];
  testimonials: Testimonial[];
  recentlyViewed: ProductSummary[];
  settings: Settings;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  lowStockProducts: number;
  revenueThisMonth: number;
  revenueToday: number;
  ordersToday: number;
}

export interface SalesPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string;
  name: string;
  thumbnailUrl?: string | null;
  soldCount: number;
  revenue: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  sku: string;
  stock: number;
  lowStockThreshold: number;
}

export interface CategorySales {
  categoryName: string;
  revenue: number;
  orders: number;
}

export interface Dashboard {
  stats: DashboardStats;
  salesChart: SalesPoint[];
  topProducts: TopProduct[];
  lowStockProducts: LowStockItem[];
  recentOrders: OrderSummary[];
  salesByCategory: CategorySales[];
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface UpdateCustomerRequest {
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  role?: string | null;
}

export interface InventoryVariant {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

export interface InventoryItem {
  productId: string;
  name: string;
  sku: string;
  categoryName?: string | null;
  stock: number;
  lowStockThreshold: number;
  totalStock: number;
  costPrice: number;
  status: string;
  variants: InventoryVariant[];
}

export interface StockAdjustmentRequest {
  quantityChange: number;
  variantId?: string | null;
  note?: string | null;
  type: string;
}

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  type: string;
  quantityChange: number;
  stockAfter: number;
  reference?: string | null;
  note?: string | null;
  createdBy?: string | null;
  createdAt: string;
}

export interface SalesReport {
  from: string;
  to: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
  points: SalesPoint[];
  topProducts: TopProduct[];
  byCategory: CategorySales[];
}

export interface OrderReport {
  from: string;
  to: string;
  totalOrders: number;
  totalValue: number;
  byStatus: Record<string, number>;
  points: SalesPoint[];
}

export interface AuditLog {
  id: string;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

export interface Permission {
  key: string;
  name: string;
  group: string;
  description: string;
}

export interface ReturnItemRequest {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export interface CreateReturnRequest {
  orderId: string;
  items: ReturnItemRequest[];
  reason: string;
  comment?: string | null;
  refundPreference: string;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
}

export interface ReturnItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  sku: string;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
  userId?: string | null;
  customerName: string;
  customerEmail: string;
  items: ReturnItem[];
  reason: string;
  comment?: string | null;
  refundPreference: string;
  refundAccountName?: string | null;
  refundAccountNumber?: string | null;
  refundBankName?: string | null;
  status: string;
  refundAmount: number;
  refundPoints: number;
  refundMethod?: string | null;
  refundReference?: string | null;
  adminNote?: string | null;
  processedAt?: string | null;
  processedBy?: string | null;
  createdAt: string;
}

export interface UpdateReturnStatusRequest {
  status: string;
  adminNote?: string | null;
  destination?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  bankName?: string | null;
  reference?: string | null;
}

export interface VoucherTransaction {
  id: string;
  points: number;
  balanceAfter: number;
  type: string;
  orderId?: string | null;
  orderNumber?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface VoucherWallet {
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  pointValue: number;
  earnPercent: number;
  enabled: boolean;
  transactions: VoucherTransaction[];
}

export interface BusinessDocument {
  id: string;
  title: string;
  category: string;
  url: string;
  fileName: string;
  size: number;
  contentType?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
}

export interface BusinessDocumentRequest {
  id?: string | null;
  title: string;
  category: string;
  url: string;
  fileName: string;
  size: number;
  contentType?: string | null;
}

export interface StaffMember {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: string;
  status: string;
  joinedOn: string;
  leftOn?: string | null;
  salary: number;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  documents: BusinessDocument[];
  createdAt: string;
  updatedAt?: string | null;
}

export interface StaffRequest {
  employeeCode?: string | null;
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  employmentType: string;
  status: string;
  joinedOn: string;
  leftOn?: string | null;
  salary: number;
  address?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  documents: BusinessDocumentRequest[];
}

export interface EmploymentHistory {
  company: string;
  role: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
}

export interface OwnerProfile {
  id: string;
  fullName: string;
  businessName: string;
  designation: string;
  email: string;
  phone: string;
  address?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  tinNumber?: string | null;
  binNumber?: string | null;
  bio?: string | null;
  employmentHistory: EmploymentHistory[];
  documents: BusinessDocument[];
  updatedAt?: string | null;
}

export interface OwnerProfileRequest {
  fullName: string;
  businessName: string;
  designation: string;
  email: string;
  phone: string;
  address?: string | null;
  dateOfBirth?: string | null;
  nationalId?: string | null;
  tinNumber?: string | null;
  binNumber?: string | null;
  bio?: string | null;
  employmentHistory: EmploymentHistory[];
  documents: BusinessDocumentRequest[];
}

export interface CapitalEntry {
  id: string;
  type: string;
  amount: number;
  source: string;
  paymentMethod: string;
  reference?: string | null;
  note?: string | null;
  entryDate: string;
  createdBy?: string | null;
  createdAt: string;
}

export interface CapitalEntryRequest {
  type: string;
  amount: number;
  source: string;
  paymentMethod: string;
  reference?: string | null;
  note?: string | null;
  entryDate: string;
}

export interface ExpenseEntry {
  id: string;
  category: string;
  title: string;
  amount: number;
  vendor?: string | null;
  paymentMethod: string;
  reference?: string | null;
  note?: string | null;
  expenseDate: string;
  isPaid: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface ExpenseEntryRequest {
  category: string;
  title: string;
  amount: number;
  vendor?: string | null;
  paymentMethod: string;
  reference?: string | null;
  note?: string | null;
  expenseDate: string;
  isPaid: boolean;
}

export interface StockArrival {
  id: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string | null;
  reference?: string | null;
  note?: string | null;
  arrivalDate: string;
  stockApplied: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface StockArrivalRequest {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitCost: number;
  supplier?: string | null;
  reference?: string | null;
  note?: string | null;
  arrivalDate: string;
}

export interface SupplierReturn {
  id: string;
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string | null;
  reference?: string | null;
  reason?: string | null;
  note?: string | null;
  returnDate: string;
  stockRemoved: boolean;
  createdBy?: string | null;
  createdAt: string;
}

export interface SupplierReturnRequest {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitCost: number;
  supplier?: string | null;
  reference?: string | null;
  reason?: string | null;
  note?: string | null;
  returnDate: string;
}

export interface StockPurchaseLine {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface StockPurchase {
  id: string;
  supplier?: string | null;
  reference?: string | null;
  note?: string | null;
  purchaseDate: string;
  stockApplied: boolean;
  totalQuantity: number;
  totalAmount: number;
  items: StockPurchaseLine[];
  createdBy?: string | null;
  createdAt: string;
}

export interface StockPurchaseLineRequest {
  productId: string;
  variantId?: string | null;
  quantity: number;
  unitCost: number;
}

export interface StockPurchaseRequest {
  supplier?: string | null;
  reference?: string | null;
  note?: string | null;
  purchaseDate: string;
  items: StockPurchaseLineRequest[];
}

export interface BusinessProductOption {
  id: string;
  name: string;
  sku: string;
  stock: number;
  totalStock: number;
  costPrice: number;
  thumbnailUrl?: string | null;
  variants: { id: string; name: string; sku: string; stock: number }[];
}

export interface ProfitLossPoint {
  period: string;
  label: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  orders: number;
  purchases: number;
  purchaseReturns: number;
}

export interface ProfitLoss {
  from: string;
  to: string;
  groupBy: string;
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  margin: number;
  orders: number;
  purchases: number;
  purchaseReturns: number;
  capitalIn: number;
  capitalOut: number;
  series: ProfitLossPoint[];
}

export interface BusinessFinancials {
  revenue: number;
  costOfGoods: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  margin: number;
  orders: number;
  purchases: number;
  purchaseReturns: number;
}

export interface BusinessOverview {
  today: BusinessFinancials;
  thisMonth: BusinessFinancials;
  lifetime: BusinessFinancials;
  capitalInvested: number;
  capitalWithdrawn: number;
  netCapital: number;
  totalPurchases: number;
  totalPurchaseReturns: number;
  inventoryValue: number;
  totalStaff: number;
  activeStaff: number;
  totalPaidOrders: number;
  lowStockCount: number;
  owner: OwnerProfile;
  monthlySeries: ProfitLossPoint[];
  recentArrivals: StockArrival[];
  recentSupplierReturns: SupplierReturn[];
  recentPurchases: StockPurchase[];
  recentExpenses: ExpenseEntry[];
  recentStaff: StaffMember[];
  staffByDepartment: { department: string; count: number; monthlySalary: number }[];
  lowStockProducts: LowStockItem[];
}

export interface UploadResult {
  url: string;
  fileName: string;
  size: number;
}

export const PERMISSIONS = {
  productsView: 'products.view',
  productsManage: 'products.manage',
  categoriesManage: 'categories.manage',
  brandsManage: 'brands.manage',
  ordersView: 'orders.view',
  ordersManage: 'orders.manage',
  customersView: 'customers.view',
  customersManage: 'customers.manage',
  inventoryManage: 'inventory.manage',
  couponsManage: 'coupons.manage',
  reviewsManage: 'reviews.manage',
  contentManage: 'content.manage',
  settingsManage: 'settings.manage',
  dashboardView: 'dashboard.view',
  reportsView: 'reports.view',
  businessView: 'business.view',
  businessManage: 'business.manage',
} as const;

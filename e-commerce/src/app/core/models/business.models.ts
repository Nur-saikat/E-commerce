import { LowStockItem, PagedQuery } from './api.models';

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

export interface StaffQuery extends PagedQuery {
  status?: string;
  department?: string;
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

export interface LedgerQuery extends PagedQuery {
  from?: string;
  to?: string;
  type?: string;
  category?: string;
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

export interface StockArrivalQuery extends PagedQuery {
  productId?: string;
  from?: string;
  to?: string;
}

export interface BusinessVariantOption {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

export interface BusinessProductOption {
  id: string;
  name: string;
  sku: string;
  stock: number;
  totalStock: number;
  costPrice: number;
  thumbnailUrl?: string | null;
  variants: BusinessVariantOption[];
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
}

export interface ProfitLossQuery {
  from?: string;
  to?: string;
  groupBy?: 'day' | 'month' | string;
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
}

export interface DepartmentBreakdown {
  department: string;
  count: number;
  monthlySalary: number;
}

export interface BusinessOverview {
  today: BusinessFinancials;
  thisMonth: BusinessFinancials;
  lifetime: BusinessFinancials;
  capitalInvested: number;
  capitalWithdrawn: number;
  netCapital: number;
  totalPurchases: number;
  inventoryValue: number;
  totalStaff: number;
  activeStaff: number;
  totalPaidOrders: number;
  lowStockCount: number;
  owner: OwnerProfile;
  monthlySeries: ProfitLossPoint[];
  recentArrivals: StockArrival[];
  recentExpenses: ExpenseEntry[];
  recentStaff: StaffMember[];
  staffByDepartment: DepartmentBreakdown[];
  lowStockProducts: LowStockItem[];
}

export const STAFF_STATUSES = ['Active', 'OnLeave', 'Resigned', 'Terminated'] as const;
export const EMPLOYMENT_TYPES = ['FullTime', 'PartTime', 'Contract', 'Intern'] as const;
export const DOCUMENT_CATEGORIES = ['CV', 'NID', 'Contract', 'Certificate', 'Other'] as const;
export const CAPITAL_TYPES = ['Investment', 'Withdrawal', 'Loan', 'LoanRepayment'] as const;
export const EXPENSE_CATEGORIES = [
  'Rent',
  'Salary',
  'Marketing',
  'Utilities',
  'Packaging',
  'Transport',
  'Software',
  'General'
] as const;

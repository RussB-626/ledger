// Shared TypeScript types for Ledger API
// All API payloads must be strictly typed per CLAUDE.md

// User entity
export interface User {
  id: number;
  name: string;
  currency_symbol: string;
  decimal_places: number;
  thousand_separator: string;
  decimal_separator: string;
  currency_position: 'before' | 'after';
  negative_format: string;
  negative_color: string;
  positive_color: string;
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_time: string;
  backup_day_of_week?: number;
  backup_day_of_month?: number;
  backup_count: number;
  last_backup_date?: string;
  created_at: string;
}

// Transaction types (W = Withdrawal, D = Deposit, TW = Transfer Withdraw, TD = Transfer Deposit)
export type TransactionType = 'W' | 'D' | 'TW' | 'TD';

// Transaction entity
export interface Transaction {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  account: string;
  category: string;
  description_id: number;
  description?: string; // Populated from descriptions table on response
  note: string | null;
  amount: number; // DECIMAL(12,2)
  type: TransactionType;
  pending: boolean;
  created_at: string;
}

// Group entity: Account groups per user
export interface Group {
  id: number;
  user_id: number;
  name: string;
  sort_order: number;
}

// Account entity
export interface Account {
  id: number;
  user_id: number;
  group_id: number;
  name: string;
  sort_order: number;
}

// Category entity with type and is_ignored flags
export interface Category {
  id: number;
  user_id: number;
  name: string;
  is_expense: boolean;
  is_income: boolean;
  is_transfer: boolean;
  is_ignored: boolean;
}

// Description entity
export interface Description {
  id: number;
  user_id: number;
  description: string;
  is_monthly: boolean;
  is_yearly: boolean;
}

// API Response format: all endpoints return { data?, error? }
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Page Data response: initial load with all reference data and current year transactions
export interface PageData {
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  groups: Group[];
  accounts: Account[];
  categories: Category[];
  txnDescriptions: Description[];
  balances: Record<string, number>; // e.g., { "Checking": 1234.56, "Savings": 5678.90 }
  years: number[];
  months: number[]; // Months with transactions in current year
}

// Category totals response: sum of transactions per category for a month
export interface CategoryTotals {
  expenses: Record<string, number>; // e.g., { "Food": 250.50, "Utilities": 125.00 }
  incomes: Record<string, number>; // e.g., { "Salary": 3000.00, "Bonus": 500.00 }
}

// Monthly difference response: (Income - Expenses) for a month
export interface MonthlyDifference {
  income: number;
  expenses: number;
  difference: number;
}

// Request/Response for creating or updating transactions
export interface CreateTransactionRequest {
  date: string; // YYYY-MM-DD
  account: string;
  category: string;
  description: string; // May be new; backend creates FK if needed
  note?: string | null;
  amount: number;
  type: TransactionType;
  pending?: boolean;
}

// Request for batch transaction creation (e.g., transfer pairs)
export interface BatchCreateTransactionsRequest {
  transactions: CreateTransactionRequest[];
}

// Request for updating transaction
export interface UpdateTransactionRequest {
  date?: string;
  account?: string;
  category?: string;
  description?: string;
  note?: string | null;
  amount?: number;
  type?: TransactionType;
  pending?: boolean;
}

// Request for creating/updating account
export interface CreateAccountRequest {
  name: string;
  group_id: number; // Required: account must belong to a group
}

export interface UpdateAccountRequest {
  name?: string;
  group_id?: number; // Optional: can move account to different group
}

// Request for creating group
export interface CreateGroupRequest {
  name: string;
}

// Request for updating group
export interface UpdateGroupRequest {
  name?: string;
}

// Request for reordering groups
export interface ReorderGroupsRequest {
  groups: Array<{ id: number; sort_order: number }>;
}

// Request for reordering accounts
export interface ReorderAccountsRequest {
  accounts: Array<{ id: number; sort_order: number }>;
}

// Request for creating/updating category
export interface CreateCategoryRequest {
  name: string;
  is_expense: boolean;
  is_income: boolean;
  is_transfer: boolean;
  is_ignored?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  is_expense?: boolean;
  is_income?: boolean;
  is_transfer?: boolean;
  is_ignored?: boolean;
}

// Request for creating/updating description
export interface CreateDescriptionRequest {
  description: string;
  is_monthly?: boolean;
  is_yearly?: boolean;
}

export interface UpdateDescriptionRequest {
  description?: string;
  is_monthly?: boolean;
  is_yearly?: boolean;
}

// Request for creating user
export interface CreateUserRequest {
  name: string;
}

// Database connection config
export interface DBConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  waitForConnections: boolean;
  connectionLimit: number;
  queueLimit: number;
}

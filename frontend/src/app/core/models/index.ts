// Core models and interfaces for the Ledger app
// All types are explicitly defined per CLAUDE.md

export type TransactionType = 'W' | 'D' | 'TW' | 'TD';

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
  theme: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  date: string; // YYYY-MM-DD
  account: string;
  category: string;
  description_id: number;
  description?: string; // Populated from backend
  note: string | null;
  amount: number;
  type: TransactionType;
  pending: boolean;
  created_at: string;
}

export interface Group {
  id: number;
  user_id: number;
  name: string;
  sort_order: number;
}

export interface Account {
  id: number;
  user_id: number;
  group_id: number;
  name: string;
  sort_order: number;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  is_expense: boolean;
  is_income: boolean;
  is_transfer: boolean;
  is_ignored: boolean;
}

export interface Description {
  id: number;
  user_id: number;
  description: string;
  is_monthly: boolean;
  is_yearly: boolean;
}

export interface PageData {
  transactions: Transaction[];
  pendingTransactions: Transaction[];
  groups: Group[];
  accounts: Account[];
  categories: Category[];
  txnDescriptions: Description[];
  balances: Record<string, number>;
  years: number[];
  months: number[];
}

export interface CategoryTotals {
  expenses: Record<string, number>;
  incomes: Record<string, number>;
}

export interface MonthlyDifference {
  income: number;
  expenses: number;
  difference: number;
}

export interface BackupSettings {
  backup_enabled: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_time: string;
  backup_day_of_week?: number;
  backup_day_of_month?: number;
  backup_count: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

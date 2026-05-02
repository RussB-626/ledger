// Core models and interfaces for the Checkbook Register app
// All types are explicitly defined per CLAUDE.md

export type TransactionType = 'W' | 'D' | 'TW' | 'TD';

export interface User {
  id: number;
  name: string;
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

export interface Account {
  id: number;
  user_id: number;
  name: string;
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
  is_common: boolean;
}

export interface PageData {
  transactions: Transaction[];
  pendingTransactions: Transaction[];
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

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

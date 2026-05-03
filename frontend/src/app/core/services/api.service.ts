// API service with HTTP client and interceptor
// Per CLAUDE.md: HTTP interceptor injects userId, all requests use { data, error } format

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  User,
  Transaction,
  Account,
  Category,
  Description,
  PageData,
  CategoryTotals,
  MonthlyDifference
} from '../models/index';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api';

  constructor(
    private http: HttpClient,
    private userService: UserService
  ) {}

  // ====== USERS ======

  getAllUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.baseUrl}/users`)
      .pipe(map(response => response.data || []));
  }

  createUser(name: string): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.baseUrl}/users`, { name })
      .pipe(map(response => response.data!));
  }

  deleteUser(userId: number): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/users/${userId}`)
      .pipe(map(response => response.data || { success: false }));
  }

  // ====== TRANSACTIONS ======

  getPageData(userId: number): Observable<PageData> {
    return this.http.get<ApiResponse<PageData>>(`${this.baseUrl}/users/${userId}/page-data`)
      .pipe(map(response => response.data!));
  }

  getTransactionsByYear(userId: number, year?: number): Observable<Transaction[]> {
    let params = new HttpParams();
    if (year !== undefined) {
      params = params.set('year', year.toString());
    }

    return this.http.get<ApiResponse<Transaction[]>>(
      `${this.baseUrl}/users/${userId}/transactions`,
      { params }
    ).pipe(map(response => response.data || []));
  }

  getPendingTransactions(userId: number): Observable<Transaction[]> {
    return this.http.get<ApiResponse<Transaction[]>>(
      `${this.baseUrl}/users/${userId}/transactions/pending`
    ).pipe(map(response => response.data || []));
  }

  createTransaction(userId: number, transaction: any): Observable<Transaction> {
    return this.http.post<ApiResponse<Transaction>>(
      `${this.baseUrl}/users/${userId}/transactions`,
      transaction
    ).pipe(map(response => response.data!));
  }

  createTransactionBatch(userId: number, transactions: any[]): Observable<Transaction[]> {
    return this.http.post<ApiResponse<Transaction[]>>(
      `${this.baseUrl}/users/${userId}/transactions/batch`,
      { transactions }
    ).pipe(map(response => response.data || []));
  }

  updateTransaction(userId: number, transactionId: number, updates: any): Observable<Transaction> {
    return this.http.put<ApiResponse<Transaction>>(
      `${this.baseUrl}/users/${userId}/transactions/${transactionId}`,
      updates
    ).pipe(map(response => response.data!));
  }

  deleteTransaction(userId: number, transactionId: number): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseUrl}/users/${userId}/transactions/${transactionId}`
    ).pipe(map(response => response.data || { success: false }));
  }

  // ====== ACCOUNTS ======

  getAccounts(userId: number): Observable<Account[]> {
    return this.http.get<ApiResponse<Account[]>>(`${this.baseUrl}/users/${userId}/accounts`)
      .pipe(map(response => response.data || []));
  }

  createAccount(userId: number, name: string): Observable<Account> {
    return this.http.post<ApiResponse<Account>>(
      `${this.baseUrl}/users/${userId}/accounts`,
      { name }
    ).pipe(map(response => response.data!));
  }

  updateAccount(userId: number, accountId: number, name: string): Observable<Account> {
    return this.http.put<ApiResponse<Account>>(
      `${this.baseUrl}/users/${userId}/accounts/${accountId}`,
      { name }
    ).pipe(map(response => response.data!));
  }

  deleteAccount(userId: number, accountId: number): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseUrl}/users/${userId}/accounts/${accountId}`
    ).pipe(map(response => response.data || { success: false }));
  }

  bulkCreateAccounts(userId: number, names: string[]): Observable<Account[]> {
    return this.http.post<ApiResponse<Account[]>>(
      `${this.baseUrl}/users/${userId}/accounts/bulk`,
      { names }
    ).pipe(map(response => response.data || []));
  }

  bulkCreateCategories(userId: number, names: string[], type: 'expense' | 'income' | 'transfer'): Observable<Category[]> {
    return this.http.post<ApiResponse<Category[]>>(
      `${this.baseUrl}/users/${userId}/categories/bulk`,
      { names, type }
    ).pipe(map(response => response.data || []));
  }

  // ====== CATEGORIES ======

  getCategories(userId: number, type?: string): Observable<Category[]> {
    let params = new HttpParams();
    if (type) {
      params = params.set('type', type);
    }

    return this.http.get<ApiResponse<Category[]>>(
      `${this.baseUrl}/users/${userId}/categories`,
      { params }
    ).pipe(map(response => response.data || []));
  }

  getCategoriesByType(userId: number, type: 'expense' | 'income' | 'transfer'): Observable<Category[]> {
    return this.getCategories(userId, type);
  }

  createCategory(userId: number, category: any): Observable<Category> {
    return this.http.post<ApiResponse<Category>>(
      `${this.baseUrl}/users/${userId}/categories`,
      category
    ).pipe(map(response => response.data!));
  }

  updateCategory(userId: number, categoryId: number, category: any): Observable<Category> {
    return this.http.put<ApiResponse<Category>>(
      `${this.baseUrl}/users/${userId}/categories/${categoryId}`,
      category
    ).pipe(map(response => response.data!));
  }

  deleteCategory(userId: number, categoryId: number): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseUrl}/users/${userId}/categories/${categoryId}`
    ).pipe(map(response => response.data || { success: false }));
  }

  // ====== DESCRIPTIONS ======

  getDescriptions(userId: number, common?: boolean): Observable<Description[]> {
    let params = new HttpParams();
    if (common) {
      params = params.set('common', 'true');
    }

    return this.http.get<ApiResponse<Description[]>>(
      `${this.baseUrl}/users/${userId}/txn-descriptions`,
      { params }
    ).pipe(map(response => response.data || []));
  }

  getCommonDescriptions(userId: number): Observable<Description[]> {
    return this.getDescriptions(userId, true);
  }

  createDescription(userId: number, description: any): Observable<Description> {
    return this.http.post<ApiResponse<Description>>(
      `${this.baseUrl}/users/${userId}/txn-descriptions`,
      description
    ).pipe(map(response => response.data!));
  }

  updateDescription(userId: number, descriptionId: number, description: any): Observable<Description> {
    return this.http.put<ApiResponse<Description>>(
      `${this.baseUrl}/users/${userId}/txn-descriptions/${descriptionId}`,
      description
    ).pipe(map(response => response.data!));
  }

  deleteDescription(userId: number, descriptionId: number): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(
      `${this.baseUrl}/users/${userId}/txn-descriptions/${descriptionId}`
    ).pipe(map(response => response.data || { success: false }));
  }

  bulkCreateDescriptions(userId: number, descriptions: string[], isCommon: boolean): Observable<Description[]> {
    return this.http.post<ApiResponse<Description[]>>(
      `${this.baseUrl}/users/${userId}/txn-descriptions/bulk`,
      { descriptions, is_common: isCommon }
    ).pipe(map(response => response.data || []));
  }

  // ====== ANALYTICS ======

  getCategoryTotals(userId: number, year: number, month: number): Observable<CategoryTotals> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<ApiResponse<CategoryTotals>>(
      `${this.baseUrl}/users/${userId}/categories`,
      { params }
    ).pipe(map(response => response.data!));
  }

  getMonthlyDifference(userId: number, year: number, month: number): Observable<MonthlyDifference> {
    const params = new HttpParams()
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<ApiResponse<MonthlyDifference>>(
      `${this.baseUrl}/users/${userId}/monthly-difference`,
      { params }
    ).pipe(map(response => response.data!));
  }
}

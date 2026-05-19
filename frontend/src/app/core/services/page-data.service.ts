// Page data service for managing application state
// Per CLAUDE.md: BehaviorSubject for state management, no NgRx

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { PageData, Transaction, Account, Category, Description, Group } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class PageDataService {
  private pageDataSubject = new BehaviorSubject<PageData | null>(null);
  pageData$: Observable<PageData | null> = this.pageDataSubject.asObservable();

  private transactionsSubject = new BehaviorSubject<Transaction[]>([]);
  transactions$: Observable<Transaction[]> = this.transactionsSubject.asObservable();

  private pendingTransactionsSubject = new BehaviorSubject<Transaction[]>([]);
  pendingTransactions$: Observable<Transaction[]> = this.pendingTransactionsSubject.asObservable();

  private groupsSubject = new BehaviorSubject<Group[]>([]);
  groups$: Observable<Group[]> = this.groupsSubject.asObservable();

  private accountsSubject = new BehaviorSubject<Account[]>([]);
  accounts$: Observable<Account[]> = this.accountsSubject.asObservable();

  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  categories$: Observable<Category[]> = this.categoriesSubject.asObservable();

  private descriptionsSubject = new BehaviorSubject<Description[]>([]);
  descriptions$: Observable<Description[]> = this.descriptionsSubject.asObservable();

  private balancesSubject = new BehaviorSubject<Record<string, number>>({});
  balances$: Observable<Record<string, number>> = this.balancesSubject.asObservable();

  private yearsSubject = new BehaviorSubject<number[]>([]);
  years$: Observable<number[]> = this.yearsSubject.asObservable();

  private monthsSubject = new BehaviorSubject<number[]>([]);
  months$: Observable<number[]> = this.monthsSubject.asObservable();

  private refreshSubject = new BehaviorSubject<void>(undefined);
  refresh$: Observable<void> = this.refreshSubject.asObservable();

  constructor() {}

  /**
   * Set the entire page data
   */
  setPageData(pageData: PageData): void {
    this.pageDataSubject.next(pageData);
    this.transactionsSubject.next(pageData.transactions);
    this.pendingTransactionsSubject.next(pageData.pendingTransactions);
    this.groupsSubject.next(pageData.groups);
    this.accountsSubject.next(pageData.accounts);
    this.categoriesSubject.next(pageData.categories);
    this.descriptionsSubject.next(pageData.txnDescriptions);
    this.balancesSubject.next(pageData.balances);
    this.yearsSubject.next(pageData.years);
    this.monthsSubject.next(pageData.months);
  }

  /**
   * Get page data synchronously
   */
  getPageDataSync(): PageData | null {
    return this.pageDataSubject.value;
  }

  /**
   * Set groups
   */
  setGroups(groups: Group[]): void {
    this.groupsSubject.next(groups);
  }

  /**
   * Get groups synchronously
   */
  getGroupsSync(): Group[] {
    return this.groupsSubject.value;
  }

  /**
   * Set transactions (for year changes)
   */
  setTransactions(transactions: Transaction[]): void {
    this.transactionsSubject.next(transactions);
  }

  /**
   * Get transactions synchronously
   */
  getTransactionsSync(): Transaction[] {
    return this.transactionsSubject.value;
  }

  /**
   * Update a single transaction in the state
   */
  updateTransaction(transaction: Transaction): void {
    const transactions = this.transactionsSubject.value;
    const index = transactions.findIndex(t => t.id === transaction.id);
    if (index >= 0) {
      transactions[index] = transaction;
      this.transactionsSubject.next([...transactions]);
    }
  }

  /**
   * Add a transaction to the state
   */
  addTransaction(transaction: Transaction): void {
    const transactions = this.transactionsSubject.value;
    this.transactionsSubject.next([transaction, ...transactions]);
  }

  /**
   * Remove a transaction from the state
   */
  removeTransaction(transactionId: number): void {
    const transactions = this.transactionsSubject.value.filter(t => t.id !== transactionId);
    this.transactionsSubject.next(transactions);
  }

  /**
   * Set pending transactions
   */
  setPendingTransactions(transactions: Transaction[]): void {
    this.pendingTransactionsSubject.next(transactions);
  }

  /**
   * Update pending transactions after removing pending flag
   */
  removePendingTransaction(transactionId: number): void {
    const pending = this.pendingTransactionsSubject.value.filter(t => t.id !== transactionId);
    this.pendingTransactionsSubject.next(pending);
  }

  /**
   * Set accounts
   */
  setAccounts(accounts: Account[]): void {
    this.accountsSubject.next(accounts);
  }

  /**
   * Get accounts synchronously
   */
  getAccountsSync(): Account[] {
    return this.accountsSubject.value;
  }

  /**
   * Set categories
   */
  setCategories(categories: Category[]): void {
    this.categoriesSubject.next(categories);
  }

  /**
   * Get categories synchronously
   */
  getCategoriesSync(): Category[] {
    return this.categoriesSubject.value;
  }

  /**
   * Set descriptions
   */
  setDescriptions(descriptions: Description[]): void {
    this.descriptionsSubject.next(descriptions);
  }

  /**
   * Get descriptions synchronously
   */
  getDescriptionsSync(): Description[] {
    return this.descriptionsSubject.value;
  }

  /**
   * Set balances
   */
  setBalances(balances: Record<string, number>): void {
    this.balancesSubject.next(balances);
  }

  /**
   * Get balances synchronously
   */
  getBalancesSync(): Record<string, number> {
    return this.balancesSubject.value;
  }

  /**
   * Clear all page data
   */
  clear(): void {
    this.pageDataSubject.next(null);
    this.transactionsSubject.next([]);
    this.pendingTransactionsSubject.next([]);
    this.groupsSubject.next([]);
    this.accountsSubject.next([]);
    this.categoriesSubject.next([]);
    this.descriptionsSubject.next([]);
    this.balancesSubject.next({});
    this.yearsSubject.next([]);
    this.monthsSubject.next([]);
  }

  /**
   * Trigger a refresh event (used after operations like backup restore)
   */
  refreshPageData(): void {
    this.refreshSubject.next(undefined);
  }
}

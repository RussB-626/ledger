import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { PageData, Transaction, User } from '../../../../core/models/index';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';
@Component({
  selector: 'app-account-pendings',
  templateUrl: './account-pendings.component.html',
  styleUrls: ['./account-pendings.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent]
})
export class AccountPendingsComponent implements OnInit, OnChanges, OnDestroy {
  @Input() pageData!: PageData;
  @Input() selectedAccountName: string | null = null;
  @Output() editTransaction = new EventEmitter<Transaction>();

  activeUser: User | null = null;
  searchTerm: string = '';

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];
  Math = Math;

  // Modal state
  showConfirmation = false;
  confirmationType: 'delete' | 'removePending' | null = null;
  transactionToConfirm: Transaction | null = null;

  // Mobile view
  isMobileView = false;
  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef,
    private breakpointObserver: BreakpointObserver
  ) {
    this.activeUser = this.userService.getActiveUser();
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 767px)'])
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        this.isMobileView = result.matches;
        this.cdr.markForCheck();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && this.pageData) {
      this.currentPage = 1;
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pendingTransactions(): Transaction[] {
    return this.pageData?.pendingTransactions || [];
  }

  get filteredPendingTransactions(): Transaction[] {
    let filtered = this.pendingTransactions;

    // Filter by selected account from parent (account card click)
    if (this.selectedAccountName) {
      filtered = filtered.filter(txn => txn.account === this.selectedAccountName);
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(txn =>
        txn.date.toLowerCase().includes(term) ||
        txn.account.toLowerCase().includes(term) ||
        txn.category.toLowerCase().includes(term) ||
        (txn.description?.toLowerCase() ?? '').includes(term) ||
        (txn.note?.toLowerCase() ?? '').includes(term) ||
        this.formatCurrency(txn.amount).toLowerCase().includes(term)
      );
    }

    // Sort by date in ascending order (YYYY-MM-DD format sorts correctly as strings)
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    return filtered;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  onEditTransaction(transaction: Transaction): void {
    this.editTransaction.emit(transaction);
  }

  removePending(transaction: Transaction): void {
    this.confirmationType = 'removePending';
    this.transactionToConfirm = transaction;
    this.showConfirmation = true;
  }

  private executeRemovePending(): void {
    if (!this.transactionToConfirm) return;

    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.apiService.updateTransaction(activeUser.id, this.transactionToConfirm.id, { pending: false }).subscribe({
      next: () => {
        // Refresh page data
        this.apiService.getPageData(activeUser.id).subscribe({
          next: (pageData) => {
            this.pageDataService.setPageData(pageData);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error refreshing page data:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error updating transaction:', error);
        alert('Failed to remove pending flag');
        this.cdr.markForCheck();
      }
    });
  }

  deleteTransaction(transactionId: number): void {
    const transaction = this.pendingTransactions.find(t => t.id === transactionId);
    if (!transaction) return;

    this.confirmationType = 'delete';
    this.transactionToConfirm = transaction;
    this.showConfirmation = true;
  }

  private executeDelete(): void {
    if (!this.transactionToConfirm) return;

    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.apiService.deleteTransaction(activeUser.id, this.transactionToConfirm.id).subscribe({
      next: () => {
        // Refresh page data
        this.apiService.getPageData(activeUser.id).subscribe({
          next: (pageData) => {
            this.pageDataService.setPageData(pageData);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Error refreshing page data:', error);
          }
        });
      },
      error: (error) => {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction');
        this.cdr.markForCheck();
      }
    });
  }

  formatCurrency(amount: number, type?: string): string {
    const user = this.userService.getActiveUser();
    if (!user) {
      return `$${amount.toFixed(2)}`;
    }

    const symbol = user.currency_symbol;
    const decimalPlaces = user.decimal_places;
    const thousandSep = user.thousand_separator;
    const decimalSep = user.decimal_separator;
    const currencyPos = user.currency_position;
    const negativeFormat = user.negative_format;

    const absAmount = Math.abs(amount);
    const isNegative = type ? (type === 'W' || type === 'TW') : amount < 0;

    const parts = absAmount.toFixed(decimalPlaces).split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    const formatted = decPart !== undefined ? `${withThousands}${decimalSep}${decPart}` : withThousands;
    const withCurrency = currencyPos === 'before'
      ? `${symbol}${formatted}`
      : `${formatted}${symbol}`;

    if (!isNegative) {
      return withCurrency;
    }

    return this.applyNegativeFormat(withCurrency, negativeFormat);
  }

  private applyNegativeFormat(value: string, format: string): string {
    switch (format) {
      case 'parentheses':
        return `(${value})`;
      case 'brackets':
        return `[${value}]`;
      case 'braces':
        return `{${value}}`;
      case '-prefix':
      default:
        return `-${value}`;
    }
  }

  formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  }

  truncateText(text: string | undefined | null, maxLength: number = 40): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredPendingTransactions.length / this.pageSize);
  }

  get paginatedPendingTransactions(): Transaction[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredPendingTransactions.slice(start, end);
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  onConfirmationConfirmed(): void {
    if (this.confirmationType === 'removePending') {
      this.executeRemovePending();
    } else if (this.confirmationType === 'delete') {
      this.executeDelete();
    }
    this.closeConfirmation();
  }

  onConfirmationClosed(): void {
    this.closeConfirmation();
  }

  private closeConfirmation(): void {
    this.showConfirmation = false;
    this.confirmationType = null;
    this.transactionToConfirm = null;
  }

  getConfirmationTitle(): string {
    return this.confirmationType === 'delete' ? 'Delete Transaction' : 'Remove Pending';
  }

  getConfirmationMessage(): string {
    return this.confirmationType === 'delete'
      ? 'Are you sure you want to delete this transaction?'
      : 'This removes the pending flag and finalizes the entry.';
  }

  getFilteredTotal(): number {
    return this.filteredPendingTransactions.reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      const signedAmount = (txn.type === 'W' || txn.type === 'TW') ? -amount : amount;
      return sum + (isNaN(signedAmount) ? 0 : signedAmount);
    }, 0);
  }

  isFilteredTotalNegative(): boolean {
    return this.getFilteredTotal() < 0;
  }

  mapTransactionType(type: string): string {
    const typeMap: Record<string, string> = {
      'W': 'Withdrawal',
      'D': 'Deposit',
      'TW': 'Transfer Out',
      'TD': 'Transfer In'
    };
    return typeMap[type] || type;
  }
}

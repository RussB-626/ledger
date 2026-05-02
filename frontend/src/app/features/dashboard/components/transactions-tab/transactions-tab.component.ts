// Transactions Tab component
// Per CLAUDE.md: Year selector, sortable/filterable table with Edit/Delete, pagination

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { PageData, Transaction } from '../../../../core/models/index';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-transactions-tab',
  templateUrl: './transactions-tab.component.html',
  styleUrls: ['./transactions-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent]
})
export class TransactionsTabComponent implements OnInit, OnChanges {
  @Input() pageData!: PageData;
  @Output() editTransaction = new EventEmitter<Transaction>();

  transactions: Transaction[] = [];
  selectedYear: number;
  selectedMonth: string = 'All';
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  loading = false;
  searchTerm: string = '';
  displayedColumns: string[] = ['date', 'account', 'category', 'description', 'amount', 'type', 'actions'];

  // Pagination properties
  currentPage = 1;
  pageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];
  Math = Math;

  // Modal state
  showDeleteConfirmation = false;
  showRemovePendingConfirmation = false;
  transactionToDelete: Transaction | null = null;
  transactionToRemovePending: Transaction | null = null;

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {
    this.selectedYear = new Date().getFullYear();
  }

  ngOnInit(): void {
    if (this.pageData) {
      this.updateTransactionsFromPageData();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && this.pageData) {
      this.updateTransactionsFromPageData();
    }
  }

  private updateTransactionsFromPageData(): void {
    if (this.pageData?.transactions) {
      this.transactions = this.pageData.transactions;
      this.currentPage = 1;
      this.cdr.markForCheck();
    }
  }

  onYearChange(year: number): void {
    this.selectedYear = year;
    this.selectedMonth = 'All';
    this.currentPage = 1;
    this.searchTerm = '';
    this.loadTransactions();
  }

  onMonthChange(): void {
    this.currentPage = 1;
  }

  onSearchChange(): void {
    this.currentPage = 1;
  }

  private loadTransactions(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.loading = true;
    this.apiService.getTransactionsByYear(activeUser.id, this.selectedYear).subscribe({
      next: (transactions) => {
        this.transactions = transactions;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading transactions:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onEditTransaction(transaction: Transaction): void {
    this.editTransaction.emit(transaction);
  }

  deleteTransaction(transactionId: number): void {
    const transaction = this.transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    this.transactionToDelete = transaction;
    this.showDeleteConfirmation = true;
  }

  private executeDelete(): void {
    if (!this.transactionToDelete) return;

    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.apiService.deleteTransaction(activeUser.id, this.transactionToDelete.id).subscribe({
      next: () => {
        // Refresh page data to update balances and other components
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
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US');
  }

  truncateText(text: string | undefined | null, maxLength: number = 20): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  get uniqueMonths(): number[] {
    const months = new Set<number>();
    this.transactions.forEach(txn => {
      const date = new Date(txn.date);
      months.add(date.getMonth() + 1);
    });
    return Array.from(months).sort((a, b) => a - b);
  }

  get filteredTransactions(): Transaction[] {
    let filtered = this.transactions;

    // Filter by selected month
    if (this.selectedMonth !== 'All') {
      const monthNum = parseInt(this.selectedMonth);
      filtered = filtered.filter(txn => {
        const date = new Date(txn.date);
        return date.getMonth() + 1 === monthNum;
      });
    }

    // Filter by search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(txn =>
        txn.date.toLowerCase().includes(term) ||
        txn.account.toLowerCase().includes(term) ||
        txn.category.toLowerCase().includes(term) ||
        (txn.description?.toLowerCase() ?? '').includes(term) ||
        this.formatCurrency(txn.amount).toLowerCase().includes(term)
      );
    }

    return filtered;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.pageSize);
  }

  get paginatedTransactions(): Transaction[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredTransactions.slice(start, end);
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

  onDeleteConfirmed(): void {
    this.executeDelete();
    this.closeDeleteConfirmation();
  }

  onDeleteClosed(): void {
    this.closeDeleteConfirmation();
  }

  private closeDeleteConfirmation(): void {
    this.showDeleteConfirmation = false;
    this.transactionToDelete = null;
  }

  removePending(transaction: Transaction): void {
    this.transactionToRemovePending = transaction;
    this.showRemovePendingConfirmation = true;
  }

  private executeRemovePending(): void {
    if (!this.transactionToRemovePending) return;

    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.apiService.updateTransaction(activeUser.id, this.transactionToRemovePending.id, { pending: false }).subscribe({
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

  onRemovePendingConfirmed(): void {
    this.executeRemovePending();
    this.closeRemovePendingConfirmation();
  }

  onRemovePendingClosed(): void {
    this.closeRemovePendingConfirmation();
  }

  private closeRemovePendingConfirmation(): void {
    this.showRemovePendingConfirmation = false;
    this.transactionToRemovePending = null;
  }
}

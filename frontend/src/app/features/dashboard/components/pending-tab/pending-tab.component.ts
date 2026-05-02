import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { PageData, Transaction } from '../../../../core/models/index';
import { ConfirmationModalComponent } from '../../../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-pending-tab',
  templateUrl: './pending-tab.component.html',
  styleUrls: ['./pending-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmationModalComponent]
})
export class PendingTabComponent implements OnChanges {
  @Input() pageData!: PageData;
  @Output() editTransaction = new EventEmitter<Transaction>();

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

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && this.pageData) {
      this.currentPage = 1;
      this.cdr.markForCheck();
    }
  }

  get pendingTransactions(): Transaction[] {
    return this.pageData?.pendingTransactions || [];
  }

  get filteredPendingTransactions(): Transaction[] {
    if (!this.searchTerm.trim()) {
      return this.pendingTransactions;
    }
    const term = this.searchTerm.toLowerCase();
    return this.pendingTransactions.filter(txn =>
      txn.date.toLowerCase().includes(term) ||
      txn.account.toLowerCase().includes(term) ||
      txn.category.toLowerCase().includes(term) ||
      (txn.description?.toLowerCase() ?? '').includes(term) ||
      this.formatCurrency(txn.amount).toLowerCase().includes(term)
    );
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US');
  }

  truncateText(text: string | undefined | null, maxLength: number = 20): string {
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
}

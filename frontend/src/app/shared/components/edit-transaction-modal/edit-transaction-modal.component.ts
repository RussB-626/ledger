import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { Account, Category, Description, Transaction, TransactionType } from '../../../core/models/index';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-edit-transaction-modal',
  templateUrl: './edit-transaction-modal.component.html',
  styleUrls: ['./edit-transaction-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ClickOutsideDirective]
})
export class EditTransactionModalComponent implements OnInit, OnChanges {
  @Input() transaction!: Transaction;
  @Output() closed = new EventEmitter<void>();
  @Output() transactionUpdated = new EventEmitter<void>();

  loading = false;
  error: string | null = null;

  date: string = '';
  account: string = '';
  category: string = '';
  type: TransactionType = 'W';
  description: string = '';
  amount: number = 0;
  note: string = '';
  pending: boolean = false;

  accounts: Account[] = [];
  categories: Category[] = [];
  descriptions: Description[] = [];

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadReferenceData();
    // Also populate if transaction was already provided at init time
    if (this.transaction) {
      this.populateFormFromTransaction();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['transaction']) {
      if (this.transaction) {
        // Load reference data and then populate
        this.loadReferenceData();
        this.populateFormFromTransaction();
      }
    }
  }

  private loadReferenceData(): void {
    const pageData = this.pageDataService.getPageDataSync();
    if (pageData) {
      this.accounts = pageData.accounts;
      this.categories = pageData.categories;
      this.descriptions = pageData.txnDescriptions;
    }
  }

  private populateFormFromTransaction(): void {
    if (!this.transaction) {
      console.warn('No transaction provided to edit modal');
      return;
    }

    // Convert ISO date format to YYYY-MM-DD format for date input
    let dateStr = '';
    if (this.transaction.date) {
      const dateObj = new Date(this.transaction.date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      dateStr = `${year}-${month}-${day}`;
    }

    this.date = dateStr;
    this.account = this.transaction.account || '';
    this.category = this.transaction.category || '';
    this.type = this.transaction.type || 'W';
    this.description = this.transaction.description || '';
    this.amount = typeof this.transaction.amount === 'string'
      ? parseFloat(this.transaction.amount)
      : this.transaction.amount || 0;
    this.note = this.transaction.note || '';
    this.pending = this.transaction.pending || false;

    this.cdr.markForCheck();
  }

  selectType(newType: TransactionType): void {
    this.type = newType;
    // Update category options based on type
    this.cdr.markForCheck();
  }

  getCategoriesByType(): Category[] {
    switch (this.type) {
      case 'W':
        return this.categories.filter(cat => cat.is_expense);
      case 'D':
        return this.categories.filter(cat => cat.is_income);
      case 'TW':
      case 'TD':
        return this.categories.filter(cat => cat.is_transfer);
      default:
        return [];
    }
  }

  getTypeLabel(type: TransactionType): string {
    switch (type) {
      case 'W':
        return 'Withdrawal';
      case 'D':
        return 'Deposit';
      case 'TW':
        return 'Transfer Out';
      case 'TD':
        return 'Transfer In';
      default:
        return '';
    }
  }

  submit(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) {
      this.error = 'No active user';
      return;
    }

    if (!this.validateForm()) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;

    const updateData = {
      date: this.date,
      account: this.account,
      category: this.category,
      type: this.type,
      description: this.description,
      note: this.note || null,
      amount: this.amount,
      pending: this.pending
    };

    this.apiService.updateTransaction(activeUser.id, this.transaction.id, updateData).subscribe({
      next: () => {
        this.loading = false;
        this.transactionUpdated.emit();
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Failed to update transaction';
        console.error('Error updating transaction:', error);
      }
    });
  }

  private validateForm(): boolean {
    return !!(
      this.date &&
      this.account &&
      this.category &&
      this.type &&
      this.description &&
      this.amount > 0
    );
  }

  close(): void {
    this.closed.emit();
  }
}

// Create Transaction Modal component
// Per CLAUDE.md: 3 tabs (Withdrawal/Deposit/Transfer), form fields as specified, description autocomplete

import { Component, EventEmitter, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { ApiService } from '../../../core/services/api.service';
import { UserService } from '../../../core/services/user.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { Account, Category, Description, TransactionType, Group } from '../../../core/models/index';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-create-transaction-modal',
  templateUrl: './create-transaction-modal.component.html',
  styleUrls: ['./create-transaction-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ClickOutsideDirective]
})
export class CreateTransactionModalComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();
  @Output() transactionCreated = new EventEmitter<void>();

  activeTab: 'withdrawal' | 'deposit' | 'transfer' = 'withdrawal';
  withdrawalForm!: FormGroup;
  depositForm!: FormGroup;
  transferForm!: FormGroup;
  loading = false;
  error: string | null = null;

  editingTransaction: any = null;

  groups: Group[] = [];
  accounts: Account[] = [];
  categories: Category[] = [];
  descriptions: Description[] = [];
  selectedGroup: Group | null = null;
  selectedTransferGroup: Group | null = null;

  filteredDescriptions$: Observable<string[]> | null = null;

  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadReferenceData();
    this.resetFormToActiveGroup();
  }

  setEditingTransaction(transaction: any): void {
    this.editingTransaction = transaction;
    this.loadReferenceData();
    this.populateFormsForEdit();
  }

  openForNewTransaction(): void {
    this.editingTransaction = null;
    this.activeTab = 'withdrawal';
    this.error = null;
    this.initializeForms();
    this.loadReferenceData();
    this.resetFormToActiveGroup();
  }

  private populateFormsForEdit(): void {
    if (!this.editingTransaction) return;

    const txn = this.editingTransaction;

    // Determine transaction type and populate appropriate form
    if (txn.type === 'W') {
      this.activeTab = 'withdrawal';
      this.withdrawalForm.patchValue({
        date: txn.date,
        account: txn.account,
        category: txn.category,
        description: txn.description,
        notes: txn.note || '',
        amount: txn.amount,
        pending: txn.pending || false
      });
    } else if (txn.type === 'D') {
      this.activeTab = 'deposit';
      this.depositForm.patchValue({
        date: txn.date,
        account: txn.account,
        category: txn.category,
        description: txn.description,
        notes: txn.note || '',
        amount: txn.amount,
        pending: txn.pending || false
      });
    } else if (txn.type === 'TW' || txn.type === 'TD') {
      this.activeTab = 'transfer';
      this.transferForm.patchValue({
        date: txn.date,
        fromAccount: txn.type === 'TW' ? txn.account : '',
        toAccount: txn.type === 'TD' ? txn.account : '',
        category: txn.category,
        description: txn.description,
        notes: txn.note || '',
        amount: txn.amount,
        pending: txn.pending || false
      });
    }
  }

  private initializeForms(): void {
    const today = this.getTodayString();

    // Withdrawal form (expense)
    this.withdrawalForm = this.fb.group({
      date: [today, Validators.required],
      account: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      notes: [''],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      pending: [false]
    });

    // Deposit form (income)
    this.depositForm = this.fb.group({
      date: [today, Validators.required],
      account: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      notes: [''],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      pending: [false]
    });

    // Transfer form
    this.transferForm = this.fb.group({
      date: [today, Validators.required],
      fromAccount: ['', Validators.required],
      toAccount: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      notes: [''],
      amount: ['', [Validators.required, Validators.min(0.01)]],
      pending: [false]
    });
  }

  private loadReferenceData(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) {
      this.error = 'No active user';
      return;
    }

    const pageData = this.pageDataService.getPageDataSync();
    if (pageData) {
      this.groups = pageData.groups || [];
      this.accounts = pageData.accounts;
      this.categories = pageData.categories;
      this.descriptions = pageData.txnDescriptions;
    }

    // Set initial group selections to active group
    const activeGroup = this.userService.getActiveGroupSync();
    if (activeGroup && this.groups.length > 0) {
      const matchingGroup = this.groups.find(g => g.id === activeGroup.id);
      if (matchingGroup) {
        this.selectedGroup = matchingGroup;
        this.selectedTransferGroup = matchingGroup;
      }
    }
  }

  private resetFormToActiveGroup(): void {
    const activeGroup = this.userService.getActiveGroupSync();
    if (activeGroup) {
      const matchingGroup = this.groups.find(g => g.id === activeGroup.id);
      if (matchingGroup) {
        this.selectedGroup = matchingGroup;
        this.selectedTransferGroup = matchingGroup;
      }
      this.cdr.markForCheck();
    }
  }

  getAccountsByType(type: 'all' | 'fromAccount' | 'toAccount' = 'all'): Account[] {
    let filtered = this.accounts;

    // Filter by selected group for withdrawal/deposit
    if (type === 'all' && this.selectedGroup) {
      filtered = filtered.filter(a => a.group_id === this.selectedGroup!.id);
    }

    if (type === 'toAccount' && this.selectedTransferGroup) {
      return filtered.filter(a => a.group_id === this.selectedTransferGroup!.id);
    }
    if (type === 'fromAccount' && this.selectedGroup) {
      return filtered.filter(a => a.group_id === this.selectedGroup!.id);
    }
    return filtered;
  }

  getCategoriesByType(categoryType: 'expense' | 'income' | 'transfer'): Category[] {
    return this.categories.filter(cat => {
      if (categoryType === 'expense') return cat.is_expense;
      if (categoryType === 'income') return cat.is_income;
      if (categoryType === 'transfer') return cat.is_transfer;
      return false;
    });
  }

  getDescriptionSuggestions(input: string): string[] {
    if (!input || input.length === 0) {
      return this.descriptions.map(d => d.description);
    }
    return this.descriptions
      .filter(d => d.description.toLowerCase().includes(input.toLowerCase()))
      .map(d => d.description);
  }

  setupDescriptionAutocomplete(formControlName: string): void {
    const form = this.getActiveForm();
    const control = form.get(formControlName);

    if (control) {
      this.filteredDescriptions$ = control.valueChanges.pipe(
        startWith(''),
        map((value: string) => this.getDescriptionSuggestions(value))
      );
    }
  }

  selectTab(tab: 'withdrawal' | 'deposit' | 'transfer'): void {
    this.activeTab = tab;
    this.error = null;
  }

  getActiveForm(): FormGroup {
    if (this.activeTab === 'withdrawal') return this.withdrawalForm;
    if (this.activeTab === 'deposit') return this.depositForm;
    return this.transferForm;
  }

  submit(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) {
      this.error = 'No active user';
      return;
    }

    const form = this.getActiveForm();
    if (!form.valid) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;

    if (this.editingTransaction) {
      if (this.activeTab === 'transfer') {
        this.updateTransfer(activeUser.id, form.value);
      } else {
        this.updateSingleTransaction(activeUser.id, form.value);
      }
    } else {
      if (this.activeTab === 'transfer') {
        this.submitTransfer(activeUser.id, form.value);
      } else {
        this.submitSingleTransaction(activeUser.id, form.value);
      }
    }
  }

  private submitSingleTransaction(userId: number, formValue: any): void {
    const transactionType: TransactionType = this.activeTab === 'withdrawal' ? 'W' : 'D';

    const transaction = {
      date: formValue.date,
      account: formValue.account,
      category: formValue.category,
      description: formValue.description,
      note: formValue.notes || null,
      amount: parseFloat(formValue.amount),
      type: transactionType,
      pending: formValue.pending || false
    };

    this.apiService.createTransaction(userId, transaction).subscribe({
      next: () => {
        this.loading = false;
        this.transactionCreated.emit();
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Failed to create transaction';
        console.error('Error creating transaction:', error);
      }
    });
  }

  private submitTransfer(userId: number, formValue: any): void {
    const transactions = [
      {
        date: formValue.date,
        account: formValue.fromAccount,
        category: formValue.category,
        description: formValue.description,
        note: formValue.notes || null,
        amount: parseFloat(formValue.amount),
        type: 'TW' as TransactionType,
        pending: formValue.pending || false
      },
      {
        date: formValue.date,
        account: formValue.toAccount,
        category: formValue.category,
        description: formValue.description,
        note: formValue.notes || null,
        amount: parseFloat(formValue.amount),
        type: 'TD' as TransactionType,
        pending: formValue.pending || false
      }
    ];

    this.apiService.createTransactionBatch(userId, transactions).subscribe({
      next: () => {
        this.loading = false;
        this.transactionCreated.emit();
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Failed to create transfer';
        console.error('Error creating transfer:', error);
      }
    });
  }

  private updateSingleTransaction(userId: number, formValue: any): void {
    const transactionType: TransactionType = this.activeTab === 'withdrawal' ? 'W' : 'D';

    const transaction = {
      date: formValue.date,
      account: formValue.account,
      category: formValue.category,
      description: formValue.description,
      note: formValue.notes || null,
      amount: parseFloat(formValue.amount),
      type: transactionType,
      pending: formValue.pending || false
    };

    this.apiService.updateTransaction(userId, this.editingTransaction.id, transaction).subscribe({
      next: () => {
        this.loading = false;
        this.transactionCreated.emit();
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Failed to update transaction';
        console.error('Error updating transaction:', error);
      }
    });
  }

  private updateTransfer(userId: number, formValue: any): void {
    const updateData = {
      date: formValue.date,
      category: formValue.category,
      description: formValue.description,
      note: formValue.notes || null,
      amount: parseFloat(formValue.amount),
      pending: formValue.pending || false
    };

    this.apiService.updateTransaction(userId, this.editingTransaction.id, updateData).subscribe({
      next: () => {
        this.loading = false;
        this.transactionCreated.emit();
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.error || 'Failed to update transfer';
        console.error('Error updating transfer:', error);
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  private getTodayString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

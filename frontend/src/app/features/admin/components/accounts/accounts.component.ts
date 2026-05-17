import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { Account, User } from '../../../../core/models/index';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  itemId?: number;
}

interface AccountModalData {
  name: string;
}

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AccountsComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  accounts: Account[] = [];
  itemsPerPage = 10;
  accountsPage = 1;
  searchAccounts = '';

  accountModal: ModalState = { isOpen: false, mode: 'create' };
  accountFormData: AccountModalData = { name: '' };

  bulkAddModal = { isOpen: false };
  bulkAccountsText = '';
  bulkAddError = '';
  bulkAddLoading = false;

  deleteConfirmation: {
    isOpen: boolean;
    itemId?: number;
    itemName?: string;
  } = {
    isOpen: false
  };

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadAccounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAccounts(): void {
    if (!this.activeUser) return;
    this.apiService.getAccounts(this.activeUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(accounts => {
        this.accounts = accounts;
        this.pageDataService.setAccounts(accounts);
        this.pageDataService.refreshPageData();
        this.cdr.markForCheck();
      });
  }

  openAccountModal(mode: 'create' | 'edit', account?: Account): void {
    this.accountModal = { isOpen: true, mode, itemId: account?.id };
    if (mode === 'edit' && account) {
      this.accountFormData = { name: account.name };
    } else {
      this.accountFormData = { name: '' };
    }
  }

  closeAccountModal(): void {
    this.accountModal = { isOpen: false, mode: 'create' };
    this.accountFormData = { name: '' };
  }

  saveAccount(): void {
    if (!this.activeUser || !this.accountFormData.name.trim()) return;

    if (this.accountModal.mode === 'create') {
      this.apiService
        .createAccount(this.activeUser.id, this.accountFormData.name)
        .subscribe(() => {
          this.closeAccountModal();
          this.loadAccounts();
        });
    } else if (this.accountModal.itemId) {
      this.apiService
        .updateAccount(this.activeUser.id, this.accountModal.itemId, this.accountFormData.name)
        .subscribe(() => {
          this.closeAccountModal();
          this.loadAccounts();
        });
    }
  }

  openBulkAddModal(): void {
    this.bulkAddModal = { isOpen: true };
    this.bulkAccountsText = '';
    this.bulkAddError = '';
    this.bulkAddLoading = false;
  }

  closeBulkAddModal(): void {
    this.bulkAddModal = { isOpen: false };
    this.bulkAccountsText = '';
    this.bulkAddError = '';
  }

  saveBulkAccounts(): void {
    if (!this.activeUser || !this.bulkAccountsText.trim()) {
      this.bulkAddError = 'Please paste account names';
      return;
    }

    const accountNames = this.bulkAccountsText
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (accountNames.length === 0) {
      this.bulkAddError = 'No valid account names found';
      return;
    }

    this.bulkAddLoading = true;
    this.bulkAddError = '';

    this.apiService.bulkCreateAccounts(this.activeUser.id, accountNames)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeBulkAddModal();
          this.loadAccounts();
          this.bulkAddLoading = false;
        },
        error: (error: unknown) => {
          this.bulkAddLoading = false;
          const err = error as { error?: { error?: string } };
          const errorMsg = err?.error?.error || 'Failed to add accounts';
          this.bulkAddError = errorMsg;
        }
      });
  }

  openDeleteConfirmation(itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false };
  }

  confirmDelete(): void {
    if (!this.activeUser || !this.deleteConfirmation.itemId) return;

    this.apiService.deleteAccount(this.activeUser.id, this.deleteConfirmation.itemId)
      .subscribe({
        next: () => {
          this.closeDeleteConfirmation();
          this.loadAccounts();
        },
        error: (error) => {
          this.closeDeleteConfirmation();
          const errorMsg = error?.error?.error || 'Failed to delete account';
          alert(errorMsg);
        }
      });
  }

  getFilteredAccounts(): Account[] {
    if (!this.searchAccounts.trim()) return this.accounts;
    const search = this.searchAccounts.toLowerCase();
    return this.accounts.filter(a => a.name.toLowerCase().includes(search));
  }

  getPaginatedAccounts(): Account[] {
    const filtered = this.getFilteredAccounts();
    const start = (this.accountsPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalPages(): number {
    return Math.ceil(this.getFilteredAccounts().length / this.itemsPerPage);
  }
}

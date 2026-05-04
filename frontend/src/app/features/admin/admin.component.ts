import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../core/services/user.service';
import { ApiService } from '../../core/services/api.service';
import { PageDataService } from '../../core/services/page-data.service';
import { User, Account, Category, Description } from '../../core/models/index';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  itemId?: number;
}

interface AccountModalData {
  name: string;
}

interface CategoryModalData {
  name: string;
  is_expense: boolean;
  is_income: boolean;
  is_transfer: boolean;
  is_ignored: boolean;
}

interface DescriptionModalData {
  description: string;
  is_common: boolean;
}

interface ParsedTransaction {
  date: string;
  account: string;
  category: string;
  categoryType: 'expense' | 'income' | 'transfer';
  description: string;
  notes: string;
  amount: number;
  type: 'D' | 'W' | 'TD' | 'TW';
  pending: boolean;
  originalDate: string;
  parseError?: string;
}

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminComponent implements OnInit, OnDestroy {
  activeUser: User | null = null;
  activeTab: 'accounts' | 'categories' | 'descriptions' | 'transactions' | 'other' | 'backups' = 'accounts';

  // Data arrays
  accounts: Account[] = [];
  categories: Category[] = [];
  descriptions: Description[] = [];

  // Pagination
  itemsPerPage = 10;
  accountsPage = 1;
  categoriesPage = 1;
  descriptionsPage = 1;

  // Search filters
  searchAccounts = '';
  searchCategories = '';
  searchDescriptions = '';

  // Money format preferences
  currencySymbol = '$';
  decimalPlaces = 2;
  thousandSeparator = ',';
  decimalSeparator = '.';
  currencyPosition: 'before' | 'after' = 'before';
  negativeFormat = '-prefix';
  negativeColor = '#ff6b6b';
  positiveColor = '#1dd1a1';
  currencySymbolOptions = ['$', '€', '£', '¥', '₹', 'USD', 'EUR'];
  decimalPlacesOptions = [2, 3];
  thousandSeparatorOptions = [',', '.', ' '];
  decimalSeparatorOptions = ['.', ','];
  currencyPositionOptions: Array<'before' | 'after'> = ['before', 'after'];
  negativeFormatOptions: Array<{ value: string; label: string }> = [
    { value: '-prefix', label: '-$1.00' },
    { value: 'parentheses', label: '($1.00)' },
    { value: 'brackets', label: '[$1.00]' },
    { value: 'braces', label: '{$1.00}' }
  ];

  // User deletion modal state
  showUserDeletionModal = false;
  availableUsers: User[] = [];
  newUserName = '';

  // Modal states
  accountModal: ModalState = { isOpen: false, mode: 'create' };
  accountFormData: AccountModalData = { name: '' };

  categoryModal: ModalState = { isOpen: false, mode: 'create' };
  categoryFormData: CategoryModalData = {
    name: '',
    is_expense: false,
    is_income: false,
    is_transfer: false,
    is_ignored: false
  };

  descriptionModal: ModalState = { isOpen: false, mode: 'create' };
  descriptionFormData: DescriptionModalData = { description: '', is_common: false };

  // Bulk add modal state
  bulkAddModal = { isOpen: false };
  bulkAccountsText = '';
  bulkAddError = '';
  bulkAddLoading = false;

  // Bulk add categories modal state
  bulkCategoryModal = { isOpen: false };
  bulkCategoriesText = '';
  bulkCategoryType: 'expense' | 'income' | 'transfer' = 'expense';
  bulkCategoryError = '';
  bulkCategoryLoading = false;

  // Bulk add descriptions modal state
  bulkDescriptionModal = { isOpen: false };
  bulkDescriptionsText = '';
  bulkDescriptionIsCommon = false;
  bulkDescriptionError = '';
  bulkDescriptionLoading = false;

  // Bulk upload transactions modal state
  bulkUploadModal = { isOpen: false };
  bulkUploadParsedData: ParsedTransaction[] = [];
  bulkUploadParsedDataWithErrors: ParsedTransaction[] = [];
  bulkUploadValidCount = 0;
  bulkUploadError = '';
  bulkUploadLoading = false;
  bulkUploadFileLoading = false;
  bulkUploadDateFormat = '';
  bulkUploadStatus = '';

  deleteConfirmation: {
    isOpen: boolean;
    type: 'user' | 'account' | 'category' | 'description' | null;
    itemId?: number;
    itemName?: string;
  } = {
    isOpen: false,
    type: null
  };

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userService.activeUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.activeUser = user;
        if (user) {
          this.loadMoneyFormatPreferences();
          this.loadAllData();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllData(): void {
    if (!this.activeUser) return;
    const userId = this.activeUser.id;

    forkJoin({
      accounts: this.apiService.getAccounts(userId),
      categories: this.apiService.getCategories(userId),
      descriptions: this.apiService.getDescriptions(userId)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.accounts = data.accounts;
        this.categories = data.categories;
        this.descriptions = data.descriptions;
        this.cdr.markForCheck();
      });
  }

  private refreshPageDataInDashboard(): void {
    if (!this.activeUser) return;
    this.apiService.getPageData(this.activeUser.id).subscribe(pageData => {
      this.pageDataService.setPageData(pageData);
    });
  }

  // ====== ACCOUNT OPERATIONS ======

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
          this.loadAllData();
          this.refreshPageDataInDashboard();
        });
    } else if (this.accountModal.itemId) {
      this.apiService
        .updateAccount(this.activeUser.id, this.accountModal.itemId, this.accountFormData.name)
        .subscribe(() => {
          this.closeAccountModal();
          this.loadAllData();
          this.refreshPageDataInDashboard();
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
          this.loadAllData();
          this.refreshPageDataInDashboard();
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

  openBulkCategoryModal(): void {
    this.bulkCategoryModal = { isOpen: true };
    this.bulkCategoriesText = '';
    this.bulkCategoryType = 'expense';
    this.bulkCategoryError = '';
    this.bulkCategoryLoading = false;
  }

  closeBulkCategoryModal(): void {
    this.bulkCategoryModal = { isOpen: false };
    this.bulkCategoriesText = '';
    this.bulkCategoryType = 'expense';
    this.bulkCategoryError = '';
  }

  saveBulkCategories(): void {
    if (!this.activeUser || !this.bulkCategoriesText.trim()) {
      this.bulkCategoryError = 'Please paste category names';
      return;
    }

    const categoryNames = this.bulkCategoriesText
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (categoryNames.length === 0) {
      this.bulkCategoryError = 'No valid category names found';
      return;
    }

    this.bulkCategoryLoading = true;
    this.bulkCategoryError = '';

    this.apiService.bulkCreateCategories(this.activeUser.id, categoryNames, this.bulkCategoryType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeBulkCategoryModal();
          this.loadAllData();
          this.refreshPageDataInDashboard();
          this.bulkCategoryLoading = false;
        },
        error: (error: unknown) => {
          this.bulkCategoryLoading = false;
          const err = error as { error?: { error?: string } };
          const errorMsg = err?.error?.error || 'Failed to add categories';
          this.bulkCategoryError = errorMsg;
        }
      });
  }

  openBulkDescriptionModal(): void {
    this.bulkDescriptionModal = { isOpen: true };
    this.bulkDescriptionsText = '';
    this.bulkDescriptionIsCommon = false;
    this.bulkDescriptionError = '';
    this.bulkDescriptionLoading = false;
  }

  closeBulkDescriptionModal(): void {
    this.bulkDescriptionModal = { isOpen: false };
    this.bulkDescriptionsText = '';
    this.bulkDescriptionIsCommon = false;
    this.bulkDescriptionError = '';
  }

  saveBulkDescriptions(): void {
    if (!this.activeUser || !this.bulkDescriptionsText.trim()) {
      this.bulkDescriptionError = 'Please paste description text';
      return;
    }

    const descriptions = this.bulkDescriptionsText
      .split(',')
      .map(desc => desc.trim())
      .filter(desc => desc.length > 0);

    if (descriptions.length === 0) {
      this.bulkDescriptionError = 'No valid descriptions found';
      return;
    }

    this.bulkDescriptionLoading = true;
    this.bulkDescriptionError = '';

    this.apiService.bulkCreateDescriptions(this.activeUser.id, descriptions, this.bulkDescriptionIsCommon)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeBulkDescriptionModal();
          this.loadAllData();
          this.refreshPageDataInDashboard();
          this.bulkDescriptionLoading = false;
        },
        error: (error: unknown) => {
          this.bulkDescriptionLoading = false;
          const err = error as { error?: { error?: string } };
          const errorMsg = err?.error?.error || 'Failed to add descriptions';
          this.bulkDescriptionError = errorMsg;
        }
      });
  }

  openDeleteConfirmation(type: 'user' | 'account' | 'category' | 'description', itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, type, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false, type: null };
  }

  confirmDelete(): void {
    if (!this.deleteConfirmation.type || !this.deleteConfirmation.itemId) return;

    const itemId = this.deleteConfirmation.itemId;
    const type = this.deleteConfirmation.type;

    let deleteCall;
    if (type === 'user') {
      deleteCall = this.apiService.deleteUser(itemId);
    } else if (type === 'account') {
      if (!this.activeUser) return;
      deleteCall = this.apiService.deleteAccount(this.activeUser.id, itemId);
    } else if (type === 'category') {
      if (!this.activeUser) return;
      deleteCall = this.apiService.deleteCategory(this.activeUser.id, itemId);
    } else {
      if (!this.activeUser) return;
      deleteCall = this.apiService.deleteDescription(this.activeUser.id, itemId);
    }

    deleteCall.subscribe({
      next: () => {
        this.closeDeleteConfirmation();

        if (type === 'user') {
          this.openUserDeletionModal();
        } else {
          this.loadAllData();
          if (this.activeUser) {
            this.refreshPageDataInDashboard();
          }
        }
      },
      error: (error) => {
        this.closeDeleteConfirmation();
        const errorMsg = error?.error?.error || 'Failed to delete item';
        alert(errorMsg);
      }
    });
  }


  // ====== CATEGORY OPERATIONS ======

  openCategoryModal(mode: 'create' | 'edit', category?: Category): void {
    this.categoryModal = { isOpen: true, mode, itemId: category?.id };
    if (mode === 'edit' && category) {
      this.categoryFormData = {
        name: category.name,
        is_expense: category.is_expense,
        is_income: category.is_income,
        is_transfer: category.is_transfer,
        is_ignored: category.is_ignored
      };
    } else {
      this.categoryFormData = {
        name: '',
        is_expense: false,
        is_income: false,
        is_transfer: false,
        is_ignored: false
      };
    }
  }

  closeCategoryModal(): void {
    this.categoryModal = { isOpen: false, mode: 'create' };
    this.categoryFormData = {
      name: '',
      is_expense: false,
      is_income: false,
      is_transfer: false,
      is_ignored: false
    };
  }

  saveCategory(): void {
    if (!this.activeUser || !this.categoryFormData.name.trim()) return;

    const payload = {
      name: this.categoryFormData.name,
      is_expense: this.categoryFormData.is_expense,
      is_income: this.categoryFormData.is_income,
      is_transfer: this.categoryFormData.is_transfer,
      is_ignored: this.categoryFormData.is_ignored
    };

    if (this.categoryModal.mode === 'create') {
      this.apiService.createCategory(this.activeUser.id, payload).subscribe(() => {
        this.closeCategoryModal();
        this.loadAllData();
        this.refreshPageDataInDashboard();
      });
    } else if (this.categoryModal.itemId) {
      this.apiService
        .updateCategory(this.activeUser.id, this.categoryModal.itemId, payload)
        .subscribe(() => {
          this.closeCategoryModal();
          this.loadAllData();
          this.refreshPageDataInDashboard();
        });
    }
  }

  // ====== DESCRIPTION OPERATIONS ======

  openDescriptionModal(mode: 'create' | 'edit', description?: Description): void {
    this.descriptionModal = { isOpen: true, mode, itemId: description?.id };
    if (mode === 'edit' && description) {
      this.descriptionFormData = {
        description: description.description,
        is_common: description.is_common
      };
    } else {
      this.descriptionFormData = { description: '', is_common: false };
    }
  }

  closeDescriptionModal(): void {
    this.descriptionModal = { isOpen: false, mode: 'create' };
    this.descriptionFormData = { description: '', is_common: false };
  }

  saveDescription(): void {
    if (!this.activeUser || !this.descriptionFormData.description.trim()) return;

    const payload = {
      description: this.descriptionFormData.description,
      is_common: this.descriptionFormData.is_common
    };

    if (this.descriptionModal.mode === 'create') {
      this.apiService.createDescription(this.activeUser.id, payload).subscribe(() => {
        this.closeDescriptionModal();
        this.loadAllData();
        this.refreshPageDataInDashboard();
      });
    } else if (this.descriptionModal.itemId) {
      this.apiService
        .updateDescription(this.activeUser.id, this.descriptionModal.itemId, payload)
        .subscribe(() => {
          this.closeDescriptionModal();
          this.loadAllData();
          this.refreshPageDataInDashboard();
        });
    }
  }

  // ====== BULK UPLOAD TRANSACTIONS ======

  openBulkUploadModal(): void {
    this.bulkUploadModal = { isOpen: true };
    this.bulkUploadParsedData = [];
    this.bulkUploadParsedDataWithErrors = [];
    this.bulkUploadValidCount = 0;
    this.bulkUploadError = '';
    this.bulkUploadLoading = false;
    this.bulkUploadDateFormat = '';
    this.bulkUploadStatus = '';
    (this as any).bulkUploadAllParsedData = [];
  }

  closeBulkUploadModal(): void {
    this.bulkUploadModal = { isOpen: false };
    this.bulkUploadParsedData = [];
    this.bulkUploadParsedDataWithErrors = [];
    this.bulkUploadValidCount = 0;
    this.bulkUploadError = '';
    this.bulkUploadLoading = false;
    this.bulkUploadDateFormat = '';
    this.bulkUploadStatus = '';
    (this as any).bulkUploadAllParsedData = [];
  }

  onBulkUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.bulkUploadFileLoading = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        this.bulkUploadError = '';
        this.bulkUploadStatus = '';

        this.bulkUploadParsedData = this.parseTsvFile(text);

        // Pre-compute filtered values for template
        this.bulkUploadParsedDataWithErrors = this.bulkUploadParsedData.filter(t => t.parseError);
        this.bulkUploadValidCount = this.bulkUploadParsedData.length - this.bulkUploadParsedDataWithErrors.length;

        // Keep only preview (first 10) + errors for display; keep all for upload
        const previewData = this.bulkUploadParsedData.slice(0, 10);
        const allData = this.bulkUploadParsedData;
        this.bulkUploadParsedData = previewData;
        // Store full data separately for upload
        (this as any).bulkUploadAllParsedData = allData;

        if (this.bulkUploadParsedData.length === 0) {
          this.bulkUploadError = 'No valid transactions found in file';
        }
      } catch (error) {
        this.bulkUploadError = `Failed to parse file: ${(error as Error).message}`;
        this.bulkUploadParsedData = [];
      } finally {
        this.bulkUploadFileLoading = false;
        this.cdr.markForCheck();
      }
    };
    reader.readAsText(file);
  }

  parseTsvFile(fileText: string): ParsedTransaction[] {
    const lines = fileText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const parsed: ParsedTransaction[] = [];

    // Extract all unique dates to detect format
    const dateStrings = lines.map(line => {
      const parts = line.split('\t');
      return parts[0]?.trim() || '';
    }).filter(d => d);

    const detectedFormat = this.detectDateFormat(dateStrings);

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 8) continue;

      const [dateStr, account, category, description, notes, amountStr, type, pendingStr] = parts.map(p => p.trim());

      // Parse date
      const dateResult = this.parseDate(dateStr, detectedFormat);
      if (!dateResult.success || !dateResult.date) {
        parsed.push({
          date: '',
          account,
          category,
          categoryType: this.inferCategoryType(type as 'D' | 'W' | 'TD' | 'TW'),
          description,
          notes,
          amount: 0,
          type: type as 'D' | 'W' | 'TD' | 'TW',
          pending: false,
          originalDate: dateStr,
          parseError: `Invalid date: ${dateStr}`
        });
        continue;
      }

      // Parse amount
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        parsed.push({
          date: dateResult.date,
          account,
          category,
          categoryType: this.inferCategoryType(type as 'D' | 'W' | 'TD' | 'TW'),
          description,
          notes,
          amount: 0,
          type: type as 'D' | 'W' | 'TD' | 'TW',
          pending: false,
          originalDate: dateStr,
          parseError: `Invalid amount: ${amountStr}`
        });
        continue;
      }

      // Parse pending flag
      const pending = pendingStr.toUpperCase() === 'TRUE';

      parsed.push({
        date: dateResult.date,
        account,
        category,
        categoryType: this.inferCategoryType(type as 'D' | 'W' | 'TD' | 'TW'),
        description,
        notes,
        amount,
        type: type as 'D' | 'W' | 'TD' | 'TW',
        pending,
        originalDate: dateStr
      });
    }

    this.bulkUploadDateFormat = detectedFormat;
    return parsed;
  }

  detectDateFormat(dateStrings: string[]): string {
    if (dateStrings.length === 0) return 'yyyy-mm-dd';

    // Infer from first date only for performance
    const firstDate = dateStrings[0];

    // Check yyyy-mm-dd pattern
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(firstDate)) {
      return 'yyyy-mm-dd';
    }

    // Check dd-mm-yyyy or mm-dd-yyyy pattern
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(firstDate)) {
      const parts = firstDate.split(/[-/]/);
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);

      if (first > 12) {
        return 'dd-mm-yyyy';
      } else if (second > 12) {
        return 'mm-dd-yyyy';
      } else {
        // Ambiguous - prefer dd-mm-yyyy as more common globally
        return 'dd-mm-yyyy';
      }
    }

    return 'yyyy-mm-dd';
  }

  parseDate(dateStr: string, format: string): { success: boolean; date?: string; error?: string } {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) {
      return { success: false, error: 'Invalid date format' };
    }

    let year: number, month: number, day: number;

    if (format === 'yyyy-mm-dd') {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else if (format === 'dd-mm-yyyy') {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      // mm-dd-yyyy
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    // Validate month and day ranges (no expensive Date object creation)
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { success: false, error: 'Invalid month or day' };
    }

    // Return as yyyy-mm-dd format
    const isoMonth = String(month).padStart(2, '0');
    const isoDay = String(day).padStart(2, '0');
    const isoDate = `${year}-${isoMonth}-${isoDay}`;

    return { success: true, date: isoDate };
  }

  private inferCategoryType(type: 'D' | 'W' | 'TD' | 'TW'): 'expense' | 'income' | 'transfer' {
    if (type === 'W' || type === 'TW') {
      return type === 'TW' ? 'transfer' : 'expense';
    } else if (type === 'D') {
      return 'income';
    } else {
      // TD
      return 'transfer';
    }
  }

  saveBulkUpload(): void {
    if (!this.activeUser) return;

    // Use the full data, not just the preview
    const allData = (this as any).bulkUploadAllParsedData as ParsedTransaction[] || this.bulkUploadParsedData;
    const transactionsToUpload = allData.filter((t: ParsedTransaction) => !t.parseError);

    if (transactionsToUpload.length === 0) {
      this.bulkUploadError = 'No valid transactions to upload. Please fix parsing errors.';
      return;
    }

    this.bulkUploadLoading = true;
    this.bulkUploadError = '';
    this.bulkUploadStatus = 'Uploading transactions...';

    this.apiService.bulkUploadTransactions(this.activeUser.id, transactionsToUpload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.bulkUploadLoading = false;
          this.bulkUploadStatus = 'Upload successful!';
          setTimeout(() => {
            this.closeBulkUploadModal();
            this.loadAllData();
            this.refreshPageDataInDashboard();
          }, 1500);
        },
        error: (error: unknown) => {
          this.bulkUploadLoading = false;
          const err = error as { error?: { error?: string } };
          const errorMsg = err?.error?.error || 'Failed to upload transactions';
          this.bulkUploadError = errorMsg;
          this.bulkUploadStatus = '';
        }
      });
  }

  // ====== NAVIGATION ======

  selectTab(tab: 'accounts' | 'categories' | 'descriptions' | 'transactions' | 'other' | 'backups'): void {
    this.activeTab = tab;
  }

  // Filter helpers
  getFilteredAccounts(): Account[] {
    if (!this.searchAccounts.trim()) return this.accounts;
    const search = this.searchAccounts.toLowerCase();
    return this.accounts.filter(a => a.name.toLowerCase().includes(search));
  }

  getFilteredCategories(): Category[] {
    if (!this.searchCategories.trim()) return this.categories;
    const search = this.searchCategories.toLowerCase();
    return this.categories.filter(c => c.name.toLowerCase().includes(search));
  }

  getFilteredDescriptions(): Description[] {
    if (!this.searchDescriptions.trim()) return this.descriptions;
    const search = this.searchDescriptions.toLowerCase();
    return this.descriptions.filter(d => d.description.toLowerCase().includes(search));
  }

  // Pagination helpers
  getPaginatedAccounts(): Account[] {
    const filtered = this.getFilteredAccounts();
    const start = (this.accountsPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalAccountsPages(): number {
    return Math.ceil(this.getFilteredAccounts().length / this.itemsPerPage);
  }

  getPaginatedCategories(): Category[] {
    const filtered = this.getFilteredCategories();
    const start = (this.categoriesPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalCategoriesPages(): number {
    return Math.ceil(this.getFilteredCategories().length / this.itemsPerPage);
  }

  getPaginatedDescriptions(): Description[] {
    const filtered = this.getFilteredDescriptions();
    const start = (this.descriptionsPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalDescriptionsPages(): number {
    return Math.ceil(this.getFilteredDescriptions().length / this.itemsPerPage);
  }

  deleteCurrentUser(): void {
    if (!this.activeUser) return;
    this.openDeleteConfirmation('user', this.activeUser.id, this.activeUser.name);
  }

  private openUserDeletionModal(): void {
    this.apiService.getAllUsers().subscribe(users => {
      this.availableUsers = users;
      // Update UserService so navbar dropdown shows current users
      this.userService.setAllUsers(users);
      this.showUserDeletionModal = true;
      this.newUserName = '';
      this.cdr.markForCheck();
    });
  }

  selectUserAndContinue(user: User): void {
    this.userService.setActiveUser(user);
    this.apiService.getPageData(user.id).subscribe({
      next: (pageData) => {
        this.pageDataService.setPageData(pageData);
        this.closeUserDeletionModal();
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('Failed to load page data:', error);
        this.closeUserDeletionModal();
        this.router.navigate(['/dashboard']);
      }
    });
  }

  createUserAndContinue(): void {
    if (!this.newUserName.trim()) {
      alert('Please enter a user name');
      return;
    }

    this.apiService.createUser(this.newUserName).subscribe({
      next: (user) => {
        const allUsers = this.userService.getAllUsersSync();
        this.userService.setAllUsers([...allUsers, user]);
        this.userService.setActiveUser(user);
        this.apiService.getPageData(user.id).subscribe({
          next: (pageData) => {
            this.pageDataService.setPageData(pageData);
            this.closeUserDeletionModal();
            this.router.navigate(['/dashboard']);
          },
          error: (error) => {
            console.error('Failed to load page data:', error);
            this.closeUserDeletionModal();
            this.router.navigate(['/dashboard']);
          }
        });
      },
      error: (error) => {
        const errorMsg = error?.error?.error || 'Failed to create user';
        alert(errorMsg);
      }
    });
  }

  closeUserDeletionModal(): void {
    this.showUserDeletionModal = false;
    this.availableUsers = [];
    this.newUserName = '';
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  loadMoneyFormatPreferences(): void {
    if (this.activeUser) {
      this.currencySymbol = this.activeUser.currency_symbol ?? '$';
      this.decimalPlaces = this.activeUser.decimal_places ?? 2;
      this.thousandSeparator = this.activeUser.thousand_separator ?? ',';
      this.decimalSeparator = this.activeUser.decimal_separator ?? '.';
      this.currencyPosition = this.activeUser.currency_position ?? 'before';
      this.negativeFormat = this.activeUser.negative_format ?? '-prefix';
      this.negativeColor = this.activeUser.negative_color ?? '#ff6b6b';
      this.positiveColor = this.activeUser.positive_color ?? '#1dd1a1';
    }
  }

  saveMoneyFormatPreferences(): void {
    if (!this.activeUser) return;

    this.apiService.updateUserPreferences(this.activeUser.id, {
      currency_symbol: this.currencySymbol,
      decimal_places: this.decimalPlaces,
      thousand_separator: this.thousandSeparator,
      decimal_separator: this.decimalSeparator,
      currency_position: this.currencyPosition,
      negative_format: this.negativeFormat,
      negative_color: this.negativeColor,
      positive_color: this.positiveColor
    }).subscribe({
      next: (updatedUser) => {
        this.activeUser = updatedUser;
        this.userService.setActiveUser(updatedUser);
      },
      error: (error) => {
        console.error('Failed to save money format preferences:', error);
        alert('Failed to save preferences');
      }
    });
  }
}

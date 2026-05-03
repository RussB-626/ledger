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

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminComponent implements OnInit, OnDestroy {
  activeUser: User | null = null;
  activeTab: 'accounts' | 'categories' | 'descriptions' = 'accounts';

  // Data arrays
  accounts: Account[] = [];
  categories: Category[] = [];
  descriptions: Description[] = [];

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

  // ====== NAVIGATION ======

  selectTab(tab: 'accounts' | 'categories' | 'descriptions'): void {
    this.activeTab = tab;
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
}

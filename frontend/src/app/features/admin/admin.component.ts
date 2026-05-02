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

  deleteConfirmation: {
    isOpen: boolean;
    type: 'account' | 'category' | 'description' | null;
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

  openDeleteConfirmation(type: 'account' | 'category' | 'description', itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, type, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false, type: null };
  }

  confirmDelete(): void {
    if (!this.activeUser || !this.deleteConfirmation.type || !this.deleteConfirmation.itemId) return;

    const userId = this.activeUser.id;
    const itemId = this.deleteConfirmation.itemId;
    const type = this.deleteConfirmation.type;

    let deleteCall;
    if (type === 'account') {
      deleteCall = this.apiService.deleteAccount(userId, itemId);
    } else if (type === 'category') {
      deleteCall = this.apiService.deleteCategory(userId, itemId);
    } else {
      deleteCall = this.apiService.deleteDescription(userId, itemId);
    }

    deleteCall.subscribe(() => {
      this.closeDeleteConfirmation();
      this.loadAllData();
      if (type === 'account' || type === 'category' || type === 'description') {
        this.refreshPageDataInDashboard();
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

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { Category, User } from '../../../../core/models/index';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  itemId?: number;
}

interface CategoryModalData {
  name: string;
  is_expense: boolean;
  is_income: boolean;
  is_transfer: boolean;
  is_ignored: boolean;
}

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CategoriesComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  categories: Category[] = [];
  itemsPerPage = 10;
  categoriesPage = 1;
  searchCategories = '';

  categoryModal: ModalState = { isOpen: false, mode: 'create' };
  categoryFormData: CategoryModalData = {
    name: '',
    is_expense: false,
    is_income: false,
    is_transfer: false,
    is_ignored: false
  };

  bulkCategoryModal = { isOpen: false };
  bulkCategoriesText = '';
  bulkCategoryType: 'expense' | 'income' | 'transfer' = 'expense';
  bulkCategoryError = '';
  bulkCategoryLoading = false;

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    if (!this.activeUser) return;
    this.apiService.getCategories(this.activeUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
        this.cdr.markForCheck();
      });
  }

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
        this.loadCategories();
      });
    } else if (this.categoryModal.itemId) {
      this.apiService
        .updateCategory(this.activeUser.id, this.categoryModal.itemId, payload)
        .subscribe(() => {
          this.closeCategoryModal();
          this.loadCategories();
        });
    }
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
          this.loadCategories();
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

  openDeleteConfirmation(itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false };
  }

  confirmDelete(): void {
    if (!this.activeUser || !this.deleteConfirmation.itemId) return;

    this.apiService.deleteCategory(this.activeUser.id, this.deleteConfirmation.itemId)
      .subscribe({
        next: () => {
          this.closeDeleteConfirmation();
          this.loadCategories();
        },
        error: (error) => {
          this.closeDeleteConfirmation();
          const errorMsg = error?.error?.error || 'Failed to delete category';
          alert(errorMsg);
        }
      });
  }

  getFilteredCategories(): Category[] {
    if (!this.searchCategories.trim()) return this.categories;
    const search = this.searchCategories.toLowerCase();
    return this.categories.filter(c => c.name.toLowerCase().includes(search));
  }

  getPaginatedCategories(): Category[] {
    const filtered = this.getFilteredCategories();
    const start = (this.categoriesPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalPages(): number {
    return Math.ceil(this.getFilteredCategories().length / this.itemsPerPage);
  }
}

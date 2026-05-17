import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { Description, User } from '../../../../core/models/index';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  itemId?: number;
}

interface DescriptionModalData {
  description: string;
  is_common: boolean;
}

@Component({
  selector: 'app-descriptions',
  templateUrl: './descriptions.component.html',
  styleUrls: ['./descriptions.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DescriptionsComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  descriptions: Description[] = [];
  itemsPerPage = 10;
  descriptionsPage = 1;
  searchDescriptions = '';

  descriptionModal: ModalState = { isOpen: false, mode: 'create' };
  descriptionFormData: DescriptionModalData = { description: '', is_common: false };

  bulkDescriptionModal = { isOpen: false };
  bulkDescriptionsText = '';
  bulkDescriptionIsCommon = false;
  bulkDescriptionError = '';
  bulkDescriptionLoading = false;

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
    this.loadDescriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDescriptions(): void {
    if (!this.activeUser) return;
    this.apiService.getDescriptions(this.activeUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(descriptions => {
        this.descriptions = descriptions;
        this.pageDataService.setDescriptions(descriptions);
        this.pageDataService.refreshPageData();
        this.cdr.markForCheck();
      });
  }

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
        this.loadDescriptions();
      });
    } else if (this.descriptionModal.itemId) {
      this.apiService
        .updateDescription(this.activeUser.id, this.descriptionModal.itemId, payload)
        .subscribe(() => {
          this.closeDescriptionModal();
          this.loadDescriptions();
        });
    }
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
          this.loadDescriptions();
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

  openDeleteConfirmation(itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false };
  }

  confirmDelete(): void {
    if (!this.activeUser || !this.deleteConfirmation.itemId) return;

    this.apiService.deleteDescription(this.activeUser.id, this.deleteConfirmation.itemId)
      .subscribe({
        next: () => {
          this.closeDeleteConfirmation();
          this.loadDescriptions();
        },
        error: (error) => {
          this.closeDeleteConfirmation();
          const errorMsg = error?.error?.error || 'Failed to delete description';
          alert(errorMsg);
        }
      });
  }

  getFilteredDescriptions(): Description[] {
    if (!this.searchDescriptions.trim()) return this.descriptions;
    const search = this.searchDescriptions.toLowerCase();
    return this.descriptions.filter(d => d.description.toLowerCase().includes(search));
  }

  getPaginatedDescriptions(): Description[] {
    const filtered = this.getFilteredDescriptions();
    const start = (this.descriptionsPage - 1) * this.itemsPerPage;
    return filtered.slice(start, start + this.itemsPerPage);
  }

  getTotalPages(): number {
    return Math.ceil(this.getFilteredDescriptions().length / this.itemsPerPage);
  }
}

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { Description, User, Group } from '../../../../core/models/index';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  itemId?: number;
}

interface DescriptionModalData {
  description: string;
  monthly_group_ids: number[];
  yearly_group_ids: number[];
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
  groups: Group[] = [];
  itemsPerPage = 10;
  descriptionsPage = 1;
  searchDescriptions = '';

  descriptionModal: ModalState = { isOpen: false, mode: 'create' };
  descriptionFormData: DescriptionModalData = { description: '', monthly_group_ids: [], yearly_group_ids: [] };

  bulkDescriptionModal = { isOpen: false };
  bulkDescriptionsText = '';
  bulkMonthlyGroupIds: number[] = [];
  bulkYearlyGroupIds: number[] = [];
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
    this.pageDataService.groups$
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => {
        this.groups = groups;
        this.cdr.markForCheck();
      });
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
        monthly_group_ids: description.monthly_group_ids,
        yearly_group_ids: description.yearly_group_ids
      };
    } else {
      this.descriptionFormData = { description: '', monthly_group_ids: [], yearly_group_ids: [] };
    }
  }

  closeDescriptionModal(): void {
    this.descriptionModal = { isOpen: false, mode: 'create' };
    this.descriptionFormData = { description: '', monthly_group_ids: [], yearly_group_ids: [] };
  }

  saveDescription(): void {
    if (!this.activeUser || !this.descriptionFormData.description.trim()) return;

    const payload = {
      description: this.descriptionFormData.description,
      monthly_group_ids: this.descriptionFormData.monthly_group_ids,
      yearly_group_ids: this.descriptionFormData.yearly_group_ids
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
    this.bulkMonthlyGroupIds = [];
    this.bulkYearlyGroupIds = [];
    this.bulkDescriptionError = '';
    this.bulkDescriptionLoading = false;
  }

  closeBulkDescriptionModal(): void {
    this.bulkDescriptionModal = { isOpen: false };
    this.bulkDescriptionsText = '';
    this.bulkMonthlyGroupIds = [];
    this.bulkYearlyGroupIds = [];
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

    this.apiService.bulkCreateDescriptions(this.activeUser.id, descriptions, this.bulkMonthlyGroupIds, this.bulkYearlyGroupIds)
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

  toggleMonthlyGroup(groupId: number): void {
    const index = this.descriptionFormData.monthly_group_ids.indexOf(groupId);
    if (index === -1) {
      this.descriptionFormData.monthly_group_ids.push(groupId);
    } else {
      this.descriptionFormData.monthly_group_ids.splice(index, 1);
    }
  }

  toggleYearlyGroup(groupId: number): void {
    const index = this.descriptionFormData.yearly_group_ids.indexOf(groupId);
    if (index === -1) {
      this.descriptionFormData.yearly_group_ids.push(groupId);
    } else {
      this.descriptionFormData.yearly_group_ids.splice(index, 1);
    }
  }

  toggleBulkMonthlyGroup(groupId: number): void {
    const index = this.bulkMonthlyGroupIds.indexOf(groupId);
    if (index === -1) {
      this.bulkMonthlyGroupIds.push(groupId);
    } else {
      this.bulkMonthlyGroupIds.splice(index, 1);
    }
  }

  toggleBulkYearlyGroup(groupId: number): void {
    const index = this.bulkYearlyGroupIds.indexOf(groupId);
    if (index === -1) {
      this.bulkYearlyGroupIds.push(groupId);
    } else {
      this.bulkYearlyGroupIds.splice(index, 1);
    }
  }

  isMonthlyGroupSelected(groupId: number): boolean {
    return this.descriptionFormData.monthly_group_ids.includes(groupId);
  }

  isYearlyGroupSelected(groupId: number): boolean {
    return this.descriptionFormData.yearly_group_ids.includes(groupId);
  }

  isBulkMonthlyGroupSelected(groupId: number): boolean {
    return this.bulkMonthlyGroupIds.includes(groupId);
  }

  isBulkYearlyGroupSelected(groupId: number): boolean {
    return this.bulkYearlyGroupIds.includes(groupId);
  }

  getMonthlyGroupNames(groupIds: number[]): string {
    const names = this.getGroupNamesList(groupIds);
    return this.truncateWithEllipsis(names, 20);
  }

  getYearlyGroupNames(groupIds: number[]): string {
    const names = this.getGroupNamesList(groupIds);
    return this.truncateWithEllipsis(names, 20);
  }

  getFullMonthlyGroupNames(groupIds: number[]): string {
    return this.getGroupNamesList(groupIds);
  }

  getFullYearlyGroupNames(groupIds: number[]): string {
    return this.getGroupNamesList(groupIds);
  }

  private getGroupNamesList(groupIds: number[]): string {
    return groupIds
      .map(id => this.groups.find(g => g.id === id)?.name)
      .filter((name): name is string => name !== undefined)
      .join(', ');
  }

  private truncateWithEllipsis(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }
}

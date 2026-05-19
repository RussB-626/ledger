import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { UserService } from '../../../../core/services/user.service';
import { Group, User } from '../../../../core/models/index';

interface ModalState {
  isOpen: boolean;
  mode: 'create' | 'edit';
  itemId?: number;
}

interface GroupModalData {
  name: string;
}

@Component({
  selector: 'app-groups',
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GroupsComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  groups: Group[] = [];
  groupModal: ModalState = { isOpen: false, mode: 'create' };
  groupFormData: GroupModalData = { name: '' };

  bulkAddModal = { isOpen: false };
  bulkGroupsText = '';
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
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadGroups(): void {
    if (!this.activeUser) return;
    this.apiService.getGroups(this.activeUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => {
        this.groups = groups;
        this.pageDataService.setGroups(groups);
        this.cdr.markForCheck();
      });
  }

  openGroupModal(mode: 'create' | 'edit', group?: Group): void {
    this.groupModal = { isOpen: true, mode, itemId: group?.id };
    if (mode === 'edit' && group) {
      this.groupFormData = { name: group.name };
    } else {
      this.groupFormData = { name: '' };
    }
  }

  closeGroupModal(): void {
    this.groupModal = { isOpen: false, mode: 'create' };
    this.groupFormData = { name: '' };
  }

  saveGroup(): void {
    if (!this.activeUser || !this.groupFormData.name.trim()) return;

    if (this.groupModal.mode === 'create') {
      this.apiService
        .createGroup(this.activeUser.id, this.groupFormData.name)
        .subscribe(() => {
          this.closeGroupModal();
          this.loadGroups();
        });
    } else if (this.groupModal.itemId) {
      this.apiService
        .updateGroup(this.activeUser.id, this.groupModal.itemId, this.groupFormData.name)
        .subscribe(() => {
          this.closeGroupModal();
          this.loadGroups();
        });
    }
  }

  openBulkAddModal(): void {
    this.bulkAddModal = { isOpen: true };
    this.bulkGroupsText = '';
    this.bulkAddError = '';
    this.bulkAddLoading = false;
  }

  closeBulkAddModal(): void {
    this.bulkAddModal = { isOpen: false };
    this.bulkGroupsText = '';
    this.bulkAddError = '';
  }

  saveBulkGroups(): void {
    if (!this.activeUser || !this.bulkGroupsText.trim()) {
      this.bulkAddError = 'Please enter group names';
      return;
    }

    const groupNames = this.bulkGroupsText
      .split('\n')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (groupNames.length === 0) {
      this.bulkAddError = 'No valid group names found';
      return;
    }

    this.bulkAddLoading = true;
    this.bulkAddError = '';

    // Create groups one by one (since there's no bulk group endpoint yet)
    let created = 0;
    const createGroupsSequentially = (index: number) => {
      if (index >= groupNames.length) {
        this.closeBulkAddModal();
        this.loadGroups();
        this.bulkAddLoading = false;
        return;
      }

      this.apiService.createGroup(this.activeUser!.id, groupNames[index])
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            created++;
            createGroupsSequentially(index + 1);
          },
          error: (error: unknown) => {
            this.bulkAddLoading = false;
            const err = error as { error?: { error?: string } };
            const errorMsg = err?.error?.error || `Failed to create group "${groupNames[index]}"`;
            this.bulkAddError = errorMsg;
          }
        });
    };

    createGroupsSequentially(0);
  }

  openDeleteConfirmation(itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false };
  }

  confirmDelete(): void {
    if (!this.activeUser || !this.deleteConfirmation.itemId) return;

    this.apiService.deleteGroup(this.activeUser.id, this.deleteConfirmation.itemId)
      .subscribe({
        next: () => {
          this.closeDeleteConfirmation();
          this.loadGroups();
          // Reset active group if deleted
          const activeGroup = this.userService.getActiveGroupSync();
          if (activeGroup?.id === this.deleteConfirmation.itemId) {
            const remainingGroups = this.groups.filter(g => g.id !== this.deleteConfirmation.itemId);
            if (remainingGroups.length > 0) {
              const firstGroup = remainingGroups.sort((a, b) => a.sort_order - b.sort_order)[0];
              this.userService.setActiveGroup(firstGroup);
            }
          }
        },
        error: (error) => {
          this.closeDeleteConfirmation();
          const errorMsg = error?.error?.error || 'Failed to delete group';
          alert(errorMsg);
        }
      });
  }

  moveGroupUp(group: Group): void {
    if (!this.activeUser) return;
    const index = this.groups.findIndex(g => g.id === group.id);
    if (index <= 0) return;

    const newGroups = [...this.groups];
    [newGroups[index], newGroups[index - 1]] = [newGroups[index - 1], newGroups[index]];

    const reorderData = newGroups.map((g, i) => ({ id: g.id, sort_order: i + 1 }));
    this.apiService.reorderGroups(this.activeUser.id, reorderData)
      .subscribe(() => {
        this.loadGroups();
      });
  }

  moveGroupDown(group: Group): void {
    if (!this.activeUser) return;
    const index = this.groups.findIndex(g => g.id === group.id);
    if (index >= this.groups.length - 1) return;

    const newGroups = [...this.groups];
    [newGroups[index], newGroups[index + 1]] = [newGroups[index + 1], newGroups[index]];

    const reorderData = newGroups.map((g, i) => ({ id: g.id, sort_order: i + 1 }));
    this.apiService.reorderGroups(this.activeUser.id, reorderData)
      .subscribe(() => {
        this.loadGroups();
      });
  }
}

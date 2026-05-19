// Sidenav component with user switcher and navigation
// Per CLAUDE.md: Sidenav with logo, Dashboard/Admin tabs, New Transaction button, User dropdown

import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { User, Group } from '../../../core/models/index';
import { CreateTransactionModalComponent } from '../create-transaction-modal/create-transaction-modal.component';
import { UserManagementPanelComponent } from '../user-management-panel/user-management-panel.component';
import { GroupManagementPanelComponent } from '../group-management-panel/group-management-panel.component';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  standalone: true,
  imports: [CommonModule, CreateTransactionModalComponent, UserManagementPanelComponent, GroupManagementPanelComponent]
})
export class SidenavComponent implements OnInit {
  @ViewChild(CreateTransactionModalComponent) createTransactionModal?: CreateTransactionModalComponent;

  activeUser$: Observable<User | null>;
  allUsers$: Observable<User[]>;
  activeGroup$: Observable<Group | null>;
  showCreateTransactionModal = false;
  userManagementPanelOpen = false;
  groupManagementPanelOpen = false;
  isExpanded = false;

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private router: Router
  ) {
    this.activeUser$ = this.userService.activeUser$;
    this.allUsers$ = this.userService.allUsers$;
    this.activeGroup$ = this.userService.activeGroup$;
  }

  ngOnInit(): void {
    this.updateBodyAttribute();
  }

  toggleSidenav(): void {
    this.isExpanded = !this.isExpanded;
    this.updateBodyAttribute();
  }

  private updateBodyAttribute(): void {
    document.body.setAttribute('data-sidenav-expanded', String(this.isExpanded));
  }

  openUserManagementPanel(): void {
    this.userManagementPanelOpen = true;
  }

  closeUserManagementPanel(): void {
    this.userManagementPanelOpen = false;
  }

  openGroupManagementPanel(): void {
    this.groupManagementPanelOpen = true;
  }

  closeGroupManagementPanel(): void {
    this.groupManagementPanelOpen = false;
  }

  openCreateTransactionModal(): void {
    this.showCreateTransactionModal = true;
    if (this.createTransactionModal) {
      this.createTransactionModal.openForNewTransaction();
    }
  }

  closeCreateTransactionModal(): void {
    this.showCreateTransactionModal = false;
  }

  onTransactionCreated(): void {
    // Refresh page data
    const activeUser = this.userService.getActiveUserSync();
    if (activeUser) {
      this.apiService.getPageData(activeUser.id).subscribe({
        next: (pageData) => {
          this.pageDataService.setPageData(pageData);
        },
        error: (error) => {
          console.error('Failed to refresh page data:', error);
        }
      });
    }
    this.closeCreateTransactionModal();
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  navigateToAdmin(): void {
    this.router.navigate(['/admin']);
  }

  isOnAdminPage(): boolean {
    return this.router.url.startsWith('/admin');
  }

  getActiveUserInitial(): string {
    const user = this.userService.getActiveUserSync();
    if (!user || !user.name) return '?';
    return user.name.charAt(0).toUpperCase();
  }

  getActiveGroupName(): string {
    const group = this.userService.getActiveGroupSync();
    if (!group || !group.name) return '?';
    return group.name.substring(0, 1).toUpperCase();
  }
}

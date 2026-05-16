// Sidenav component with user switcher and navigation
// Per CLAUDE.md: Sidenav with logo, Dashboard/Admin tabs, New Transaction button, User dropdown

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { User } from '../../../core/models/index';
import { CreateTransactionModalComponent } from '../create-transaction-modal/create-transaction-modal.component';
import { UserManagementPanelComponent } from '../user-management-panel/user-management-panel.component';

@Component({
  selector: 'app-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss'],
  standalone: true,
  imports: [CommonModule, CreateTransactionModalComponent, UserManagementPanelComponent]
})
export class SidenavComponent implements OnInit {
  activeUser$: Observable<User | null>;
  allUsers$: Observable<User[]>;
  showCreateTransactionModal = false;
  userManagementPanelOpen = false;

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private router: Router
  ) {
    this.activeUser$ = this.userService.activeUser$;
    this.allUsers$ = this.userService.allUsers$;
  }

  ngOnInit(): void {}

  openUserManagementPanel(): void {
    this.userManagementPanelOpen = true;
  }

  closeUserManagementPanel(): void {
    this.userManagementPanelOpen = false;
  }

  openCreateTransactionModal(): void {
    this.showCreateTransactionModal = true;
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
}

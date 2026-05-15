import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../core/services/user.service';
import { ApiService } from '../../core/services/api.service';
import { PageDataService } from '../../core/services/page-data.service';
import { User } from '../../core/models/index';
import { AccountsComponent } from './components/accounts/accounts.component';
import { CategoriesComponent } from './components/categories/categories.component';
import { DescriptionsComponent } from './components/descriptions/descriptions.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { MoneyComponent } from './components/money/money.component';
import { ThemesComponent } from './components/themes/themes.component';
import { BackupsComponent } from './components/backups/backups.component';
import { UserDeletionModalComponent } from './modals/user-deletion-modal/user-deletion-modal.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccountsComponent,
    CategoriesComponent,
    DescriptionsComponent,
    TransactionsComponent,
    MoneyComponent,
    ThemesComponent,
    BackupsComponent,
    UserDeletionModalComponent
  ]
})
export class AdminComponent implements OnInit, OnDestroy {
  activeUser: User | null = null;
  activeTab: 'accounts' | 'categories' | 'descriptions' | 'transactions' | 'other' | 'backups' | 'themes' = 'accounts';

  // User deletion modal state
  showUserDeletionModal = false;
  availableUsers: User[] = [];

  deleteConfirmation: {
    isOpen: boolean;
    type: 'user' | null;
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
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  selectTab(tab: 'accounts' | 'categories' | 'descriptions' | 'transactions' | 'other' | 'backups' | 'themes'): void {
    this.activeTab = tab;
  }

  deleteCurrentUser(): void {
    if (!this.activeUser) return;
    this.openDeleteConfirmation('user', this.activeUser.id, this.activeUser.name);
  }

  openDeleteConfirmation(type: 'user', itemId: number, itemName: string): void {
    this.deleteConfirmation = { isOpen: true, type, itemId, itemName };
  }

  closeDeleteConfirmation(): void {
    this.deleteConfirmation = { isOpen: false, type: null };
  }

  confirmDelete(): void {
    if (!this.deleteConfirmation.type || !this.deleteConfirmation.itemId) return;

    this.apiService.deleteUser(this.deleteConfirmation.itemId).subscribe({
      next: () => {
        this.closeDeleteConfirmation();
        this.openUserDeletionModal();
      },
      error: (error) => {
        this.closeDeleteConfirmation();
        const errorMsg = error?.error?.error || 'Failed to delete user';
        alert(errorMsg);
      }
    });
  }

  private openUserDeletionModal(): void {
    this.apiService.getAllUsers().subscribe(users => {
      this.availableUsers = users;
      this.userService.setAllUsers(users);
      this.showUserDeletionModal = true;
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

  createUserAndContinue(userName: string): void {
    if (!userName.trim()) {
      alert('Please enter a user name');
      return;
    }

    this.apiService.createUser(userName).subscribe({
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
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

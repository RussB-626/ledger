// Root app component
// Per CLAUDE.md: Strict TypeScript typing, all components typed with explicit interfaces

import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from './core/services/user.service';
import { ApiService } from './core/services/api.service';
import { PageDataService } from './core/services/page-data.service';
import { ThemeService } from './core/services/theme.service';
import { SharedModule } from './shared/shared.module';
import { User } from './core/models/index';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, SharedModule, FormsModule]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Checkbook Register';
  loading = true;
  showUserSelectionModal = false;
  hasExistingUsers = false;
  availableUsers: User[] = [];
  newUserName = '';
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private themeService: ThemeService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeApp();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeApp(): void {
    // Load all users
    this.apiService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.ngZone.run(() => {
          this.userService.setAllUsers(users);

          // Try to restore active user from localStorage
          const storedUserId = localStorage.getItem('checkbook_active_user_id');
          if (storedUserId) {
            const userId = parseInt(storedUserId, 10);
            const user = users.find(u => u.id === userId);
            if (user) {
              this.userService.setActiveUser(user);
              this.themeService.applyTheme(user.theme || 'default');
              this.loadPageData(userId);
            } else {
              // User was deleted, select first user
              if (users.length > 0) {
                this.userService.setActiveUser(users[0]);
                this.themeService.applyTheme(users[0].theme || 'default');
                this.loadPageData(users[0].id);
              } else {
                this.showUserCreationModal();
              }
            }
          } else {
            // No stored user, select first user
            if (users.length > 0) {
              this.userService.setActiveUser(users[0]);
              this.themeService.applyTheme(users[0].theme || 'default');
              this.loadPageData(users[0].id);
            } else {
              this.showUserCreationModal();
            }
          }
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Failed to load users:', error);
          this.loading = false;
          this.cdr.markForCheck();
        });
      }
    });
  }

  private loadPageData(userId: number): void {
    this.apiService.getPageData(userId).subscribe({
      next: (pageData) => {
        this.ngZone.run(() => {
          this.pageDataService.setPageData(pageData);
          this.loading = false;
          this.cdr.markForCheck();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          console.error('Failed to load page data:', error);
          this.loading = false;
          this.cdr.markForCheck();
        });
      }
    });
  }

  private showUserCreationModal(): void {
    this.showUserSelectionModal = true;
    this.loading = false;
    this.cdr.markForCheck();
  }

  createNewUserOnInit(): void {
    if (!this.newUserName.trim()) {
      alert('Please enter a user name');
      return;
    }

    this.apiService.createUser(this.newUserName).subscribe({
      next: (user) => {
        this.ngZone.run(() => {
          // Update all users list
          const allUsers = this.userService.getAllUsersSync();
          this.userService.setAllUsers([...allUsers, user]);

          this.userService.setActiveUser(user);
          this.themeService.applyTheme(user.theme || 'default');
          this.loadPageData(user.id);
          this.closeUserSelectionModal();
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
          const errorMsg = error?.error?.error || 'Failed to create user';
          alert(errorMsg);
        });
      }
    });
  }

  closeUserSelectionModal(): void {
    this.showUserSelectionModal = false;
    this.newUserName = '';
  }
}

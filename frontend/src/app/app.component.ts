// Root app component
// Per CLAUDE.md: Strict TypeScript typing, all components typed with explicit interfaces

import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, skip } from 'rxjs/operators';
import { UserService } from './core/services/user.service';
import { ApiService } from './core/services/api.service';
import { PageDataService } from './core/services/page-data.service';
import { ThemeService } from './core/services/theme.service';
import { SharedModule } from './shared/shared.module';
import { CreateNewUserComponent } from './shared/components/create-new-user/create-new-user.component';
import { User, Group } from './core/models/index';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, SharedModule, FormsModule, CreateNewUserComponent]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Ledger';
  loading = true;
  showUserSelectionModal = false;
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
    this.setupRefreshListener();
  }

  private setupRefreshListener(): void {
    this.pageDataService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const activeUser = this.userService.getActiveUserSync();
        if (activeUser) {
          this.loadPageData(activeUser.id);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeApp(): void {
    // Apply default theme immediately
    this.themeService.applyTheme('default');

    // Subscribe to user list changes to show modal if all users are deleted
    // Skip initial emission to avoid showing modal on page load
    this.userService.allUsers$
      .pipe(skip(1), takeUntil(this.destroy$))
      .subscribe((users: User[]) => {
        if (users.length === 0 && !this.showUserSelectionModal) {
          this.showUserSelectionModal = true;
          this.cdr.markForCheck();
        }
      });

    // Load all users
    this.apiService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.ngZone.run(() => {
          this.userService.setAllUsers(users);

          // Select first user
          if (users.length > 0) {
            this.userService.setActiveUser(users[0]);
            this.themeService.applyTheme(users[0].theme || 'default');
            this.loadPageData(users[0].id);
          } else {
            this.showUserCreationModal();
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

          // Initialize groups - select first group by sort_order
          const groups = pageData.groups || [];
          if (groups.length > 0) {
            this.pageDataService.setGroups(groups);

            const activeGroup = groups.sort((a, b) => a.sort_order - b.sort_order)[0];
            if (activeGroup) {
              this.userService.setActiveGroup(activeGroup);
            }
          }

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

  onInitialUserCreated(user: User): void {
    this.ngZone.run(() => {
      // Update all users list
      const allUsers = this.userService.getAllUsersSync();
      this.userService.setAllUsers([...allUsers, user]);

      this.userService.setActiveUser(user);
      this.themeService.applyTheme(user.theme || 'default');
      this.loadPageData(user.id);
      this.showUserSelectionModal = false;
    });
  }
}

// Root app component
// Per CLAUDE.md: Strict TypeScript typing, all components typed with explicit interfaces

import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from './core/services/user.service';
import { ApiService } from './core/services/api.service';
import { PageDataService } from './core/services/page-data.service';
import { SharedModule } from './shared/shared.module';
import { User } from './core/models/index';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterOutlet, SharedModule]
})
export class AppComponent implements OnInit {
  title = 'Checkbook Register';
  loading = true;

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initializeApp();
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
              this.loadPageData(userId);
            } else {
              // User was deleted, select first user
              if (users.length > 0) {
                this.userService.setActiveUser(users[0]);
                this.loadPageData(users[0].id);
              } else {
                this.loading = false;
                this.cdr.markForCheck();
              }
            }
          } else {
            // No stored user, select first user
            if (users.length > 0) {
              this.userService.setActiveUser(users[0]);
              this.loadPageData(users[0].id);
            } else {
              this.loading = false;
              this.cdr.markForCheck();
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
}

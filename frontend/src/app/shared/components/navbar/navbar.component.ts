// Navbar component with user switcher and navigation
// Per CLAUDE.md: Navbar with logo, Dashboard/Admin tabs, New Transaction button, User dropdown

import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { User } from '../../../core/models/index';
import { CreateTransactionModalComponent } from '../create-transaction-modal/create-transaction-modal.component';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CreateTransactionModalComponent, ClickOutsideDirective]
})
export class NavbarComponent implements OnInit {
  activeUser$: Observable<User | null>;
  allUsers$: Observable<User[]>;
  showUserDropdown = false;
  showCreateTransactionModal = false;
  showCreateUserModal = false;
  newUserName = '';

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

  toggleUserDropdown(): void {
    this.showUserDropdown = !this.showUserDropdown;
  }

  closeUserDropdown(): void {
    this.showUserDropdown = false;
  }

  switchUser(user: User): void {
    const activeUser = this.userService.getActiveUserSync();
    if (activeUser?.id === user.id) {
      this.closeUserDropdown();
      return;
    }

    this.userService.setActiveUser(user);
    this.pageDataService.clear();

    // Load page data for new user
    this.apiService.getPageData(user.id).subscribe({
      next: (pageData) => {
        this.pageDataService.setPageData(pageData);
        this.closeUserDropdown();

        // Navigate to dashboard if not already there
        if (!this.router.url.startsWith('/dashboard')) {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (error) => {
        console.error('Failed to load page data for user:', error);
      }
    });
  }

  openCreateUserModal(): void {
    this.closeUserDropdown();
    this.showCreateUserModal = true;
    this.newUserName = '';
  }

  createNewUserFromNavbar(): void {
    if (!this.newUserName.trim()) {
      alert('Please enter a user name');
      return;
    }

    this.apiService.createUser(this.newUserName).subscribe({
      next: (user: User) => {
        const allUsers = this.userService.getAllUsersSync();
        this.userService.setAllUsers([...allUsers, user]);
        this.switchUser(user);
        this.closeCreateUserModal();
      },
      error: (error) => {
        console.error('Failed to create user:', error);
        alert('Failed to create user');
      }
    });
  }

  closeCreateUserModal(): void {
    this.showCreateUserModal = false;
    this.newUserName = '';
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
}

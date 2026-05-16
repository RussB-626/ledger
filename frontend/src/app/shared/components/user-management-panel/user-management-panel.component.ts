import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { Router } from '@angular/router';
import { User } from '../../../core/models/index';
import { CreateNewUserComponent } from '../create-new-user/create-new-user.component';
import { DeleteUserModalComponent } from '../delete-user-modal/delete-user-modal.component';

@Component({
  selector: 'app-user-management-panel',
  templateUrl: './user-management-panel.component.html',
  styleUrls: ['./user-management-panel.component.scss'],
  standalone: true,
  imports: [CommonModule, CreateNewUserComponent, DeleteUserModalComponent]
})
export class UserManagementPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  activeUser$: Observable<User | null>;
  allUsers$: Observable<User[]>;
  showCreateUserModal = false;
  showDeleteUserModal = false;
  userToDelete: User | null = null;

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

  closePanel(): void {
    this.closed.emit();
  }

  switchUser(user: User): void {
    const activeUser = this.userService.getActiveUserSync();
    if (activeUser?.id === user.id) {
      this.closePanel();
      return;
    }

    this.userService.setActiveUser(user);
    this.pageDataService.clear();

    this.apiService.getPageData(user.id).subscribe({
      next: (pageData) => {
        this.pageDataService.setPageData(pageData);
        this.closePanel();

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
    this.showCreateUserModal = true;
  }

  closeCreateUserModal(): void {
    this.showCreateUserModal = false;
  }

  onUserCreated(user: User): void {
    const allUsers = this.userService.getAllUsersSync();
    this.userService.setAllUsers([...allUsers, user]);
    this.switchUser(user);
  }

  openDeleteUserModal(): void {
    const activeUser = this.userService.getActiveUserSync();
    this.userToDelete = activeUser;
    this.showDeleteUserModal = true;
  }

  closeDeleteUserModal(): void {
    this.showDeleteUserModal = false;
    this.userToDelete = null;
  }

  onUserDeleted(): void {
    if (!this.userToDelete) return;

    const allUsers = this.userService.getAllUsersSync();
    const updatedUsers = allUsers.filter(u => u.id !== this.userToDelete!.id);
    this.userService.setAllUsers(updatedUsers);

    const activeUser = this.userService.getActiveUserSync();
    if (activeUser?.id === this.userToDelete.id) {
      const firstRemainingUser = updatedUsers[0];
      if (firstRemainingUser) {
        this.switchUser(firstRemainingUser);
      } else {
        this.userService.clearActiveUser();
        this.pageDataService.clear();
        this.router.navigate(['/']);
      }
    }

    this.closeDeleteUserModal();
  }
}

// User management service
// Per CLAUDE.md: BehaviorSubject for state, localStorage persistence, no NgRx

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Group } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly USER_STORAGE_KEY = 'ledger_active_user_id';
  private readonly GROUP_STORAGE_KEY = 'ledger_active_group_id';

  private activeUserSubject = new BehaviorSubject<User | null>(null);
  activeUser$: Observable<User | null> = this.activeUserSubject.asObservable();

  private activeGroupSubject = new BehaviorSubject<Group | null>(null);
  activeGroup$: Observable<Group | null> = this.activeGroupSubject.asObservable();

  private allUsersSubject = new BehaviorSubject<User[]>([]);
  allUsers$: Observable<User[]> = this.allUsersSubject.asObservable();

  constructor() {
    this.loadActiveUserFromStorage();
    this.loadActiveGroupFromStorage();
  }

  /**
   * Set the currently active user
   */
  setActiveUser(user: User): void {
    this.activeUserSubject.next(user);
    localStorage.setItem(this.USER_STORAGE_KEY, user.id.toString());
  }

  /**
   * Get current active user synchronously
   */
  getActiveUserSync(): User | null {
    return this.activeUserSubject.value;
  }

  /**
   * Get current active user synchronously (alias for getActiveUserSync)
   */
  getActiveUser(): User | null {
    return this.activeUserSubject.value;
  }

  /**
   * Set the currently active group
   */
  setActiveGroup(group: Group): void {
    this.activeGroupSubject.next(group);
    localStorage.setItem(this.GROUP_STORAGE_KEY, group.id.toString());
  }

  /**
   * Get current active group synchronously
   */
  getActiveGroupSync(): Group | null {
    return this.activeGroupSubject.value;
  }

  /**
   * Set all available users
   */
  setAllUsers(users: User[]): void {
    this.allUsersSubject.next(users);
  }

  /**
   * Get all available users synchronously
   */
  getAllUsersSync(): User[] {
    return this.allUsersSubject.value;
  }

  /**
   * Load active user ID from localStorage
   */
  private loadActiveUserFromStorage(): void {
    const storedUserId = localStorage.getItem(this.USER_STORAGE_KEY);
    if (storedUserId) {
      const userId = parseInt(storedUserId, 10);
      // Will be set by the app initialization
      // The actual user object will be loaded via API
    }
  }

  /**
   * Load active group ID from localStorage
   */
  private loadActiveGroupFromStorage(): void {
    const storedGroupId = localStorage.getItem(this.GROUP_STORAGE_KEY);
    if (storedGroupId) {
      const groupId = parseInt(storedGroupId, 10);
      // Will be set by the app initialization
      // The actual group object will be loaded via API
    }
  }

  /**
   * Clear active user and group
   */
  clearActiveUser(): void {
    this.activeUserSubject.next(null);
    this.activeGroupSubject.next(null);
    localStorage.removeItem(this.USER_STORAGE_KEY);
    localStorage.removeItem(this.GROUP_STORAGE_KEY);
  }
}

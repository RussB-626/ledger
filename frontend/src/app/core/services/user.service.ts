// User management service
// Per CLAUDE.md: BehaviorSubject for state, localStorage persistence, no NgRx

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly STORAGE_KEY = 'checkbook_active_user_id';

  private activeUserSubject = new BehaviorSubject<User | null>(null);
  activeUser$: Observable<User | null> = this.activeUserSubject.asObservable();

  private allUsersSubject = new BehaviorSubject<User[]>([]);
  allUsers$: Observable<User[]> = this.allUsersSubject.asObservable();

  constructor() {
    this.loadActiveUserFromStorage();
  }

  /**
   * Set the currently active user
   */
  setActiveUser(user: User): void {
    this.activeUserSubject.next(user);
    localStorage.setItem(this.STORAGE_KEY, user.id.toString());
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
    const storedUserId = localStorage.getItem(this.STORAGE_KEY);
    if (storedUserId) {
      const userId = parseInt(storedUserId, 10);
      // Will be set by the app initialization
      // The actual user object will be loaded via API
    }
  }

  /**
   * Clear active user
   */
  clearActiveUser(): void {
    this.activeUserSubject.next(null);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

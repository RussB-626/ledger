// User management service
// Per CLAUDE.md: BehaviorSubject for state, no NgRx

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Group } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private activeUserSubject = new BehaviorSubject<User | null>(null);
  activeUser$: Observable<User | null> = this.activeUserSubject.asObservable();

  private activeGroupSubject = new BehaviorSubject<Group | null>(null);
  activeGroup$: Observable<Group | null> = this.activeGroupSubject.asObservable();

  private allUsersSubject = new BehaviorSubject<User[]>([]);
  allUsers$: Observable<User[]> = this.allUsersSubject.asObservable();

  constructor() {}

  /**
   * Set the currently active user
   */
  setActiveUser(user: User): void {
    this.activeUserSubject.next(user);
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
   * Clear active user and group
   */
  clearActiveUser(): void {
    this.activeUserSubject.next(null);
    this.activeGroupSubject.next(null);
  }
}

// Group management service
// Handles API calls for group CRUD operations

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Group, ApiResponse } from '../models/index';

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private apiUrl = '/api/users';

  constructor(private http: HttpClient) {}

  /**
   * Get all groups for a user
   */
  getGroups(userId: number): Observable<Group[]> {
    return this.http
      .get<ApiResponse<Group[]>>(`${this.apiUrl}/${userId}/groups`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Create a new group
   */
  createGroup(userId: number, name: string): Observable<Group> {
    return this.http
      .post<ApiResponse<Group>>(`${this.apiUrl}/${userId}/groups`, { name })
      .pipe(map(response => response.data!));
  }

  /**
   * Update group name
   */
  updateGroup(userId: number, groupId: number, name: string): Observable<Group> {
    return this.http
      .put<ApiResponse<Group>>(`${this.apiUrl}/${userId}/groups/${groupId}`, { name })
      .pipe(map(response => response.data!));
  }

  /**
   * Reorder groups (batch update sort_order)
   */
  reorderGroups(userId: number, groups: Array<{ id: number; sort_order: number }>): Observable<Group[]> {
    return this.http
      .put<ApiResponse<Group[]>>(`${this.apiUrl}/${userId}/groups/reorder/batch`, { groups })
      .pipe(map(response => response.data || []));
  }

  /**
   * Delete a group (cascades to accounts)
   */
  deleteGroup(userId: number, groupId: number): Observable<{ success: boolean }> {
    return this.http
      .delete<ApiResponse<{ success: boolean }>>(`${this.apiUrl}/${userId}/groups/${groupId}`)
      .pipe(map(response => response.data!));
  }
}

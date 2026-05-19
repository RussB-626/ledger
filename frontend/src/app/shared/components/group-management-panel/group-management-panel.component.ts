import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { UserService } from '../../../core/services/user.service';
import { PageDataService } from '../../../core/services/page-data.service';
import { ApiService } from '../../../core/services/api.service';
import { Group } from '../../../core/models/index';

@Component({
  selector: 'app-group-management-panel',
  templateUrl: './group-management-panel.component.html',
  styleUrls: ['./group-management-panel.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class GroupManagementPanelComponent implements OnInit {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  activeGroup$: Observable<Group | null>;
  groups$: Observable<Group[]>;

  constructor(
    private userService: UserService,
    private pageDataService: PageDataService,
    private apiService: ApiService
  ) {
    this.activeGroup$ = this.userService.activeGroup$;
    this.groups$ = this.pageDataService.groups$;
  }

  ngOnInit(): void {}

  closePanel(): void {
    this.closed.emit();
  }

  switchGroup(group: Group): void {
    const activeGroup = this.userService.getActiveGroupSync();
    if (activeGroup?.id === group.id) {
      this.closePanel();
      return;
    }

    this.userService.setActiveGroup(group);
    this.closePanel();
  }
}

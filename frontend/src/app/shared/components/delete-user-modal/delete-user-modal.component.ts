import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../core/models/index';

@Component({
  selector: 'app-delete-user-modal',
  templateUrl: './delete-user-modal.component.html',
  styleUrls: ['./delete-user-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective]
})
export class DeleteUserModalComponent implements OnInit {
  @Input() user: User | null = null;
  @Output() confirmed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  isDeleting = false;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {}

  onConfirm(): void {
    if (!this.user) return;

    this.isDeleting = true;
    this.apiService.deleteUser(this.user.id).subscribe({
      next: () => {
        this.confirmed.emit();
      },
      error: (error) => {
        console.error('Failed to delete user:', error);
        this.isDeleting = false;
      }
    });
  }

  onCancel(): void {
    this.closed.emit();
  }
}

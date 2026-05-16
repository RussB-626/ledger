import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { User } from '../../../core/models/index';

@Component({
  selector: 'app-create-new-user',
  templateUrl: './create-new-user.component.html',
  styleUrls: ['./create-new-user.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CreateNewUserComponent implements OnInit {
  @Input() isOpen = false;
  @Input() isRequired = false;
  @Output() closed = new EventEmitter<void>();
  @Output() userCreated = new EventEmitter<User>();

  newUserName = '';

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {}

  close(): void {
    if (this.isRequired) return;
    this.newUserName = '';
    this.closed.emit();
  }

  createUser(): void {
    if (!this.newUserName.trim()) {
      alert('Please enter a user name');
      return;
    }

    this.apiService.createUser(this.newUserName).subscribe({
      next: (user: User) => {
        this.userCreated.emit(user);
        this.newUserName = '';
        this.close();
      },
      error: (error) => {
        console.error('Failed to create user:', error);
        alert('Failed to create user');
      }
    });
  }
}

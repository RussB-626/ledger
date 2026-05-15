import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { User } from '../../../../core/models/index';

@Component({
  selector: 'app-user-deletion-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-deletion-modal.component.html',
  styleUrls: ['./user-deletion-modal.component.scss'],
})
export class UserDeletionModalComponent implements OnInit {
  @Input() show: boolean = false;
  @Input() availableUsers: User[] = [];
  @Output() userSelected = new EventEmitter<User>();
  @Output() userCreated = new EventEmitter<string>();

  newUserName: string = '';

  ngOnInit(): void {}

  selectUserAndContinue(user: User): void {
    this.userSelected.emit(user);
  }

  createUserAndContinue(): void {
    if (this.newUserName.trim()) {
      this.userCreated.emit(this.newUserName);
      this.newUserName = '';
    }
  }
}

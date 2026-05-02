import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ClickOutsideDirective]
})
export class ConfirmationModalComponent {
  @Input() title: string = 'Confirm';
  @Input() message: string = 'Are you sure?';
  @Output() confirmed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.closed.emit();
  }
}

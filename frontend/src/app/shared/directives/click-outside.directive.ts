// Click outside directive for closing dropdowns and modals
import { Directive, EventEmitter, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[clickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  @Output() clickOutside = new EventEmitter<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;

    if (!targetElement.closest('[clickOutside]')) {
      this.clickOutside.emit();
    }
  }
}

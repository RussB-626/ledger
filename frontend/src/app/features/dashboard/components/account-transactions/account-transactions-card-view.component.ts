import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../../../core/models/index';

@Component({
  selector: 'app-account-transactions-card-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './account-transactions-card-view.component.html',
  styleUrls: ['./account-transactions-card-view.component.scss']
})
export class AccountTransactionsCardViewComponent {
  @Input() transactions: Transaction[] = [];
  @Input() selectedYear: number = new Date().getFullYear();
  @Input() currentPage: number = 1;
  @Input() pageSize: number = 10;
  @Input() totalPages: number = 1;
  @Output() editTransaction = new EventEmitter<Transaction>();
  @Output() removePending = new EventEmitter<Transaction>();
  @Output() pageChanged = new EventEmitter<number>();
  @ViewChild('cardsContainer') cardsContainer!: ElementRef;

  onTransactionClick(transaction: Transaction): void {
    this.editTransaction.emit(transaction);
  }

  onRemovePending(event: Event, transaction: Transaction): void {
    event.stopPropagation();
    this.removePending.emit(transaction);
  }

  getTransactionTypeLabel(type: string): string {
    const typeMap: { [key: string]: string } = {
      'W': 'Withdrawal',
      'D': 'Deposit',
      'TW': 'Transfer Out',
      'TD': 'Transfer In'
    };
    return typeMap[type] || type;
  }

  getTypeClass(type: string): string {
    return `badge-${type.toLowerCase()}`;
  }

  formatAmount(amount: number): string {
    return Math.abs(amount).toFixed(2);
  }

  getAmountColor(amount: number): string {
    return amount < 0 ? '#ff4757' : '#2ed573';
  }

  formatDate(dateString: string): string {
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
  }

  truncateText(text: string | undefined | null, maxLength: number = 20): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  private scrollToTop(): void {
    if (this.cardsContainer) {
      this.cardsContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.scrollToTop();
      this.pageChanged.emit(page);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.scrollToTop();
      this.pageChanged.emit(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.scrollToTop();
      this.pageChanged.emit(this.currentPage - 1);
    }
  }

  firstPage(): void {
    this.scrollToTop();
    this.pageChanged.emit(1);
  }

  lastPage(): void {
    this.scrollToTop();
    this.pageChanged.emit(this.totalPages);
  }
}

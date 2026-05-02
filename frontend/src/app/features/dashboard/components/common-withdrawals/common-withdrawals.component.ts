import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageData, Transaction } from '../../../../core/models/index';

@Component({
  selector: 'app-common-withdrawals',
  templateUrl: './common-withdrawals.component.html',
  styleUrls: ['./common-withdrawals.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CommonWithdrawalsComponent implements OnChanges {
  @Input() pageData!: PageData;

  selectedYear: number;
  selectedMonth: number;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  constructor() {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && this.pageData) {
      // Page data updated, filtering will happen through getter
    }
  }

  get commonDescriptions() {
    return this.pageData?.txnDescriptions.filter(d => d.is_common) || [];
  }

  private getTransactionsForMonth(year: number, month: number, descriptionText: string): Transaction[] {
    if (!this.pageData?.transactions) return [];

    return this.pageData.transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      return txn.description === descriptionText &&
             txnDate.getFullYear() === year &&
             txnDate.getMonth() + 1 === month;
    });
  }

  getPriorMonthTotal(descriptionText: string): number {
    let priorMonth = this.selectedMonth - 1;
    let priorYear = this.selectedYear;

    if (priorMonth < 1) {
      priorMonth = 12;
      priorYear--;
    }

    const txns = this.getTransactionsForMonth(priorYear, priorMonth, descriptionText);
    return txns.reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getCurrentMonthTotal(descriptionText: string): number {
    const txns = this.getTransactionsForMonth(this.selectedYear, this.selectedMonth, descriptionText);
    return txns.reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getYearTotal(descriptionText: string): number {
    if (!this.pageData?.transactions) return 0;

    return this.pageData.transactions.filter(txn => {
      const txnDate = new Date(txn.date);
      return txn.description === descriptionText &&
             txnDate.getFullYear() === this.selectedYear;
    }).reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  getPriorMonthName(): string {
    let priorMonth = this.selectedMonth - 1;
    if (priorMonth < 1) {
      priorMonth = 12;
    }
    return this.monthNames[priorMonth - 1];
  }

  onYearOrMonthChange(): void {
    // Filtering happens through the getters
  }
}

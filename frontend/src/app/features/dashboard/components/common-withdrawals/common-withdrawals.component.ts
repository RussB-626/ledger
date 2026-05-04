import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageData, Transaction } from '../../../../core/models/index';
import { UserService } from '../../../../core/services/user.service';
import { FormatCurrencyPipe } from '../../../../shared/pipes/format-currency.pipe';

@Component({
  selector: 'app-common-withdrawals',
  templateUrl: './common-withdrawals.component.html',
  styleUrls: ['./common-withdrawals.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormatCurrencyPipe]
})
export class CommonWithdrawalsComponent implements OnChanges {
  @Input() pageData!: PageData;

  selectedYear: number;
  selectedMonth: number;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  constructor(private userService: UserService) {
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
    const user = this.userService.getActiveUser();
    if (!user) {
      return `$${amount.toFixed(2)}`;
    }

    const symbol = user.currency_symbol;
    const decimalPlaces = user.decimal_places;
    const thousandSep = user.thousand_separator;
    const currencyPos = user.currency_position;

    const absAmount = Math.abs(amount);
    const isNegative = amount < 0;

    const parts = absAmount.toFixed(decimalPlaces).split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    const formatted = decPart !== undefined ? `${withThousands}.${decPart}` : withThousands;
    const withCurrency = currencyPos === 'before'
      ? `${symbol}${formatted}`
      : `${formatted}${symbol}`;

    return isNegative ? `-${withCurrency}` : withCurrency;
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

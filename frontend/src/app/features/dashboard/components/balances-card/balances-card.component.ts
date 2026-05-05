import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { PageData, MonthlyDifference, User } from '../../../../core/models/index';

@Component({
  selector: 'app-balances-card',
  templateUrl: './balances-card.component.html',
  styleUrls: ['./balances-card.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BalancesCardComponent implements OnInit, OnChanges {
  @Input() pageData!: PageData;
  @Input() compact: boolean = false;
  @Input() selectedYear?: number;
  @Input() selectedMonth?: number;

  activeUser: User | null = null;
  year: number;
  month: number;
  difference: MonthlyDifference | null = null;
  loading = false;

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.year = today.getFullYear();
    this.month = today.getMonth() + 1;
    this.activeUser = this.userService.getActiveUser();
  }

  ngOnInit(): void {
    // Use inputs if provided, otherwise use defaults
    if (this.selectedYear !== undefined) {
      this.year = this.selectedYear;
    }
    if (this.selectedMonth !== undefined) {
      this.month = this.selectedMonth;
    }
    this.loadDifference();
  }

  ngOnChanges(): void {
    // Update when inputs change
    if (this.selectedYear !== undefined) {
      this.year = this.selectedYear;
    }
    if (this.selectedMonth !== undefined) {
      this.month = this.selectedMonth;
    }
    this.loadDifference();
  }

  private loadDifference(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.loading = true;
    this.apiService.getMonthlyDifference(activeUser.id, this.year, this.month).subscribe({
      next: (diff) => {
        this.difference = diff;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading monthly balance:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onYearOrMonthChange(): void {
    this.loadDifference();
  }

  formatCurrency(amount: number): string {
    const user = this.activeUser;
    if (!user) {
      return `$${amount.toFixed(2)}`;
    }

    const symbol = user.currency_symbol;
    const decimalPlaces = user.decimal_places;
    const thousandSep = user.thousand_separator;
    const decimalSep = user.decimal_separator;
    const currencyPos = user.currency_position;
    const negativeFormat = user.negative_format;

    const absAmount = Math.abs(amount);
    const isNegative = amount < 0;

    const formatted = this.formatNumber(absAmount, decimalPlaces, thousandSep, decimalSep);
    const withCurrency = currencyPos === 'before'
      ? `${symbol}${formatted}`
      : `${formatted}${symbol}`;

    if (!isNegative) {
      return withCurrency;
    }

    return this.applyNegativeFormat(withCurrency, negativeFormat);
  }

  private formatNumber(num: number, decimalPlaces: number, thousandSep: string, decimalSep: string): string {
    const parts = num.toFixed(decimalPlaces).split('.');
    const intPart = parts[0];
    const decPart = parts[1];

    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandSep);
    return decPart !== undefined ? `${withThousands}${decimalSep}${decPart}` : withThousands;
  }

  private applyNegativeFormat(value: string, format: string): string {
    switch (format) {
      case 'parentheses':
        return `(${value})`;
      case 'brackets':
        return `[${value}]`;
      case 'braces':
        return `{${value}}`;
      case '-prefix':
      default:
        return `-${value}`;
    }
  }

  get differenceClass(): string {
    if (!this.difference) return '';
    return this.difference.difference >= 0 ? 'positive' : 'negative';
  }
}

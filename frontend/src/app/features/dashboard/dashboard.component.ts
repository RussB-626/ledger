// Dashboard component - main page with all features
// Per CLAUDE.md: Accounts/Transactions/Pending tabs, Categories, Networth, Common Withdrawals

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageDataService } from '../../core/services/page-data.service';
import { UserService } from '../../core/services/user.service';
import { ApiService } from '../../core/services/api.service';
import { PageData, Transaction, User } from '../../core/models/index';
import { AccountsComponent } from './components/accounts/accounts.component';
import { CategoriesSectionComponent } from './components/categories-section/categories-section.component';
import { NetworthCardComponent } from './components/networth-card/networth-card.component';
import { CommonWithdrawalsComponent } from './components/common-withdrawals/common-withdrawals.component';
import { EditTransactionModalComponent } from '../../shared/components/edit-transaction-modal/edit-transaction-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccountsComponent,
    CategoriesSectionComponent,
    NetworthCardComponent,
    CommonWithdrawalsComponent,
    EditTransactionModalComponent
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  pageData$: Observable<PageData | null>;
  showCreateTransactionModal = false;
  showEditTransactionModal = false;
  editingTransaction: Transaction | null = null;
  activeUser: User | null = null;

  selectedCategoryYear: number;
  selectedCategoryMonth: number;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  showDifferencesOnMobile: boolean = true;

  private destroy$ = new Subject<void>();

  constructor(
    private pageDataService: PageDataService,
    private userService: UserService,
    private apiService: ApiService
  ) {
    this.pageData$ = this.pageDataService.pageData$;
    this.activeUser = this.userService.getActiveUser();
    const now = new Date();
    this.selectedCategoryYear = now.getFullYear();
    this.selectedCategoryMonth = now.getMonth() + 1;
  }

  ngOnInit(): void {
    // Watch for user changes and reload page data
    this.userService.activeUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        if (user) {
          // Page data is loaded via app initialization
          // This is here to handle user switches
        }
      });
  }

  calculateNetWorth(balances: Record<string, number>): number {
    return Object.values(balances).reduce((sum, balance) => sum + balance, 0);
  }

  formatNetWorth(balances: Record<string, number>): string {
    const netWorth = this.calculateNetWorth(balances);
    const user = this.activeUser;
    if (!user) {
      return `$${netWorth.toFixed(2)}`;
    }

    const symbol = user.currency_symbol;
    const decimalPlaces = user.decimal_places;
    const thousandSep = user.thousand_separator;
    const decimalSep = user.decimal_separator;
    const currencyPos = user.currency_position;
    const negativeFormat = user.negative_format;

    const absAmount = Math.abs(netWorth);
    const isNegative = netWorth < 0;

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

  onEditTransaction(transaction: Transaction): void {
    this.editingTransaction = transaction;
    this.showEditTransactionModal = true;
  }

  onCloseEditTransactionModal(): void {
    this.showEditTransactionModal = false;
    this.editingTransaction = null;
  }

  onTransactionUpdated(): void {
    this.showEditTransactionModal = false;
    this.editingTransaction = null;
    // Refresh page data
    const activeUser = this.userService.getActiveUserSync();
    if (activeUser) {
      this.apiService.getPageData(activeUser.id).subscribe({
        next: (pageData) => {
          this.pageDataService.setPageData(pageData);
        },
        error: (error) => {
          console.error('Failed to refresh page data:', error);
        }
      });
    }
  }

  onCategoryYearMonthChange(): void {
    // This method is called when year/month changes in the dashboard header
    // The bindings will automatically update the differences card and categories section
  }

  toggleMobileView(): void {
    this.showDifferencesOnMobile = !this.showDifferencesOnMobile;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

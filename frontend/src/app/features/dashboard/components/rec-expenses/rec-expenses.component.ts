import { Component, Input, OnInit, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageData, Transaction, Group, Account } from '../../../../core/models/index';
import { UserService } from '../../../../core/services/user.service';
import { ApiService } from '../../../../core/services/api.service';
import { FormatCurrencyPipe } from '../../../../shared/pipes/format-currency.pipe';

@Component({
  selector: 'app-rec-expenses',
  templateUrl: './rec-expenses.component.html',
  styleUrls: ['./rec-expenses.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, FormatCurrencyPipe]
})
export class RecExpensesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() pageData!: PageData;

  selectedTab: 'monthly' | 'yearly' = 'monthly';
  selectedYear: number;
  selectedMonth: number;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  yearlyTransactions: Transaction[] = [];
  activeGroup: Group | null = null;
  groupAccounts: Account[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {
    const now = new Date();
    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth() + 1;
  }

  ngOnInit(): void {
    this.userService.activeGroup$
      .pipe(takeUntil(this.destroy$))
      .subscribe(group => {
        this.activeGroup = group;
        this.updateGroupAccounts();
        this.loadYearlyTransactions();
      });
  }

  private updateGroupAccounts(): void {
    if (!this.activeGroup || !this.pageData?.accounts) {
      this.groupAccounts = [];
      return;
    }
    this.groupAccounts = this.pageData.accounts.filter(
      account => account.group_id === this.activeGroup!.id
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && this.pageData) {
      this.updateGroupAccounts();
    }
  }

  get monthlyDescriptions() {
    if (!this.pageData?.txnDescriptions || !this.activeGroup) {
      return [];
    }
    return this.pageData.txnDescriptions.filter(d => d.monthly_group_ids.includes(this.activeGroup!.id));
  }

  get yearlyDescriptions() {
    if (!this.pageData?.txnDescriptions || !this.activeGroup) {
      return [];
    }
    return this.pageData.txnDescriptions.filter(d => d.yearly_group_ids.includes(this.activeGroup!.id));
  }

  private getTransactionsForMonth(year: number, month: number, descriptionId: number): Transaction[] {
    const monthNum = Number(month);
    const yearNum = Number(year);
    const groupAccountNames = this.groupAccounts.map(a => a.name);

    return this.yearlyTransactions.filter(txn => {
      const [txnYear, txnMonth] = txn.date.split('-').map(Number);
      return txn.description_id === descriptionId &&
             txnYear === yearNum &&
             txnMonth === monthNum &&
             groupAccountNames.includes(txn.account);
    });
  }

  getPriorMonthTotal(descriptionId: number): number {
    let priorMonth = Number(this.selectedMonth) - 1;
    let priorYear = Number(this.selectedYear);

    if (priorMonth < 1) {
      priorMonth = 12;
      priorYear--;
    }

    const txns = this.getTransactionsForMonth(priorYear, priorMonth, descriptionId);
    return txns.reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getCurrentMonthTotal(descriptionId: number): number {
    const txns = this.getTransactionsForMonth(Number(this.selectedYear), Number(this.selectedMonth), descriptionId);
    return txns.reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getYearTotal(descriptionId: number): number {
    const yearNum = Number(this.selectedYear);
    const groupAccountNames = this.groupAccounts.map(a => a.name);
    return this.yearlyTransactions.filter(txn => {
      const [txnYear] = txn.date.split('-').map(Number);
      return txn.description_id === descriptionId &&
             txnYear === yearNum &&
             groupAccountNames.includes(txn.account);
    }).reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getCurrentYearTotal(descriptionId: number): number {
    const groupAccountNames = this.groupAccounts.map(a => a.name);
    return this.yearlyTransactions.filter(txn => {
      const [txnYear] = txn.date.split('-').map(Number);
      return txn.description_id === descriptionId &&
             txnYear === Number(this.selectedYear) &&
             groupAccountNames.includes(txn.account);
    }).reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getPriorYearTotal(descriptionId: number): number {
    const priorYear = Number(this.selectedYear) - 1;
    const groupAccountNames = this.groupAccounts.map(a => a.name);
    return this.yearlyTransactions.filter(txn => {
      const [txnYear] = txn.date.split('-').map(Number);
      return txn.description_id === descriptionId &&
             txnYear === priorYear &&
             groupAccountNames.includes(txn.account);
    }).reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
  }

  getYearDifference(descriptionId: number): number {
    return this.getCurrentYearTotal(descriptionId) - this.getPriorYearTotal(descriptionId);
  }

  getPositiveColor(): string {
    const user = this.userService.getActiveUser();
    return user?.positive_color || '#4ade80';
  }

  getNegativeColor(): string {
    const user = this.userService.getActiveUser();
    return user?.negative_color || '#ef4444';
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

  getPriorMonthNameWithYear(): string {
    if (Number(this.selectedMonth) !== 1) {
      return this.getPriorMonthName();
    }
    const priorYear = Number(this.selectedYear) - 1;
    return `December Of ${priorYear}`;
  }

  private loadYearlyTransactions(): void {
    const user = this.userService.getActiveUser();
    if (!user) return;

    forkJoin({
      currentYear: this.apiService.getTransactionsByYear(user.id, this.selectedYear),
      priorYear: this.apiService.getTransactionsByYear(user.id, this.selectedYear - 1)
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ currentYear, priorYear }) => {
        this.yearlyTransactions = [...currentYear, ...priorYear];
        this.cdr.markForCheck();
      });
  }

  onYearOrMonthChange(): void {
    // Reload transactions when year changes to ensure year totals are current
    this.loadYearlyTransactions();
  }

  onTabChange(tab: 'monthly' | 'yearly'): void {
    this.selectedTab = tab;
    // Load transactions for yearly tab
    if (tab === 'yearly') {
      this.loadYearlyTransactions();
    }
  }
}

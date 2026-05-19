import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageData, User, Group, Account } from '../../../../core/models/index';
import { UserService } from '../../../../core/services/user.service';
import { FormatCurrencyPipe } from '../../../../shared/pipes/format-currency.pipe';

interface BalanceRow {
  accountName: string;
  balance: number;
  isTotal?: boolean;
}

@Component({
  selector: 'app-account-balances',
  templateUrl: './account-balances.component.html',
  styleUrls: ['./account-balances.component.scss'],
  standalone: true,
  imports: [CommonModule, FormatCurrencyPipe]
})
export class AccountBalancesComponent implements OnInit, OnChanges, OnDestroy {
  @Input() pageData!: PageData;
  @Output() accountSelected = new EventEmitter<string>();

  activeUser: User | null = null;
  activeGroup: Group | null = null;
  selectedAccountName: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(private userService: UserService) {
    this.activeUser = this.userService.getActiveUser();
  }

  ngOnInit(): void {
    this.userService.activeGroup$
      .pipe(takeUntil(this.destroy$))
      .subscribe(group => {
        this.activeGroup = group;
        this.selectFirstAccount();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && !changes['pageData'].firstChange) {
      this.selectFirstAccount();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private selectFirstAccount(): void {
    if (this.pageData?.accounts && this.pageData.accounts.length > 0) {
      const firstAccountName = this.pageData.accounts[0].name;
      this.selectedAccountName = firstAccountName;
      this.accountSelected.emit(firstAccountName);
    }
  }

  get balanceRows(): BalanceRow[] {
    const rows: BalanceRow[] = [];

    if (!this.activeGroup) return rows;

    // Filter accounts by active group
    const groupAccounts = this.pageData.accounts.filter(
      account => account.group_id === this.activeGroup!.id
    );

    // Add all accounts in the group with their balances (or 0 if no transactions)
    for (const account of groupAccounts) {
      const balance = this.pageData.balances[account.name] ?? 0;
      rows.push({
        accountName: account.name,
        balance
      });
    }

    // Add totals row for this group only
    const totalBalance = groupAccounts.reduce((sum, account) => {
      return sum + (this.pageData.balances[account.name] ?? 0);
    }, 0);
    rows.push({
      accountName: 'TOTAL',
      balance: totalBalance,
      isTotal: true
    });

    return rows;
  }

  getBalanceColor(balance: number): string {
    if (balance === 0) return 'var(--color-zero)';
    if (balance < 0) return this.activeUser?.negative_color || '#ff6b6b';
    return this.activeUser?.positive_color || '#00d9ff';
  }

  onAccountCardClick(accountName: string): void {
    this.selectedAccountName = accountName;
    this.accountSelected.emit(accountName);
  }
}

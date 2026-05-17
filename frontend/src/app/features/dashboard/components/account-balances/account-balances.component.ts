import { Component, Input, Output, EventEmitter, OnInit, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageData, User } from '../../../../core/models/index';
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
export class AccountBalancesComponent implements OnInit, OnChanges {
  @Input() pageData!: PageData;
  @Output() accountSelected = new EventEmitter<string>();

  activeUser: User | null = null;
  selectedAccountName: string | null = null;

  constructor(private userService: UserService) {
    this.activeUser = this.userService.getActiveUser();
  }

  ngOnInit(): void {
    this.selectFirstAccount();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageData'] && !changes['pageData'].firstChange) {
      this.selectFirstAccount();
    }
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

    // Add all accounts with their balances (or 0 if no transactions)
    for (const account of this.pageData.accounts) {
      const balance = this.pageData.balances[account.name] ?? 0;
      rows.push({
        accountName: account.name,
        balance
      });
    }

    // Add totals row
    const totalBalance = Object.values(this.pageData.balances).reduce((sum, balance) => sum + balance, 0);
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

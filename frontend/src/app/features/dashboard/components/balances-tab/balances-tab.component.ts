// Balances Tab component
// Per CLAUDE.md: Displays account name + balance + totals row

import { Component, Input } from '@angular/core';
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
  selector: 'app-balances-tab',
  templateUrl: './balances-tab.component.html',
  styleUrls: ['./balances-tab.component.scss'],
  standalone: true,
  imports: [CommonModule, FormatCurrencyPipe]
})
export class BalancesTabComponent {
  @Input() pageData!: PageData;
  activeUser: User | null = null;

  constructor(private userService: UserService) {
    this.activeUser = this.userService.getActiveUser();
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
}

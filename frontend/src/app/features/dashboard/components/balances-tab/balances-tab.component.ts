// Balances Tab component
// Per CLAUDE.md: Displays account name + balance + totals row

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageData } from '../../../../core/models/index';

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
  imports: [CommonModule]
})
export class BalancesTabComponent {
  @Input() pageData!: PageData;

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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

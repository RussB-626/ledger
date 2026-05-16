import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageData, Transaction } from '../../../../core/models/index';
import { AccountBalancesComponent } from '../account-balances/account-balances.component';
import { AccountTransactionsComponent } from '../account-transactions/account-transactions.component';
import { AccountPendingsComponent } from '../account-pendings/account-pendings.component';

@Component({
  selector: 'app-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.scss'],
  standalone: true,
  imports: [CommonModule, AccountBalancesComponent, AccountTransactionsComponent, AccountPendingsComponent]
})
export class AccountsComponent {
  @Input() pageData!: PageData;
  @Output() editTransaction = new EventEmitter<Transaction>();

  activeTab: 'transactions' | 'pending' = 'transactions';
  selectedAccountName: string | null = null;

  onAccountSelected(accountName: string): void {
    this.selectedAccountName = accountName;
  }

  onEditTransaction(transaction: Transaction): void {
    this.editTransaction.emit(transaction);
  }
}

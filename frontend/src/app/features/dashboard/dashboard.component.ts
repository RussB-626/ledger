// Dashboard component - main page with all features
// Per CLAUDE.md: Balances & Transactions tabs, Categories, Differences, Common Withdrawals

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PageDataService } from '../../core/services/page-data.service';
import { UserService } from '../../core/services/user.service';
import { ApiService } from '../../core/services/api.service';
import { PageData, Transaction } from '../../core/models/index';
import { BalancesTabComponent } from './components/balances-tab/balances-tab.component';
import { TransactionsTabComponent } from './components/transactions-tab/transactions-tab.component';
import { PendingTabComponent } from './components/pending-tab/pending-tab.component';
import { CategoriesSectionComponent } from './components/categories-section/categories-section.component';
import { DifferencesCardComponent } from './components/differences-card/differences-card.component';
import { CommonWithdrawalsComponent } from './components/common-withdrawals/common-withdrawals.component';
import { CreateTransactionModalComponent } from '../../shared/components/create-transaction-modal/create-transaction-modal.component';
import { EditTransactionModalComponent } from '../../shared/components/edit-transaction-modal/edit-transaction-modal.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BalancesTabComponent,
    TransactionsTabComponent,
    PendingTabComponent,
    CategoriesSectionComponent,
    DifferencesCardComponent,
    CommonWithdrawalsComponent,
    EditTransactionModalComponent
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  pageData$: Observable<PageData | null>;
  activeMainTab: 'accounts' | 'transactions' | 'pending' = 'accounts';
  showCreateTransactionModal = false;
  showEditTransactionModal = false;
  editingTransaction: Transaction | null = null;

  selectedCategoryYear: number;
  selectedCategoryMonth: number;
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  private destroy$ = new Subject<void>();

  constructor(
    private pageDataService: PageDataService,
    private userService: UserService,
    private apiService: ApiService
  ) {
    this.pageData$ = this.pageDataService.pageData$;
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

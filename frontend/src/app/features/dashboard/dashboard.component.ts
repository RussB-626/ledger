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
import { FinSummaryComponent } from './components/fin-summary/fin-summary.component';
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
    FinSummaryComponent,
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

  private destroy$ = new Subject<void>();

  constructor(
    private pageDataService: PageDataService,
    private userService: UserService,
    private apiService: ApiService
  ) {
    this.pageData$ = this.pageDataService.pageData$;
    this.activeUser = this.userService.getActiveUser();
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

    // Watch for refresh signals (e.g., after admin panel changes)
    this.pageDataService.refresh$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
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
      });
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

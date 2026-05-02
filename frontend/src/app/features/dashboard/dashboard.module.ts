// Dashboard module with main page features
// Per CLAUDE.md: Balances, Transactions, Pending tabs; Categories section; Differences card

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { NgChartsModule } from 'ng2-charts';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { BalancesTabComponent } from './components/balances-tab/balances-tab.component';
import { TransactionsTabComponent } from './components/transactions-tab/transactions-tab.component';
import { PendingTabComponent } from './components/pending-tab/pending-tab.component';
import { CategoriesSectionComponent } from './components/categories-section/categories-section.component';
import { DifferencesCardComponent } from './components/differences-card/differences-card.component';
import { CommonWithdrawalsComponent } from './components/common-withdrawals/common-withdrawals.component';
import { SharedModule } from '../../shared/shared.module';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridModule,
    NgChartsModule,
    DashboardRoutingModule,
    SharedModule,
    DashboardComponent,
    BalancesTabComponent,
    TransactionsTabComponent,
    PendingTabComponent,
    CategoriesSectionComponent,
    DifferencesCardComponent,
    CommonWithdrawalsComponent
  ]
})
export class DashboardModule { }

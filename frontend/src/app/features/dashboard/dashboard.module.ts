// Dashboard module with main page features
// Per CLAUDE.md: Balances, Transactions, Pending tabs; Categories section; Networth card

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { NgChartsModule } from 'ng2-charts';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { AccountsComponent } from './components/accounts/accounts.component';
import { FinSummaryComponent } from './components/fin-summary/fin-summary.component';
import { RecExpensesComponent } from './components/rec-expenses/rec-expenses.component';
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
    AccountsComponent,
    FinSummaryComponent,
    RecExpensesComponent
  ]
})
export class DashboardModule { }

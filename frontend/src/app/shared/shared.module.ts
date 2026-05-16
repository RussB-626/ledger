// Shared module for reusable components, directives, and pipes
// All shared components and directives are now standalone

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AgGridModule } from 'ag-grid-angular';
import { NgChartsModule } from 'ng2-charts';

import { SidenavComponent } from './components/sidenav/sidenav.component';
import { CreateTransactionModalComponent } from './components/create-transaction-modal/create-transaction-modal.component';
import { ClickOutsideDirective } from './directives/click-outside.directive';

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridModule,
    NgChartsModule,
    SidenavComponent,
    CreateTransactionModalComponent,
    ClickOutsideDirective
  ],
  exports: [
    SidenavComponent,
    CreateTransactionModalComponent,
    ClickOutsideDirective,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    AgGridModule,
    NgChartsModule
  ]
})
export class SharedModule { }

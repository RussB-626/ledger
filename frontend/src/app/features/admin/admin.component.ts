import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserService } from '../../core/services/user.service';
import { ApiService } from '../../core/services/api.service';
import { PageDataService } from '../../core/services/page-data.service';
import { User } from '../../core/models/index';
import { GroupsComponent } from './components/groups/groups.component';
import { AccountsComponent } from './components/accounts/accounts.component';
import { CategoriesComponent } from './components/categories/categories.component';
import { DescriptionsComponent } from './components/descriptions/descriptions.component';
import { TransactionsComponent } from './components/transactions/transactions.component';
import { MoneyComponent } from './components/money/money.component';
import { ThemesComponent } from './components/themes/themes.component';
import { BackupsComponent } from './components/backups/backups.component';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GroupsComponent,
    AccountsComponent,
    CategoriesComponent,
    DescriptionsComponent,
    TransactionsComponent,
    MoneyComponent,
    ThemesComponent,
    BackupsComponent
  ]
})
export class AdminComponent implements OnInit, OnDestroy {
  activeUser: User | null = null;
  activeTab: 'groups' | 'accounts' | 'categories' | 'descriptions' | 'transactions' | 'other' | 'backups' | 'themes' = 'groups';

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: UserService,
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userService.activeUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.activeUser = user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  selectTab(tab: 'groups' | 'accounts' | 'categories' | 'descriptions' | 'transactions' | 'other' | 'backups' | 'themes'): void {
    this.activeTab = tab;
  }

  backToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}

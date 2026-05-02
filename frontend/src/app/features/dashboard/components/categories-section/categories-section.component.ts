import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { PageData, CategoryTotals } from '../../../../core/models/index';

@Component({
  selector: 'app-categories-section',
  templateUrl: './categories-section.component.html',
  styleUrls: ['./categories-section.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class CategoriesSectionComponent implements OnInit, OnChanges {
  @Input() pageData!: PageData;
  @Input() externalSelectedYear?: number;
  @Input() externalSelectedMonth?: number;
  @Output() yearMonthChanged = new EventEmitter<void>();

  selectedYear: number;
  selectedMonth: number;
  selectedTab: 'expenses' | 'incomes' = 'expenses';
  categoryTotals: CategoryTotals | null = null;
  loading = false;
  Object = Object;

  readonly monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor(
    private apiService: ApiService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {
    const today = new Date();
    this.selectedYear = today.getFullYear();
    this.selectedMonth = today.getMonth() + 1;
  }

  ngOnInit(): void {
    this.loadCategoryTotals();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['externalSelectedYear'] || changes['externalSelectedMonth']) {
      if (this.externalSelectedYear !== undefined) {
        this.selectedYear = this.externalSelectedYear;
      }
      if (this.externalSelectedMonth !== undefined) {
        this.selectedMonth = this.externalSelectedMonth;
      }
      this.loadCategoryTotals();
    }
  }

  private loadCategoryTotals(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.loading = true;
    this.apiService.getCategoryTotals(activeUser.id, this.selectedYear, this.selectedMonth).subscribe({
      next: (totals) => {
        this.categoryTotals = totals;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading category totals:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onYearOrMonthChange(): void {
    this.loadCategoryTotals();
  }

  selectTab(tab: 'expenses' | 'incomes'): void {
    this.selectedTab = tab;
  }

  get currentCategoryData(): Record<string, number> {
    if (!this.categoryTotals) return {};
    return this.selectedTab === 'expenses' ? this.categoryTotals.expenses : this.categoryTotals.incomes;
  }

  get sortedCategoryEntries(): Array<[string, number]> {
    return Object.entries(this.currentCategoryData).sort((a, b) => b[1] - a[1]);
  }

  get totalAmount(): number {
    return Object.values(this.currentCategoryData).reduce((sum, val) => sum + val, 0);
  }

  getPercentage(amount: number): number {
    if (this.totalAmount === 0) return 0;
    return Math.round((amount / this.totalAmount) * 100);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
}

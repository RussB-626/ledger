import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { PageData, MonthlyDifference } from '../../../../core/models/index';

@Component({
  selector: 'app-differences-card',
  templateUrl: './differences-card.component.html',
  styleUrls: ['./differences-card.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DifferencesCardComponent implements OnInit, OnChanges {
  @Input() pageData!: PageData;
  @Input() compact: boolean = false;
  @Input() selectedYear?: number;
  @Input() selectedMonth?: number;

  year: number;
  month: number;
  difference: MonthlyDifference | null = null;
  loading = false;

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
    this.year = today.getFullYear();
    this.month = today.getMonth() + 1;
  }

  ngOnInit(): void {
    // Use inputs if provided, otherwise use defaults
    if (this.selectedYear !== undefined) {
      this.year = this.selectedYear;
    }
    if (this.selectedMonth !== undefined) {
      this.month = this.selectedMonth;
    }
    this.loadDifference();
  }

  ngOnChanges(): void {
    // Update when inputs change
    if (this.selectedYear !== undefined) {
      this.year = this.selectedYear;
    }
    if (this.selectedMonth !== undefined) {
      this.month = this.selectedMonth;
    }
    this.loadDifference();
  }

  private loadDifference(): void {
    const activeUser = this.userService.getActiveUserSync();
    if (!activeUser) return;

    this.loading = true;
    this.apiService.getMonthlyDifference(activeUser.id, this.year, this.month).subscribe({
      next: (diff) => {
        this.difference = diff;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading monthly difference:', error);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onYearOrMonthChange(): void {
    this.loadDifference();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  get differenceClass(): string {
    if (!this.difference) return '';
    return this.difference.difference >= 0 ? 'positive' : 'negative';
  }
}

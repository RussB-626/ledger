import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/index';

@Component({
  selector: 'app-money',
  templateUrl: './money.component.html',
  styleUrls: ['./money.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MoneyComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  currencySymbol = '$';
  decimalPlaces = 2;
  thousandSeparator = ',';
  decimalSeparator = '.';
  currencyPosition: 'before' | 'after' = 'before';
  negativeFormat = '-prefix';
  negativeColor = '#ff6b6b';
  positiveColor = '#1dd1a1';

  currencySymbolOptions = ['$', '€', '£', '¥', '₹', 'USD', 'EUR'];
  decimalPlacesOptions = [2, 3];
  thousandSeparatorOptions = [',', '.', ' '];
  decimalSeparatorOptions = ['.', ','];
  negativeFormatOptions: Array<{ value: string; label: string }> = [
    { value: '-prefix', label: '-$1.00' },
    { value: 'parentheses', label: '($1.00)' },
    { value: 'brackets', label: '[$1.00]' },
    { value: 'braces', label: '{$1.00}' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadMoneyFormatPreferences();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMoneyFormatPreferences(): void {
    if (this.activeUser) {
      this.currencySymbol = this.activeUser.currency_symbol ?? '$';
      this.decimalPlaces = this.activeUser.decimal_places ?? 2;
      this.thousandSeparator = this.activeUser.thousand_separator ?? ',';
      this.decimalSeparator = this.activeUser.decimal_separator ?? '.';
      this.currencyPosition = this.activeUser.currency_position ?? 'before';
      this.negativeFormat = this.activeUser.negative_format ?? '-prefix';
      this.negativeColor = this.activeUser.negative_color ?? '#ff6b6b';
      this.positiveColor = this.activeUser.positive_color ?? '#1dd1a1';
    }
  }

  saveMoneyFormatPreferences(): void {
    if (!this.activeUser) return;

    this.apiService.updateUserPreferences(this.activeUser.id, {
      currency_symbol: this.currencySymbol,
      decimal_places: this.decimalPlaces,
      thousand_separator: this.thousandSeparator,
      decimal_separator: this.decimalSeparator,
      currency_position: this.currencyPosition,
      negative_format: this.negativeFormat,
      negative_color: this.negativeColor,
      positive_color: this.positiveColor
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.activeUser = updatedUser;
          this.userService.setActiveUser(updatedUser);
        },
        error: (error) => {
          console.error('Failed to save money format preferences:', error);
          alert('Failed to save preferences');
        }
      });
  }
}

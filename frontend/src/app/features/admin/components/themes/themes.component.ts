import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { ThemeService } from '../../../../core/services/theme.service';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/index';

interface Theme {
  id: string;
  name: string;
}

@Component({
  selector: 'app-themes',
  templateUrl: './themes.component.html',
  styleUrls: ['./themes.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ThemesComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  selectedTheme = 'default';
  savingTheme = false;
  themeError = '';
  themes: Theme[] = [
    { id: 'default', name: 'Default' },
    { id: 'light', name: 'Light' },
    { id: 'high-contrast', name: 'High Contrast' },
    { id: 'colorblind-deuteranopia', name: 'Color Blind (Red-Green)' },
    { id: 'colorblind-protanopia', name: 'Color Blind (Red-Green Alt)' },
    { id: 'colorblind-tritanopia', name: 'Color Blind (Blue-Yellow)' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private themeService: ThemeService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadThemePreference();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadThemePreference(): void {
    if (this.activeUser) {
      this.selectedTheme = this.activeUser.theme || 'default';
    }
  }

  saveTheme(): void {
    if (!this.activeUser) return;

    this.savingTheme = true;
    this.themeError = '';

    const themeToSave = this.selectedTheme;
    this.themeService.applyTheme(themeToSave);

    this.apiService.updateUserTheme(this.activeUser.id, themeToSave)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser: User) => {
          this.activeUser = updatedUser;
          this.selectedTheme = updatedUser.theme || 'default';
          this.userService.setActiveUser(updatedUser);
          this.savingTheme = false;
          this.cdr.markForCheck();
        },
        error: (error: unknown) => {
          console.error('Failed to save theme:', error);
          this.themeError = 'Failed to save theme';
          this.savingTheme = false;
          this.cdr.markForCheck();
        }
      });
  }
}

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { User } from '../../../../core/models/index';

@Component({
  selector: 'app-backups',
  templateUrl: './backups.component.html',
  styleUrls: ['./backups.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BackupsComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  // Backup settings
  backupLoading = false;
  savingBackupSettings = false;
  backupError = '';
  showBackupSuccessModal = false;
  backupSuccessMessage = '';
  backupEnabled = true;
  backupFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly';
  backupTime = '02:00';
  backupDayOfWeek = 0;
  backupDayOfMonth = 1;
  backupCount = 5;

  // Restore state
  showRestoreModal = false;
  restoreFile: File | null = null;
  restoreLoading = false;
  restoreError = '';
  restoreMode: 'overwrite' | 'merge' = 'overwrite';
  restoreOriginalUserId: number | null = null;
  showRestoreSuccessModal = false;
  restoreSuccessMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBackupSettings();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadBackupSettings(): void {
    if (this.activeUser) {
      this.backupEnabled = this.activeUser.backup_enabled ?? true;
      this.backupFrequency = (this.activeUser.backup_frequency ?? 'weekly') as 'daily' | 'weekly' | 'monthly';
      this.backupTime = this.activeUser.backup_time ?? '02:00';
      this.backupDayOfWeek = this.activeUser.backup_day_of_week ?? 0;
      this.backupDayOfMonth = this.activeUser.backup_day_of_month ?? 1;
      this.backupCount = this.activeUser.backup_count ?? 5;
    }
  }

  saveBackupSettings(): void {
    if (!this.activeUser) return;

    this.savingBackupSettings = true;
    this.backupError = '';

    this.apiService.updateBackupSettings(this.activeUser.id, {
      backup_enabled: this.backupEnabled,
      backup_frequency: this.backupFrequency,
      backup_time: this.backupTime,
      backup_day_of_week: this.backupDayOfWeek,
      backup_day_of_month: this.backupDayOfMonth,
      backup_count: this.backupCount
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.activeUser = updatedUser;
          this.savingBackupSettings = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to save backup settings:', error);
          this.backupError = 'Failed to save settings';
          this.savingBackupSettings = false;
          this.cdr.markForCheck();
        }
      });
  }

  onCreateManualBackup(): void {
    if (!this.activeUser) return;

    this.backupLoading = true;
    this.backupError = '';

    this.apiService.createBackup(this.activeUser.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.backupLoading = false;
          this.backupSuccessMessage = `Backup created: ${result.filename}`;
          this.showBackupSuccessModal = true;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to create backup:', error);
          this.backupError = 'Failed to create backup';
          this.backupLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onUploadBackupFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.restoreFile = file;
    this.restoreError = '';
    this.analyzeBackupFile(file);
  }

  async analyzeBackupFile(file: File): Promise<void> {
    try {
      const content = await file.text();

      const userIdMatch = content.match(/INSERT INTO users[^;]*VALUES\s*\(\s*(\d+)\s*,/);
      if (userIdMatch && userIdMatch[1]) {
        this.restoreOriginalUserId = parseInt(userIdMatch[1], 10);
      } else {
        const fallbackMatch = content.match(/user_id[`"']?\s*[,)]\s*(\d+)/);
        if (fallbackMatch && fallbackMatch[1]) {
          this.restoreOriginalUserId = parseInt(fallbackMatch[1], 10);
        }
      }
    } catch (error) {
      console.error('Failed to analyze backup file:', error);
      this.restoreError = 'Failed to analyze backup file';
    }
  }

  onRestoreBackup(): void {
    if (!this.activeUser || !this.restoreFile) return;

    this.restoreLoading = true;
    this.restoreError = '';

    this.apiService.restoreBackup(
      this.activeUser.id,
      this.restoreFile,
      this.activeUser.id,
      this.restoreMode
    ).subscribe({
      next: (result) => {
        this.restoreLoading = false;
        if (result.restored) {
          this.showRestoreModal = false;
          this.restoreFile = null;
          this.restoreMode = 'overwrite';
          this.restoreOriginalUserId = null;
          this.restoreSuccessMessage = 'Backup restored successfully! Your data has been updated.';
          this.showRestoreSuccessModal = true;
          this.cdr.markForCheck();
          this.pageDataService.refreshPageData();
        }
      },
      error: (error) => {
        console.error('Failed to restore backup:', error);
        this.restoreError = 'Failed to restore backup';
        this.restoreLoading = false;
      }
    });
  }

  getDayOfWeekName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Sunday';
  }
}

import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../../../core/services/api.service';
import { PageDataService } from '../../../../core/services/page-data.service';
import { User, Group } from '../../../../core/models/index';

interface ParsedTransaction {
  date: string;
  account: string;
  category: string;
  categoryType: 'expense' | 'income' | 'transfer';
  description: string;
  notes: string;
  amount: number;
  type: 'D' | 'W' | 'TD' | 'TW';
  pending: boolean;
  originalDate: string;
  parseError?: string;
}

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class TransactionsComponent implements OnInit, OnDestroy {
  @Input() activeUser: User | null = null;

  bulkUploadModal = { isOpen: false };
  bulkUploadParsedData: ParsedTransaction[] = [];
  bulkUploadParsedDataWithErrors: ParsedTransaction[] = [];
  bulkUploadValidCount = 0;
  bulkUploadError = '';
  bulkUploadLoading = false;
  bulkUploadFileLoading = false;
  bulkUploadDateFormat = '';
  bulkUploadStatus = '';
  bulkUploadGroupId = 0;
  groups: Group[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: ApiService,
    private pageDataService: PageDataService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.pageDataService.groups$
      .pipe(takeUntil(this.destroy$))
      .subscribe(groups => {
        this.groups = groups;
        if (groups.length > 0 && this.bulkUploadGroupId === 0) {
          this.bulkUploadGroupId = groups[0].id;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openBulkUploadModal(): void {
    this.bulkUploadModal = { isOpen: true };
    this.bulkUploadParsedData = [];
    this.bulkUploadParsedDataWithErrors = [];
    this.bulkUploadValidCount = 0;
    this.bulkUploadError = '';
    this.bulkUploadLoading = false;
    this.bulkUploadDateFormat = '';
    this.bulkUploadStatus = '';
    if (this.groups.length > 0 && this.bulkUploadGroupId === 0) {
      this.bulkUploadGroupId = this.groups[0].id;
    }
    (this as any).bulkUploadAllParsedData = [];
  }

  closeBulkUploadModal(): void {
    this.bulkUploadModal = { isOpen: false };
    this.bulkUploadParsedData = [];
    this.bulkUploadParsedDataWithErrors = [];
    this.bulkUploadValidCount = 0;
    this.bulkUploadError = '';
    this.bulkUploadLoading = false;
    this.bulkUploadDateFormat = '';
    this.bulkUploadStatus = '';
    (this as any).bulkUploadAllParsedData = [];
  }

  onBulkUploadFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.bulkUploadFileLoading = true;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        this.bulkUploadError = '';
        this.bulkUploadStatus = '';

        this.bulkUploadParsedData = this.parseTsvFile(text);

        this.bulkUploadParsedDataWithErrors = this.bulkUploadParsedData.filter(t => t.parseError);
        this.bulkUploadValidCount = this.bulkUploadParsedData.length - this.bulkUploadParsedDataWithErrors.length;

        const previewData = this.bulkUploadParsedData.slice(0, 10);
        const allData = this.bulkUploadParsedData;
        this.bulkUploadParsedData = previewData;
        (this as any).bulkUploadAllParsedData = allData;

        if (this.bulkUploadParsedData.length === 0) {
          this.bulkUploadError = 'No valid transactions found in file';
        }
      } catch (error) {
        this.bulkUploadError = `Failed to parse file: ${(error as Error).message}`;
        this.bulkUploadParsedData = [];
      } finally {
        this.bulkUploadFileLoading = false;
        this.cdr.markForCheck();
      }
    };
    reader.readAsText(file);
  }

  parseTsvFile(fileText: string): ParsedTransaction[] {
    const lines = fileText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const parsed: ParsedTransaction[] = [];

    const dateStrings = lines.map(line => {
      const parts = line.split('\t');
      return parts[0]?.trim() || '';
    }).filter(d => d);

    const detectedFormat = this.detectDateFormat(dateStrings);

    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 8) continue;

      const [dateStr, account, category, description, notes, amountStr, type, pendingStr] = parts.map(p => p.trim());

      const dateResult = this.parseDate(dateStr, detectedFormat);
      if (!dateResult.success || !dateResult.date) {
        parsed.push({
          date: '',
          account,
          category,
          categoryType: this.inferCategoryType(type as 'D' | 'W' | 'TD' | 'TW'),
          description,
          notes,
          amount: 0,
          type: type as 'D' | 'W' | 'TD' | 'TW',
          pending: false,
          originalDate: dateStr,
          parseError: `Invalid date: ${dateStr}`
        });
        continue;
      }

      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        parsed.push({
          date: dateResult.date,
          account,
          category,
          categoryType: this.inferCategoryType(type as 'D' | 'W' | 'TD' | 'TW'),
          description,
          notes,
          amount: 0,
          type: type as 'D' | 'W' | 'TD' | 'TW',
          pending: false,
          originalDate: dateStr,
          parseError: `Invalid amount: ${amountStr}`
        });
        continue;
      }

      const pending = pendingStr.toUpperCase() === 'TRUE';

      parsed.push({
        date: dateResult.date,
        account,
        category,
        categoryType: this.inferCategoryType(type as 'D' | 'W' | 'TD' | 'TW'),
        description,
        notes,
        amount,
        type: type as 'D' | 'W' | 'TD' | 'TW',
        pending,
        originalDate: dateStr
      });
    }

    this.bulkUploadDateFormat = detectedFormat;
    return parsed;
  }

  detectDateFormat(dateStrings: string[]): string {
    if (dateStrings.length === 0) return 'yyyy-mm-dd';

    const firstDate = dateStrings[0];

    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(firstDate)) {
      return 'yyyy-mm-dd';
    }

    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(firstDate)) {
      const parts = firstDate.split(/[-/]/);
      const first = parseInt(parts[0], 10);
      const second = parseInt(parts[1], 10);

      if (first > 12) {
        return 'dd-mm-yyyy';
      } else if (second > 12) {
        return 'mm-dd-yyyy';
      } else {
        return 'dd-mm-yyyy';
      }
    }

    return 'yyyy-mm-dd';
  }

  parseDate(dateStr: string, format: string): { success: boolean; date?: string; error?: string } {
    const parts = dateStr.split(/[-/]/);
    if (parts.length !== 3) {
      return { success: false, error: 'Invalid date format' };
    }

    let year: number, month: number, day: number;

    if (format === 'yyyy-mm-dd') {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else if (format === 'dd-mm-yyyy') {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    } else {
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return { success: false, error: 'Invalid month or day' };
    }

    const isoMonth = String(month).padStart(2, '0');
    const isoDay = String(day).padStart(2, '0');
    const isoDate = `${year}-${isoMonth}-${isoDay}`;

    return { success: true, date: isoDate };
  }

  private inferCategoryType(type: 'D' | 'W' | 'TD' | 'TW'): 'expense' | 'income' | 'transfer' {
    if (type === 'W' || type === 'TW') {
      return type === 'TW' ? 'transfer' : 'expense';
    } else if (type === 'D') {
      return 'income';
    } else {
      return 'transfer';
    }
  }

  saveBulkUpload(): void {
    if (!this.activeUser || !this.bulkUploadGroupId) {
      this.bulkUploadError = 'Please select a group for new accounts';
      return;
    }

    const allData = (this as any).bulkUploadAllParsedData as ParsedTransaction[] || this.bulkUploadParsedData;
    const transactionsToUpload = allData.filter((t: ParsedTransaction) => !t.parseError);

    if (transactionsToUpload.length === 0) {
      this.bulkUploadError = 'No valid transactions to upload. Please fix parsing errors.';
      return;
    }

    this.bulkUploadLoading = true;
    this.bulkUploadError = '';
    this.bulkUploadStatus = 'Uploading transactions...';

    this.apiService.bulkUploadTransactions(this.activeUser.id, transactionsToUpload, this.bulkUploadGroupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.bulkUploadLoading = false;
          this.bulkUploadStatus = 'Upload successful!';
          this.pageDataService.refreshPageData();
          setTimeout(() => {
            this.closeBulkUploadModal();
          }, 1500);
        },
        error: (error: unknown) => {
          this.bulkUploadLoading = false;
          const err = error as { error?: { error?: string } };
          const errorMsg = err?.error?.error || 'Failed to upload transactions';
          this.bulkUploadError = errorMsg;
          this.bulkUploadStatus = '';
        }
      });
  }
}

// Hybrid table/card display component
// Shows expandable cards on mobile, tables on desktop

import { Component, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ColumnDefinition {
  key: string;
  label: string;
  format?: (value: any) => string;
  hidden?: boolean;
  hiddenOnMobile?: boolean;
}

export interface TableAction {
  label: string;
  icon?: string;
  class?: string;
  action: (row: any) => void;
}

@Component({
  selector: 'app-hybrid-table',
  templateUrl: './hybrid-table.component.html',
  styleUrls: ['./hybrid-table.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class HybridTableComponent {
  @Input() data: any[] = [];
  @Input() columns: ColumnDefinition[] = [];
  @Input() actions: TableAction[] = [];
  @Input() expandedContentTemplate?: TemplateRef<any>;
  @Input() emptyMessage = 'No data available';

  expandedRows = new Set<number>();

  toggleExpand(rowIndex: number): void {
    if (this.expandedRows.has(rowIndex)) {
      this.expandedRows.delete(rowIndex);
    } else {
      this.expandedRows.add(rowIndex);
    }
  }

  isExpanded(rowIndex: number): boolean {
    return this.expandedRows.has(rowIndex);
  }

  getColumnValue(row: any, column: ColumnDefinition): string {
    const value = row[column.key];
    if (column.format) {
      return column.format(value);
    }
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  executeAction(action: TableAction, row: any): void {
    action.action(row);
  }

  getVisibleColumns(): ColumnDefinition[] {
    return this.columns.filter(col => !col.hidden && !col.hiddenOnMobile);
  }

  getCardHeaderColumns(): ColumnDefinition[] {
    return this.columns.filter(col => !col.hidden && !col.hiddenOnMobile).slice(0, 3);
  }
}

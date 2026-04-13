import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-data-table',
  template: `
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th *ngFor="let col of columns" 
                [class.sortable]="col.sortable"
                (click)="col.sortable && sort(col.key)">
              {{ col.label }}
              <span class="sort-icon" *ngIf="col.sortable && sortColumn === col.key">
                {{ sortDirection === 'asc' ? '▲' : '▼' }}
              </span>
            </th>
            <th *ngIf="actions.length > 0" class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of paginatedData; let i = index" [style.animation-delay]="i * 30 + 'ms'">
            <td *ngFor="let col of columns">
              <ng-container [ngSwitch]="col.type">
                <span *ngSwitchCase="'currency'">{{ row[col.key] | currency }}</span>
                <span *ngSwitchCase="'date'">{{ row[col.key] | date:'mediumDate' }}</span>
                <span *ngSwitchCase="'datetime'">{{ row[col.key] | date:'medium' }}</span>
                <span *ngSwitchCase="'percentage'">{{ row[col.key] | number:'1.1-1' }}%</span>
                <span *ngSwitchCase="'number'">{{ row[col.key] | number }}</span>
                <span *ngSwitchCase="'badge'" class="badge" [ngClass]="getBadgeClass(row[col.key])">{{ row[col.key] }}</span>
                <span *ngSwitchDefault>{{ row[col.key] }}</span>
              </ng-container>
            </td>
            <td *ngIf="actions.length > 0" class="actions-cell">
              <button *ngFor="let action of actions" 
                      class="action-btn"
                      [class]="action.class"
                      (click)="actionClicked.emit({ action: action.key, row: row })"
                      [title]="action.label">
                <span class="material-icons">{{ action.icon }}</span>
              </button>
            </td>
          </tr>
          <tr *ngIf="data.length === 0">
            <td [attr.colspan]="columns.length + (actions.length > 0 ? 1 : 0)" class="empty-cell">
              <div class="empty-state">
                <span class="material-icons">inbox</span>
                <span>{{ emptyMessage }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="pagination" *ngIf="data.length > 0">
      <div class="pagination-info">
        Showing {{ (currentPage - 1) * pageSize + 1 }} to {{ currentPage * pageSize }} of {{ data.length }} entries
      </div>
      <div class="pagination-controls">
        <button [disabled]="currentPage === 1" (click)="goToPage(1)">
          <span class="material-icons">first_page</span>
        </button>
        <button [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
          <span class="material-icons">chevron_left</span>
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">
          <span class="material-icons">chevron_right</span>
        </button>
        <button [disabled]="currentPage === totalPages" (click)="goToPage(totalPages)">
          <span class="material-icons">last_page</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left;
      padding: 14px 16px;
      background: #f8f9fa;
      color: #666;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e0;
      white-space: nowrap;
    }
    .data-table th.sortable { cursor: pointer; user-select: none; }
    .data-table th.sortable:hover { background: #eee; }
    .sort-icon { margin-left: 4px; font-size: 10px; }
    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
      color: #333;
    }
    .data-table tbody tr {
      animation: fadeIn 0.3s ease forwards;
      opacity: 0;
    }
    @keyframes fadeIn { to { opacity: 1; } }
    .data-table tbody tr:hover { background: #f8f9fa; }
    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
    }
    .badge.active, .badge.approved, .badge.completed { background: #e8f5e9; color: #27ae60; }
    .badge.pending, .badge.in-progress { background: #fff3e0; color: #f39c12; }
    .badge.inactive, .badge.rejected, .badge.failed { background: #ffebee; color: #e74c3c; }
    .actions-col { width: 120px; }
    .actions-cell { display: flex; gap: 4px; }
    .action-btn {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 6px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .action-btn:hover { background: #f5f5f5; color: #667eea; border-color: #667eea; }
    .action-btn.danger:hover { color: #e74c3c; border-color: #e74c3c; }
    .action-btn.success:hover { color: #27ae60; border-color: #27ae60; }
    .empty-cell { text-align: center; padding: 40px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #999; }
    .empty-state .material-icons { font-size: 48px; opacity: 0.5; }
    .pagination {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #eee;
      margin-top: 16px;
    }
    .pagination-info { font-size: 13px; color: #666; }
    .pagination-controls { display: flex; align-items: center; gap: 8px; }
    .pagination-controls button {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      color: #666;
      transition: all 0.2s;
      display: flex;
      align-items: center;
    }
    .pagination-controls button:hover:not(:disabled) { background: #667eea; color: white; border-color: #667eea; }
    .pagination-controls button:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { padding: 0 16px; font-size: 14px; color: #666; font-weight: 500; }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DataTableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: any[] = [];
  @Input() actions: TableAction[] = [];
  @Input() pageSize = 10;
  @Input() emptyMessage = 'No data found';
  
  @Output() actionClicked = new EventEmitter<{ action: string; row: any }>();

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;

  get totalPages(): number {
    return Math.ceil(this.data.length / this.pageSize) || 1;
  }

  get paginatedData(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.data.slice(start, start + this.pageSize);
  }

  sort(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.data.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  getBadgeClass(value: string): string {
    return value?.toLowerCase().replace(/\s+/g, '-') || '';
  }
}

export interface TableColumn {
  key: string;
  label: string;
  type?: 'text' | 'currency' | 'date' | 'datetime' | 'percentage' | 'number' | 'badge';
  sortable?: boolean;
}

export interface TableAction {
  key: string;
  label: string;
  icon: string;
  class?: string;
}

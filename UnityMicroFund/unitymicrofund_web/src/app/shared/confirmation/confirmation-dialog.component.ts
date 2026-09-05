import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConfirmationOptions } from './confirmation.model';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="confirm-dialog">
      <div class="confirm-icon" [class.danger]="data.danger">
        <span class="material-icons">{{ data.icon || (data.danger ? 'warning_amber' : 'help_outline') }}</span>
      </div>
      <h2 mat-dialog-title class="confirm-title">{{ data.title }}</h2>
      <div mat-dialog-content class="confirm-content">
        <p class="confirm-message">{{ data.message }}</p>
        <p *ngIf="data.detail" class="confirm-detail">{{ data.detail }}</p>
      </div>
      <div mat-dialog-actions class="confirm-actions" align="end">
        <button mat-stroked-button class="btn-secondary" (click)="onCancel()">
          <span class="material-icons">close</span> {{ data.cancelText || 'Cancel' }}
        </button>
        <button mat-flat-button color="primary" [class.danger]="data.danger"
                class="btn-confirm" (click)="onConfirm()">
          <span class="material-icons">{{ data.danger ? 'delete' : 'check' }}</span>
          {{ data.confirmText || 'Confirm' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .confirm-dialog { font-family: inherit; padding: 8px 0 0; }
    .confirm-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #ecfdf5; color: #0d9488; margin: 4px auto 14px; }
    .confirm-icon .material-icons { font-size: 28px; }
    .confirm-icon.danger { background: #fef2f2; color: #dc2626; }
    .confirm-title { text-align: center; font-size: 19px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
    .confirm-content { text-align: center; color: #475569; font-size: 14px; padding: 0 8px; }
    .confirm-message { margin: 0 0 4px; line-height: 1.5; }
    .confirm-detail { margin: 0; font-size: 12.5px; color: #64748b; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 8px 10px; word-break: break-word; }
    .confirm-actions { justify-content: center; gap: 10px; padding: 16px 8px 6px; }
    .btn-secondary { border-color: #e2e8f0; color: #475569; }
    .btn-confirm { background: #0d9488; color: #fff; }
    .btn-confirm.danger { background: #dc2626; }
    .btn-confirm span, .btn-secondary span { margin-right: 4px; font-size: 16px; }
  `],
})
export class ConfirmationDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ConfirmationOptions,
    private dialogRef: MatDialogRef<ConfirmationDialogComponent>,
  ) {}

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}

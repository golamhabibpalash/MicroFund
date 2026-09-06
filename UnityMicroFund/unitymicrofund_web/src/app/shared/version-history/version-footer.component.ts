import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

import { VersioningService } from '../../core/services/versioning.service';
import { VersionHistoryDialogComponent } from './version-history-dialog.component';

/**
 * The small version badge pinned to the bottom of the app shell. Clicking it
 * opens the full, scrollable release history in a modal.
 */
@Component({
  selector: 'app-version-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <footer class="version-footer">
      <button
        type="button"
        class="version-link"
        [disabled]="!version"
        (click)="openHistory()"
        [attr.aria-label]="version ? 'View version history, current version ' + version : 'Version history'">
        <span class="material-icons">tag</span>
        <span class="version-text">{{ version ? 'v' + version : 'Version' }}</span>
      </button>
    </footer>
  `,
  styles: [`
    .version-footer {
      display: flex; justify-content: center;
      padding: var(--space-3) var(--space-4) var(--space-4);
    }
    .version-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px;
      background: var(--color-surface);
      border: 1px solid var(--color-border-light);
      border-radius: 100px;
      color: var(--text-muted);
      font-family: inherit; font-size: var(--text-xs); font-weight: 600; letter-spacing: 0.3px;
      cursor: pointer;
      transition: all var(--transition-fast);
    }
    .version-link:hover:not(:disabled) {
      color: var(--color-accent);
      border-color: var(--color-accent);
      background: var(--color-background-alt);
    }
    .version-link:disabled { opacity: 0.6; cursor: default; }
    .version-link .material-icons { font-size: 14px; }
  `],
})
export class VersionFooterComponent implements OnInit {
  version: string | null = null;

  constructor(
    private versioning: VersioningService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.versioning.getCurrent().subscribe({
      next: (v) => (this.version = v?.version ?? null),
      error: () => (this.version = null),
    });
  }

  openHistory(): void {
    this.dialog.open(VersionHistoryDialogComponent, {
      width: '640px',
      maxWidth: '94vw',
      autoFocus: false,
      panelClass: 'version-history-panel',
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { AppVersion, VersionChangeType, VersioningService } from '../../core/services/versioning.service';

@Component({
  selector: 'app-version-history-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="vh">
      <header class="vh-header">
        <div class="vh-title">
          <span class="material-icons">history</span>
          <div>
            <h2>Version History</h2>
            <p *ngIf="current">You're on <strong>v{{ current.version }}</strong> &mdash; {{ current.title }}</p>
          </div>
        </div>
        <button class="vh-close" (click)="close()" aria-label="Close">
          <span class="material-icons">close</span>
        </button>
      </header>

      <div class="vh-body" mat-dialog-content>
        <div *ngIf="loading" class="vh-state">
          <div class="spinner"></div>
          <p>Loading release history&hellip;</p>
        </div>

        <div *ngIf="!loading && versions.length === 0" class="vh-state">
          <span class="material-icons">inbox</span>
          <p>No version history recorded yet.</p>
        </div>

        <ol class="vh-timeline" *ngIf="!loading && versions.length > 0">
          <li class="vh-item" *ngFor="let v of versions" [class.is-current]="v.isCurrent">
            <div class="vh-rail">
              <span class="vh-dot"></span>
              <span class="vh-line"></span>
            </div>
            <div class="vh-card">
              <div class="vh-card-head">
                <span class="vh-badge">v{{ v.version }}</span>
                <span class="vh-current-tag" *ngIf="v.isCurrent">Current</span>
                <span class="vh-date">{{ v.releaseDate | date: 'mediumDate' }}</span>
              </div>
              <h3 class="vh-card-title">{{ v.title }}</h3>
              <p class="vh-card-summary" *ngIf="v.summary">{{ v.summary }}</p>
              <ul class="vh-changes">
                <li *ngFor="let c of v.changes">
                  <span class="vh-chip" [ngClass]="chipClass(c.type)">{{ c.type }}</span>
                  <span class="vh-change-text">{{ c.description }}</span>
                </li>
              </ul>
            </div>
          </li>
        </ol>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .vh { display: flex; flex-direction: column; max-height: 82vh; font-family: inherit; }

    .vh-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: var(--space-4); padding: var(--space-5) var(--space-5) var(--space-4);
      border-bottom: 1px solid var(--color-border-light);
    }
    .vh-title { display: flex; gap: var(--space-3); }
    .vh-title > .material-icons {
      color: var(--color-accent); font-size: 22px; margin-top: 2px;
    }
    .vh-title h2 { margin: 0; font-size: var(--text-xl); font-weight: 700; color: var(--text-primary); }
    .vh-title p { margin: 2px 0 0; font-size: var(--text-sm); color: var(--text-muted); }
    .vh-close {
      flex-shrink: 0; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-md);
      color: var(--text-muted); cursor: pointer; transition: all var(--transition-fast);
    }
    .vh-close:hover { background: var(--color-background-alt); color: var(--text-primary); }

    .vh-body { padding: var(--space-5); overflow-y: auto; }

    .vh-state { text-align: center; padding: var(--space-8) var(--space-4); color: var(--text-light); }
    .vh-state .material-icons { font-size: 40px; opacity: 0.4; }
    .vh-state .spinner {
      width: 28px; height: 28px; margin: 0 auto var(--space-3);
      border: 3px solid var(--color-border); border-top-color: var(--color-accent);
      border-radius: 50%; animation: vh-spin 0.8s linear infinite;
    }
    @keyframes vh-spin { to { transform: rotate(360deg); } }

    .vh-timeline { list-style: none; margin: 0; padding: 0; }
    .vh-item { display: grid; grid-template-columns: 22px 1fr; gap: var(--space-3); }

    .vh-rail { position: relative; display: flex; flex-direction: column; align-items: center; }
    .vh-dot {
      width: 12px; height: 12px; border-radius: 50%; margin-top: 6px; flex-shrink: 0;
      background: var(--color-border); border: 2px solid var(--color-surface);
      box-shadow: 0 0 0 2px var(--color-border);
    }
    .vh-item.is-current .vh-dot { background: var(--color-accent); box-shadow: 0 0 0 2px var(--color-accent); }
    .vh-line { flex: 1; width: 2px; background: var(--color-border-light); margin: 4px 0; }
    .vh-item:last-child .vh-line { display: none; }

    .vh-card {
      background: var(--color-surface); border: 1px solid var(--color-border-light);
      border-radius: var(--radius-lg); padding: var(--space-4);
      margin-bottom: var(--space-4);
    }
    .vh-item.is-current .vh-card { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent) inset; }

    .vh-card-head { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; margin-bottom: 6px; }
    .vh-badge {
      font-weight: 700; font-size: var(--text-xs); letter-spacing: 0.3px;
      padding: 3px 8px; border-radius: var(--radius-sm);
      background: var(--color-background-alt); color: var(--text-primary);
    }
    .vh-item.is-current .vh-badge { background: var(--brand-gradient); color: #fff; }
    .vh-current-tag {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px;
      color: var(--color-accent); border: 1px solid var(--color-accent);
      padding: 2px 6px; border-radius: 100px;
    }
    .vh-date { margin-left: auto; font-size: var(--text-xs); color: var(--text-light); }

    .vh-card-title { margin: 0 0 4px; font-size: var(--text-base); font-weight: 600; color: var(--text-primary); }
    .vh-card-summary { margin: 0 0 10px; font-size: var(--text-sm); color: var(--text-muted); line-height: 1.5; }

    .vh-changes { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .vh-changes li { display: flex; align-items: flex-start; gap: var(--space-2); font-size: var(--text-sm); }
    .vh-change-text { color: var(--text-primary); line-height: 1.45; }

    .vh-chip {
      flex-shrink: 0; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      padding: 2px 7px; border-radius: 100px; margin-top: 1px; min-width: 62px; text-align: center;
    }
    .vh-chip.feature { background: #dcfce7; color: #15803d; }
    .vh-chip.improvement { background: #e0f2fe; color: #0369a1; }
    .vh-chip.fix { background: #fef3c7; color: #b45309; }
    .vh-chip.docs { background: #ede9fe; color: #6d28d9; }
    .vh-chip.chore { background: #f1f5f9; color: #475569; }

    @media (max-width: 560px) {
      .vh-chip { min-width: 0; }
      .vh-date { margin-left: 0; width: 100%; }
    }
  `],
})
export class VersionHistoryDialogComponent implements OnInit {
  versions: AppVersion[] = [];
  current: AppVersion | null = null;
  loading = true;

  constructor(
    private versioning: VersioningService,
    private dialogRef: MatDialogRef<VersionHistoryDialogComponent>,
  ) {}

  ngOnInit(): void {
    this.versioning.getHistory().subscribe({
      next: (versions) => {
        this.versions = versions;
        this.current = versions.find((v) => v.isCurrent) ?? versions[0] ?? null;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  chipClass(type: VersionChangeType): string {
    return type.toLowerCase();
  }

  close(): void {
    this.dialogRef.close();
  }
}

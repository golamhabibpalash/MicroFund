import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat-card" [class.primary]="primary" [style.--accent-color]="color">
      <div class="stat-icon-wrapper">
        <div class="stat-icon" [style.background]="gradient">
          <span class="material-icons">{{ icon }}</span>
        </div>
        <div class="stat-glow" *ngIf="primary"></div>
      </div>
      <div class="stat-content">
        <span class="stat-label">{{ label }}</span>
        <span class="stat-value">{{ value }}</span>
        <div class="stat-trend" *ngIf="trend" [class.positive]="(trendValue ?? 0) >= 0" [class.negative]="(trendValue ?? 0) < 0">
          <span class="material-icons">{{ (trendValue ?? 0) >= 0 ? 'trending_up' : 'trending_down' }}</span>
          <span>{{ trend }}</span>
        </div>
        <div class="stat-detail" *ngIf="detail">{{ detail }}</div>
      </div>
    </div>
  `,
  styles: [`
    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04);
      transition: all 0.25s ease;
      display: flex;
      gap: 16px;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
    }
    .stat-card.primary {
      background: linear-gradient(135deg, var(--accent-color, #667eea), var(--accent-color-2, #764ba2));
      color: white;
    }
    .stat-card.primary .stat-label { color: rgba(255,255,255,0.85); }
    .stat-card.primary .stat-value { color: white; }
    .stat-card.primary .stat-detail { color: rgba(255,255,255,0.7); }
    .stat-card.primary .stat-trend { background: rgba(255,255,255,0.2); color: #fff; }
    .stat-icon-wrapper { position: relative; }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--accent-color, #667eea);
      flex-shrink: 0;
    }
    .stat-card:not(.primary) .stat-icon {
      background: linear-gradient(135deg, var(--accent-color, #667eea), var(--accent-color-2, #667eea));
      color: white;
    }
    .stat-icon .material-icons { font-size: 24px; }
    .stat-glow {
      position: absolute;
      top: -16px;
      right: -16px;
      width: 64px;
      height: 64px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      filter: blur(16px);
    }
    .stat-content { flex: 1; display: flex; flex-direction: column; justify-content: center; min-width: 0; }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 2px 0;
      line-height: 1.2;
      word-break: break-word;
    }
    .stat-detail { font-size: 12px; color: #999; }
    .stat-trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 16px;
      margin-top: 6px;
      background: #e8f5e9;
      color: #27ae60;
      font-weight: 500;
      width: fit-content;
    }
    .stat-trend.negative { background: #ffebee; color: #e74c3c; }
    .stat-trend .material-icons { font-size: 14px; }

    @media (max-width: 1200px) {
      .stat-card { padding: 16px; gap: 14px; }
      .stat-icon { width: 44px; height: 44px; }
      .stat-icon .material-icons { font-size: 22px; }
      .stat-value { font-size: 22px; }
    }

    @media (max-width: 768px) {
      .stat-card { padding: 14px; gap: 12px; border-radius: 12px; }
      .stat-icon { width: 40px; height: 40px; border-radius: 10px; }
      .stat-icon .material-icons { font-size: 20px; }
      .stat-value { font-size: 20px; }
      .stat-label { font-size: 11px; }
    }

    @media (max-width: 576px) {
      .stat-card { padding: 12px; gap: 10px; flex-direction: row; }
      .stat-icon { width: 36px; height: 36px; border-radius: 8px; }
      .stat-icon .material-icons { font-size: 18px; }
      .stat-value { font-size: 18px; margin: 2px 0; }
      .stat-label { font-size: 10px; }
      .stat-trend { font-size: 10px; padding: 2px 6px; }
    }

    @media (max-width: 480px) {
      .stat-card { padding: 10px; gap: 8px; }
      .stat-icon { width: 32px; height: 32px; }
      .stat-icon .material-icons { font-size: 16px; }
      .stat-value { font-size: 16px; }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class StatCardComponent {
  @Input() icon = 'analytics';
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() trend?: string;
  @Input() trendValue?: number;
  @Input() detail?: string;
  @Input() primary = false;
  @Input() color = '#667eea';
  @Input() color2 = '#764ba2';

  get gradient(): string {
    return `linear-gradient(135deg, ${this.color}, ${this.color2})`;
  }
}

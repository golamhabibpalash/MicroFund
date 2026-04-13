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
      border-radius: 20px;
      padding: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      transition: all 0.3s ease;
      display: flex;
      gap: 20px;
    }
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(102, 126, 234, 0.15);
    }
    .stat-card.primary {
      background: linear-gradient(135deg, var(--accent-color, #667eea), var(--accent-color-2, #764ba2));
      color: white;
    }
    .stat-card.primary .stat-label { color: rgba(255,255,255,0.8); }
    .stat-card.primary .stat-value { color: white; }
    .stat-card.primary .stat-detail { color: rgba(255,255,255,0.7); }
    .stat-card.primary .stat-trend { background: rgba(255,255,255,0.2); }
    .stat-icon-wrapper { position: relative; }
    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
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
    .stat-icon .material-icons { font-size: 28px; }
    .stat-glow {
      position: absolute;
      top: -20px;
      right: -20px;
      width: 80px;
      height: 80px;
      background: rgba(255,255,255,0.1);
      border-radius: 50%;
      filter: blur(20px);
    }
    .stat-content { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .stat-label {
      font-size: 13px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 4px 0;
    }
    .stat-detail { font-size: 12px; color: #999; }
    .stat-trend {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 20px;
      margin-top: 8px;
      background: #e8f5e9;
      color: #27ae60;
      font-weight: 500;
    }
    .stat-trend.negative { background: #ffebee; color: #e74c3c; }
    .stat-trend .material-icons { font-size: 14px; }
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

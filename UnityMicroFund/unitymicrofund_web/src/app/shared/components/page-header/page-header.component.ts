import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="header-content">
        <div class="title-section" *ngIf="title">
          <div class="icon-wrapper" *ngIf="icon" [style.background]="iconColor">
            <span class="material-icons">{{ icon }}</span>
          </div>
          <div class="title-text">
            <h1>{{ title }}</h1>
            <p *ngIf="subtitle">{{ subtitle }}</p>
          </div>
        </div>
        <ng-content select="[header-extra]"></ng-content>
      </div>
      <div class="header-actions">
        <ng-content select="[actions]"></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header-content { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .title-section { display: flex; align-items: center; gap: 12px; }
    .icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      flex-shrink: 0;
    }
    .icon-wrapper .material-icons { font-size: 24px; }
    .title-text h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0;
      line-height: 1.2;
    }
    .title-text p {
      font-size: 14px;
      color: #666;
      margin: 4px 0 0 0;
    }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }

    @media (max-width: 768px) {
      .page-header { margin-bottom: 20px; }
      .icon-wrapper { width: 42px; height: 42px; border-radius: 10px; }
      .icon-wrapper .material-icons { font-size: 22px; }
      .title-text h1 { font-size: 22px; }
    }

    @media (max-width: 576px) {
      .page-header { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 16px; }
      .header-content { gap: 12px; }
      .icon-wrapper { width: 38px; height: 38px; }
      .icon-wrapper .material-icons { font-size: 20px; }
      .title-text h1 { font-size: 20px; }
      .title-text p { font-size: 13px; }
      .header-actions { justify-content: stretch; }
      .header-actions ::ng-deep button, .header-actions ::ng-deep .btn { flex: 1; justify-content: center; }
    }

    @media (max-width: 480px) {
      .title-text h1 { font-size: 18px; }
      .title-text p { font-size: 12px; }
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() iconColor = 'linear-gradient(135deg, #667eea, #764ba2)';
}

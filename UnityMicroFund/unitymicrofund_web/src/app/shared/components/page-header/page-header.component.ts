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
      margin-bottom: 32px;
    }
    .header-content { display: flex; align-items: center; gap: 24px; }
    .title-section { display: flex; align-items: center; gap: 16px; }
    .icon-wrapper {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }
    .icon-wrapper .material-icons { font-size: 28px; }
    .title-text h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 0;
    }
    .title-text p {
      font-size: 14px;
      color: #666;
      margin: 4px 0 0 0;
    }
    .header-actions { display: flex; gap: 12px; }
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

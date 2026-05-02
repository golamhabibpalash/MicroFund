import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ParamBusConfigService, ParamBusConfig, UpdateParamBusConfig } from '../../core/services/param-bus-config.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-business-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-container">
      <div class="config-header">
        <div class="header-left">
          <h2>Business Configuration</h2>
          <p>Manage system parameters and settings</p>
        </div>
      </div>

      <div class="config-content">
        <div *ngIf="loading" class="loading">Loading...</div>
        
        <table class="config-table" *ngIf="!loading">
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
              <th>Description</th>
              <th>Status</th>
              <th>Modified By</th>
              <th>Last Modified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let config of configs">
              <ng-container *ngIf="editingId !== config.id; else editRow">
                <td><strong>{{ config.name }}</strong></td>
                <td>{{ config.value }}</td>
                <td>{{ config.description || '-' }}</td>
                <td>
                  <span class="status-badge" [class.active]="config.status" [class.inactive]="!config.status">
                    {{ config.status ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td>{{ config.lastModifiedBy || 'System' }}</td>
                <td>{{ config.lastModifiedDate | date:'medium' }}</td>
                <td>
                  <button class="btn-edit" (click)="startEdit(config)">Edit</button>
                  <button class="btn-toggle" (click)="toggleStatus(config.id)">
                    {{ config.status ? 'Disable' : 'Enable' }}
                  </button>
                </td>
              </ng-container>
              <ng-template #editRow>
                <td><strong>{{ editConfig.name }}</strong></td>
                <td>
                  <input type="text" [(ngModel)]="editConfig.value" class="form-input">
                </td>
                <td>
                  <input type="text" [(ngModel)]="editConfig.description" class="form-input">
                </td>
                <td>
                  <label class="toggle-switch">
                    <input type="checkbox" [(ngModel)]="editConfig.status">
                    <span class="slider"></span>
                  </label>
                </td>
                <td>{{ config.lastModifiedBy || 'System' }}</td>
                <td>{{ config.lastModifiedDate | date:'medium' }}</td>
                <td>
                  <button class="btn-save" (click)="saveConfig()">Save</button>
                  <button class="btn-cancel" (click)="cancelEdit()">Cancel</button>
                </td>
              </ng-template>
            </tr>
          </tbody>
        </table>

        <div *ngIf="!loading && configs.length === 0" class="no-data">
          No configurations found.
        </div>
      </div>
    </div>
  `,
  styles: [`
    .config-container { padding: 20px; }
    .config-header { margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
    .header-left h2 { margin: 0 0 8px 0; color: #333; }
    .header-left p { margin: 0; color: #666; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .config-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .config-table th { background: #1976d2; color: white; padding: 12px; text-align: left; font-weight: 500; }
    .config-table td { padding: 12px; border-bottom: 1px solid #eee; }
    .config-table tr:hover { background: #f5f5f5; }
    .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .status-badge.active { background: #e8f5e9; color: #2e7d32; }
    .status-badge.inactive { background: #ffebee; color: #c62828; }
    .btn-edit, .btn-toggle, .btn-save, .btn-cancel { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; margin-right: 8px; font-size: 13px; }
    .btn-edit { background: #1976d2; color: white; }
    .btn-toggle { background: #ff9800; color: white; }
    .btn-save { background: #4caf50; color: white; }
    .btn-cancel { background: #9e9e9e; color: white; }
    .form-input { padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; }
    .toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.3s; border-radius: 20px; }
    .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: 0.3s; border-radius: 50%; }
    input:checked + .slider { background-color: #4caf50; }
    input:checked + .slider:before { transform: translateX(20px); }
    .no-data { text-align: center; padding: 40px; color: #999; }
  `]
})
export class BusinessConfigComponent implements OnInit, AfterViewInit, OnDestroy {
  configs: ParamBusConfig[] = [];
  editingId: string | null = null;
  editConfig: any = {};
  loading = true;
  private routeSubscription: any;

  constructor(
    private configService: ParamBusConfigService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadConfigs();
    
    this.routeSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.loadConfigs();
    });
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  loadConfigs(): void {
    this.loading = true;
    console.log('Loading configs...');
    this.configService.getAll().subscribe({
      next: (data) => {
        console.log('Configs loaded:', data);
        this.configs = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load configurations:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        this.toastService.error('Failed to load: ' + (err.message || err.statusText || 'Unknown error'));
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  startEdit(config: ParamBusConfig): void {
    this.editingId = config.id;
    this.editConfig = {
      name: config.name,
      value: config.value,
      description: config.description,
      status: config.status
    };
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editConfig = {};
  }

  saveConfig(): void {
    if (!this.editingId) return;

    const updateData: UpdateParamBusConfig = {
      value: this.editConfig.value,
      description: this.editConfig.description,
      status: this.editConfig.status
    };

    this.configService.update(this.editingId, updateData).subscribe({
      next: () => {
        this.toastService.success('Configuration updated successfully');
        this.loadConfigs();
        this.cancelEdit();
      },
      error: () => this.toastService.error('Failed to update configuration')
    });
  }

  toggleStatus(id: string): void {
    this.configService.toggleStatus(id).subscribe({
      next: () => {
        this.toastService.success('Status updated successfully');
        this.loadConfigs();
      },
      error: () => this.toastService.error('Failed to update status')
    });
  }
}
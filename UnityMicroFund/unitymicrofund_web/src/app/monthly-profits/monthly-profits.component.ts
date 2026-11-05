import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { filter, Observable, Subject, takeUntil } from 'rxjs';
import {
  CalculateProfitRequest,
  MonthlyProfitDistribution,
  MonthlyProfitDistributionSummary,
  MonthlyProfitLine,
  MonthlyProfitPreview,
  MonthlyProfitService,
  ProfitDistributionType,
  ProfitEligibleProject,
} from '../core/services/monthly-profit.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmationService } from '../shared/confirmation/confirmation.service';
import { DraggableModalDirective } from '../shared/directives/draggable-modal.directive';
import { BdtCurrencyPipe, formatBdt } from '../shared/pipes/bdt-currency.pipe';

interface CreateForm {
  investmentId: string | null;
  year: number;
  month: number;
  rate: number | null;
  profitAmount: number | null;
  profitDate: string;
  notes: string;
}

/**
 * Per-project profit distribution, in two flavours:
 *  - Monthly: a monthly % of each holding for one project and one month, pro-rated by
 *    days held. A project is paid at most once per month.
 *  - Project-based: a realised profit amount for one open-ended project; maintenance is
 *    taken first and the rest is split by shares.
 * Both go Draft -> Finalized -> Paid to member wallets.
 */
@Component({
  selector: 'app-monthly-profits',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BdtCurrencyPipe, DraggableModalDirective],
  template: `
    <div class="mp-wrapper">
      <header class="top-header">
        <div class="header-left">
          <div>
            <h1>Profit Distribution</h1>
            <p class="subtitle">Pay monthly profit or share a project's realised profit with its shareholders</p>
          </div>
          <button class="btn-refresh" (click)="reload()" title="Refresh" aria-label="Refresh">
            <span class="material-icons">refresh</span>
          </button>
        </div>
        <div class="header-actions">
          <button class="btn-outline" (click)="openCreate('ProjectBased')">
            <span class="material-icons">savings</span>
            Project Profit
          </button>
          <button class="btn-primary" (click)="openCreate('Monthly')">
            <span class="material-icons">calendar_month</span>
            Monthly Profit
          </button>
        </div>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon blue"><span class="material-icons">receipt_long</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ distributions.length }}</span>
            <span class="stat-label">Distributions</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><span class="material-icons">trending_up</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalProfit | bdtCurrency }}</span>
            <span class="stat-label">Profit Calculated</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal"><span class="material-icons">check_circle</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalPaid | bdtCurrency }}</span>
            <span class="stat-label">Paid to Wallets</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><span class="material-icons">pending_actions</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalPending | bdtCurrency }}</span>
            <span class="stat-label">Pending Payment</span>
          </div>
        </div>
      </div>

      <!-- Projects on a periodic payout -->
      <section class="content-section">
        <div class="section-header">
          <div>
            <h2>Projects</h2>
            <p class="section-sub">
              Projects paid monthly or by entered profit. Set a project's payout type in
              <a routerLink="/investments">Investments</a> → Edit → Profit Payout.
            </p>
          </div>
        </div>

        <div class="project-grid" *ngIf="eligibleProjects.length > 0">
          <div class="project-card" *ngFor="let p of eligibleProjects" [class.inactive]="!p.canDistribute">
            <div class="pc-top">
              <span class="type-badge" [ngClass]="p.profitPayoutMode === 'Monthly' ? 'monthly' : 'project'">
                <span class="material-icons">{{ p.profitPayoutMode === 'Monthly' ? 'calendar_month' : 'savings' }}</span>
                {{ p.profitPayoutMode === 'Monthly' ? (p.monthlyProfitRate ?? 0) + '% monthly' : 'Project profit' }}
              </span>
              <span class="pc-status" [class.active]="p.canDistribute">{{ p.status }}</span>
            </div>
            <h3 class="pc-name" [title]="p.name">{{ p.name }}</h3>
            <div class="pc-facts">
              <div><span>Invested</span><strong>{{ p.totalInvested | bdtCurrency }}</strong></div>
              <div><span>Paid out</span><strong class="profit">{{ p.totalDistributed | bdtCurrency }}</strong></div>
              <div><span>Last payout</span><strong>{{ p.lastDistributionLabel || 'Never' }}</strong></div>
              <div *ngIf="p.profitPayoutMode === 'Monthly' && p.nextMonth">
                <span>Next month</span><strong>{{ monthName(p.nextMonth) }} {{ p.nextYear }}</strong>
              </div>
              <div *ngIf="p.profitPayoutMode === 'ProjectBased'">
                <span>Maintenance</span><strong>{{ p.maintenancePercentage }}%</strong>
              </div>
            </div>
            <button class="btn-card" *ngIf="p.canDistribute" (click)="openCreate(p.profitPayoutMode, p)">
              <span class="material-icons">{{ p.profitPayoutMode === 'Monthly' ? 'calculate' : 'add_card' }}</span>
              {{ p.profitPayoutMode === 'Monthly' ? 'Calculate monthly profit' : 'Add profit' }}
            </button>
            <span class="pc-hint" *ngIf="!p.canDistribute">Payouts are available once the project is Active.</span>
          </div>
        </div>

        <div class="empty-block" *ngIf="!loadingProjects && eligibleProjects.length === 0">
          <span class="material-icons">tune</span>
          <div>
            <strong>No project is set up for monthly or project-based profit yet.</strong>
            <p>In <a routerLink="/investments">Investments</a>, edit a project and set <em>Profit Payout</em> to
              <strong>Monthly % payout</strong> or <strong>Project-based</strong>.</p>
          </div>
        </div>
      </section>

      <!-- History -->
      <section class="content-section">
        <div class="section-header">
          <h2>Distribution History</h2>
          <div class="filters">
            <label>
              <span>Type</span>
              <select [(ngModel)]="filterType" (ngModelChange)="load()">
                <option value="">All</option>
                <option value="Monthly">Monthly</option>
                <option value="ProjectBased">Project profit</option>
              </select>
            </label>
            <label>
              <span>Year</span>
              <input type="number" [(ngModel)]="filterYear" (change)="load()" placeholder="All" />
            </label>
            <label>
              <span>Status</span>
              <select [(ngModel)]="filterStatus" (ngModelChange)="load()">
                <option value="">All</option>
                <option value="Draft">Draft</option>
                <option value="Distributed">Finalized</option>
                <option value="Paid">Paid</option>
              </select>
            </label>
            <button class="btn-clear" *ngIf="filterYear || filterStatus || filterType" (click)="clearFilters()">
              <span class="material-icons">restart_alt</span> Clear
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="mp-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Period</th>
                <th>Type</th>
                <th class="num">Basis</th>
                <th class="num">Members</th>
                <th class="num">Profit</th>
                <th class="num">Paid / Pending</th>
                <th>Status</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let d of distributions" class="clickable" (click)="openDetail(d.id)">
                <td class="project-cell">
                  <strong class="truncate" [title]="d.projectNames.join(', ')">{{ projectLabel(d) }}</strong>
                  <span class="sub" *ngIf="d.notes" [title]="d.notes">{{ d.notes }}</span>
                </td>
                <td>{{ periodLabel(d) }}</td>
                <td>
                  <span class="type-badge" [ngClass]="d.type === 'Monthly' ? 'monthly' : 'project'">
                    {{ d.type === 'Monthly' ? 'Monthly' : 'Project profit' }}
                  </span>
                </td>
                <td class="num">
                  <ng-container *ngIf="d.type === 'Monthly'">{{ d.rate != null ? d.rate + '%' : 'Mixed' }}</ng-container>
                  <ng-container *ngIf="d.type === 'ProjectBased'">
                    {{ d.grossProfitAmount || 0 | bdtCurrency }}
                    <span class="sub-num" *ngIf="d.maintenanceAmount">− {{ d.maintenanceAmount | bdtCurrency }} maintenance</span>
                  </ng-container>
                </td>
                <td class="num">{{ d.eligibleMemberCount }}</td>
                <td class="num strong">{{ d.totalProfitAmount | bdtCurrency }}</td>
                <td class="num">
                  <span class="paid-amount">{{ d.totalPaidAmount | bdtCurrency }}</span>
                  <span class="pending-amount" *ngIf="d.pendingAmount > 0">{{ d.pendingAmount | bdtCurrency }} pending</span>
                </td>
                <td>
                  <div class="badge-stack">
                    <span class="status-badge" [ngClass]="statusClass(d.status)">{{ statusLabel(d.status) }}</span>
                    <span class="payment-badge" [ngClass]="paymentClass(d.paymentStatus)">{{ paymentLabel(d.paymentStatus) }}</span>
                  </div>
                </td>
                <td class="actions"><span class="material-icons chevron">chevron_right</span></td>
              </tr>
              <tr *ngIf="!loading && distributions.length === 0">
                <td colspan="9" class="empty-row">
                  <span class="material-icons">payments</span>
                  <span>No profit distributions yet</span>
                </td>
              </tr>
              <tr *ngIf="loading">
                <td colspan="9" class="empty-row">
                  <span class="material-icons spin">sync</span>
                  <span>Loading distributions...</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- ===================== Create ===================== -->
      <div class="modal-overlay" *ngIf="showCreate" (click)="closeCreate()">
        <div class="modal-content modal-wide" (click)="$event.stopPropagation()" appDraggableModal>
          <div class="modal-header">
            <div>
              <h3>New Profit Distribution</h3>
              <p>Choose a project, calculate and review the split, then save it as a draft. Nobody is paid until you finalize and pay.</p>
            </div>
            <button class="btn-icon" (click)="closeCreate()" aria-label="Close">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="type-tabs" role="tablist">
            <button role="tab" [class.active]="createType === 'Monthly'" [attr.aria-selected]="createType === 'Monthly'"
                    (click)="switchCreateType('Monthly')">
              <span class="material-icons">calendar_month</span>
              <span class="tab-text"><strong>Monthly profit</strong><small>A monthly % of each holding</small></span>
            </button>
            <button role="tab" [class.active]="createType === 'ProjectBased'" [attr.aria-selected]="createType === 'ProjectBased'"
                    (click)="switchCreateType('ProjectBased')">
              <span class="material-icons">savings</span>
              <span class="tab-text"><strong>Project profit</strong><small>Share a realised profit amount</small></span>
            </button>
          </div>

          <div class="modal-body">
            <div class="empty-block" *ngIf="projectsForType.length === 0">
              <span class="material-icons">tune</span>
              <div>
                <strong>No project uses {{ createType === 'Monthly' ? 'monthly profit' : 'project-based profit' }} yet.</strong>
                <p>In <a routerLink="/investments" (click)="closeCreate()">Investments</a>, edit the project and set
                  <em>Profit Payout</em> to <strong>{{ createType === 'Monthly' ? 'Monthly % payout' : 'Project-based' }}</strong>.</p>
              </div>
            </div>

            <ng-container *ngIf="projectsForType.length > 0">
              <label class="full-field">
                <span>Project *</span>
                <select [(ngModel)]="form.investmentId" (ngModelChange)="onProjectChange()">
                  <option [ngValue]="null" disabled>Select a project</option>
                  <option *ngFor="let p of projectsForType" [ngValue]="p.id" [disabled]="!p.canDistribute">
                    {{ p.name }}{{ p.canDistribute ? '' : ' — ' + p.status }}
                  </option>
                </select>
              </label>

              <div class="project-facts" *ngIf="chosenProject as p">
                <div><span>Capital invested</span><strong>{{ p.totalInvested | bdtCurrency }}</strong></div>
                <div><span>Shares sold</span><strong>{{ p.soldShares }}<ng-container *ngIf="p.totalShares"> / {{ p.totalShares }}</ng-container></strong></div>
                <div *ngIf="createType === 'Monthly'"><span>Default rate</span><strong>{{ p.monthlyProfitRate ?? 0 }}% / month</strong></div>
                <div *ngIf="createType === 'ProjectBased'"><span>Maintenance</span><strong>{{ p.maintenancePercentage }}%</strong></div>
                <div><span>Last payout</span><strong>{{ p.lastDistributionLabel || 'Never' }}</strong></div>
                <div><span>Paid out so far</span><strong class="profit">{{ p.totalDistributed | bdtCurrency }}</strong></div>
              </div>

              <div class="form-grid" *ngIf="createType === 'Monthly'">
                <label>
                  <span>Month *</span>
                  <select [(ngModel)]="form.month" (ngModelChange)="invalidatePreview()">
                    <option *ngFor="let m of months" [ngValue]="m.value" [disabled]="isFutureMonth(form.year, m.value)">{{ m.label }}</option>
                  </select>
                </label>
                <label>
                  <span>Year *</span>
                  <select [(ngModel)]="form.year" (ngModelChange)="onYearChange()">
                    <option *ngFor="let y of years" [ngValue]="y">{{ y }}</option>
                  </select>
                </label>
                <label>
                  <span>Rate for this month (%) *</span>
                  <input type="number" min="0.01" max="100" step="0.01" [(ngModel)]="form.rate" (ngModelChange)="invalidatePreview()" />
                  <small class="field-hint" *ngIf="chosenProject?.monthlyProfitRate != null">
                    Project default {{ chosenProject?.monthlyProfitRate }}%
                    <button type="button" class="link-btn" *ngIf="form.rate !== chosenProject?.monthlyProfitRate"
                            (click)="resetRate()">Reset</button>
                  </small>
                </label>
              </div>

              <div class="form-grid" *ngIf="createType === 'ProjectBased'">
                <label>
                  <span>Profit amount *</span>
                  <input type="number" min="0.01" step="0.01" [(ngModel)]="form.profitAmount"
                         (ngModelChange)="invalidatePreview()" placeholder="Before maintenance" />
                </label>
                <label>
                  <span>Profit date *</span>
                  <input type="date" [max]="today" [(ngModel)]="form.profitDate" (ngModelChange)="invalidatePreview()" />
                </label>
              </div>

              <label class="full-field">
                <span>Notes</span>
                <input type="text" maxlength="1000" [(ngModel)]="form.notes"
                       [placeholder]="createType === 'Monthly' ? 'Optional' : 'e.g. Harvest sale, rent for Q3'" />
              </label>

              <div class="alert error" *ngIf="calcError" role="alert">
                <span class="material-icons">error_outline</span><span>{{ calcError }}</span>
              </div>

              <div class="form-actions">
                <button class="btn-secondary" (click)="calculate()" [disabled]="previewing || !canCalculate()">
                  <span class="material-icons">calculate</span>
                  {{ previewing ? 'Calculating...' : 'Calculate' }}
                </button>
                <button class="btn-primary" (click)="saveDraft()" [disabled]="saving || !preview || preview.lines.length === 0">
                  <span class="material-icons">save</span>
                  {{ saving ? 'Saving...' : 'Save Draft' }}
                </button>
                <span class="step-hint" *ngIf="!preview && !calcError">Calculate to review the split before saving.</span>
              </div>
            </ng-container>

            <!-- Preview -->
            <ng-container *ngIf="preview">
              <div class="alert warn" *ngFor="let w of preview.warnings">
                <span class="material-icons">info</span><span>{{ w }}</span>
              </div>

              <div class="preview-panel">
                <div class="breakdown" *ngIf="preview.type === 'ProjectBased' && preview.lines.length > 0">
                  <div><span>Profit entered</span><strong>{{ preview.grossProfitAmount || 0 | bdtCurrency }}</strong></div>
                  <div class="op">−</div>
                  <div><span>Maintenance ({{ preview.maintenancePercentage || 0 }}%)</span><strong class="minus">{{ preview.maintenanceAmount || 0 | bdtCurrency }}</strong></div>
                  <div class="op">=</div>
                  <div><span>Investor pool</span><strong>{{ preview.investorProfitPool || 0 | bdtCurrency }}</strong></div>
                  <div class="op">→</div>
                  <div class="hl"><span>To {{ preview.eligibleMemberCount }} shareholder(s)</span><strong class="profit">{{ preview.totalProfitAmount | bdtCurrency }}</strong></div>
                  <div *ngIf="preview.undistributedRemainder"><span>Retained by organisation</span><strong>{{ preview.undistributedRemainder | bdtCurrency }}</strong></div>
                </div>

                <div class="breakdown" *ngIf="preview.type === 'Monthly' && preview.lines.length > 0">
                  <div><span>Period</span><strong>{{ monthName(preview.month) }} {{ preview.year }}</strong></div>
                  <div><span>Rate</span><strong>{{ preview.rate }}%</strong></div>
                  <div><span>Capital earning</span><strong>{{ preview.totalInvestmentAmount | bdtCurrency }}</strong></div>
                  <div class="hl"><span>To {{ preview.eligibleMemberCount }} shareholder(s)</span><strong class="profit">{{ preview.totalProfitAmount | bdtCurrency }}</strong></div>
                </div>

                <div class="table-container compact" *ngIf="preview.lines.length > 0">
                  <table class="mp-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th class="num">Invested</th>
                        <th class="num">Shares</th>
                        <th class="num" *ngIf="preview.type === 'ProjectBased'">Ownership</th>
                        <th class="num" *ngIf="preview.type === 'Monthly'">Days held</th>
                        <th class="num">Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let line of preview.lines">
                        <td>{{ line.memberName }}</td>
                        <td class="num">{{ line.investmentAmount | bdtCurrency }}</td>
                        <td class="num">{{ line.sharesOwned }}</td>
                        <td class="num" *ngIf="preview.type === 'ProjectBased'">{{ line.ownershipPercentage | number: '1.2-2' }}%</td>
                        <td class="num" *ngIf="preview.type === 'Monthly'">
                          <span [class.prorated]="isProrated(line)">{{ daysLabel(line) }}</span>
                        </td>
                        <td class="num profit">{{ line.profitAmount | bdtCurrency }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="empty-preview" *ngIf="preview.lines.length === 0">
                  <span class="material-icons">info</span>
                  No shareholder held this project during the selected period, so there is nothing to distribute.
                </div>
              </div>
            </ng-container>
          </div>
        </div>
      </div>

      <!-- ===================== Detail ===================== -->
      <div class="modal-overlay" *ngIf="showDetail && selected" (click)="closeDetail()">
        <div class="modal-content modal-wide" (click)="$event.stopPropagation()" appDraggableModal>
          <div class="modal-header">
            <div>
              <div class="title-row">
                <span class="type-badge" [ngClass]="selected.type === 'Monthly' ? 'monthly' : 'project'">
                  {{ selected.type === 'Monthly' ? 'Monthly' : 'Project profit' }}
                </span>
                <h3>{{ projectLabel(selected) }} · {{ periodLabel(selected) }}</h3>
              </div>
              <p>{{ detailSubtitle(selected) }}</p>
            </div>
            <button class="btn-icon" (click)="closeDetail()" aria-label="Close">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-stats">
              <div *ngIf="selected.type === 'Monthly'"><span>Capital earning</span><strong>{{ selected.totalInvestmentAmount | bdtCurrency }}</strong></div>
              <ng-container *ngIf="selected.type === 'ProjectBased'">
                <div><span>Profit entered</span><strong>{{ selected.grossProfitAmount || 0 | bdtCurrency }}</strong></div>
                <div><span>Maintenance ({{ selected.maintenancePercentage || 0 }}%)</span><strong class="pending">{{ selected.maintenanceAmount || 0 | bdtCurrency }}</strong></div>
              </ng-container>
              <div><span>To shareholders</span><strong class="profit">{{ selected.totalProfitAmount | bdtCurrency }}</strong></div>
              <div><span>Paid</span><strong class="paid">{{ selected.totalPaidAmount | bdtCurrency }}</strong></div>
              <div><span>Pending</span><strong class="pending">{{ selected.pendingAmount | bdtCurrency }}</strong></div>
              <div *ngIf="selected.undistributedRemainder"><span>Retained by organisation</span><strong>{{ selected.undistributedRemainder | bdtCurrency }}</strong></div>
            </div>

            <div class="status-row">
              <span class="status-badge" [ngClass]="statusClass(selected.status)">{{ statusLabel(selected.status) }}</span>
              <span class="payment-badge" [ngClass]="paymentClass(selected.paymentStatus)">{{ paymentLabel(selected.paymentStatus) }}</span>
              <span class="meta">Calculated by {{ selected.calculatedBy || 'System' }} on {{ selected.calculatedAt | date: 'medium' }}</span>
            </div>

            <!-- Draft editor -->
            <div class="draft-editor" *ngIf="selected.status === 'Draft'">
              <div class="form-grid">
                <label *ngIf="selected.type === 'Monthly'">
                  <span>Rate for {{ monthName(selected.month) }} (%)</span>
                  <input type="number" min="0.01" max="100" step="0.01" [(ngModel)]="draftRate" />
                </label>
                <ng-container *ngIf="selected.type === 'ProjectBased'">
                  <label>
                    <span>Profit amount</span>
                    <input type="number" min="0.01" step="0.01" [(ngModel)]="draftAmount" />
                  </label>
                  <label>
                    <span>Profit date</span>
                    <input type="date" [max]="today" [(ngModel)]="draftDate" />
                  </label>
                </ng-container>
              </div>
              <label class="full-field">
                <span>Notes</span>
                <textarea rows="2" maxlength="1000" [(ngModel)]="draftNotes"></textarea>
              </label>
              <div class="form-actions">
                <button class="btn-secondary" (click)="recalculateDraft()" [disabled]="working">
                  <span class="material-icons">calculate</span> Recalculate
                </button>
                <button class="btn-danger" (click)="deleteDraft()" [disabled]="working">
                  <span class="material-icons">delete</span> Delete Draft
                </button>
                <button class="btn-primary" (click)="distribute()" [disabled]="working">
                  <span class="material-icons">lock</span> Finalize
                </button>
              </div>
              <p class="hint">
                Finalizing locks these figures<ng-container *ngIf="selected.type === 'ProjectBased' && selected.maintenanceAmount">
                and posts the maintenance share to the project's maintenance account</ng-container>.
                Members are paid only when you choose “Pay”.
              </p>
            </div>

            <div class="detail-actions" *ngIf="selected.status !== 'Draft'">
              <button class="btn-primary" *ngIf="selected.pendingLineCount > 0" (click)="payAll()" [disabled]="working">
                <span class="material-icons">payments</span>
                {{ working ? 'Paying...' : 'Pay All Pending' }}
              </button>
              <span class="meta" *ngIf="selected.pendingLineCount === 0">Every member has been paid.</span>
              <span class="meta" *ngIf="selected.distributedBy">Finalized by {{ selected.distributedBy }} on {{ selected.distributedAt | date: 'medium' }}</span>
            </div>

            <h4 class="section-title">Members</h4>
            <div class="table-container compact">
              <table class="mp-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th *ngIf="selected.projectCount > 1">Project</th>
                    <th class="num">Invested</th>
                    <th class="num">Shares</th>
                    <th class="num" *ngIf="selected.type === 'Monthly'">Days held</th>
                    <th class="num">Profit</th>
                    <th>Payment</th>
                    <th class="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of selected.lines">
                    <td>{{ line.memberName }}</td>
                    <td *ngIf="selected.projectCount > 1" class="truncate" [title]="line.investmentName">{{ line.investmentName }}</td>
                    <td class="num">{{ line.investmentAmount | bdtCurrency }}</td>
                    <td class="num">{{ line.sharesOwned || '—' }}</td>
                    <td class="num" *ngIf="selected.type === 'Monthly'">
                      <span [class.prorated]="isProrated(line)">{{ daysLabel(line) }}</span>
                    </td>
                    <td class="num profit">{{ line.profitAmount | bdtCurrency }}</td>
                    <td>
                      <span class="line-badge" [class.paid]="line.status === 'Paid'" [class.pending]="line.status === 'Pending'">
                        {{ line.status }}
                      </span>
                      <span class="paid-at" *ngIf="line.paidAt">{{ line.paidAt | date: 'mediumDate' }}</span>
                    </td>
                    <td class="actions">
                      <button class="btn-small" *ngIf="line.status === 'Pending' && selected.status !== 'Draft'"
                              (click)="payLine(line)" [disabled]="working">
                        Pay
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <ng-container *ngIf="selected.transactions.length > 0">
              <h4 class="section-title">Wallet Transactions</h4>
              <div class="table-container compact">
                <table class="mp-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Description</th>
                      <th class="num">Amount</th>
                      <th>Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let tx of selected.transactions">
                      <td>{{ tx.memberName }}</td>
                      <td class="truncate" [title]="tx.description || ''">{{ tx.description || tx.investmentName }}</td>
                      <td class="num profit">{{ tx.amount | bdtCurrency }}</td>
                      <td>{{ tx.paidAt | date: 'medium' }}<span class="paid-at" *ngIf="tx.paidBy">by {{ tx.paidBy }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-container>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .mp-wrapper { padding: 24px; background: #f5f7fb; min-height: 100%; color: #1f2937; }
    .top-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #64748b; }
    .btn-primary, .btn-secondary, .btn-outline, .btn-danger, .btn-small, .btn-clear, .btn-refresh, .btn-icon, .btn-card {
      border: 0; cursor: pointer; font: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn-primary { background: #4f46e5; color: #fff; padding: 10px 16px; border-radius: 9px; font-weight: 600; }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-outline { background: #fff; color: #0f766e; border: 1px solid #99f6e4; padding: 9px 15px; border-radius: 9px; font-weight: 600; }
    .btn-outline:hover { background: #f0fdfa; }
    .btn-secondary { background: #eef2ff; color: #3730a3; padding: 9px 14px; border-radius: 8px; font-weight: 600; }
    .btn-danger { background: #fef2f2; color: #b91c1c; padding: 9px 14px; border-radius: 8px; font-weight: 600; }
    .btn-small { background: #4f46e5; color: #fff; padding: 5px 11px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .btn-small:disabled, .btn-primary:disabled, .btn-secondary:disabled, .btn-danger:disabled { opacity: .55; cursor: not-allowed; }
    .btn-refresh { background: #fff; color: #475569; width: 36px; height: 36px; border-radius: 9px; box-shadow: 0 1px 3px rgba(15,23,42,.1); }
    .btn-icon { background: transparent; color: #64748b; width: 32px; height: 32px; border-radius: 7px; }
    .btn-icon:hover { background: #f1f5f9; color: #1e293b; }
    .btn-clear { background: transparent; color: #4f46e5; font-size: 12px; font-weight: 600; }
    .link-btn { background: none; border: 0; padding: 0; margin-left: 6px; color: #4f46e5; font: inherit; font-weight: 600; cursor: pointer; }
    .material-icons { font-size: 19px; line-height: 1; }

    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
    .stat-card { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; box-shadow: 0 1px 2px rgba(15,23,42,.04); }
    .stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; flex: 0 0 auto; }
    .stat-icon.blue { background: #4f46e5; } .stat-icon.green { background: #16a34a; } .stat-icon.teal { background: #0d9488; } .stat-icon.amber { background: #d97706; }
    .stat-info { display: flex; flex-direction: column; min-width: 0; }
    .stat-value { font-size: 18px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stat-label { font-size: 12px; color: #64748b; }

    .content-section { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px; box-shadow: 0 1px 2px rgba(15,23,42,.04); margin-bottom: 20px; }
    .section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
    .section-header h2 { margin: 0; font-size: 17px; }
    .section-sub { margin: 4px 0 0; font-size: 12px; color: #64748b; }
    .section-sub a, .empty-block a { color: #4f46e5; font-weight: 600; text-decoration: none; }

    .type-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .type-badge .material-icons { font-size: 14px; }
    .type-badge.monthly { background: #eef2ff; color: #4338ca; }
    .type-badge.project { background: #ccfbf1; color: #0f766e; }

    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
    .project-card { border: 1px solid #e5e7eb; border-radius: 11px; padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #fff; }
    .project-card.inactive { opacity: .7; }
    .pc-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .pc-status { font-size: 11px; font-weight: 600; color: #64748b; }
    .pc-status.active { color: #15803d; }
    .pc-name { margin: 0; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pc-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    .pc-facts div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
    .pc-facts span { font-size: 11px; color: #94a3b8; }
    .pc-facts strong { font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .btn-card { margin-top: auto; background: #f8fafc; border: 1px solid #e2e8f0; color: #334155; border-radius: 8px; padding: 8px; font-size: 13px; font-weight: 600; }
    .btn-card:hover { background: #eef2ff; border-color: #c7d2fe; color: #3730a3; }
    .pc-hint { margin-top: auto; font-size: 11px; color: #94a3b8; }
    .empty-block { display: flex; gap: 12px; align-items: flex-start; padding: 16px; border: 1px dashed #cbd5e1; border-radius: 10px; background: #f8fafc; }
    .empty-block > .material-icons { color: #64748b; font-size: 24px; }
    .empty-block p { margin: 4px 0 0; font-size: 13px; color: #475569; }

    .filters { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
    .filters label { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #64748b; font-weight: 600; }
    .filters input, .filters select { width: 120px; border: 1px solid #d1d5db; border-radius: 7px; padding: 7px 8px; background: #fff; color: #1f2937; }
    .filters input[type=number] { width: 78px; }

    .table-container { overflow-x: auto; }
    .table-container.compact { max-height: 340px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 9px; }
    .mp-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .mp-table th, .mp-table td { padding: 10px 8px; text-align: left; border-bottom: 1px solid #eef2f7; vertical-align: middle; }
    .mp-table th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #64748b; font-weight: 700; background: #f8fafc; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
    .mp-table tbody tr:last-child td { border-bottom: 0; }
    .mp-table tbody tr:hover { background: #fafbff; }
    .mp-table tr.clickable { cursor: pointer; }
    .chevron { color: #cbd5e1; }
    .num { text-align: right !important; white-space: nowrap; }
    .strong { font-weight: 700; }
    .project-cell strong { display: block; }
    .sub { display: block; color: #94a3b8; font-size: 11px; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sub-num { display: block; color: #94a3b8; font-size: 11px; }
    .paid-amount { display: block; color: #15803d; font-weight: 600; }
    .pending-amount { display: block; color: #b45309; font-size: 11px; }
    .profit { color: #15803d; font-weight: 600; }
    .minus { color: #b45309; }
    .badge-stack { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .status-badge, .payment-badge, .line-badge { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .status-draft { background: #f1f5f9; color: #475569; }
    .status-distributed { background: #eef2ff; color: #3730a3; }
    .status-paid { background: #dcfce7; color: #166534; }
    .pay-notdistributed { background: #f8fafc; color: #64748b; }
    .pay-pending { background: #fef3c7; color: #92400e; }
    .pay-partiallypaid { background: #ffedd5; color: #9a3412; }
    .pay-paid { background: #dcfce7; color: #166534; }
    .line-badge.paid { background: #dcfce7; color: #166534; }
    .line-badge.pending { background: #fef3c7; color: #92400e; }
    .actions-col { width: 60px; text-align: center; }
    .actions { text-align: center; }
    .empty-row { text-align: center !important; color: #94a3b8; padding: 30px 8px !important; }
    .empty-row .material-icons { display: block; margin: 0 auto 6px; font-size: 28px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .truncate { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .prorated { color: #b45309; font-weight: 600; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.42); display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; z-index: 1000; overflow: auto; }
    .modal-content { background: #fff; border-radius: 14px; width: min(720px, 100%); box-shadow: 0 24px 80px rgba(15,23,42,.34); }
    .modal-content.modal-wide { width: min(920px, 100%); }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 18px 20px; border-bottom: 1px solid #eef2f7; }
    .modal-header h3 { margin: 0; font-size: 18px; }
    .modal-header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .modal-body { padding: 18px 20px 20px; }

    .type-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 14px 20px 0; }
    .type-tabs button { display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px 14px; border: 1.5px solid #e5e7eb; border-radius: 10px; background: #fff; cursor: pointer; font: inherit; color: #475569; }
    .type-tabs button .material-icons { font-size: 22px; color: #94a3b8; }
    .type-tabs button.active { border-color: #4f46e5; background: #f5f7ff; color: #1e1b4b; }
    .type-tabs button.active .material-icons { color: #4f46e5; }
    .tab-text { display: flex; flex-direction: column; }
    .tab-text small { font-size: 11px; color: #64748b; }

    .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
    .form-grid label, .full-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: #475569; font-weight: 600; }
    .form-grid input, .form-grid select, .full-field input, .full-field select, .full-field textarea { border: 1px solid #d1d5db; border-radius: 8px; padding: 9px 10px; font: inherit; color: #1f2937; background: #fff; }
    .full-field { margin-bottom: 12px; }
    .field-hint { font-size: 11px; font-weight: 500; color: #64748b; }
    .form-actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
    .step-hint { font-size: 12px; color: #64748b; }

    .project-facts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; padding: 12px; margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 10px; background: #f8fafc; }
    .project-facts div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .project-facts span { font-size: 11px; color: #64748b; }
    .project-facts strong { font-size: 13px; }

    .alert { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; border-radius: 8px; padding: 9px 11px; margin: 12px 0 0; }
    .alert .material-icons { font-size: 17px; }
    .alert.error { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; margin-bottom: 12px; }
    .alert.warn { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }

    .preview-panel { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; }
    .preview-panel .table-container.compact { border: 0; border-radius: 0; }
    .breakdown { display: flex; align-items: stretch; gap: 8px; flex-wrap: wrap; padding: 14px; background: #f8fafc; border-bottom: 1px solid #eef2f7; }
    .breakdown > div:not(.op) { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }
    .breakdown > div.hl { border-color: #86efac; background: #f0fdf4; }
    .breakdown span { font-size: 11px; color: #64748b; }
    .breakdown strong { font-size: 15px; }
    .breakdown .op { align-self: center; color: #94a3b8; font-weight: 700; }
    .empty-preview { padding: 14px; color: #64748b; font-size: 13px; display: flex; gap: 8px; align-items: center; }
    .section-title { margin: 18px 0 10px; font-size: 14px; }

    .detail-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
    .detail-stats div { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 9px; padding: 11px 12px; }
    .detail-stats span { display: block; font-size: 11px; color: #64748b; margin-bottom: 3px; }
    .detail-stats strong { font-size: 16px; }
    .detail-stats .paid { color: #15803d; } .detail-stats .pending { color: #b45309; }
    .status-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .meta { font-size: 11px; color: #64748b; }
    .draft-editor { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 16px; background: #fcfdff; }
    .hint { margin: 8px 0 0; font-size: 11px; color: #64748b; }
    .detail-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .paid-at { display: block; font-size: 10px; color: #94a3b8; margin-top: 3px; }

    @media (max-width: 900px) {
      .mp-wrapper { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .section-header { flex-direction: column; align-items: stretch; }
      .form-grid { grid-template-columns: 1fr; }
      .project-facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .type-tabs { grid-template-columns: 1fr; }
    }
  `],
})
export class MonthlyProfitsComponent implements OnInit, OnDestroy {
  readonly months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ].map((label, i) => ({ value: i + 1, label }));

  readonly today = toDateInput(new Date());
  private readonly now = new Date();

  distributions: MonthlyProfitDistributionSummary[] = [];
  eligibleProjects: ProfitEligibleProject[] = [];
  selected: MonthlyProfitDistribution | null = null;
  preview: MonthlyProfitPreview | null = null;
  calcError: string | null = null;

  showCreate = false;
  showDetail = false;
  loading = false;
  loadingProjects = false;
  saving = false;
  previewing = false;
  working = false;

  filterYear: number | null = null;
  filterStatus = '';
  filterType = '';

  createType: ProfitDistributionType = 'Monthly';
  form: CreateForm = this.emptyForm();

  draftRate: number | null = null;
  draftAmount: number | null = null;
  draftDate = '';
  draftNotes = '';

  private destroy$ = new Subject<void>();

  constructor(
    private readonly monthlyProfitService: MonthlyProfitService,
    private readonly toast: ToastService,
    private readonly confirmation: ConfirmationService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalProfit(): number {
    return this.distributions.reduce((sum, d) => sum + d.totalProfitAmount, 0);
  }

  get totalPaid(): number {
    return this.distributions.reduce((sum, d) => sum + d.totalPaidAmount, 0);
  }

  get totalPending(): number {
    return this.distributions.reduce((sum, d) => sum + d.pendingAmount, 0);
  }

  get projectsForType(): ProfitEligibleProject[] {
    return this.eligibleProjects.filter((p) => p.profitPayoutMode === this.createType);
  }

  get chosenProject(): ProfitEligibleProject | null {
    return this.eligibleProjects.find((p) => p.id === this.form.investmentId) ?? null;
  }

  /** From the chosen project's start year to this year. */
  get years(): number[] {
    const current = this.now.getFullYear();
    const start = this.chosenProject ? new Date(this.chosenProject.dateInvested).getFullYear() : current - 1;
    const years: number[] = [];
    for (let y = current; y >= Math.min(start, current); y--) years.push(y);
    return years;
  }

  reload(): void {
    this.load();
    this.loadProjects();
  }

  load(): void {
    this.loading = true;
    this.monthlyProfitService
      .getAll(this.filterYear, this.filterStatus || null, this.filterType || null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.distributions = data;
          this.loading = false;
          this.tick();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(this.errorMessage(err), 'Could not load distributions');
          this.tick();
        },
      });
  }

  loadProjects(): void {
    this.loadingProjects = true;
    this.monthlyProfitService
      .getEligibleProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (projects) => {
          this.eligibleProjects = projects;
          this.loadingProjects = false;
          this.tick();
        },
        error: (err) => {
          this.eligibleProjects = [];
          this.loadingProjects = false;
          this.toast.error(this.errorMessage(err), 'Could not load projects');
          this.tick();
        },
      });
  }

  clearFilters(): void {
    this.filterYear = null;
    this.filterStatus = '';
    this.filterType = '';
    this.load();
  }

  // ------------------------------------------------------------------ create

  openCreate(type: ProfitDistributionType, project?: ProfitEligibleProject): void {
    this.createType = type;
    this.form = this.emptyForm();
    this.form.investmentId = project?.id ?? this.projectsForType.find((p) => p.canDistribute)?.id ?? null;
    this.applyProjectDefaults();
    this.showCreate = true;
  }

  switchCreateType(type: ProfitDistributionType): void {
    if (this.createType === type) return;
    this.createType = type;
    this.form.investmentId = this.projectsForType.find((p) => p.canDistribute)?.id ?? null;
    this.applyProjectDefaults();
  }

  closeCreate(): void {
    this.showCreate = false;
    this.invalidatePreview();
  }

  onProjectChange(): void {
    this.applyProjectDefaults();
  }

  onYearChange(): void {
    // Keep the month valid when switching to the current year.
    if (this.isFutureMonth(this.form.year, this.form.month)) {
      this.form.month = this.now.getMonth() + 1;
    }
    this.invalidatePreview();
  }

  resetRate(): void {
    this.form.rate = this.chosenProject?.monthlyProfitRate ?? null;
    this.invalidatePreview();
  }

  isFutureMonth(year: number, month: number): boolean {
    return year > this.now.getFullYear()
      || (year === this.now.getFullYear() && month > this.now.getMonth() + 1);
  }

  /** Any input change makes the shown figures stale, so they must be recalculated before saving. */
  invalidatePreview(): void {
    this.preview = null;
    this.calcError = null;
  }

  canCalculate(): boolean {
    const f = this.form;
    if (!f.investmentId) return false;
    return this.createType === 'Monthly'
      ? !!f.year && !!f.month && f.rate != null && f.rate > 0 && f.rate <= 100
      : f.profitAmount != null && f.profitAmount > 0 && !!f.profitDate;
  }

  calculate(): void {
    if (!this.canCalculate()) return;

    this.previewing = true;
    this.calcError = null;
    this.monthlyProfitService
      .preview(this.buildRequest())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preview) => {
          this.preview = preview;
          this.previewing = false;
          this.tick();
        },
        error: (err) => {
          this.preview = null;
          this.previewing = false;
          this.calcError = this.errorMessage(err);
          this.tick();
        },
      });
  }

  saveDraft(): void {
    if (!this.preview || !this.canCalculate()) return;

    this.saving = true;
    this.monthlyProfitService
      .create({ ...this.buildRequest(), notes: this.form.notes.trim() || null })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (distribution) => {
          this.saving = false;
          this.showCreate = false;
          this.invalidatePreview();
          this.reload();
          this.applySelected(distribution);
          this.showDetail = true;
          this.toast.success('Draft saved. Review it, then finalize when ready.');
          this.tick();
        },
        error: (err) => {
          this.saving = false;
          this.calcError = this.errorMessage(err);
          this.tick();
        },
      });
  }

  private buildRequest(): CalculateProfitRequest {
    const f = this.form;
    return this.createType === 'Monthly'
      ? { type: 'Monthly', investmentId: f.investmentId!, year: Number(f.year), month: Number(f.month), rate: Number(f.rate) }
      : {
          type: 'ProjectBased',
          investmentId: f.investmentId!,
          profitAmount: Number(f.profitAmount),
          profitDate: `${f.profitDate}T00:00:00Z`,
        };
  }

  /** Default rate and the project's next unpaid month; for monthly, calculate straight away. */
  private applyProjectDefaults(): void {
    this.invalidatePreview();
    const project = this.chosenProject;
    if (!project) return;

    if (this.createType === 'Monthly') {
      this.form.rate = project.monthlyProfitRate ?? null;
      this.form.year = project.nextYear ?? this.now.getFullYear();
      this.form.month = project.nextMonth ?? this.now.getMonth() + 1;
      if (project.canDistribute) this.calculate();
    }
  }

  private emptyForm(): CreateForm {
    return {
      investmentId: null,
      year: this.now.getFullYear(),
      month: this.now.getMonth() + 1,
      rate: null,
      profitAmount: null,
      profitDate: this.today,
      notes: '',
    };
  }

  // ------------------------------------------------------------------ detail

  openDetail(id: string): void {
    this.monthlyProfitService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (distribution) => {
          this.applySelected(distribution);
          this.showDetail = true;
          this.tick();
        },
        error: (err) => this.toast.error(this.errorMessage(err), 'Could not load distribution'),
      });
  }

  closeDetail(): void {
    this.showDetail = false;
    this.selected = null;
  }

  recalculateDraft(): void {
    const s = this.selected;
    if (!s) return;

    if (s.type === 'Monthly' && !(this.draftRate != null && this.draftRate > 0 && this.draftRate <= 100)) {
      this.toast.warning('Enter a rate greater than 0 and at most 100.');
      return;
    }
    if (s.type === 'ProjectBased' && (!this.draftAmount || this.draftAmount <= 0 || !this.draftDate)) {
      this.toast.warning('Enter a profit amount greater than zero and a profit date.');
      return;
    }

    const request = s.type === 'Monthly'
      ? { rate: Number(this.draftRate), notes: this.draftNotes.trim() || null }
      : {
          profitAmount: Number(this.draftAmount),
          profitDate: `${this.draftDate}T00:00:00Z`,
          notes: this.draftNotes.trim() || null,
        };

    this.runAction(this.monthlyProfitService.update(s.id, request), 'Draft recalculated.', 'Could not recalculate draft');
  }

  distribute(): void {
    const s = this.selected;
    if (!s) return;
    this.confirmation
      .confirm({
        title: 'Finalize Distribution',
        message: `Finalize ${this.projectLabel(s)} for ${this.periodLabel(s)}? The figures will be locked.`,
        detail: s.type === 'ProjectBased' && s.maintenanceAmount
          ? `Maintenance of ${formatBdt(s.maintenanceAmount)} will be posted to the project's maintenance account.`
          : `Total to shareholders: ${formatBdt(s.totalProfitAmount)}`,
        confirmText: 'Finalize',
        icon: 'lock',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() =>
        this.runAction(this.monthlyProfitService.distribute(s.id), 'Finalized. You can now pay members.', 'Could not finalize'),
      );
  }

  payAll(): void {
    const s = this.selected;
    if (!s) return;
    this.confirmation
      .confirm({
        title: 'Pay All Pending',
        message: `Credit ${s.pendingLineCount} member(s) with their profit?`,
        detail: `Total: ${formatBdt(s.pendingAmount)}. This cannot be undone.`,
        confirmText: 'Pay',
        danger: true,
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() =>
        this.runAction(this.monthlyProfitService.pay(s.id), 'Profit paid to member wallets.', 'Could not pay members'),
      );
  }

  payLine(line: MonthlyProfitLine): void {
    const s = this.selected;
    if (!s) return;
    this.confirmation
      .confirm({
        title: 'Pay Member',
        message: `Credit ${formatBdt(line.profitAmount)} to ${line.memberName}'s wallet?`,
        detail: line.investmentName,
        confirmText: 'Pay',
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() =>
        this.runAction(this.monthlyProfitService.pay(s.id, line.id), `${line.memberName} paid.`, 'Could not pay member'),
      );
  }

  deleteDraft(): void {
    const s = this.selected;
    if (!s) return;
    this.confirmation
      .confirm({
        title: 'Delete Draft',
        message: `Delete the draft for ${this.projectLabel(s)} (${this.periodLabel(s)})?`,
        confirmText: 'Delete',
        danger: true,
        icon: 'delete',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => {
        this.working = true;
        this.monthlyProfitService
          .delete(s.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.working = false;
              this.closeDetail();
              this.reload();
              this.toast.success('Draft deleted.');
              this.tick();
            },
            error: (err) => {
              this.working = false;
              this.toast.error(this.errorMessage(err), 'Could not delete draft');
              this.tick();
            },
          });
      });
  }

  private runAction(action$: Observable<MonthlyProfitDistribution>, success: string, failure: string): void {
    this.working = true;
    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (distribution) => {
        this.working = false;
        this.applySelected(distribution);
        this.reload();
        this.toast.success(success);
        this.tick();
      },
      error: (err) => {
        this.working = false;
        this.toast.error(this.errorMessage(err), failure);
        this.tick();
      },
    });
  }

  private applySelected(distribution: MonthlyProfitDistribution): void {
    this.selected = distribution;
    this.draftRate = distribution.rate ?? null;
    this.draftAmount = distribution.grossProfitAmount ?? null;
    this.draftDate = distribution.profitDate ? distribution.profitDate.slice(0, 10) : this.today;
    this.draftNotes = distribution.notes ?? '';
  }

  // ------------------------------------------------------------------ labels

  monthName(month: number): string {
    return this.months.find((m) => m.value === Number(month))?.label ?? '';
  }

  periodLabel(d: MonthlyProfitDistributionSummary): string {
    if (d.type === 'ProjectBased' && d.profitDate) {
      return new Date(d.profitDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return `${this.monthName(d.month)} ${d.year}`;
  }

  projectLabel(d: MonthlyProfitDistributionSummary): string {
    const name = d.investmentName || d.projectNames[0] || 'Project';
    return d.projectNames.length > 1 ? `${name} +${d.projectNames.length - 1} more` : name;
  }

  detailSubtitle(d: MonthlyProfitDistribution): string {
    return d.type === 'Monthly'
      ? `${d.rate != null ? d.rate + '% monthly rate' : 'Per-project rates'} · ${d.eligibleMemberCount} member(s)`
      : `Realised profit shared by shares · ${d.eligibleMemberCount} shareholder(s)`;
  }

  isProrated(line: MonthlyProfitLine): boolean {
    return line.heldDays != null && line.daysInPeriod != null && line.heldDays < line.daysInPeriod;
  }

  daysLabel(line: MonthlyProfitLine): string {
    if (line.heldDays == null || line.daysInPeriod == null) return 'Full month';
    if (!this.isProrated(line)) return `${line.daysInPeriod} / ${line.daysInPeriod}`;
    return `${+line.heldDays.toFixed(1)} / ${line.daysInPeriod}`;
  }

  statusLabel(status: string): string {
    return status === 'Distributed' ? 'Finalized' : status;
  }

  statusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  paymentClass(status: string): string {
    return `pay-${status.toLowerCase()}`;
  }

  paymentLabel(status: string): string {
    const labels: Record<string, string> = {
      NotDistributed: 'Not finalized',
      Pending: 'Payment pending',
      PartiallyPaid: 'Partially paid',
      Paid: 'Paid',
    };
    return labels[status] ?? status;
  }

  /** Zoneless app: async callbacks must request a render explicitly. */
  private tick(): void {
    this.cdr.markForCheck();
  }

  private errorMessage(err: any): string {
    const errors = err?.error?.errors;
    if (errors && typeof errors === 'object') {
      const first = Object.values(errors)[0];
      if (Array.isArray(first) && first.length > 0) return String(first[0]);
      if (typeof first === 'string') return first;
    }
    return err?.error?.message || err?.error?.title || err?.message || 'Something went wrong.';
  }
}

function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

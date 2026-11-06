import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { filter, Observable, Subject, takeUntil } from 'rxjs';
import {
  MonthlyProfitService,
  ProcessProfitRequest,
  ProfitDistribution,
  ProfitDistributionSummary,
  ProfitEligibleProject,
  ProfitLine,
  ProfitPreview,
} from '../core/services/monthly-profit.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmationService } from '../shared/confirmation/confirmation.service';
import { DraggableModalDirective } from '../shared/directives/draggable-modal.directive';
import { BdtCurrencyPipe, formatBdt } from '../shared/pipes/bdt-currency.pipe';

interface ProcessForm {
  investmentId: string | null;
  year: number;
  month: number;
  periodEnd: string;
  notes: string;
}

interface StatusInfo {
  label: string;
  css: string;
}

/**
 * Distributes each project's recorded income minus its recorded expenses to the project's
 * investors, by shares, after the organisation's maintenance share:
 *   1. Process Profit - pick a project and period, review, process (locks the entries).
 *   2. Disburse      - credit each investor's wallet, one by one or all at once.
 * Monthly projects are processed per calendar month; project-based ones up to any date.
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
            <p class="subtitle">Distribute each project's recorded income minus expenses to its investors</p>
          </div>
          <button class="btn-refresh" (click)="reload()" title="Refresh" aria-label="Refresh">
            <span class="material-icons">refresh</span>
          </button>
        </div>
        <button class="btn-primary" (click)="openProcess()">
          <span class="material-icons">calculate</span>
          Process Profit
        </button>
      </header>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon green"><span class="material-icons">trending_up</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalProfit | bdtCurrency }}</span>
            <span class="stat-label">Distributed to Investors</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon teal"><span class="material-icons">check_circle</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalPaid | bdtCurrency }}</span>
            <span class="stat-label">Disbursed to Wallets</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon amber"><span class="material-icons">pending_actions</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ totalPending | bdtCurrency }}</span>
            <span class="stat-label">Awaiting Disbursement</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><span class="material-icons">receipt_long</span></div>
          <div class="stat-info">
            <span class="stat-value">{{ distributions.length }}</span>
            <span class="stat-label">Distributions</span>
          </div>
        </div>
      </div>

      <!-- Projects on a periodic payout -->
      <section class="content-section">
        <div class="section-header">
          <div>
            <h2>Projects</h2>
            <p class="section-sub">
              Income and expenses are recorded on each project (Investments → Shares &amp; lifecycle).
              The payout type is set in <a routerLink="/investments">Investments</a> → Edit → Profit Payout.
            </p>
          </div>
        </div>

        <div class="project-grid" *ngIf="eligibleProjects.length > 0">
          <div class="project-card" *ngFor="let p of eligibleProjects" [class.inactive]="!p.canDistribute">
            <div class="pc-top">
              <span class="type-badge" [ngClass]="p.profitPayoutMode === 'Monthly' ? 'monthly' : 'project'">
                <span class="material-icons">{{ p.profitPayoutMode === 'Monthly' ? 'calendar_month' : 'event_available' }}</span>
                {{ p.profitPayoutMode === 'Monthly' ? 'Monthly' : 'Project-based' }}
              </span>
              <span class="pc-status" [class.active]="p.canDistribute">{{ p.status }}</span>
            </div>
            <h3 class="pc-name" [title]="p.name">{{ p.name }}</h3>
            <div class="pc-facts">
              <div><span>Undistributed income</span><strong class="profit">{{ p.pendingIncome | bdtCurrency }}</strong></div>
              <div><span>Undistributed expenses</span><strong class="minus">{{ p.pendingExpense | bdtCurrency }}</strong></div>
              <div><span>Last processed</span><strong>{{ p.lastDistributionLabel || 'Never' }}</strong></div>
              <div><span>Distributed so far</span><strong>{{ p.totalDistributed | bdtCurrency }}</strong></div>
            </div>
            <button class="btn-card" *ngIf="p.canDistribute" (click)="openProcess(p)">
              <span class="material-icons">calculate</span>
              Process profit
            </button>
            <span class="pc-hint" *ngIf="!p.canDistribute">Available once the project is Active.</span>
          </div>
        </div>

        <div class="empty-block" *ngIf="!loadingProjects && eligibleProjects.length === 0">
          <span class="material-icons">tune</span>
          <div>
            <strong>No project is set up for periodic profit yet.</strong>
            <p>In <a routerLink="/investments">Investments</a>, edit a project and set <em>Profit Payout</em> to
              <strong>Monthly payout</strong> or <strong>Project-based</strong>.</p>
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
                <option value="ProjectBased">Project-based</option>
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
                <option value="Distributed">Awaiting disbursement</option>
                <option value="Paid">Disbursed</option>
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
                <th class="num">Income</th>
                <th class="num">Expenses</th>
                <th class="num">Maintenance</th>
                <th class="num">To Investors</th>
                <th class="num">Disbursed</th>
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
                <td>
                  {{ periodLabel(d) }}
                  <span class="sub">{{ d.type === 'Monthly' ? 'Monthly' : 'Project-based' }}</span>
                </td>
                <td class="num">{{ d.incomeAmount | bdtCurrency }}</td>
                <td class="num minus">{{ d.expenseAmount | bdtCurrency }}</td>
                <td class="num">{{ d.maintenanceAmount || 0 | bdtCurrency }}</td>
                <td class="num strong">{{ d.totalProfitAmount | bdtCurrency }}</td>
                <td class="num">
                  <span class="paid-amount">{{ d.totalPaidAmount | bdtCurrency }}</span>
                  <span class="pending-amount" *ngIf="d.pendingAmount > 0">{{ d.pendingAmount | bdtCurrency }} pending</span>
                </td>
                <td><span class="status-badge" [ngClass]="statusInfo(d).css">{{ statusInfo(d).label }}</span></td>
                <td class="actions"><span class="material-icons chevron">chevron_right</span></td>
              </tr>
              <tr *ngIf="!loading && distributions.length === 0">
                <td colspan="9" class="empty-row">
                  <span class="material-icons">payments</span>
                  <span>No profit has been distributed yet</span>
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

      <!-- ===================== Process ===================== -->
      <div class="modal-overlay" *ngIf="showProcess" (click)="closeProcess()">
        <div class="modal-content modal-wide" (click)="$event.stopPropagation()" appDraggableModal>
          <div class="modal-header">
            <div>
              <h3>Process Profit</h3>
              <p>Distributes the project's income minus expenses for the period to its investors, by shares.</p>
            </div>
            <button class="btn-icon" (click)="closeProcess()" aria-label="Close">
              <span class="material-icons">close</span>
            </button>
          </div>

          <div class="modal-body">
            <div class="empty-block" *ngIf="eligibleProjects.length === 0">
              <span class="material-icons">tune</span>
              <div>
                <strong>No project is set up for periodic profit yet.</strong>
                <p>In <a routerLink="/investments" (click)="closeProcess()">Investments</a>, edit the project and set
                  <em>Profit Payout</em> to <strong>Monthly payout</strong> or <strong>Project-based</strong>.</p>
              </div>
            </div>

            <ng-container *ngIf="eligibleProjects.length > 0">
              <div class="form-grid">
                <label class="span-2">
                  <span>Project *</span>
                  <select [(ngModel)]="form.investmentId" (ngModelChange)="onProjectChange()">
                    <option [ngValue]="null" disabled>Select a project</option>
                    <option *ngFor="let p of eligibleProjects" [ngValue]="p.id" [disabled]="!p.canDistribute">
                      {{ p.name }} ({{ p.profitPayoutMode === 'Monthly' ? 'Monthly' : 'Project-based' }}){{ p.canDistribute ? '' : ' — ' + p.status }}
                    </option>
                  </select>
                </label>

                <ng-container *ngIf="chosenProject as p">
                  <ng-container *ngIf="p.profitPayoutMode === 'Monthly'">
                    <label>
                      <span>Month *</span>
                      <select [(ngModel)]="form.month" (ngModelChange)="calculate()">
                        <option *ngFor="let m of months" [ngValue]="m.value" [disabled]="isFutureMonth(form.year, m.value)">{{ m.label }}</option>
                      </select>
                    </label>
                    <label>
                      <span>Year *</span>
                      <select [(ngModel)]="form.year" (ngModelChange)="onYearChange()">
                        <option *ngFor="let y of years" [ngValue]="y">{{ y }}</option>
                      </select>
                    </label>
                  </ng-container>
                  <label *ngIf="p.profitPayoutMode === 'ProjectBased'" class="span-2">
                    <span>Include income &amp; expenses up to *</span>
                    <input type="date" [max]="today" [(ngModel)]="form.periodEnd" (change)="calculate()" />
                  </label>
                </ng-container>
              </div>

              <div class="alert error" *ngIf="calcError" role="alert">
                <span class="material-icons">error_outline</span><span>{{ calcError }}</span>
              </div>

              <div class="loading-line" *ngIf="previewing">
                <span class="material-icons spin">sync</span> Calculating from the project's books...
              </div>

              <ng-container *ngIf="preview && !previewing">
                <!-- Statement -->
                <div class="statement">
                  <div class="st-row">
                    <span>Income <em>({{ preview.incomeEntries.length }} {{ preview.incomeEntries.length === 1 ? 'entry' : 'entries' }})</em></span>
                    <strong>{{ preview.incomeAmount | bdtCurrency }}</strong>
                  </div>
                  <div class="st-row">
                    <span>Expenses <em>({{ preview.expenseEntries.length }} {{ preview.expenseEntries.length === 1 ? 'entry' : 'entries' }})</em></span>
                    <strong class="minus">− {{ preview.expenseAmount | bdtCurrency }}</strong>
                  </div>
                  <div class="st-row total">
                    <span>Net profit</span>
                    <strong [class.minus]="preview.netProfitAmount < 0">{{ preview.netProfitAmount | bdtCurrency }}</strong>
                  </div>
                  <ng-container *ngIf="preview.canProcess">
                    <div class="st-row">
                      <span>Maintenance ({{ preview.maintenancePercentage }}%)</span>
                      <strong class="minus">− {{ preview.maintenanceAmount | bdtCurrency }}</strong>
                    </div>
                    <div class="st-row grand">
                      <span>To {{ preview.eligibleMemberCount }} investor(s)</span>
                      <strong class="profit">{{ preview.totalProfitAmount | bdtCurrency }}</strong>
                    </div>
                    <div class="st-row muted" *ngIf="preview.undistributedRemainder > 0">
                      <span>Retained by the organisation (unsold shares, rounding)</span>
                      <strong>{{ preview.undistributedRemainder | bdtCurrency }}</strong>
                    </div>
                  </ng-container>
                </div>

                <div class="alert info" *ngIf="!preview.canProcess && preview.message" role="status">
                  <span class="material-icons">info</span><span>{{ preview.message }}</span>
                </div>
                <div class="alert warn" *ngFor="let w of preview.warnings">
                  <span class="material-icons">info</span><span>{{ w }}</span>
                </div>

                <details class="entries" *ngIf="preview.incomeEntries.length || preview.expenseEntries.length">
                  <summary>Show income &amp; expense entries</summary>
                  <div class="entry-grid">
                    <div>
                      <h5>Income</h5>
                      <div class="entry" *ngFor="let e of preview.incomeEntries">
                        <span class="e-date">{{ e.date | date: 'dd MMM yyyy' }}</span>
                        <span class="e-desc" [title]="e.description">{{ e.description }}</span>
                        <span class="e-amt profit">{{ e.amount | bdtCurrency }}</span>
                      </div>
                      <p class="none" *ngIf="!preview.incomeEntries.length">None</p>
                    </div>
                    <div>
                      <h5>Expenses</h5>
                      <div class="entry" *ngFor="let e of preview.expenseEntries">
                        <span class="e-date">{{ e.date | date: 'dd MMM yyyy' }}</span>
                        <span class="e-desc" [title]="e.description">{{ e.description }}</span>
                        <span class="e-amt minus">{{ e.amount | bdtCurrency }}</span>
                      </div>
                      <p class="none" *ngIf="!preview.expenseEntries.length">None</p>
                    </div>
                  </div>
                </details>

                <ng-container *ngIf="preview.canProcess">
                  <h4 class="section-title">Investor shares</h4>
                  <div class="table-container compact">
                    <table class="mp-table">
                      <thead>
                        <tr>
                          <th>Investor</th>
                          <th class="num">Invested</th>
                          <th class="num">Shares</th>
                          <th class="num">Ownership</th>
                          <th class="num">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr *ngFor="let line of preview.lines">
                          <td>{{ line.memberName }}</td>
                          <td class="num">{{ line.investmentAmount | bdtCurrency }}</td>
                          <td class="num">{{ line.sharesOwned }}</td>
                          <td class="num">{{ line.ownershipPercentage | number: '1.2-2' }}%</td>
                          <td class="num profit">{{ line.profitAmount | bdtCurrency }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <label class="full-field notes-field">
                    <span>Notes</span>
                    <input type="text" maxlength="1000" [(ngModel)]="form.notes" placeholder="Optional" />
                  </label>
                </ng-container>
              </ng-container>

              <div class="form-actions end">
                <button class="btn-ghost" (click)="closeProcess()">Cancel</button>
                <button class="btn-primary" (click)="process()" [disabled]="processing || previewing || !preview?.canProcess">
                  <span class="material-icons">task_alt</span>
                  {{ processing ? 'Processing...' : 'Process Profit' }}
                </button>
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
                <h3>{{ projectLabel(selected) }}</h3>
                <span class="status-badge" [ngClass]="statusInfo(selected).css">{{ statusInfo(selected).label }}</span>
              </div>
              <p>
                {{ selected.type === 'Monthly' ? 'Monthly' : 'Project-based' }} · {{ periodLabel(selected) }}
                <ng-container *ngIf="selected.distributedBy"> · Processed by {{ selected.distributedBy }} on {{ selected.distributedAt | date: 'medium' }}</ng-container>
              </p>
            </div>
            <button class="btn-icon" (click)="closeDetail()" aria-label="Close">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="detail-stats">
              <div><span>Income</span><strong>{{ selected.incomeAmount | bdtCurrency }}</strong></div>
              <div><span>Expenses</span><strong class="minus">{{ selected.expenseAmount | bdtCurrency }}</strong></div>
              <div><span>Maintenance ({{ selected.maintenancePercentage || 0 }}%)</span><strong>{{ selected.maintenanceAmount || 0 | bdtCurrency }}</strong></div>
              <div><span>To investors</span><strong class="profit">{{ selected.totalProfitAmount | bdtCurrency }}</strong></div>
              <div><span>Disbursed</span><strong class="paid">{{ selected.totalPaidAmount | bdtCurrency }}</strong></div>
              <div><span>Pending</span><strong class="pending">{{ selected.pendingAmount | bdtCurrency }}</strong></div>
            </div>

            <div class="detail-actions">
              <button class="btn-primary" *ngIf="canDisburse(selected)" (click)="disburseAll()" [disabled]="working">
                <span class="material-icons">payments</span>
                {{ working ? 'Disbursing...' : 'Disburse All (' + (selected.pendingAmount | bdtCurrency) + ')' }}
              </button>
              <span class="meta" *ngIf="selected.status === 'Paid'">
                <span class="material-icons ok">check_circle</span> Every investor has been paid.
              </span>
              <button class="btn-link danger" *ngIf="selected.paidLineCount === 0" (click)="cancelDistribution()" [disabled]="working">
                {{ selected.status === 'Draft' ? 'Delete draft' : 'Cancel processing' }}
              </button>
            </div>
            <p class="hint" *ngIf="selected.paidLineCount === 0 && selected.status !== 'Draft'">
              Nobody has been paid yet, so this can still be cancelled: the income and expense entries are released and
              the maintenance posting is reversed.
            </p>
            <p class="hint" *ngIf="selected.status === 'Draft'">
              This draft was created with the earlier rate-based calculation. Delete it and process the project again.
            </p>

            <h4 class="section-title">Investors</h4>
            <div class="table-container compact">
              <table class="mp-table">
                <thead>
                  <tr>
                    <th>Investor</th>
                    <th *ngIf="selected.projectCount > 1">Project</th>
                    <th class="num">Invested</th>
                    <th class="num">Shares</th>
                    <th class="num">Profit</th>
                    <th>Status</th>
                    <th class="actions-col"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let line of selected.lines">
                    <td>{{ line.memberName }}</td>
                    <td *ngIf="selected.projectCount > 1" class="truncate" [title]="line.investmentName">{{ line.investmentName }}</td>
                    <td class="num">{{ line.investmentAmount | bdtCurrency }}</td>
                    <td class="num">{{ line.sharesOwned || '—' }}</td>
                    <td class="num profit">{{ line.profitAmount | bdtCurrency }}</td>
                    <td>
                      <span class="line-badge" [class.paid]="line.status === 'Paid'" [class.pending]="line.status === 'Pending'">
                        {{ line.status === 'Paid' ? 'Disbursed' : 'Pending' }}
                      </span>
                      <span class="paid-at" *ngIf="line.paidAt">{{ line.paidAt | date: 'dd MMM yyyy' }}</span>
                    </td>
                    <td class="actions">
                      <button class="btn-small" *ngIf="line.status === 'Pending' && canDisburse(selected)"
                              (click)="disburseLine(line)" [disabled]="working">
                        Disburse
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <details class="entries" *ngIf="selected.incomeEntries.length || selected.expenseEntries.length">
              <summary>Income &amp; expense entries included ({{ selected.incomeEntries.length + selected.expenseEntries.length }})</summary>
              <div class="entry-grid">
                <div>
                  <h5>Income</h5>
                  <div class="entry" *ngFor="let e of selected.incomeEntries">
                    <span class="e-date">{{ e.date | date: 'dd MMM yyyy' }}</span>
                    <span class="e-desc" [title]="e.description">{{ e.description }}</span>
                    <span class="e-amt profit">{{ e.amount | bdtCurrency }}</span>
                  </div>
                  <p class="none" *ngIf="!selected.incomeEntries.length">None</p>
                </div>
                <div>
                  <h5>Expenses</h5>
                  <div class="entry" *ngFor="let e of selected.expenseEntries">
                    <span class="e-date">{{ e.date | date: 'dd MMM yyyy' }}</span>
                    <span class="e-desc" [title]="e.description">{{ e.description }}</span>
                    <span class="e-amt minus">{{ e.amount | bdtCurrency }}</span>
                  </div>
                  <p class="none" *ngIf="!selected.expenseEntries.length">None</p>
                </div>
              </div>
            </details>

            <ng-container *ngIf="selected.transactions.length > 0">
              <h4 class="section-title">Wallet Transactions</h4>
              <div class="table-container compact">
                <table class="mp-table">
                  <thead>
                    <tr>
                      <th>Investor</th>
                      <th>Description</th>
                      <th class="num">Amount</th>
                      <th>Disbursed</th>
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
    h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; }
    .subtitle { margin: 2px 0 0; font-size: 13px; color: #64748b; }
    .btn-primary, .btn-ghost, .btn-small, .btn-clear, .btn-refresh, .btn-icon, .btn-card, .btn-link {
      border: 0; cursor: pointer; font: inherit; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn-primary { background: #4f46e5; color: #fff; padding: 10px 16px; border-radius: 9px; font-weight: 600; }
    .btn-primary:hover:not(:disabled) { background: #4338ca; }
    .btn-ghost { background: transparent; color: #475569; padding: 10px 14px; border-radius: 9px; font-weight: 600; }
    .btn-ghost:hover { background: #f1f5f9; }
    .btn-small { background: #4f46e5; color: #fff; padding: 5px 11px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .btn-small:disabled, .btn-primary:disabled, .btn-link:disabled { opacity: .55; cursor: not-allowed; }
    .btn-refresh { background: #fff; color: #475569; width: 36px; height: 36px; border-radius: 9px; box-shadow: 0 1px 3px rgba(15,23,42,.1); }
    .btn-icon { background: transparent; color: #64748b; width: 32px; height: 32px; border-radius: 7px; }
    .btn-icon:hover { background: #f1f5f9; color: #1e293b; }
    .btn-clear { background: transparent; color: #4f46e5; font-size: 12px; font-weight: 600; }
    .btn-link { background: none; padding: 0; color: #4f46e5; font-size: 13px; font-weight: 600; }
    .btn-link.danger { color: #b91c1c; margin-left: auto; }
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

    .project-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
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
    .filters input, .filters select { width: 150px; border: 1px solid #d1d5db; border-radius: 7px; padding: 7px 8px; background: #fff; color: #1f2937; }
    .filters input[type=number] { width: 78px; }

    .table-container { overflow-x: auto; }
    .table-container.compact { max-height: 320px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 9px; }
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
    .paid-amount { display: block; color: #15803d; font-weight: 600; }
    .pending-amount { display: block; color: #b45309; font-size: 11px; }
    .profit { color: #15803d; font-weight: 600; }
    .minus { color: #b45309; }
    .status-badge, .line-badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .st-draft { background: #f1f5f9; color: #475569; }
    .st-ready { background: #eef2ff; color: #3730a3; }
    .st-partial { background: #ffedd5; color: #9a3412; }
    .st-done { background: #dcfce7; color: #166534; }
    .line-badge.paid { background: #dcfce7; color: #166534; }
    .line-badge.pending { background: #fef3c7; color: #92400e; }
    .actions-col { width: 80px; text-align: center; }
    .actions { text-align: center; }
    .empty-row { text-align: center !important; color: #94a3b8; padding: 30px 8px !important; }
    .empty-row .material-icons { display: block; margin: 0 auto 6px; font-size: 28px; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .truncate { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,.42); display: flex; align-items: flex-start; justify-content: center; padding: 40px 16px; z-index: 1000; overflow: auto; }
    .modal-content { background: #fff; border-radius: 14px; width: min(720px, 100%); box-shadow: 0 24px 80px rgba(15,23,42,.34); }
    .modal-content.modal-wide { width: min(880px, 100%); }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; padding: 18px 20px; border-bottom: 1px solid #eef2f7; }
    .modal-header h3 { margin: 0; font-size: 18px; }
    .modal-header p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
    .title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .modal-body { padding: 18px 20px 20px; }

    .form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 14px; }
    .form-grid .span-2 { grid-column: span 2; }
    .form-grid label, .full-field { display: flex; flex-direction: column; gap: 5px; font-size: 12px; color: #475569; font-weight: 600; }
    .form-grid input, .form-grid select, .full-field input { border: 1px solid #d1d5db; border-radius: 8px; padding: 9px 10px; font: inherit; color: #1f2937; background: #fff; }
    .notes-field { margin-top: 14px; }
    .form-actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; margin-top: 16px; }
    .form-actions.end { justify-content: flex-end; border-top: 1px solid #eef2f7; padding-top: 14px; }
    .loading-line { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; padding: 10px 0; }

    .alert { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; border-radius: 8px; padding: 9px 11px; margin: 10px 0 0; }
    .alert .material-icons { font-size: 17px; }
    .alert.error { color: #991b1b; background: #fef2f2; border: 1px solid #fecaca; }
    .alert.info { color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; }
    .alert.warn { color: #92400e; background: #fffbeb; border: 1px solid #fde68a; }

    .statement { border: 1px solid #e5e7eb; border-radius: 10px; padding: 6px 14px; background: #fcfdff; }
    .st-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 7px 0; font-size: 14px; }
    .st-row em { font-style: normal; color: #94a3b8; font-size: 12px; }
    .st-row.total { border-top: 1px solid #e5e7eb; font-weight: 600; }
    .st-row.grand { border-top: 1px solid #e5e7eb; font-size: 15px; font-weight: 700; }
    .st-row.muted { font-size: 12px; color: #64748b; }

    .entries { margin-top: 12px; border: 1px solid #eef2f7; border-radius: 9px; padding: 0 12px; }
    .entries summary { cursor: pointer; padding: 10px 0; font-size: 13px; font-weight: 600; color: #4f46e5; }
    .entry-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; padding-bottom: 12px; }
    .entry-grid h5 { margin: 0 0 6px; font-size: 12px; color: #475569; text-transform: uppercase; letter-spacing: .04em; }
    .entry { display: grid; grid-template-columns: 86px 1fr auto; gap: 8px; font-size: 12px; padding: 5px 0; border-bottom: 1px dashed #eef2f7; }
    .e-date { color: #94a3b8; }
    .e-desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .e-amt { text-align: right; font-weight: 600; }
    .none { margin: 0; font-size: 12px; color: #94a3b8; }
    .section-title { margin: 18px 0 10px; font-size: 14px; }

    .detail-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 14px; }
    .detail-stats div { background: #f8fafc; border: 1px solid #eef2f7; border-radius: 9px; padding: 11px 12px; }
    .detail-stats span { display: block; font-size: 11px; color: #64748b; margin-bottom: 3px; }
    .detail-stats strong { font-size: 15px; }
    .detail-stats .paid { color: #15803d; } .detail-stats .pending { color: #b45309; }
    .detail-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .meta { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; }
    .meta .ok { color: #16a34a; font-size: 18px; }
    .hint { margin: 8px 0 0; font-size: 12px; color: #64748b; }
    .paid-at { display: block; font-size: 10px; color: #94a3b8; margin-top: 3px; }

    @media (max-width: 900px) {
      .mp-wrapper { padding: 16px; }
      .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .section-header { flex-direction: column; align-items: stretch; }
      .form-grid { grid-template-columns: 1fr 1fr; }
      .form-grid .span-2 { grid-column: span 2; }
      .entry-grid { grid-template-columns: 1fr; }
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

  distributions: ProfitDistributionSummary[] = [];
  eligibleProjects: ProfitEligibleProject[] = [];
  selected: ProfitDistribution | null = null;
  preview: ProfitPreview | null = null;
  calcError: string | null = null;

  showProcess = false;
  showDetail = false;
  loading = false;
  loadingProjects = false;
  previewing = false;
  processing = false;
  working = false;

  filterYear: number | null = null;
  filterStatus = '';
  filterType = '';

  form: ProcessForm = this.emptyForm();

  private destroy$ = new Subject<void>();

  constructor(
    private readonly profitService: MonthlyProfitService,
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
    return this.distributions.filter((d) => d.status !== 'Draft').reduce((sum, d) => sum + d.pendingAmount, 0);
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
    this.profitService
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
    this.profitService
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

  // ------------------------------------------------------------------ process

  openProcess(project?: ProfitEligibleProject): void {
    this.form = this.emptyForm();
    this.form.investmentId = project?.id ?? this.eligibleProjects.find((p) => p.canDistribute)?.id ?? null;
    this.showProcess = true;
    this.onProjectChange();
  }

  closeProcess(): void {
    this.showProcess = false;
    this.preview = null;
    this.calcError = null;
  }

  /** Defaults the period to the project's next unprocessed month (or today), then calculates. */
  onProjectChange(): void {
    const project = this.chosenProject;
    if (!project) return;

    if (project.profitPayoutMode === 'Monthly') {
      this.form.year = project.nextYear ?? this.now.getFullYear();
      this.form.month = project.nextMonth ?? this.now.getMonth() + 1;
    } else {
      this.form.periodEnd = this.today;
    }
    this.calculate();
  }

  onYearChange(): void {
    if (this.isFutureMonth(this.form.year, this.form.month)) {
      this.form.month = this.now.getMonth() + 1;
    }
    this.calculate();
  }

  isFutureMonth(year: number, month: number): boolean {
    return year > this.now.getFullYear()
      || (year === this.now.getFullYear() && month > this.now.getMonth() + 1);
  }

  calculate(): void {
    const request = this.buildRequest();
    this.preview = null;
    this.calcError = null;
    if (!request) return;

    this.previewing = true;
    this.profitService
      .preview(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preview) => {
          this.preview = preview;
          this.previewing = false;
          this.tick();
        },
        error: (err) => {
          this.previewing = false;
          this.calcError = this.errorMessage(err);
          this.tick();
        },
      });
  }

  process(): void {
    const preview = this.preview;
    const request = this.buildRequest();
    if (!preview?.canProcess || !request) return;

    this.confirmation
      .confirm({
        title: 'Process Profit',
        message: `Distribute ${formatBdt(preview.totalProfitAmount)} to ${preview.eligibleMemberCount} investor(s) of ${preview.investmentName}?`,
        detail: preview.maintenanceAmount > 0
          ? `The income and expense entries will be locked and ${formatBdt(preview.maintenanceAmount)} maintenance posted. You can disburse to investors next.`
          : 'The income and expense entries will be locked. You can disburse to investors next.',
        confirmText: 'Process',
        icon: 'task_alt',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => {
        this.processing = true;
        this.profitService
          .process({ ...request, notes: this.form.notes.trim() || null })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (distribution) => {
              this.processing = false;
              this.closeProcess();
              this.reload();
              this.selected = distribution;
              this.showDetail = true;
              this.toast.success('Profit processed. Disburse it to the investors when ready.');
              this.tick();
            },
            error: (err) => {
              this.processing = false;
              this.calcError = this.errorMessage(err);
              this.tick();
            },
          });
      });
  }

  private buildRequest(): ProcessProfitRequest | null {
    const project = this.chosenProject;
    if (!project) return null;

    if (project.profitPayoutMode === 'Monthly') {
      return { investmentId: project.id, year: Number(this.form.year), month: Number(this.form.month) };
    }
    return this.form.periodEnd ? { investmentId: project.id, periodEnd: `${this.form.periodEnd}T00:00:00Z` } : null;
  }

  private emptyForm(): ProcessForm {
    return {
      investmentId: null,
      year: this.now.getFullYear(),
      month: this.now.getMonth() + 1,
      periodEnd: this.today,
      notes: '',
    };
  }

  // ------------------------------------------------------------------ detail & disbursement

  openDetail(id: string): void {
    this.profitService
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (distribution) => {
          this.selected = distribution;
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

  canDisburse(d: ProfitDistributionSummary): boolean {
    return d.status === 'Distributed' && d.pendingLineCount > 0;
  }

  disburseAll(): void {
    const s = this.selected;
    if (!s) return;
    this.confirmation
      .confirm({
        title: 'Disburse All',
        message: `Credit ${s.pendingLineCount} investor(s) with their profit?`,
        detail: `Total: ${formatBdt(s.pendingAmount)}. This cannot be undone.`,
        confirmText: 'Disburse',
        danger: true,
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() =>
        this.runAction(this.profitService.disburse(s.id), 'Profit disbursed to investor wallets.', 'Could not disburse'),
      );
  }

  disburseLine(line: ProfitLine): void {
    const s = this.selected;
    if (!s) return;
    this.confirmation
      .confirm({
        title: 'Disburse to Investor',
        message: `Credit ${formatBdt(line.profitAmount)} to ${line.memberName}'s wallet?`,
        detail: 'This cannot be undone.',
        confirmText: 'Disburse',
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() =>
        this.runAction(this.profitService.disburse(s.id, line.id), `${line.memberName} has been paid.`, 'Could not disburse'),
      );
  }

  cancelDistribution(): void {
    const s = this.selected;
    if (!s) return;
    const isDraft = s.status === 'Draft';
    this.confirmation
      .confirm({
        title: isDraft ? 'Delete Draft' : 'Cancel Processing',
        message: isDraft
          ? `Delete this draft for ${this.projectLabel(s)}?`
          : `Cancel the ${this.periodLabel(s)} profit for ${this.projectLabel(s)}?`,
        detail: isDraft
          ? undefined
          : 'The income and expense entries are released so they can be processed again, and the maintenance posting is reversed.',
        confirmText: isDraft ? 'Delete' : 'Cancel processing',
        danger: true,
        icon: 'undo',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => {
        this.working = true;
        this.profitService
          .cancel(s.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.working = false;
              this.closeDetail();
              this.reload();
              this.toast.success(isDraft ? 'Draft deleted.' : 'Processing cancelled.');
              this.tick();
            },
            error: (err) => {
              this.working = false;
              this.toast.error(this.errorMessage(err), 'Could not cancel');
              this.tick();
            },
          });
      });
  }

  private runAction(action$: Observable<ProfitDistribution>, success: string, failure: string): void {
    this.working = true;
    action$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (distribution) => {
        this.working = false;
        this.selected = distribution;
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

  // ------------------------------------------------------------------ labels

  monthName(month: number): string {
    return this.months.find((m) => m.value === Number(month))?.label ?? '';
  }

  periodLabel(d: ProfitDistributionSummary): string {
    if (d.type === 'ProjectBased' && d.periodEnd) {
      const date = new Date(d.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return `Up to ${date}`;
    }
    return `${this.monthName(d.month)} ${d.year}`;
  }

  projectLabel(d: ProfitDistributionSummary): string {
    const name = d.investmentName || d.projectNames[0] || 'Project';
    return d.projectNames.length > 1 ? `${name} +${d.projectNames.length - 1} more` : name;
  }

  statusInfo(d: ProfitDistributionSummary): StatusInfo {
    if (d.status === 'Draft') return { label: 'Draft (old method)', css: 'st-draft' };
    if (d.status === 'Paid') return { label: 'Disbursed', css: 'st-done' };
    if (d.paidLineCount > 0) return { label: 'Partially disbursed', css: 'st-partial' };
    return { label: 'Awaiting disbursement', css: 'st-ready' };
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

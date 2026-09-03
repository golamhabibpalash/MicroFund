import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter, Subject, takeUntil } from 'rxjs';
import {
  InvestmentService,
  CashOutRequest,
  CashOutBalance,
  CashOutStatusName,
} from '../core/services/investment.service';
import { UserService } from '../core/services/user';
import { ToastService } from '../core/services/toast.service';
import { BdtCurrencyPipe, formatBdt } from '../shared/pipes/bdt-currency.pipe';
import { TimeAgoPipe } from '../shared/pipes/time-ago.pipe';
import { ConfirmationService } from '../shared/confirmation/confirmation.service';

@Component({
  selector: 'app-cashout',
  standalone: true,
  imports: [CommonModule, DatePipe, ReactiveFormsModule, BdtCurrencyPipe, TimeAgoPipe],
  template: `
    <div class="cashout-wrapper">
      <div class="page-head">
        <div>
          <h1>Withdraw</h1>
          <p class="subtitle">Request a cash-out of your available wallet balance</p>
        </div>
        <button class="btn-refresh" (click)="load()" title="Refresh">
          <span class="material-icons">refresh</span>
        </button>
      </div>

      <div *ngIf="isLoading" class="loading"><div class="spinner"></div><p>Loading...</p></div>

      <!-- Member panel: balance + request form + own requests -->
      <ng-container *ngIf="!isLoading && !isAdmin">
        <section class="balance-hero" *ngIf="balance">
          <span class="hero-label">Available to Withdraw</span>
          <span class="hero-value">{{ balance.available | bdtCurrency }}</span>
          <span class="hero-note">
            of {{ balance.balance | bdtCurrency }} balance
            <ng-container *ngIf="balance.pending > 0">({{ balance.pending | bdtCurrency }} pending approval)</ng-container>
          </span>
        </section>

        <section class="panel">
          <h2>Request a Cash-out</h2>
          <form [formGroup]="form" (ngSubmit)="requestCashOut()" class="request-form">
            <div class="field">
              <label for="amount">Amount</label>
              <input
                id="amount"
                type="number"
                min="1"
                formControlName="amount"
                placeholder="Enter amount"
                [attr.step]="'0.01'" />
              <small class="hint" *ngIf="balance && balance.available > 0">
                Maximum {{ balance.available | bdtCurrency }}.
              </small>
              <small class="err" *ngIf="form.get('amount')?.touched && form.invalid">
                Enter a valid amount within your available balance.
              </small>
            </div>
            <div class="field">
              <label for="remarks">Remarks <span class="opt">(optional)</span></label>
              <textarea id="remarks" rows="3" formControlName="remarks" placeholder="Reason for withdrawal"></textarea>
            </div>
            <button type="submit" class="btn-submit" [disabled]="submitting">
              {{ submitting ? 'Submitting...' : 'Request Withdrawal' }}
            </button>
          </form>
        </section>

        <section class="panel">
          <h2>My Requests</h2>
          <p class="empty" *ngIf="myRequests.length === 0">No cash-out requests yet.</p>
          <table class="data-table" *ngIf="myRequests.length > 0">
            <thead><tr><th>Amount</th><th>Status</th><th>Remarks</th><th>Requested</th><th>Actioned</th><th></th></tr></thead>
            <tbody>
              <tr *ngFor="let r of myRequests">
                <td class="num right">{{ r.amount | bdtCurrency }}</td>
                <td><span class="pill" [ngClass]="'co-' + r.status.toLowerCase()">{{ r.status }}</span></td>
                <td class="details">{{ r.remarks || '—' }}</td>
                <td title="{{ r.requestedAt }}">{{ r.requestedAt | timeAgo }}</td>
                <td class="details">{{ r.actionedAt ? (r.actionedAt | date: 'medium') : '—' }}</td>
                <td class="right">
                  <button *ngIf="r.status === 'Pending'" class="btn-link warn" (click)="cancel(r)">Cancel</button>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </ng-container>

      <!-- Admin panel: request queue -->
      <ng-container *ngIf="!isLoading && isAdmin">
        <section class="panel">
          <div class="panel-head">
            <h2>Cash-out Requests</h2>
            <div class="filter-row">
              <select (change)="onFilter($event)" class="filter-select">
                <option value="">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <input class="filter-search" placeholder="Search name/email" (keyup.enter)="onSearch($event)" />
            </div>
          </div>
          <p class="empty" *ngIf="allRequests.length === 0">No cash-out requests found.</p>
          <table class="data-table" *ngIf="allRequests.length > 0">
            <thead>
              <tr><th>Member</th><th>Amount</th><th>Status</th><th>Remarks</th><th>Balance@Req</th><th>Requested</th><th>Admin Note</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of allRequests">
                <td>
                  <strong>{{ r.memberName }}</strong>
                  <span class="muted">{{ r.memberCode || r.memberEmail }}</span>
                </td>
                <td class="num right">{{ r.amount | bdtCurrency }}</td>
                <td><span class="pill" [ngClass]="'co-' + r.status.toLowerCase()">{{ r.status }}</span></td>
                <td class="details">{{ r.remarks || '—' }}</td>
                <td class="num right">{{ r.walletBalanceAtRequest != null ? (r.walletBalanceAtRequest | bdtCurrency) : '—' }}</td>
                <td class="details">{{ r.requestedAt | timeAgo }}</td>
                <td class="details">{{ r.adminRemarks || '—' }}</td>
                <td class="right admin-actions">
                  <ng-container *ngIf="r.status === 'Pending'">
                    <button class="btn-approve" (click)="approve(r)">Approve</button>
                    <button class="btn-reject" (click)="reject(r)">Reject</button>
                  </ng-container>
                  <span class="muted" *ngIf="r.status !== 'Pending'">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </ng-container>

      <div class="empty-state" *ngIf="!isLoading && !isAdmin && !balance && myRequests.length === 0">
        <span class="material-icons">output</span>
        <h3>No wallet linked</h3>
        <p>No member profile is linked to your account, so no withdrawal can be requested.</p>
      </div>
    </div>
  `,
  styles: [`
    .cashout-wrapper { max-width: 1000px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .page-head h1 { font-size: 24px; font-weight: 600; color: #1a1a2e; margin: 0; }
    .subtitle { color: #666; font-size: 14px; margin: 4px 0 0 0; }
    .btn-refresh { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px; cursor: pointer; color: #666; display: flex; }
    .btn-refresh:hover { background: #f5f6fa; }

    .balance-hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 14px; padding: 28px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 6px; }
    .hero-label { font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px; }
    .hero-value { font-size: 38px; font-weight: 600; }
    .hero-note { font-size: 13px; opacity: 0.9; }

    .panel { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 20px; }
    .panel h2 { font-size: 16px; font-weight: 600; color: #1a1a2e; margin: 0 0 16px 0; }
    .empty { color: #888; font-size: 14px; margin: 0; }
    .panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .panel-head h2 { margin: 0; }
    .filter-row { display: flex; gap: 8px; }
    .filter-select, .filter-search { border: 1px solid #ddd; border-radius: 8px; padding: 7px 10px; font-size: 13px; color: #333; background: white; }
    .filter-search { width: 200px; }

    .request-form { display: flex; flex-direction: column; gap: 16px; max-width: 480px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 500; color: #333; }
    .field .opt { color: #999; font-weight: 400; }
    .field input, .field textarea { border: 1px solid #ddd; border-radius: 8px; padding: 9px 12px; font-size: 14px; font-family: inherit; color: #333; }
    .field input:focus, .field textarea:focus { outline: none; border-color: #667eea; }
    .hint { color: #888; font-size: 12px; }
    .err { color: #c62828; font-size: 12px; }
    .btn-submit { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 9px; padding: 11px 18px; font-size: 14px; font-weight: 600; cursor: pointer; width: fit-content; }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table th { text-align: left; padding: 10px 8px; border-bottom: 2px solid #eee; color: #666; font-weight: 500; font-size: 13px; }
    .data-table td { padding: 12px 8px; border-bottom: 1px solid #f2f2f2; color: #333; vertical-align: middle; }
    .data-table .right { text-align: right; }
    .num { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .details { color: #666; }
    .muted { display: block; color: #999; font-size: 12px; font-weight: 400; }

    .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .co-pending { background: #fff8e1; color: #f9a825; }
    .co-approved { background: #e8f5e9; color: #2e7d32; }
    .co-rejected { background: #fdecea; color: #c62828; }
    .co-cancelled { background: #eceff1; color: #546e7a; }

    .btn-link { background: none; border: none; cursor: pointer; font-size: 13px; font-weight: 500; padding: 0; }
    .btn-link.warn { color: #c62828; }
    .admin-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-approve, .btn-reject { border: none; border-radius: 8px; padding: 7px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-approve { background: #e8f5e9; color: #2e7d32; }
    .btn-reject { background: #fdecea; color: #c62828; }

    .loading, .empty-state { text-align: center; padding: 60px 20px; color: #666; }
    .empty-state .material-icons { font-size: 56px; color: #ccc; }
    .spinner { width: 36px; height: 36px; border: 3px solid #eee; border-top-color: #667eea; border-radius: 50%; margin: 0 auto 12px; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 700px) { .panel-head { flex-direction: column; align-items: flex-start; gap: 10px; } .filter-search { width: 100%; } }
  `],
})
export class CashOutComponent implements OnInit, OnDestroy {
  balance: CashOutBalance | null = null;
  myRequests: CashOutRequest[] = [];
  allRequests: CashOutRequest[] = [];
  isAdmin = false;
  isLoading = false;
  submitting = false;
  statusFilter = '';
  form: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private investmentService: InvestmentService,
    private userService: UserService,
    private toast: ToastService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private confirmation: ConfirmationService,
  ) {
    this.form = this.fb.group({
      amount: [null, [Validators.required, Validators.min(0.01)]],
      remarks: [''],
    });
  }

  ngOnInit(): void {
    const role = this.userService.getRole();
    this.isAdmin = role === 'Admin' || role === 'Manager';
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.isLoading = true;
    this.cdr.detectChanges();

    if (this.isAdmin) {
      this.investmentService
        .adminGetCashOutRequests(this.statusFilter)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: r => {
            this.allRequests = r;
            this.isLoading = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.allRequests = [];
            this.isLoading = false;
            this.cdr.detectChanges();
          },
        });
      return;
    }

    this.investmentService
      .getCashOutAvailableBalance()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: b => {
          this.balance = b;
          this.cdr.detectChanges();
        },
        error: () => (this.balance = null),
      });

    this.investmentService
      .getMyCashOutRequests()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.myRequests = r;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.myRequests = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  requestCashOut(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const amount = this.form.value.amount;
    const remarks = this.form.value.remarks?.trim() || null;
    this.confirmation
      .confirm({
        title: 'Request Cash-out',
        message: `Submit a withdrawal of ${formatBdt(amount)} from your wallet?`,
        detail: remarks || 'No remarks provided.',
        confirmText: 'Submit Request',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doRequestCashOut(amount, remarks));
  }

  private doRequestCashOut(amount: number, remarks: string | null): void {
    this.submitting = true;
    this.cdr.detectChanges();

    this.investmentService
      .createCashOutRequest(amount, remarks)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.form.reset();
          this.toast.success('Cash-out request submitted.');
          this.load();
        },
        error: err => {
          this.submitting = false;
          this.toast.error(err?.error?.message || 'Could not submit request.');
          this.cdr.detectChanges();
        },
      });
  }

  cancel(r: CashOutRequest): void {
    this.confirmation
      .confirm({
        title: 'Cancel Cash-out',
        message: `Cancel the cash-out request of ${formatBdt(r.amount)}?`,
        confirmText: 'Cancel Request',
        danger: true,
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => {
        this.investmentService
          .cancelCashOutRequest(r.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toast.success('Request cancelled.');
              this.load();
            },
            error: err => this.toast.error(err?.error?.message || 'Could not cancel request.'),
          });
      });
  }

  approve(r: CashOutRequest): void {
    this.confirmation
      .confirm({
        title: 'Approve Cash-out',
        message: `Approve the payout of ${formatBdt(r.amount)} to this member's wallet?`,
        detail: 'This releases real funds and cannot be undone.',
        confirmText: 'Approve Payout',
        danger: true,
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => {
        this.investmentService
          .adminApproveCashOut(r.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toast.success(`${formatBdt(r.amount)} approved.`);
              this.load();
            },
            error: err => this.toast.error(err?.error?.message || 'Could not approve request.'),
          });
      });
  }

  reject(r: CashOutRequest): void {
    this.confirmation
      .confirm({
        title: 'Reject Cash-out',
        message: `Reject the cash-out request of ${formatBdt(r.amount)}?`,
        confirmText: 'Reject',
        danger: true,
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doReject(r));
  }

  private doReject(r: CashOutRequest): void {
    const note = window.prompt('Reason for rejection (optional):');
    if (note === null) return; // user cancelled the prompt
    this.investmentService
      .adminRejectCashOut(r.id, note?.trim() || null)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Request rejected.');
          this.load();
        },
        error: err => this.toast.error(err?.error?.message || 'Could not reject request.'),
      });
  }

  onFilter(event: Event): void {
    this.statusFilter = (event.target as HTMLSelectElement).value;
    this.load();
  }

  onSearch(event: Event): void {
    const q = (event.target as HTMLInputElement).value?.trim() || '';
    this.investmentService
      .adminGetCashOutRequests(this.statusFilter, q)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: r => {
          this.allRequests = r;
          this.cdr.detectChanges();
        },
      });
  }
}

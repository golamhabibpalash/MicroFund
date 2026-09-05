import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter, finalize, Subject, takeUntil } from 'rxjs';
import {
  INVESTMENT_STATUS_LABELS,
  InterimProfit,
  Investment,
  InvestmentProjectCost,
  InvestmentService,
  InvestmentStatusName,
  ProfitSettlement,
  ShareSubscription,
} from '../core/services/investment.service';
import { ToastService } from '../core/services/toast.service';
import { BdtCurrencyPipe, formatBdt } from '../shared/pipes/bdt-currency.pipe';
import { DraggableModalDirective } from '../shared/directives/draggable-modal.directive';
import { ConfirmationService } from '../shared/confirmation/confirmation.service';

/**
 * Subscription + lifecycle panel for one project: buy shares, drive the status
 * machine, record completion, distribute profit and disburse.
 */
@Component({
  selector: 'app-investment-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, BdtCurrencyPipe, DraggableModalDirective],
  template: `
    <div class="modal-overlay" (click)="close()">
      <div class="modal-content wide" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <div>
            <h3>{{ investment.name }}</h3>
            <span class="status-pill" [ngClass]="'status-' + investment.status.toLowerCase()">
              {{ statusLabel(investment.status) }}
            </span>
          </div>
          <button class="close-btn" type="button" (click)="close()">
            <span class="material-icons">close</span>
          </button>
        </div>

        <div class="modal-body">
          <!-- Share availability (spec section 8) -->
          <section class="block">
            <h4>Share Availability</h4>
            <div class="share-stats">
              <div><span class="k">Total</span><span class="v">{{ investment.totalShares || 0 }}</span></div>
              <div><span class="k">Sold</span><span class="v sold">{{ investment.soldShares }}</span></div>
              <div><span class="k">Available</span><span class="v avail">{{ investment.remainingShares }}</span></div>
              <div><span class="k">Share Price</span><span class="v">{{ investment.sharePrice || 0 | bdtCurrency }}</span></div>
            </div>
            <div class="progress">
              <div class="bar" [style.width.%]="investment.subscriptionPercentage"></div>
            </div>
            <span class="progress-label">{{ investment.subscriptionPercentage | number: '1.1-1' }}% subscribed</span>
          </section>

          <!-- Buy shares -->
          <section class="block" *ngIf="investment.status === 'OpenForSubscription'">
            <h4>Buy Shares</h4>
            <div class="buy-row">
              <div class="field">
                <label>Number of shares</label>
                <input type="number" min="1" [max]="investment.remainingShares" [(ngModel)]="sharesToBuy" name="shares" />
              </div>
              <div class="field" *ngIf="isAdmin">
                <label>On behalf of</label>
                <select [(ngModel)]="onBehalfOfMemberId" name="member">
                  <option [ngValue]="null">Myself</option>
                  <option *ngFor="let b of balances" [ngValue]="b.memberId">
                    {{ b.memberName }} ({{ b.balance | bdtCurrency }})
                  </option>
                </select>
              </div>
              <div class="cost">
                <span class="k">Cost</span>
                <span class="v">{{ (sharesToBuy || 0) * (investment.sharePrice || 0) | bdtCurrency }}</span>
              </div>
              <button class="btn-primary" (click)="buy()"
                      [disabled]="isWorking || !sharesToBuy || sharesToBuy < 1 || !agreementAccepted">
                <span class="material-icons">shopping_cart</span> Buy
              </button>
            </div>
            <label class="agreement-check">
              <input type="checkbox" [(ngModel)]="agreementAccepted" name="buy-agreement" />
              <span>I have read and understood the investment agreement/caution and agree to the
                terms before purchasing shares.</span>
            </label>
          </section>

          <!-- Investors -->
          <section class="block" *ngIf="subscriptions.length > 0">
            <h4>Investors ({{ subscriptions.length }})</h4>
            <table class="data-table">
              <thead><tr><th>Investor</th><th>Shares</th><th>Ownership</th><th class="right">Paid</th><th>Status</th></tr></thead>
              <tbody>
                <tr *ngFor="let s of subscriptions">
                  <td><strong>{{ s.memberName }}</strong></td>
                  <td>{{ s.sharesPurchased }}</td>
                  <td>{{ s.ownershipPercentage | number: '1.2-2' }}%</td>
                  <td class="right num">{{ s.amountPaid | bdtCurrency }}</td>
                  <td><span class="pill">{{ s.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- Admin lifecycle -->
          <section class="block" *ngIf="isAdmin">
            <h4>Lifecycle</h4>

            <div class="actions" *ngIf="availableTransitions().length > 0">
              <button
                *ngFor="let t of availableTransitions()"
                class="btn-secondary"
                [disabled]="isWorking"
                (click)="changeStatus(t)">
                {{ statusLabel(t) }}
              </button>
            </div>
            <p class="hint" *ngIf="investment.status === 'OpenForSubscription' && investment.remainingShares > 0 && availableTransitions().includes('Active')">
              Start the project to close buying. Unsold shares ({{ investment.remainingShares }}) remain with the organisation.
            </p>
            <p class="hint" *ngIf="availableTransitions().length === 0 && investment.status !== 'Active' && investment.status !== 'Completed'">
              No further status changes are available from {{ statusLabel(investment.status) }}.
            </p>

            <!-- Project expenses -->
            <div class="sub-block" *ngIf="canEditCosts || projectCosts.length > 0">
              <h5>Project Expenses</h5>

              <div class="buy-row" *ngIf="canEditCosts">
                <div class="field">
                  <label>Expense type *</label>
                  <input type="text" maxlength="150" list="expense-type-options"
                         [(ngModel)]="costTitle" name="costtitle"
                         placeholder="e.g. Convenience, Deed Cost, Food, Legal" />
                  <datalist id="expense-type-options">
                    <option *ngFor="let t of expenseTypeSuggestions" [value]="t"></option>
                  </datalist>
                </div>
                <div class="field">
                  <label>Amount *</label>
                  <input type="number" step="0.01" min="0.01" [(ngModel)]="costAmount" name="costamt" />
                </div>
                <div class="field">
                  <label>Date</label>
                  <input type="date" [(ngModel)]="costDate" name="costdate" />
                </div>
                <button class="btn-primary" (click)="saveCost()"
                        [disabled]="isWorking || !costTitle || !costAmount || costAmount < 0.01">
                  <span class="material-icons">{{ editingCost ? 'save' : 'add' }}</span>
                  {{ editingCost ? 'Update' : 'Add' }}
                </button>
                <button class="btn-link" type="button" *ngIf="editingCost" [disabled]="isWorking" (click)="cancelEditCost()">
                  Cancel
                </button>
              </div>
              <div class="field" *ngIf="canEditCosts">
                <label>Notes</label>
                <input type="text" maxlength="500" [(ngModel)]="costRemarks" name="costrem" placeholder="Optional note" />
              </div>
              <p class="hint" *ngIf="canEditCosts">
                Add as many expenses as you need while the project is open or running. Every add, edit or
                delete updates the project summary immediately.
              </p>

              <table class="data-table" *ngIf="projectCosts.length > 0">
                <thead>
                  <tr>
                    <th>Type</th><th>Date</th><th class="right">Amount</th><th>Notes</th>
                    <th *ngIf="canEditCosts"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let c of projectCosts">
                    <td><strong>{{ c.title }}</strong></td>
                    <td>{{ c.costDate | date: 'mediumDate' }}</td>
                    <td class="right cost-amt">− {{ c.amount | bdtCurrency }}</td>
                    <td>{{ c.remarks || '—' }}</td>
                    <td class="right" *ngIf="canEditCosts">
                      <button class="btn-link" [disabled]="isWorking" (click)="startEditCost(c)">Edit</button>
                      <button class="btn-link danger" [disabled]="isWorking" (click)="removeCost(c)">Remove</button>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div class="calc">
                <div><span class="k">Recorded expenses</span><span class="v">{{ projectCosts.length }}</span></div>
                <div class="total"><span class="k">Total project cost</span><span class="v minus">{{ projectCostTotal | bdtCurrency }}</span></div>
              </div>
            </div>

            <!-- Interim / occasional profit -->
            <div class="sub-block" *ngIf="investment.status === 'OpenForSubscription' || investment.status === 'Active'">
              <h5>Interim / Occasional Profit</h5>
              <div class="buy-row">
                <div class="field">
                  <label>Amount *</label>
                  <input type="number" step="0.01" min="0.01" [(ngModel)]="interimAmount" name="ipamt" />
                </div>
                <div class="field">
                  <label>Profit date *</label>
                  <input type="date" [(ngModel)]="interimDate" name="ipdate" />
                </div>
                <button class="btn-primary" (click)="addInterimProfit()" [disabled]="isWorking || !interimAmount || interimAmount < 0.01 || !interimDate">
                  <span class="material-icons">add</span> Add
                </button>
              </div>
              <div class="field">
                <label>Remarks</label>
                <input type="text" maxlength="500" [(ngModel)]="interimRemarks" name="iprem" placeholder="Optional note" />
              </div>
              <p class="hint">Interim profits are accrued and included in the final settlement. They are not paid out until distribution.</p>

              <table class="data-table" *ngIf="interimProfits.length > 0">
                <thead>
                  <tr><th>Date</th><th class="right">Amount</th><th>Remarks</th><th></th></tr>
                </thead>
                <tbody>
                  <tr *ngFor="let p of interimProfits">
                    <td>{{ p.profitDate | date: 'mediumDate' }}</td>
                    <td class="right num profit">{{ p.amount | bdtCurrency }}</td>
                    <td>{{ p.remarks || '—' }}</td>
                    <td>
                      <button class="btn-link" [disabled]="isWorking" (click)="removeInterimProfit(p.id)">Remove</button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div class="calc" *ngIf="interimProfits.length > 0">
                <div><span class="k">Accrued interim profit</span><span class="v">{{ interimProfitTotal | bdtCurrency }}</span></div>
              </div>
            </div>

            <!-- Completion -->
            <div class="sub-block" *ngIf="investment.status === 'Active'">
              <h5>Record Completion</h5>
              <div class="buy-row">
                <div class="field">
                  <label>Gross received amount *</label>
                  <input type="number" step="0.01" min="0" [(ngModel)]="actualGrossProfit" name="agp" />
                </div>
                <div class="field">
                  <label>Completion date</label>
                  <input type="date" [(ngModel)]="completionDate" name="cd" />
                </div>
                <button class="btn-primary" (click)="complete()" [disabled]="isWorking || actualGrossProfit === null">
                  <span class="material-icons">task_alt</span> Complete
                </button>
              </div>
              <div class="field">
                <label>Closing notes</label>
                <textarea rows="2" [(ngModel)]="closingNotes" name="notes"></textarea>
              </div>
            </div>

            <!-- Distribution preview + action -->
            <div class="sub-block" *ngIf="investment.status === 'Completed'">
              <h5>Distribute Profit</h5>
              <div class="calc">
                <div><span class="k">Gross received</span><span class="v">{{ investment.actualGrossProfit || 0 | bdtCurrency }}</span></div>
                <div *ngIf="investment.interimProfitTotal"><span class="k">Accrued interim profit</span><span class="v">{{ investment.interimProfitTotal | bdtCurrency }}</span></div>
                <div *ngIf="projectCostTotal"><span class="k">Total project costs</span><span class="v minus">− {{ projectCostTotal | bdtCurrency }}</span></div>
                <div *ngIf="valueAfterCosts() !== 0"><span class="k">Value after costs</span><span class="v">{{ valueAfterCosts() | bdtCurrency }}</span></div>
                <div><span class="k">Principal invested</span><span class="v">{{ principalTotal() | bdtCurrency }}</span></div>

                <ng-container *ngIf="!isLoss()">
                  <div *ngIf="estimatedProfit() > 0"><span class="k">Maintenance ({{ investment.maintenancePercentage || 0 }}% of profit)</span>
                       <span class="v minus">− {{ estimatedMaintenance() | bdtCurrency }}</span></div>
                  <div class="total"><span class="k">Net profit to investors</span><span class="v">{{ estimatedNet() | bdtCurrency }}</span></div>
                </ng-container>
                <ng-container *ngIf="isLoss()">
                  <div><span class="k">Loss shared by investors</span><span class="v minus">− {{ estimatedLoss() | bdtCurrency }}</span></div>
                </ng-container>

                <div class="total payable"><span class="k">Total payable to investors</span><span class="v">{{ estimatedPayableTotal() | bdtCurrency }}</span></div>
              </div>
              <button class="btn-primary" (click)="distribute()" [disabled]="isWorking">
                <span class="material-icons">paid</span> Distribute to {{ subscriptions.length }} investor(s)
              </button>
              <p class="hint" *ngIf="!isLoss()">This locks in each investor's principal and profit. Nothing reaches their wallet until you disburse below.</p>
              <p class="hint hint-loss" *ngIf="isLoss()">
                <span class="material-icons">warning</span>
                This project realised less than was invested. The loss is shared proportionally across
                investors — nobody is topped up to their original principal. Nothing reaches their wallet
                until you disburse below.
              </p>
            </div>
          </section>

          <!-- Settlement -->
          <section class="block" *ngIf="settlement && settlement.distributions.length > 0">
            <h4>Settlement</h4>
            <div class="calc">
              <div><span class="k">Gross received</span><span class="v">{{ settlement.actualGrossProfit | bdtCurrency }}</span></div>
              <div *ngIf="settlement.interimProfitTotal" class="interim-line">
                <span class="k">Accrued interim profit</span><span class="v">{{ settlement.interimProfitTotal | bdtCurrency }}</span>
              </div>
              <div><span class="k">Gross result</span><span class="v">{{ settlement.grossResult | bdtCurrency }}</span></div>
              <div *ngIf="settlement.totalProjectCost"><span class="k">Total project costs</span><span class="v minus">− {{ settlement.totalProjectCost | bdtCurrency }}</span></div>
              <div *ngIf="settlement.valueAfterCosts"><span class="k">Value after costs</span><span class="v">{{ settlement.valueAfterCosts | bdtCurrency }}</span></div>
              <div><span class="k">Principal invested</span><span class="v">{{ settlement.totalPrincipalReturned | bdtCurrency }}</span></div>
              <div *ngIf="settlement.maintenanceAmount > 0"><span class="k">Maintenance ({{ settlement.maintenancePercentage }}% of profit)</span>
                   <span class="v minus">− {{ settlement.maintenanceAmount | bdtCurrency }}</span></div>
              <div class="total" [class.loss]="settlement.totalProfitDistributed < 0">
                <span class="k">{{ settlement.totalProfitDistributed < 0 ? 'Loss shared by investors' : 'Investor profit' }}</span>
                <span class="v" [class.minus]="settlement.totalProfitDistributed < 0">{{ settlement.totalProfitDistributed | bdtCurrency }}</span>
              </div>
              <div class="total payable"><span class="k">Total paid to investors</span><span class="v">{{ settlement.totalPayable | bdtCurrency }}</span></div>
              <div class="summary-row">
                <span class="k">Capital collected</span><span class="v">{{ settlement.totalInvested | bdtCurrency }}</span>
                <span class="k">Shares sold</span><span class="v">{{ settlement.sharesSold }}</span>
              </div>
              <div *ngIf="settlement.undistributedRemainder > 0" class="remainder">
                <span class="k">Rounding remainder retained</span>
                <span class="v">{{ settlement.undistributedRemainder | bdtCurrency }}</span>
              </div>
            </div>

            <table class="data-table">
              <thead>
                <tr><th>Investor</th><th>Shares</th><th class="right">Principal</th><th class="right">Profit</th><th class="right">Total Payable</th><th>Paid</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let d of settlement.distributions">
                  <td><strong>{{ d.memberName }}</strong></td>
                  <td>{{ d.sharesOwned }} ({{ d.ownershipPercentage | number: '1.2-2' }}%)</td>
                  <td class="right num">{{ d.principalAmount | bdtCurrency }}</td>
                  <td class="right num" [class.profit]="d.profitAmount >= 0" [class.loss]="d.profitAmount < 0">
                    {{ d.profitAmount | bdtCurrency }}
                  </td>
                  <td class="right num"><strong>{{ d.totalPayable | bdtCurrency }}</strong></td>
                  <td>
                    <span class="pill paid" *ngIf="d.disbursedAt">Disbursed</span>
                    <button class="btn-link" *ngIf="!d.disbursedAt && isAdmin" [disabled]="isWorking" (click)="disburse(d.memberId)">
                      Disburse
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>

            <button class="btn-primary" *ngIf="isAdmin && hasPending()" [disabled]="isWorking" (click)="disburse()">
              <span class="material-icons">account_balance</span> Disburse all pending
            </button>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-content.wide { max-width: 900px; }
    .modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: white; z-index: 1; }
    .modal-header h3 { font-size: 18px; font-weight: 600; margin: 0 0 8px 0; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
    .modal-body { padding: 24px; }
    .block { margin-bottom: 26px; padding-bottom: 22px; border-bottom: 1px solid #eee; }
    .block:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .block h4 { font-size: 14px; font-weight: 600; color: #667eea; margin: 0 0 14px 0; text-transform: uppercase; }
    .sub-block { margin-top: 18px; padding: 16px; background: #fbfbfd; border: 1px solid #eee; border-radius: 10px; }
    .sub-block h5 { font-size: 13px; font-weight: 600; margin: 0 0 12px 0; color: #333; }

    .share-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px; }
    .share-stats > div, .cost { display: flex; flex-direction: column; gap: 3px; }
    .k { font-size: 12px; color: #888; }
    .v { font-size: 17px; font-weight: 600; color: #1a1a2e; }
    .v.sold { color: #5e35b1; } .v.avail { color: #2e7d32; } .v.minus { color: #c62828; }
    .progress { height: 8px; background: #eee; border-radius: 999px; overflow: hidden; }
    .bar { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); transition: width .3s; }
    .progress-label { font-size: 12px; color: #666; margin-top: 6px; display: inline-block; }

    .buy-row { display: flex; gap: 14px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 12px; }
    .agreement-check { display: flex; gap: 10px; align-items: flex-start; margin-top: 4px; font-size: 12.5px; line-height: 1.5; color: #555; cursor: pointer; }
    .agreement-check input { margin-top: 2px; width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
    .field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 150px; }
    .field label { font-size: 13px; font-weight: 500; color: #333; }
    .field input, .field select, .field textarea { padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; width: 100%; }
    .field input:focus, .field select:focus { outline: none; border-color: #667eea; }

    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .hint { font-size: 12px; color: #888; margin: 10px 0 0 0; }
    .hint-loss { display: flex; align-items: flex-start; gap: 6px; color: #c62828; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 8px; padding: 8px 10px; }
    .hint-loss .material-icons { font-size: 15px; flex-shrink: 0; margin-top: 1px; }
    .section-title-row { display: flex; justify-content: space-between; align-items: center; }
    .section-title-row h4 { margin-bottom: 12px; }
    .muted { color: #888; font-size: 12px; font-weight: 400; margin-top: 2px; }
    .cost-form { display: grid; grid-template-columns: repeat(4, 1fr) auto; gap: 12px; align-items: end; margin-top: 14px; padding: 14px; background: #fbfbfd; border: 1px solid #eee; border-radius: 10px; }
    .data-table .cost-amt { text-align: right; color: #c62828; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .cost-form .actions { align-self: center; }
    .btn-link.danger { color: #c62828; margin-left: 12px; }

    .calc { background: #fbfbfd; border: 1px solid #eee; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
    .calc > div { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
    .calc .total { border-top: 1px solid #ddd; margin-top: 6px; padding-top: 10px; font-weight: 600; }
    .calc .total.payable { color: #1b5e20; font-size: 15px; }
    .calc .remainder { border-top: 1px dashed #ddd; margin-top: 6px; padding-top: 8px; font-size: 12px; color: #888; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 14px; }
    .data-table th { text-align: left; padding: 9px 8px; border-bottom: 2px solid #eee; color: #666; font-weight: 500; font-size: 12px; }
    .data-table td { padding: 10px 8px; border-bottom: 1px solid #f2f2f2; }
    .data-table .right { text-align: right; }
    .num { font-variant-numeric: tabular-nums; }
    .profit { color: #2e7d32; }
    .loss { color: #c62828; }

    .pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11px; font-weight: 600; background: #eceff1; color: #546e7a; }
    .pill.paid { background: #e8f5e9; color: #2e7d32; }
    .status-pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
    .status-draft { background: #eceff1; color: #546e7a; }
    .status-openforsubscription { background: #e8f5e9; color: #2e7d32; }
    .status-fullysubscribed { background: #e3f2fd; color: #1565c0; }
    .status-active { background: #ede7f6; color: #5e35b1; }
    .status-completed { background: #fff8e1; color: #f9a825; }
    .status-profitdistributed { background: #e0f2f1; color: #00695c; }
    .status-closed { background: #eceff1; color: #546e7a; }
    .status-cancelled { background: #ffebee; color: #c62828; }

    .btn-primary { display: inline-flex; align-items: center; gap: 8px; padding: 11px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary { padding: 9px 16px; background: #f5f6fa; color: #444; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .btn-secondary:hover:not(:disabled) { background: #eee; }
    .btn-secondary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-link { background: none; border: none; color: #667eea; cursor: pointer; font-size: 13px; font-weight: 500; padding: 0; }
    .material-icons { font-size: 18px; }

    @media (max-width: 768px) { .share-stats { grid-template-columns: repeat(2, 1fr); } .buy-row { flex-direction: column; align-items: stretch; } .cost-form { grid-template-columns: 1fr; } }
  `]
})
export class InvestmentManageComponent implements OnInit, OnDestroy {
  @Input({ required: true }) investment!: Investment;
  @Input() isAdmin = false;

  @Output() changed = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  subscriptions: ShareSubscription[] = [];
  settlement: ProfitSettlement | null = null;
  balances: { memberId: string; memberName: string; balance: number }[] = [];
  interimProfits: InterimProfit[] = [];
  projectCosts: InvestmentProjectCost[] = [];

  sharesToBuy: number | null = null;
  onBehalfOfMemberId: string | null = null;
  agreementAccepted = false;
  actualGrossProfit: number | null = null;
  completionDate = '';
  closingNotes = '';
  interimAmount: number | null = null;
  interimDate = '';
  interimRemarks = '';
  costTitle = '';
  costAmount: number | null = null;
  costDate = '';
  costRemarks = '';
  editingCost: InvestmentProjectCost | null = null;
  isWorking = false;

  private destroy$ = new Subject<void>();

  constructor(private service: InvestmentService, private toast: ToastService,
              private confirmation: ConfirmationService, private cdr: ChangeDetectorRef) {}

  /** Zoneless app: async callbacks must ask for a re-render explicitly. */
  private tick(): void {
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.interimProfits = [...(this.investment.interimProfits ?? [])];
    this.projectCosts = [...(this.investment.projectCosts ?? [])];
    this.loadSubscriptions();
    if (this.investment.status === 'ProfitDistributed' || this.investment.status === 'Closed') {
      this.loadSettlement();
    }
    if (this.isAdmin) {
      this.service.getAllBalances().pipe(takeUntil(this.destroy$)).subscribe({
        next: b => { this.balances = b; this.tick(); },
        error: () => { this.balances = []; this.tick(); },
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  statusLabel(status: InvestmentStatusName): string {
    return INVESTMENT_STATUS_LABELS[status] ?? status;
  }

  /**
   * Mirrors the server's transition table. The server is still the authority -
   * this only avoids offering buttons that would be rejected.
   */
  availableTransitions(): InvestmentStatusName[] {
    switch (this.investment.status) {
      case 'Draft':
        return ['OpenForSubscription', 'Cancelled'];
      case 'OpenForSubscription':
        return ['Draft', 'Active', 'Cancelled'];
      case 'FullySubscribed':
        return ['Active', 'Cancelled'];
      case 'ProfitDistributed':
        return ['Closed'];
      default:
        return [];
    }
  }

  get interimProfitTotal(): number {
    return this.interimProfits.reduce((sum, p) => sum + p.amount, 0);
  }

  get projectCostTotal(): number {
    return this.projectCosts.reduce((sum, c) => sum + c.amount, 0);
  }

  /** Gross received + accrued interim profit − project costs. */
  valueAfterCosts(): number {
    return (this.investment.actualGrossProfit ?? 0) + this.interimProfitTotal - this.projectCostTotal;
  }

  /** Total capital collected from investors, used to derive profit. */
  principalTotal(): number {
    return this.investment.totalInvested
      ?? this.subscriptions.reduce((sum, s) => sum + s.amountPaid, 0);
  }

  /** Profit before the maintenance share; floored at zero (loss → none). */
  estimatedProfit(): number {
    return Math.max(0, this.valueAfterCosts() - this.principalTotal());
  }

  estimatedMaintenance(): number {
    const profit = this.estimatedProfit();
    if (profit <= 0) return 0;
    return Math.round(profit * (this.investment.maintenancePercentage || 0)) / 100;
  }

  estimatedNet(): number {
    return this.estimatedProfit() - this.estimatedMaintenance();
  }

  /** True when the realised value fell short of the capital collected. */
  isLoss(): boolean {
    return this.valueAfterCosts() < this.principalTotal();
  }

  /** Magnitude of the shortfall, shared proportionally across investors (never topped up). */
  estimatedLoss(): number {
    return Math.max(0, this.principalTotal() - this.valueAfterCosts());
  }

  /** The actual total that will reach investors: full payout normally, reduced on a loss. */
  estimatedPayableTotal(): number {
    return this.isLoss()
      ? Math.max(0, this.valueAfterCosts())
      : this.principalTotal() + this.estimatedNet();
  }

  hasPending(): boolean {
    return !!this.settlement?.distributions.some(d => !d.disbursedAt);
  }

  buy(): void {
    if (!this.sharesToBuy || this.sharesToBuy < 1) return;
    if (!this.agreementAccepted) {
      this.toast.error('Please accept the investment agreement / caution before buying shares.');
      return;
    }
    const sharesToBuy = this.sharesToBuy;

    this.confirmation
      .confirm({
        title: 'Confirm Share Purchase',
        message: `Purchase ${sharesToBuy} share(s) out of your wallet funds?`,
        detail: `Investment: ${this.investment.name}`,
        confirmText: 'Purchase',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doBuy(sharesToBuy));
  }

  private doBuy(sharesToBuy: number): void {
    this.isWorking = true;
    this.service
      .subscribe(this.investment.id, sharesToBuy, this.agreementAccepted, this.onBehalfOfMemberId ?? undefined)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: () => {
          this.toast.success(`${sharesToBuy} share(s) purchased.`);
          this.sharesToBuy = null;
          this.agreementAccepted = false;
          this.isWorking = false;
          this.refresh();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not complete the purchase.');
        },
      });
  }

  addInterimProfit(): void {
    if (!this.interimAmount || this.interimAmount < 0.01 || !this.interimDate) return;

    this.isWorking = true;
    this.service
      .createInterimProfit(this.investment.id, {
        amount: this.interimAmount,
        profitDate: `${this.interimDate}T00:00:00Z`,
        remarks: this.interimRemarks || null,
      })
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: p => {
          this.interimProfits = [p, ...this.interimProfits];
          this.interimAmount = null;
          this.interimDate = '';
          this.interimRemarks = '';
          this.isWorking = false;
          this.toast.success('Interim profit recorded.');
          this.refresh();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not record the interim profit.');
        },
      });
  }

  removeInterimProfit(id: string): void {
    this.confirmation
      .confirm({
        title: 'Remove Interim Profit',
        message: 'Remove this interim profit record? This cannot be undone.',
        danger: true,
        confirmText: 'Remove',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doRemoveInterimProfit(id));
  }

  private doRemoveInterimProfit(id: string): void {
    this.isWorking = true;
    this.service
      .deleteInterimProfit(this.investment.id, id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: () => {
          this.interimProfits = this.interimProfits.filter(p => p.id !== id);
          this.isWorking = false;
          this.toast.success('Interim profit removed.');
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not remove the interim profit.');
        },
      });
  }

  /** Mirrors the server rule: costs are editable while the project is open/active. */
  get canEditCosts(): boolean {
    return (
      this.investment.status === 'OpenForSubscription' ||
      this.investment.status === 'Active'
    );
  }

  /** Free-text type field; these are just autocomplete hints, not a fixed list. */
  get expenseTypeSuggestions(): string[] {
    const common = [
      'Convenience', 'Deed Cost', 'Food', 'Phone', 'Legal',
      'Transport', 'Labour', 'Materials', 'Utilities', 'Rent', 'Commission',
    ];
    const used = this.projectCosts.map(c => c.title).filter(Boolean);
    return Array.from(new Set([...used, ...common]));
  }

  startEditCost(cost: InvestmentProjectCost): void {
    this.editingCost = cost;
    this.costTitle = cost.title;
    this.costAmount = cost.amount;
    this.costDate = cost.costDate ? new Date(cost.costDate).toISOString().slice(0, 10) : '';
    this.costRemarks = cost.remarks ?? '';
  }

  cancelEditCost(): void {
    this.editingCost = null;
    this.costTitle = '';
    this.costAmount = null;
    this.costDate = '';
    this.costRemarks = '';
  }

  saveCost(): void {
    if (!this.costTitle || !this.costAmount || this.costAmount < 0.01) return;

    this.isWorking = true;
    const request = {
      title: this.costTitle.trim(),
      amount: this.costAmount,
      remarks: this.costRemarks || null,
      costDate: this.costDate ? `${this.costDate}T00:00:00Z` : null,
    };

    const call = this.editingCost
      ? this.service.updateProjectCost(this.investment.id, this.editingCost.id, request)
      : this.service.createProjectCost(this.investment.id, request);

    call.pipe(takeUntil(this.destroy$), finalize(() => this.tick())).subscribe({
      next: saved => {
        if (this.editingCost) {
          this.projectCosts = this.projectCosts.map(c => (c.id === saved.id ? saved : c));
        } else {
          this.projectCosts = [saved, ...this.projectCosts];
        }
        this.cancelEditCost();
        this.isWorking = false;
        this.toast.success('Project cost saved.');
        this.refresh();
      },
      error: err => {
        this.isWorking = false;
        this.toast.error(err?.error?.message || 'Could not save the project cost.');
      },
    });
  }

  removeCost(cost: InvestmentProjectCost): void {
    this.confirmation
      .confirm({
        title: 'Remove Project Cost',
        message: `Remove "${cost.title}" (${formatBdt(cost.amount)})? This cannot be undone.`,
        danger: true,
        confirmText: 'Remove',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doRemoveCost(cost));
  }

  private doRemoveCost(cost: InvestmentProjectCost): void {
    this.isWorking = true;
    this.service
      .deleteProjectCost(this.investment.id, cost.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: () => {
          this.projectCosts = this.projectCosts.filter(c => c.id !== cost.id);
          this.isWorking = false;
          this.toast.success('Project cost removed.');
          this.refresh();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not remove the project cost.');
        },
      });
  }

  changeStatus(status: InvestmentStatusName): void {
    const reason =
      status === 'Cancelled'
        ? 'Cancelled by administrator'
        : undefined;

    const destructive = status === 'Cancelled' || status === 'Closed';
    this.confirmation
      .confirm({
        title: destructive ? `Change Status to ${this.statusLabel(status)}` : 'Change Status',
        message: `Change this project's status to "${this.statusLabel(status)}"?`,
        detail: destructive
          ? 'This transitions the project lifecycle and cannot be reversed.'
          : `Investment: ${this.investment.name}`,
        confirmText: `Set ${this.statusLabel(status)}`,
        danger: destructive,
        icon: destructive ? 'lock' : 'swap_horiz',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doChangeStatus(status, reason));
  }

  private doChangeStatus(status: InvestmentStatusName, reason?: string): void {
    this.isWorking = true;
    this.service
      .changeStatus(this.investment.id, status, reason)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: updated => {
          this.investment = updated;
          this.isWorking = false;
          this.toast.success(`Status changed to ${this.statusLabel(status)}.`);
          this.refresh();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not change the status.');
        },
      });
  }

  complete(): void {
    if (this.actualGrossProfit === null) return;
    const actualGrossProfit = this.actualGrossProfit;

    this.confirmation
      .confirm({
        title: 'Complete Project',
        message: 'Record completion with the entered gross profit? This locks the project lifecycle.',
        detail: `Actual Gross Profit: ${formatBdt(actualGrossProfit)}`,
        confirmText: 'Complete',
        danger: true,
        icon: 'task_alt',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doComplete(actualGrossProfit));
  }

  private doComplete(actualGrossProfit: number): void {
    this.isWorking = true;
    this.service
      .complete(this.investment.id, {
        actualGrossProfit,
        completionDate: this.completionDate ? `${this.completionDate}T00:00:00Z` : null,
        closingNotes: this.closingNotes || null,
      })
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: updated => {
          this.investment = updated;
          this.isWorking = false;
          this.toast.success('Completion recorded.');
          this.refresh();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not record completion.');
        },
      });
  }

  distribute(): void {
    this.confirmation
      .confirm({
        title: 'Distribute Profit',
        message: `Distribute the profit to all ${this.investment.members?.length || 'investor'} wallet(s)?`,
        detail: 'This moves funds into investor wallets and cannot be undone.',
        confirmText: 'Distribute',
        danger: true,
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doDistribute());
  }

  private doDistribute(): void {
    this.isWorking = true;
    this.service
      .distributeProfit(this.investment.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: s => {
          this.settlement = s;
          this.investment = { ...this.investment, status: s.status };
          this.isWorking = false;
          this.toast.success('Profit distributed to investor wallets.');
          this.refresh();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not distribute profit.');
        },
      });
  }

  disburse(memberId?: string): void {
    const isBulk = !memberId;
    this.confirmation
      .confirm({
        title: isBulk ? 'Disburse All Pending' : 'Disburse Funds',
        message: isBulk
          ? 'Credit the settled principal and profit to every member with a pending payout?'
          : 'Credit this member\u2019s settled principal and profit to their wallet?',
        detail: 'This releases the funds into investor wallets and cannot be undone.',
        confirmText: 'Disburse',
        danger: true,
        icon: 'payments',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => this.doDisburse(memberId));
  }

  private doDisburse(memberId?: string): void {
    this.isWorking = true;
    this.service
      .disburse(this.investment.id, memberId)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: s => {
          this.settlement = s;
          this.isWorking = false;
          this.toast.success('Disbursement recorded.');
          this.changed.emit();
        },
        error: err => {
          this.isWorking = false;
          this.toast.error(err?.error?.message || 'Could not disburse.');
        },
      });
  }

  close(): void {
    this.closed.emit();
  }

  private refresh(): void {
    this.service
      .getInvestment(this.investment.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: i => {
          this.investment = i;
          this.interimProfits = [...(i.interimProfits ?? [])];
          this.projectCosts = [...(i.projectCosts ?? [])];
          this.loadSubscriptions();
          if (i.status === 'ProfitDistributed' || i.status === 'Closed') {
            this.loadSettlement();
          }
          this.changed.emit();
          this.tick();
        },
        error: () => {},
      });
  }

  private loadSubscriptions(): void {
    this.service
      .getSubscriptions(this.investment.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: s => { this.subscriptions = s; this.tick(); },
        error: () => { this.subscriptions = []; this.tick(); },
      });
  }

  private loadSettlement(): void {
    this.service
      .getSettlement(this.investment.id)
      .pipe(takeUntil(this.destroy$), finalize(() => this.tick()))
      .subscribe({
        next: s => { this.settlement = s; this.tick(); },
        error: () => { this.settlement = null; this.tick(); },
      });
  }
}

import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subject, forkJoin, of, takeUntil } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';
import {
  CreateInvestmentRequest,
  INVESTMENT_STATUSES,
  INVESTMENT_TYPES,
  Investment,
  InvestmentDocument,
  InvestmentService,
  InvestmentStatusName,
  InvestmentTypeName,
} from '../core/services/investment.service';
import { ToastService } from '../core/services/toast.service';
import { ConfirmationService } from '../shared/confirmation/confirmation.service';
import { DraggableModalDirective } from '../shared/directives/draggable-modal.directive';
import { AccountService, Account as BankAccount } from '../core/services/account';

/** Minimal shape needed to pre-fill a partner from an existing member. */
interface MemberOption {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: string;
  nomineeName?: string;
  nomineeRelation?: string;
  nomineePhone?: string;
}

const PHONE_PATTERN = /^(\+?88)?01[3-9]\d{8}$/;
const NID_PATTERN = /^(\d{10}|\d{13}|\d{17})$/;

function maturityAfterStartValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('dateInvested')?.value;
  const maturity = group.get('maturityDate')?.value;

  if (!start || !maturity) return null;
  return new Date(maturity) > new Date(start) ? null : { maturityBeforeStart: true };
}

/** Investor, Witness and Guarantor must be three different members. */
function participantsDistinctValidator(group: AbstractControl): ValidationErrors | null {
  const investor = group.get('investorMemberId')?.value;
  const witness = group.get('witnessMemberId')?.value;
  const guarantor = group.get('guarantorMemberId')?.value;

  const errors: ValidationErrors = {};
  if (investor && witness && investor === witness) errors['investorEqualsWitness'] = true;
  if (investor && guarantor && investor === guarantor) errors['investorEqualsGuarantor'] = true;
  if (witness && guarantor && witness === guarantor) errors['witnessEqualsGuarantor'] = true;
  return Object.keys(errors).length ? errors : null;
}

const digitsOnly = (v: unknown): string => String(v ?? '').replace(/\D/g, '');

/** Partner NID and Nominee NID must differ (they are two different people). */
function partnerNomineeNidValidator(group: AbstractControl): ValidationErrors | null {
  const partnerNid = digitsOnly(group.get('nid')?.value);
  const nomineeNid = digitsOnly(group.get('nominee')?.get('nid')?.value);
  if (!partnerNid || !nomineeNid) return null;
  return partnerNid === nomineeNid ? { partnerNomineeSameNid: true } : null;
}

@Component({
  selector: 'app-investment-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DraggableModalDirective],
  template: `
    <div class="modal-overlay" (click)="onCancel()">
      <div class="modal-content wide" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ isEditMode ? 'Edit Investment' : 'New Investment' }}</h3>
          <button class="close-btn" type="button" (click)="onCancel()">
            <span class="material-icons">close</span>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- ============ Investment Information ============ -->
          <div class="form-section">
            <h4>Investment Information</h4>

            <div class="form-group">
              <label>Investment Name *</label>
              <input type="text" formControlName="name" maxlength="200" />
              <span class="field-error" *ngIf="showError('name')">Investment name is required.</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Investment Type *</label>
                <select formControlName="type">
                  <option *ngFor="let t of investmentTypes" [value]="t">{{ labelFor(t) }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Category</label>
                <input
                  type="text"
                  formControlName="category"
                  list="investment-categories"
                  maxlength="100"
                  placeholder="e.g. Short Term" />
                <datalist id="investment-categories">
                  <option *ngFor="let c of categories" [value]="c"></option>
                </datalist>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Investment Value (BDT) *</label>
                <input type="number" formControlName="principalAmount" step="0.01" min="0.01" />
                <span class="field-error" *ngIf="showError('principalAmount')">
                  Enter an investment value greater than zero.
                </span>
              </div>
              <div class="form-group">
                <label>Target Gross Profit (BDT)</label>
                <input type="number" formControlName="targetGrossProfit" step="0.01" min="0" />
                <span class="field-hint">Estimated profit; the actual figure is recorded at completion.</span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Total Shares</label>
                <input type="number" formControlName="totalShares" min="1" step="1" />
              </div>
              <div class="form-group">
                <label>Share Price (BDT)</label>
                <input type="text" [value]="suggestedSharePrice !== null ? (suggestedSharePrice | number: '1.2-2') : '—'" readonly class="readonly" />
                <span class="field-hint">Calculated automatically as investment value ÷ total shares.</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Minimum Shares per Member</label>
                <input type="number" formControlName="minimumSharesPerMember" min="1" step="1" />
                <span class="field-error" *ngIf="showError('minimumSharesPerMember')">Minimum must be at least 1.</span>
              </div>
              <div class="form-group">
                <label>Maximum Shares per Member</label>
                <input type="number" formControlName="maximumSharesPerMember" min="1" step="1" />
                <span class="field-error" *ngIf="showError('maximumSharesPerMember')">Maximum must be at least 1.</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Maintenance % (org fee)</label>
                <input type="number" formControlName="maintenancePercentage" min="0" max="100" step="0.01" />
                <span class="field-error" *ngIf="showError('maintenancePercentage')">Between 0 and 100.</span>
                <span class="field-hint">A % of the project's profit; never of principal or gross.</span>
              </div>
              <div class="form-group">
                <label>Maintenance Account</label>
                <select formControlName="maintenanceAccountId">
                  <option [ngValue]="null">— No account —</option>
                  <option *ngFor="let acc of accounts" [ngValue]="acc.id">{{ acc.name }}</option>
                </select>
                <span class="field-hint">The org account that receives the maintenance amount on distribution.</span>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select formControlName="status" [disabled]="isEditMode">
                  <option *ngFor="let s of selectableStatuses" [value]="s">{{ s }}</option>
                </select>
                <span class="field-hint" *ngIf="isEditMode">Status is changed from the project's lifecycle panel.</span>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Start Date *</label>
                <input type="date" formControlName="dateInvested" />
                <span class="field-error" *ngIf="showError('dateInvested')">Start date is required.</span>
              </div>
              <div class="form-group">
                <label>Maturity Date</label>
                <input type="date" formControlName="maturityDate" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Duration (months)</label>
                <input type="number" formControlName="durationMonths" min="1" max="1200" />
                <span class="field-hint" *ngIf="derivedDuration !== null">
                  Derived from the dates: {{ derivedDuration }} months.
                </span>
              </div>
            </div>
            <span class="field-error block" *ngIf="form.errors?.['maturityBeforeStart'] && form.touched">
              Maturity date must be after the start date.
            </span>

            <div class="form-group">
              <label>Description / Remarks</label>
              <textarea formControlName="description" rows="3" maxlength="1000"></textarea>
            </div>
          </div>

          <!-- ============ Investor Information ============ -->
          <div class="form-section">
            <h4>Investor Information</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Investor (fund member) *</label>
                <select formControlName="investorMemberId">
                  <option [ngValue]="null">— Select a member —</option>
                  <option *ngFor="let m of members" [ngValue]="m.id">{{ m.name }}</option>
                </select>
                <span class="field-error" *ngIf="showError('investorMemberId')">An investor is required.</span>
              </div>
              <div class="form-group">
                <label>Investor Witness (fund member) *</label>
                <select formControlName="witnessMemberId">
                  <option [ngValue]="null">— Select a member —</option>
                  <option *ngFor="let m of members" [ngValue]="m.id">{{ m.name }}</option>
                </select>
                <span class="field-error" *ngIf="showError('witnessMemberId')">A witness is required.</span>
              </div>
            </div>
            <span class="field-error block" *ngIf="form.errors?.['investorEqualsWitness'] && form.touched">
              The investor and the witness must be two different members.
            </span>
          </div>

          <!-- ============ Partner Information ============ -->
          <div class="form-section" [formGroup]="asGroup(partners.at(0))">
            <h4>Partner Information</h4>
            <span class="field-hint">The partner is an external person and does not need to be a fund member.</span>

            <div class="form-row">
              <div class="form-group">
                <label>Partner Name *</label>
                <input type="text" formControlName="partnerName" maxlength="100" />
                <span class="field-error" *ngIf="showPartnerError(0, 'partnerName')">Partner name is required.</span>
              </div>
              <div class="form-group">
                <label>Contact Number *</label>
                <input type="tel" formControlName="phone1" maxlength="20" placeholder="01712345678" />
                <span class="field-error" *ngIf="showPartnerError(0, 'phone1')">
                  Enter a valid mobile number, e.g. 01712345678.
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input type="email" formControlName="email" maxlength="100" />
                <span class="field-error" *ngIf="showPartnerError(0, 'email')">Enter a valid email address.</span>
              </div>
              <div class="form-group">
                <label>NID *</label>
                <input type="text" formControlName="nid" maxlength="50" />
                <span class="field-error" *ngIf="showPartnerError(0, 'nid')">
                  Partner NID is required and must be 10, 13 or 17 digits.
                </span>
              </div>
            </div>

            <div class="form-group">
              <label>Address *</label>
              <textarea formControlName="presentAddress" rows="2" maxlength="250"></textarea>
              <span class="field-error" *ngIf="showPartnerError(0, 'presentAddress')">Partner address is required.</span>
            </div>
          </div>

          <!-- ============ Nominee Information ============ -->
          <div class="form-section" [formGroup]="asGroup(partners.at(0))">
            <div formGroupName="nominee">
              <h4>Nominee Information</h4>
              <span class="field-hint">Nominated on behalf of the partner — must be a different person from the partner.</span>

              <div class="form-row">
                <div class="form-group">
                  <label>Nominee Name *</label>
                  <input type="text" formControlName="name" maxlength="100" />
                  <span class="field-error" *ngIf="showPartnerError(0, 'nominee.name')">Nominee name is required.</span>
                </div>
                <div class="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" formControlName="phone" maxlength="20" placeholder="01712345678" />
                  <span class="field-error" *ngIf="showPartnerError(0, 'nominee.phone')">
                    Enter a valid mobile number.
                  </span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>NID *</label>
                  <input type="text" formControlName="nid" maxlength="50" />
                  <span class="field-error" *ngIf="showPartnerError(0, 'nominee.nid')">
                    Nominee NID is required and must be 10, 13 or 17 digits.
                  </span>
                </div>
                <div class="form-group">
                  <label>Relation with Partner</label>
                  <input type="text" formControlName="relation" maxlength="50" />
                </div>
              </div>
            </div>
            <span class="field-error block" *ngIf="asGroup(partners.at(0)).errors?.['partnerNomineeSameNid']">
              The partner and nominee must be two different people — their NID numbers cannot be the same.
            </span>
          </div>

          <!-- ============ Guarantor Information ============ -->
          <div class="form-section">
            <h4>Guarantor Information</h4>
            <div class="form-row">
              <div class="form-group">
                <label>Guarantor (fund member) *</label>
                <select formControlName="guarantorMemberId">
                  <option [ngValue]="null">— Select a member —</option>
                  <option *ngFor="let m of members" [ngValue]="m.id">{{ m.name }}</option>
                </select>
                <span class="field-error" *ngIf="showError('guarantorMemberId')">A guarantor is required.</span>
              </div>
            </div>
            <span class="field-error block" *ngIf="form.errors?.['investorEqualsGuarantor'] && form.touched">
              The investor and the guarantor must be two different members.
            </span>
            <span class="field-error block" *ngIf="form.errors?.['witnessEqualsGuarantor'] && form.touched">
              The witness and the guarantor must be two different members.
            </span>
          </div>

          <!-- ============ Additional Information ============ -->
          <div class="form-section">
            <h4>Additional Information</h4>

            <div class="form-row">
              <div class="form-group">
                <label>Investment Certificate Number</label>
                <input type="text" formControlName="certificateNumber" maxlength="100" />
                <span class="field-error" *ngIf="conflictField === 'certificateNumber'">
                  {{ conflictMessage }}
                </span>
              </div>
              <div class="form-group">
                <label>Reference Number</label>
                <input type="text" formControlName="referenceNumber" maxlength="100" />
                <span class="field-error" *ngIf="conflictField === 'referenceNumber'">
                  {{ conflictMessage }}
                </span>
              </div>
            </div>

            <div class="form-group">
              <label>Supporting Documents</label>
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                (change)="onFilesSelected($event)" />
              <span class="field-hint">JPG, PNG or PDF, up to 10MB each.</span>

              <ul class="file-list" *ngIf="pendingFiles.length > 0">
                <li *ngFor="let f of pendingFiles; let i = index">
                  <span class="material-icons">attach_file</span>
                  <span class="file-name">{{ f.name }}</span>
                  <button type="button" class="btn-icon-danger" (click)="removePendingFile(i)">
                    <span class="material-icons">close</span>
                  </button>
                </li>
              </ul>

              <ul class="file-list" *ngIf="existingDocuments.length > 0">
                <li *ngFor="let d of existingDocuments">
                  <span class="material-icons">description</span>
                  <a class="file-name" [href]="d.fileUrl" target="_blank" rel="noopener">{{ d.fileName }}</a>
                  <button type="button" class="btn-icon-danger" (click)="deleteExistingDocument(d)">
                    <span class="material-icons">delete</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <!-- ============ Audit ============ -->
          <div class="form-section" *ngIf="isEditMode && investment">
            <h4>Audit</h4>
            <div class="audit-grid">
              <div><span class="audit-label">Created By</span><span>{{ investment.createdBy || '—' }}</span></div>
              <div><span class="audit-label">Created Date</span><span>{{ investment.createdAt | date: 'medium' }}</span></div>
              <div><span class="audit-label">Last Modified By</span><span>{{ investment.lastModifiedBy || '—' }}</span></div>
              <div><span class="audit-label">Last Modified</span><span>{{ investment.lastModifiedAt | date: 'medium' }}</span></div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="onCancel()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="isSubmitting">
              <span class="material-icons">save</span>
              {{ isSubmitting ? 'Saving...' : isEditMode ? 'Update Investment' : 'Create Investment' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
    .modal-content.wide { max-width: 860px; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #eee; position: sticky; top: 0; background: white; z-index: 1; }
    .modal-header h3 { font-size: 18px; font-weight: 600; margin: 0; }
    .close-btn { background: none; border: none; cursor: pointer; padding: 4px; color: #666; }
    form { padding: 24px; }
    .form-section { margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #eee; }
    .form-section:last-of-type { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .form-section h4 { font-size: 14px; font-weight: 600; color: #667eea; margin: 0 0 16px 0; text-transform: uppercase; }
    .section-title-row { display: flex; justify-content: space-between; align-items: center; }
    .section-title-row h4 { margin-bottom: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .form-row.three { grid-template-columns: repeat(3, 1fr); }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; box-sizing: border-box; }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
    .field-error { display: block; margin-top: 6px; font-size: 12px; color: #e74c3c; }
    .field-error.block { margin-bottom: 16px; }
    .field-hint { display: block; margin-top: 6px; font-size: 12px; color: #888; }
    .partner-block { border: 1px solid #eee; border-radius: 10px; padding: 16px; margin-bottom: 16px; background: #fbfbfd; }
    .partner-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .partner-index { font-size: 13px; font-weight: 600; color: #555; }
    .btn-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: #667eea; font-size: 13px; font-weight: 500; cursor: pointer; padding: 0; }
    .btn-icon-danger { background: none; border: none; color: #e74c3c; cursor: pointer; padding: 2px; display: inline-flex; }
    .file-list { list-style: none; margin: 12px 0 0 0; padding: 0; }
    .file-list li { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .file-name { flex: 1; color: #333; text-decoration: none; word-break: break-all; }
    a.file-name:hover { color: #667eea; text-decoration: underline; }
    .audit-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
    .audit-grid > div { display: flex; flex-direction: column; gap: 2px; }
    .audit-label { color: #888; font-size: 12px; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
    .btn-primary { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary { padding: 12px 24px; background: #f5f6fa; color: #666; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; }
    .btn-secondary:hover { background: #eee; }
    .material-icons { font-size: 20px; }

    @media (max-width: 768px) {
      .form-row, .form-row.three, .audit-grid { grid-template-columns: 1fr; }
      .modal-content { margin: 12px; }
    }
  `]
})
export class InvestmentFormComponent implements OnInit, OnDestroy {
  /** When supplied the form is in edit mode and pre-populated. */
  @Input() investment: Investment | null = null;

  @Output() saved = new EventEmitter<Investment>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  members: MemberOption[] = [];
  categories: string[] = [];
  accounts: BankAccount[] = [];
  pendingFiles: File[] = [];
  existingDocuments: InvestmentDocument[] = [];
  isSubmitting = false;

  /** Set when the API rejects a duplicate certificate/reference number. */
  conflictField: 'certificateNumber' | 'referenceNumber' | null = null;
  conflictMessage = '';

  readonly investmentTypes = INVESTMENT_TYPES;
  readonly investmentStatuses = INVESTMENT_STATUSES;

  /** New projects always start as Draft and are published via the lifecycle panel,
   *  so members never see (or buy into) a project that hasn't been circulated.
   *  Status edits are also restricted so the publish/start/complete flow is preserved. */
  get selectableStatuses(): InvestmentStatusName[] {
    return this.isEditMode ? [this.investment?.status ?? 'Draft'] : ['Draft'];
  }

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private investmentService: InvestmentService,
    private accountService: AccountService,
    private toast: ToastService,
    private confirmation: ConfirmationService,
  ) {}

  get isEditMode(): boolean {
    return this.investment !== null;
  }

  get partners(): FormArray {
    return this.form.get('partners') as FormArray;
  }

  ngOnInit(): void {
    this.buildForm();
    this.loadMembers();
    this.loadCategories();
    this.loadAccounts();

    if (this.investment) {
      this.patchFromInvestment(this.investment);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  asGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  labelFor(type: InvestmentTypeName): string {
    return type === 'RealEstate' ? 'Real Estate' : type;
  }

  /** Suggested share price so the cross-field rule is easy to satisfy. */
  get suggestedSharePrice(): number | null {
    const shares = Number(this.form?.get('totalShares')?.value);
    const principal = Number(this.form?.get('principalAmount')?.value);
    if (!shares || !principal) return null;
    return principal / shares;
  }

  /** Months between start and maturity, shown as a hint next to the duration field. */
  get derivedDuration(): number | null {
    const start = this.form?.get('dateInvested')?.value;
    const maturity = this.form?.get('maturityDate')?.value;
    if (!start || !maturity) return null;

    const s = new Date(start);
    const m = new Date(maturity);
    let months = (m.getFullYear() - s.getFullYear()) * 12 + m.getMonth() - s.getMonth();
    if (m.getDate() < s.getDate()) months--;
    return months > 0 ? months : null;
  }

  showError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!control && control.invalid && control.touched;
  }

  showPartnerError(index: number, controlName: string): boolean {
    const control = this.partners.at(index).get(controlName);
    return !!control && control.invalid && control.touched;
  }


  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const maxBytes = 10 * 1024 * 1024;
    for (const file of Array.from(input.files)) {
      if (file.size > maxBytes) {
        this.toast.error(`"${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      this.pendingFiles.push(file);
    }
    input.value = '';
  }

  removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  deleteExistingDocument(document: InvestmentDocument): void {
    if (!this.investment) return;
    const investment = this.investment;

    this.confirmation
      .confirm({
        title: 'Remove Document',
        message: `Remove "${document.fileName}" from this investment?`,
        detail: 'This cannot be undone.',
        confirmText: 'Remove',
        danger: true,
        icon: 'delete',
      })
      .pipe(filter(Boolean), takeUntil(this.destroy$))
      .subscribe(() => {
        this.investmentService
          .deleteDocument(investment.id, document.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.existingDocuments = this.existingDocuments.filter(d => d.id !== document.id);
              this.toast.success('Document removed.');
            },
            error: () => this.toast.error('Could not remove the document.'),
          });
      });
  }

  onSubmit(): void {
    this.conflictField = null;
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.toast.error('Please correct the highlighted fields.');
      return;
    }

    this.isSubmitting = true;
    const payload = this.toRequest();

    const request$ = this.isEditMode
      ? this.investmentService.updateInvestment(this.investment!.id, payload)
      : this.investmentService.createInvestment(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: saved => this.uploadPendingFiles(saved),
      error: err => {
        this.isSubmitting = false;
        this.handleSaveError(err);
      },
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  private buildForm(): void {
    this.form = this.fb.group(
      {
        name: ['', [Validators.required, Validators.maxLength(200)]],
        type: ['Business' as InvestmentTypeName, Validators.required],
        category: ['', Validators.maxLength(100)],
        principalAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
        totalShares: [null as number | null, Validators.min(1)],
        minimumSharesPerMember: [null as number | null, Validators.min(1)],
        maximumSharesPerMember: [null as number | null, Validators.min(1)],
        maintenancePercentage: [null as number | null, [Validators.min(0), Validators.max(100)]],
        maintenanceAccountId: [null as string | null],
        targetGrossProfit: [null as number | null, Validators.min(0)],
        dateInvested: ['', Validators.required],
        maturityDate: [''],
        durationMonths: [null as number | null, [Validators.min(1), Validators.max(1200)]],
        status: ['Draft' as InvestmentStatusName, Validators.required],
        description: ['', Validators.maxLength(1000)],
        certificateNumber: ['', Validators.maxLength(100)],
        referenceNumber: ['', Validators.maxLength(100)],
        investorMemberId: [null as string | null, Validators.required],
        witnessMemberId: [null as string | null, Validators.required],
        guarantorMemberId: [null as string | null, Validators.required],
        partners: this.fb.array([this.createPartnerGroup()]),
      },
      { validators: [maturityAfterStartValidator, participantsDistinctValidator] },
    );
  }

  private createPartnerGroup(): FormGroup {
    return this.fb.group(
      {
        id: [null as string | null],
        memberId: [null as string | null],
        partnerName: ['', [Validators.required, Validators.maxLength(100)]],
        nid: ['', [Validators.required, Validators.pattern(NID_PATTERN)]],
        phone1: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
        phone2: ['', Validators.pattern(PHONE_PATTERN)],
        email: ['', Validators.email],
        presentAddress: ['', [Validators.required, Validators.maxLength(250)]],
        permanentAddress: ['', Validators.maxLength(250)],
        nominee: this.fb.group({
          name: ['', [Validators.required, Validators.maxLength(100)]],
          phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
          nid: ['', [Validators.required, Validators.pattern(NID_PATTERN)]],
          relation: ['', Validators.maxLength(50)],
        }),
      },
      { validators: [partnerNomineeNidValidator] },
    );
  }

  private patchFromInvestment(investment: Investment): void {
    this.form.patchValue({
      name: investment.name,
      type: investment.type as InvestmentTypeName,
      category: investment.category ?? '',
      principalAmount: investment.principalAmount,
      totalShares: investment.totalShares ?? null,
      minimumSharesPerMember: investment.minimumSharesPerMember ?? null,
      maximumSharesPerMember: investment.maximumSharesPerMember ?? null,
      maintenancePercentage: investment.maintenancePercentage ?? null,
      maintenanceAccountId: investment.maintenanceAccountId ?? null,
      targetGrossProfit: investment.targetGrossProfit ?? null,
      dateInvested: this.toDateInput(investment.dateInvested),
      maturityDate: this.toDateInput(investment.maturityDate),
      durationMonths: investment.durationMonths ?? null,
      status: investment.status,
      description: investment.description ?? '',
      certificateNumber: investment.certificateNumber ?? '',
      referenceNumber: investment.referenceNumber ?? '',
      investorMemberId: investment.investorMemberId ?? null,
      witnessMemberId: investment.witnessMemberId ?? null,
      guarantorMemberId: investment.guarantorMemberId ?? null,
    });

    this.partners.clear();
    const firstPartner = investment.partners[0];
    const group = this.createPartnerGroup();
    if (firstPartner) {
      group.patchValue({
        id: firstPartner.id ?? null,
        memberId: firstPartner.memberId ?? null,
        partnerName: firstPartner.partnerName,
        nid: firstPartner.nid ?? '',
        phone1: firstPartner.phone1,
        phone2: firstPartner.phone2 ?? '',
        email: firstPartner.email ?? '',
        presentAddress: firstPartner.presentAddress ?? '',
        permanentAddress: firstPartner.permanentAddress ?? '',
        nominee: {
          name: firstPartner.nominee?.name ?? firstPartner.nomineeName ?? '',
          phone: firstPartner.nominee?.phone ?? firstPartner.nomineeContact ?? '',
          nid: firstPartner.nominee?.nid ?? '',
          relation: firstPartner.nominee?.relation ?? firstPartner.nomineeRelationship ?? '',
        },
      });
    }
    this.partners.push(group);

    this.existingDocuments = [...investment.documents];
  }

  private toRequest(): CreateInvestmentRequest {
    const v = this.form.value;

    return {
      name: v.name.trim(),
      description: this.blankToNull(v.description),
      type: v.type,
      category: this.blankToNull(v.category),
      principalAmount: Number(v.principalAmount),
      totalShares: v.totalShares ? Number(v.totalShares) : null,
      minimumSharesPerMember: v.minimumSharesPerMember ? Number(v.minimumSharesPerMember) : null,
      maximumSharesPerMember: v.maximumSharesPerMember ? Number(v.maximumSharesPerMember) : null,
      maintenancePercentage: v.maintenancePercentage != null ? Number(v.maintenancePercentage) : null,
      maintenanceAccountId: v.maintenanceAccountId ?? null,
      targetGrossProfit: v.targetGrossProfit ? Number(v.targetGrossProfit) : null,
      // date inputs give a bare yyyy-MM-dd; send it as a UTC instant so the day
      // does not shift when the API echoes it back.
      dateInvested: `${v.dateInvested}T00:00:00Z`,
      maturityDate: v.maturityDate ? `${v.maturityDate}T00:00:00Z` : null,
      durationMonths: v.durationMonths ? Number(v.durationMonths) : null,
      status: v.status,
      certificateNumber: this.blankToNull(v.certificateNumber),
      referenceNumber: this.blankToNull(v.referenceNumber),
      investorMemberId: v.investorMemberId ?? null,
      witnessMemberId: v.witnessMemberId ?? null,
      guarantorMemberId: v.guarantorMemberId ?? null,
      partners: (v.partners as any[]).map(p => ({
        id: p.id ?? undefined,
        memberId: this.blankToNull(p.memberId),
        partnerName: p.partnerName.trim(),
        nid: this.blankToNull(p.nid),
        phone1: p.phone1.trim(),
        phone2: this.blankToNull(p.phone2),
        email: this.blankToNull(p.email),
        presentAddress: this.blankToNull(p.presentAddress),
        permanentAddress: this.blankToNull(p.permanentAddress),
        nominee: {
          name: (p.nominee?.name ?? '').trim(),
          phone: (p.nominee?.phone ?? '').trim(),
          nid: (p.nominee?.nid ?? '').trim(),
          relation: this.blankToNull(p.nominee?.relation),
        },
      })),
    };
  }

  /**
   * The record is saved before its files, since uploads are addressed by investment id.
   * A failed upload must not discard the saved investment - report it and move on.
   */
  private uploadPendingFiles(saved: Investment): void {
    if (this.pendingFiles.length === 0) {
      this.finish(saved);
      return;
    }

    const uploads = this.pendingFiles.map(file =>
      this.investmentService.uploadDocument(saved.id, file).pipe(
        catchError(() => {
          this.toast.error(`Could not upload "${file.name}".`);
          return of(null);
        }),
      ),
    );

    forkJoin(uploads)
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        if (results.some(r => r === null)) {
          this.toast.warning('The investment was saved, but some documents failed to upload.');
        }
        this.finish(saved);
      });
  }

  private finish(saved: Investment): void {
    this.isSubmitting = false;
    this.pendingFiles = [];
    this.toast.success(this.isEditMode ? 'Investment updated.' : 'Investment created.');
    this.saved.emit(saved);
  }

  private handleSaveError(err: any): void {
    const message: string = err?.error?.message ?? '';

    if (err?.status === 409) {
      this.conflictMessage = message || 'This number is already in use.';
      this.conflictField = message.toLowerCase().includes('reference')
        ? 'referenceNumber'
        : 'certificateNumber';
      this.toast.error(this.conflictMessage);
      return;
    }

    this.toast.error(message || 'Could not save the investment.');
  }

  private loadMembers(): void {
    this.http
      .get<MemberOption[]>('/api/members?isActive=true')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: members => (this.members = members),
        // A failed member list only costs the pre-fill convenience, so stay quiet.
        error: () => (this.members = []),
      });
  }

  private loadCategories(): void {
    this.http
      .get<{ value?: string }>('/api/parambusconfig/name/InvestmentCategories')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: config => {
          this.categories = (config?.value ?? '')
            .split(',')
            .map(c => c.trim())
            .filter(Boolean);
        },
        error: () => (this.categories = []),
      });
  }

  private loadAccounts(): void {
    this.accountService
      .getAccounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: accounts => (this.accounts = accounts.filter(a => a.isActive)),
        // A failed account list only costs the maintenance-account convenience.
        error: () => (this.accounts = []),
      });
  }

  private toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 10);
  }

  private blankToNull(value: string | null | undefined): string | null {
    const trimmed = (value ?? '').toString().trim();
    return trimmed === '' ? null : trimmed;
  }
}

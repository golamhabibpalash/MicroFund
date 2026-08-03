import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ShareSubscription, WalletEntry, WalletSummary } from '../core/services/investment.service';
import { BdtCurrencyPipe } from '../shared/pipes/bdt-currency.pipe';
import { TimeAgoPipe } from '../shared/pipes/time-ago.pipe';

/**
 * Slide-in panel showing one member's complete wallet picture.
 *
 * Enters from the left, can be expanded to a wider layout, and closes via the
 * close button, a click on the backdrop, or Escape.
 */
@Component({
  selector: 'app-member-wallet-drawer',
  standalone: true,
  imports: [CommonModule, DatePipe, BdtCurrencyPipe, TimeAgoPipe],
  template: `
    <div class="drawer-backdrop" (click)="close()"></div>

    <aside class="drawer" [class.expanded]="isExpanded" (click)="$event.stopPropagation()">
      <header class="drawer-head">
        <div class="identity">
          <div class="avatar">
            <img
              *ngIf="wallet.memberImageUrl && !imageFailed"
              [src]="wallet.memberImageUrl"
              [alt]="wallet.memberName"
              (error)="imageFailed = true" />
            <span *ngIf="!wallet.memberImageUrl || imageFailed">{{ initials() }}</span>
          </div>
          <div class="who">
            <h2>{{ wallet.memberName }}</h2>
            <div class="tags">
              <span class="tag code" *ngIf="wallet.memberCode">{{ wallet.memberCode }}</span>
              <!--
                Only render when the field is actually present. If the API omits it,
                showing "Inactive" would assert something false about a real person.
              -->
              <span
                class="tag"
                *ngIf="wallet.isActive !== undefined && wallet.isActive !== null"
                [class.active]="wallet.isActive"
                [class.inactive]="!wallet.isActive">
                {{ wallet.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
        </div>

        <div class="head-actions">
          <button class="icon-btn" (click)="toggleExpand()" [title]="isExpanded ? 'Collapse' : 'Expand'">
            <span class="material-icons">{{ isExpanded ? 'close_fullscreen' : 'open_in_full' }}</span>
          </button>
          <button class="icon-btn" (click)="close()" title="Close">
            <span class="material-icons">close</span>
          </button>
        </div>
      </header>

      <div class="drawer-body">
        <!-- Contact -->
        <section class="info-grid">
          <div *ngIf="wallet.email"><span class="k">Email</span><span class="v">{{ wallet.email }}</span></div>
          <div *ngIf="wallet.phone"><span class="k">Phone</span><span class="v">{{ wallet.phone }}</span></div>
          <div *ngIf="wallet.occupation"><span class="k">Occupation</span><span class="v">{{ wallet.occupation }}</span></div>
          <div *ngIf="wallet.joinDate"><span class="k">Joined</span><span class="v">{{ wallet.joinDate | date: 'mediumDate' }}</span></div>
        </section>

        <!-- Balance -->
        <section class="balance-card">
          <span class="bal-label">Available Balance</span>
          <span class="bal-value">{{ wallet.balance | bdtCurrency }}</span>
        </section>

        <section class="mini-stats">
          <div><span class="k">Deposited</span><span class="v in">{{ wallet.totalDeposited | bdtCurrency }}</span></div>
          <div><span class="k">Invested</span><span class="v out">{{ wallet.totalInvested | bdtCurrency }}</span></div>
          <div><span class="k">Profit</span><span class="v profit">{{ wallet.totalProfitEarned | bdtCurrency }}</span></div>
          <div><span class="k">Disbursed</span><span class="v">{{ wallet.totalDisbursed | bdtCurrency }}</span></div>
        </section>

        <!-- Holdings -->
        <section class="sec" *ngIf="subscriptions.length > 0">
          <h3>Shareholdings ({{ subscriptions.length }})</h3>
          <div class="holding" *ngFor="let s of subscriptions">
            <div class="h-main">
              <strong>{{ s.investmentName }}</strong>
              <span class="pill" [ngClass]="'sub-' + s.status.toLowerCase()">{{ s.status }}</span>
            </div>
            <div class="h-meta">
              {{ s.sharesPurchased }} share(s) · {{ s.ownershipPercentage | number: '1.2-2' }}% ·
              {{ s.amountPaid | bdtCurrency }} · {{ s.purchasedAt | date: 'mediumDate' }}
            </div>
          </div>
        </section>

        <!-- History -->
        <section class="sec">
          <h3>Transaction History ({{ wallet.entries.length }})</h3>
          <p class="empty" *ngIf="wallet.entries.length === 0">No wallet activity yet.</p>

          <div class="entry" *ngFor="let e of wallet.entries">
            <span class="pill" [ngClass]="entryClass(e)">{{ label(e.entryType) }}</span>
            <div class="e-body">
              <span class="e-desc">{{ e.description || e.investmentName || '—' }}</span>
              <span class="e-time" [title]="e.createdAt">{{ e.createdAt | timeAgo }}</span>
            </div>
            <div class="e-amounts">
              <span class="e-amt" [class.credit]="e.amount >= 0" [class.debit]="e.amount < 0">
                {{ e.amount >= 0 ? '+' : '' }}{{ e.amount | bdtCurrency }}
              </span>
              <span class="e-bal">{{ e.balanceAfter | bdtCurrency }}</span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  `,
  styles: [`
    .drawer-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1200; animation: fade .18s ease; }
    @keyframes fade { from { opacity: 0; } to { opacity: 1; } }

    .drawer {
      position: fixed; top: 0; left: 0; bottom: 0;
      width: 440px; max-width: 92vw;
      background: #fff; z-index: 1201;
      display: flex; flex-direction: column;
      box-shadow: 4px 0 24px rgba(0,0,0,0.18);
      animation: slide-in .22s cubic-bezier(.22,.7,.3,1);
      transition: width .22s cubic-bezier(.22,.7,.3,1);
    }
    .drawer.expanded { width: 860px; }
    @keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }

    .drawer-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 20px; border-bottom: 1px solid #eee; }
    .identity { display: flex; gap: 14px; align-items: center; min-width: 0; }
    .avatar { width: 56px; height: 56px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; }
    .who { min-width: 0; }
    .who h2 { margin: 0 0 6px 0; font-size: 18px; font-weight: 600; color: #1a1a2e; overflow-wrap: anywhere; }
    .tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { font-size: 11px; font-weight: 600; padding: 2px 9px; border-radius: 999px; background: #eceff1; color: #546e7a; }
    .tag.code { background: #ede7f6; color: #5e35b1; }
    .tag.active { background: #e8f5e9; color: #2e7d32; }
    .tag.inactive { background: #ffebee; color: #c62828; }
    .head-actions { display: flex; gap: 4px; flex-shrink: 0; }
    .icon-btn { background: none; border: none; cursor: pointer; color: #666; padding: 6px; border-radius: 8px; display: flex; }
    .icon-btn:hover { background: #f5f6fa; color: #333; }

    .drawer-body { flex: 1; overflow-y: auto; padding: 20px; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
    .info-grid > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .k { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .3px; }
    .v { font-size: 14px; color: #1a1a2e; overflow-wrap: anywhere; }

    .balance-card { background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 4px; margin-bottom: 14px; }
    .bal-label { font-size: 12px; opacity: .85; text-transform: uppercase; letter-spacing: .5px; }
    .bal-value { font-size: 30px; font-weight: 600; }

    .mini-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
    .mini-stats > div { background: #fbfbfd; border: 1px solid #eee; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 3px; }
    .mini-stats .v { font-size: 14px; font-weight: 600; }
    .v.in { color: #2e7d32; } .v.out { color: #5e35b1; } .v.profit { color: #f9a825; }

    .sec { margin-bottom: 22px; }
    .sec h3 { font-size: 13px; font-weight: 600; color: #667eea; text-transform: uppercase; margin: 0 0 12px 0; }
    .empty { color: #888; font-size: 13px; margin: 0; }

    .holding { border: 1px solid #eee; border-radius: 10px; padding: 12px; margin-bottom: 8px; background: #fbfbfd; }
    .h-main { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
    .h-main strong { font-size: 14px; color: #1a1a2e; }
    .h-meta { font-size: 12px; color: #666; }

    .entry { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid #f2f2f2; }
    .e-body { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .e-desc { font-size: 13px; color: #333; overflow-wrap: anywhere; }
    .e-time { font-size: 11px; color: #999; }
    .e-amounts { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
    .e-amt { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .e-bal { font-size: 11px; color: #999; font-variant-numeric: tabular-nums; }
    .credit { color: #2e7d32; } .debit { color: #c62828; }

    .pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; flex-shrink: 0; }
    .e-deposit { background: #e8f5e9; color: #2e7d32; }
    .e-sharepurchase { background: #ede7f6; color: #5e35b1; }
    .e-purchaserefund { background: #fff3e0; color: #ef6c00; }
    .e-principalreturn { background: #e3f2fd; color: #1565c0; }
    .e-profitcredit { background: #fff8e1; color: #f9a825; }
    .e-disbursement { background: #eceff1; color: #546e7a; }
    .sub-active { background: #e8f5e9; color: #2e7d32; }
    .sub-settled { background: #e3f2fd; color: #1565c0; }
    .sub-cancelled { background: #eceff1; color: #546e7a; }

    /* Expanded: use the extra width for a two-column body */
    .drawer.expanded .info-grid { grid-template-columns: repeat(4, 1fr); }

    @media (max-width: 900px) {
      .drawer, .drawer.expanded { width: 100vw; max-width: 100vw; }
      .mini-stats { grid-template-columns: repeat(2, 1fr); }
      .info-grid, .drawer.expanded .info-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MemberWalletDrawerComponent {
  @Input({ required: true }) wallet!: WalletSummary;
  @Input() subscriptions: ShareSubscription[] = [];

  @Output() closed = new EventEmitter<void>();

  isExpanded = false;
  imageFailed = false;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }

  close(): void {
    this.closed.emit();
  }

  initials(): string {
    return this.wallet.memberName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  entryClass(entry: WalletEntry): string {
    return 'e-' + entry.entryType.toLowerCase();
  }

  label(type: string): string {
    return type.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
}

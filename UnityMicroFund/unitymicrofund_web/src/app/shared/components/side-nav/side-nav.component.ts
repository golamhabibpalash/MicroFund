import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef,
  SimpleChanges,
} from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import {
  trigger, state, style, animate, transition,
} from '@angular/animations';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface NavChild {
  label: string;
  route: string;
  icon: string;
  roles?: string[];
}

export interface NavModule {
  id: string;
  label: string;
  icon: string;
  /** Direct link — no accordion (no children). */
  route?: string;
  children?: NavChild[];
  /** Roles that may see this module; empty/undefined = everyone. */
  roles?: string[];
  /** Render a visual divider above this module. */
  dividerBefore?: boolean;
}

export interface NavPolicy {
  /** Only one module open at a time. Default: true. */
  singleExpand: boolean;
  /** Auto-expand a module when one of its children is the active route. Default: true. */
  expandOnChildActive: boolean;
  /** Persist expanded state to localStorage across reloads. Default: true. */
  persistState: boolean;
  /** Module IDs that start expanded regardless of other state. */
  defaultExpanded: string[];
}

export const DEFAULT_NAV_POLICY: NavPolicy = {
  singleExpand: true,
  expandOnChildActive: true,
  persistState: true,
  defaultExpanded: [],
};

// ─── Internal ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'umf_nav_expanded';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0px', overflow: 'hidden', opacity: 0 })),
      state('expanded',  style({ height: '*',   overflow: 'hidden', opacity: 1 })),
      transition('collapsed => expanded', animate('240ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('expanded => collapsed', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)')),
    ]),
  ],
  template: `
    <nav class="sidenav" role="navigation" aria-label="Main navigation" [class.is-collapsed]="collapsed">
      <ul class="nav-list" role="list">
        <ng-container *ngFor="let mod of visibleModules; trackBy: trackById">

          <!-- Optional divider -->
          <li *ngIf="mod.dividerBefore && !collapsed" class="nav-divider" role="separator" aria-hidden="true"></li>

          <li class="nav-module"
              [class.is-active]="isModuleActive(mod)"
              [class.is-expanded]="isExpanded(mod.id)"
              [class.hover-expand]="collapsed && hoveredModule === mod.id"
              (mouseenter)="onHover(mod.id)"
              (mouseleave)="onHover(null)">

            <!-- ── Direct link (no children) ── -->
            <ng-container *ngIf="!mod.children?.length">
              <a
                class="nav-trigger"
                [routerLink]="mod.route"
                [class.active]="isModuleActive(mod)"
                (click)="onDirectClick()"
                [attr.aria-label]="mod.label"
                [attr.aria-current]="isModuleActive(mod) ? 'page' : null"
                tabindex="0"
                (keydown)="onItemKeydown($event, null, null)">
                <span class="nav-icon material-icons" aria-hidden="true">{{ mod.icon }}</span>
                <span class="nav-label" *ngIf="!collapsed">{{ mod.label }}</span>
              </a>
              <!-- Tooltip when collapsed -->
              <div class="nav-tooltip" *ngIf="collapsed && hoveredModule === mod.id">{{ mod.label }}</div>
            </ng-container>

            <!-- ── Module with children (accordion) ── -->
            <ng-container *ngIf="mod.children?.length">
              <button
                class="nav-trigger has-children"
                type="button"
                [class.active]="isModuleActive(mod)"
                [class.expanded]="isExpanded(mod.id)"
                (click)="toggleModule(mod, $event)"
                [attr.aria-expanded]="isExpanded(mod.id)"
                [attr.aria-controls]="'navgroup-' + mod.id"
                [attr.aria-label]="mod.label + (isExpanded(mod.id) ? ', expanded' : ', collapsed')"
                tabindex="0"
                (keydown)="onItemKeydown($event, mod, null)">
                <span class="nav-icon material-icons" aria-hidden="true">{{ mod.icon }}</span>
                <span class="nav-label" *ngIf="!collapsed">{{ mod.label }}</span>
                <span
                  class="nav-chevron material-icons"
                  [class.rotated]="isExpanded(mod.id)"
                  *ngIf="!collapsed"
                  aria-hidden="true">
                  chevron_right
                </span>
              </button>

              <!-- Children inline (when not collapsed) -->
              <div
                class="nav-children"
                [id]="'navgroup-' + mod.id"
                [@expandCollapse]="isExpanded(mod.id) ? 'expanded' : 'collapsed'"
                role="group"
                [attr.aria-label]="mod.label + ' submenu'"
                *ngIf="!collapsed">
                <a
                  *ngFor="let child of visibleChildren(mod); trackBy: trackByRoute"
                  class="nav-child-link"
                  [routerLink]="child.route"
                  [class.active]="isChildActive(child.route)"
                  [attr.aria-current]="isChildActive(child.route) ? 'page' : null"
                  (click)="onChildClick(mod)"
                  tabindex="0"
                  (keydown)="onItemKeydown($event, mod, child)">
                  <span class="child-indicator" aria-hidden="true"></span>
                  <span class="nav-icon material-icons" aria-hidden="true">{{ child.icon }}</span>
                  <span class="nav-label">{{ child.label }}</span>
                </a>
              </div>

              <!-- Hover popover (when collapsed) -->
              <div class="nav-popover" *ngIf="collapsed && hoveredModule === mod.id">
                <div class="popover-header">
                  <span class="material-icons">{{ mod.icon }}</span>
                  <span class="popover-title">{{ mod.label }}</span>
                </div>
                <div class="popover-children">
                  <a
                    *ngFor="let child of visibleChildren(mod); trackBy: trackByRoute"
                    class="popover-child-link"
                    [routerLink]="child.route"
                    [class.active]="isChildActive(child.route)"
                    (click)="onChildClick(mod)">
                    <span class="material-icons">{{ child.icon }}</span>
                    <span>{{ child.label }}</span>
                  </a>
                </div>
              </div>
            </ng-container>

          </li>
        </ng-container>
      </ul>
    </nav>
  `,
  styles: [`
    /* ── Reset & host ───────────────────────────────────── */
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }

    /* ── Scroll container ───────────────────────────────── */
    .sidenav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 12px 0 20px;
      scrollbar-width: thin;
      scrollbar-color: rgba(255,255,255,0.15) transparent;
    }

    .sidenav.is-collapsed {
      padding: 12px 0;
    }

    .sidenav::-webkit-scrollbar { width: 4px; }
    .sidenav::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
    .sidenav::-webkit-scrollbar-track { background: transparent; }

    .nav-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* ── Divider ────────────────────────────────────────── */
    .nav-divider {
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 10px 16px;
    }

    /* ── Trigger (shared by both direct links and group headers) ── */
    .nav-trigger {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 13px 20px;
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      background: none;
      border: none;
      border-left: 3px solid transparent;
      cursor: pointer;
      font-size: 14px;
      font-family: inherit;
      font-weight: 400;
      text-align: left;
      transition:
        background 0.18s ease,
        color      0.18s ease,
        border-color 0.18s ease;
      position: relative;
      outline: none;
      justify-content: center;
    }

    .sidenav:not(.is-collapsed) .nav-trigger {
      justify-content: flex-start;
    }

    .nav-trigger:focus-visible {
      outline: 2px solid rgba(255,215,0,0.6);
      outline-offset: -2px;
      border-radius: 4px;
    }

    .nav-trigger:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }

    /* Active — any trigger whose route/children match current URL */
    .nav-trigger.active {
      background: rgba(255,255,255,0.14);
      color: #fff;
      font-weight: 600;
      border-left-color: #FFD700;
    }

    /* Expanded group header */
    .nav-trigger.expanded {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }

    /* ── Icons ──────────────────────────────────────────── */
    .nav-icon {
      font-size: 20px;
      flex-shrink: 0;
      transition: color 0.18s ease;
    }

    .nav-trigger.active .nav-icon {
      color: #FFD700;
    }

    /* ── Chevron ────────────────────────────────────────── */
    .nav-chevron {
      font-size: 18px;
      margin-left: auto;
      flex-shrink: 0;
      transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0.6;
    }

    .nav-chevron.rotated {
      transform: rotate(90deg);
      opacity: 1;
    }

    /* ── Children container ─────────────────────────────── */
    .nav-children {
      overflow: hidden;
    }

    /* ── Child links ────────────────────────────────────── */
    .nav-child-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px 10px 28px;
      color: rgba(255,255,255,0.65);
      text-decoration: none;
      font-size: 13.5px;
      border-left: 3px solid transparent;
      transition:
        background  0.15s ease,
        color       0.15s ease,
        border-color 0.15s ease;
      position: relative;
      outline: none;
    }

    .nav-child-link:focus-visible {
      outline: 2px solid rgba(255,215,0,0.6);
      outline-offset: -2px;
      border-radius: 4px;
    }

    .nav-child-link:hover {
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.9);
    }

    .nav-child-link.active {
      background: rgba(255,215,0,0.1);
      color: #FFD700;
      font-weight: 500;
      border-left-color: #FFD700;
    }

    /* ── Tooltip (collapsed, direct links) ──────────────── */
    .nav-tooltip {
      position: absolute;
      left: calc(100% + 12px);
      top: 50%;
      transform: translateY(-50%);
      background: #1a1a2e;
      color: #fff;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      white-space: nowrap;
      pointer-events: none;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      animation: tooltipFadeIn 0.15s ease forwards;
    }

    .nav-tooltip::before {
      content: '';
      position: absolute;
      left: -6px;
      top: 50%;
      transform: translateY(-50%);
      border: 6px solid transparent;
      border-right-color: #1a1a2e;
    }

    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
      to   { opacity: 1; transform: translateY(-50%) translateX(0); }
    }

    /* ── Hover popover (collapsed, modules with children) ─ */
    .nav-popover {
      position: absolute;
      left: calc(100% + 8px);
      top: 0;
      min-width: 220px;
      background: #1a1a2e;
      border-radius: 10px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 1000;
      overflow: hidden;
      opacity: 0;
      animation: popoverFadeIn 0.2s ease forwards;
    }

    @keyframes popoverFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .popover-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      background: rgba(255,255,255,0.06);
      border-bottom: 1px solid rgba(255,255,255,0.08);
      color: #FFD700;
      font-weight: 600;
      font-size: 14px;
    }

    .popover-header .material-icons {
      font-size: 20px;
    }

    .popover-children {
      padding: 6px 0;
    }

    .popover-child-link {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      color: rgba(255,255,255,0.75);
      text-decoration: none;
      font-size: 13px;
      transition: background 0.15s, color 0.15s;
    }

    .popover-child-link:hover {
      background: rgba(255,255,255,0.08);
      color: #fff;
    }

    .popover-child-link.active {
      background: rgba(255,215,0,0.12);
      color: #FFD700;
      font-weight: 500;
    }

    .popover-child-link .material-icons {
      font-size: 18px;
      color: inherit;
    }

    /* ── Child indicator dot ────────────────────────────── */
    .child-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      flex-shrink: 0;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .nav-child-link.active .child-indicator {
      background: #FFD700;
      transform: scale(1.4);
    }

    .nav-child-link .nav-icon {
      font-size: 17px;
      color: inherit;
    }

    /* ── Module active highlight bar ────────────────────── */
    .nav-module.is-active > .nav-trigger:not(.active) {
      border-left-color: rgba(255,215,0,0.35);
    }
  `],
})
export class SideNavComponent implements OnInit, OnChanges, OnDestroy {
  @Input() modules: NavModule[] = [];
  @Input() userRole = '';
  @Input() policy: NavPolicy = { ...DEFAULT_NAV_POLICY };
  @Input() collapsed = false;

  /** Emitted on any navigation click so the parent can close a mobile drawer. */
  @Output() navigated = new EventEmitter<void>();

  expandedModules = new Set<string>();
  currentUrl = '';
  hoveredModule: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private router: Router, private cdr: ChangeDetectorRef) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit() {
    this.currentUrl = this.router.url;
    this.initExpanded();

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe((e: any) => {
      this.currentUrl = e.urlAfterRedirects;
      if (this.policy.expandOnChildActive) this.expandActiveParents();
      this.cdr.markForCheck();
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['modules'] || changes['policy']) {
      this.initExpanded();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Computed ───────────────────────────────────────────────────────────────

  get visibleModules(): NavModule[] {
    return this.modules.filter(m => this.canSee(m.roles));
  }

  visibleChildren(mod: NavModule): NavChild[] {
    return (mod.children ?? []).filter(c => this.canSee(c.roles));
  }

  isVisible = this.canSee.bind(this);

  canSee(roles?: string[]): boolean {
    return !roles?.length || roles.includes(this.userRole);
  }

  isChildActive(route: string): boolean {
    return this.currentUrl === route || this.currentUrl.startsWith(route + '/');
  }

  isModuleActive(mod: NavModule): boolean {
    if (mod.route) return this.isChildActive(mod.route);
    return mod.children?.some(c => this.isChildActive(c.route)) ?? false;
  }

  isExpanded(id: string): boolean {
    return this.expandedModules.has(id);
  }

  // ─── State ──────────────────────────────────────────────────────────────────

  private initExpanded() {
    this.expandedModules.clear();

    if (this.policy.persistState) {
      this.loadState().forEach(id => this.expandedModules.add(id));
    }
    this.policy.defaultExpanded.forEach(id => this.expandedModules.add(id));

    if (this.policy.expandOnChildActive) this.expandActiveParents();
  }

  private expandActiveParents() {
    this.modules.forEach(mod => {
      if (mod.children?.some(c => this.isChildActive(c.route))) {
        if (this.policy.singleExpand) this.expandedModules.clear();
        this.expandedModules.add(mod.id);
      }
    });
    this.saveState();
  }

  // ─── Interaction ────────────────────────────────────────────────────────────

  toggleModule(mod: NavModule, event: Event) {
    event.stopPropagation();
    const { id } = mod;

    if (this.expandedModules.has(id)) {
      // Collapse — always works, even when expanded due to active child
      this.expandedModules.delete(id);
    } else {
      if (this.policy.singleExpand) this.expandedModules.clear();
      this.expandedModules.add(id);
    }

    this.saveState();
    this.cdr.markForCheck();
  }

  onDirectClick() {
    this.navigated.emit();
    this.hoveredModule = null;
  }

  onChildClick(mod: NavModule) {
    if (this.policy.singleExpand) {
      this.expandedModules.clear();
      this.expandedModules.add(mod.id);
    }
    this.saveState();
    this.navigated.emit();
    this.hoveredModule = null;
  }

  onHover(id: string | null) {
    this.hoveredModule = this.collapsed ? id : null;
  }

  // ─── Keyboard navigation ────────────────────────────────────────────────────

  onItemKeydown(event: KeyboardEvent, mod: NavModule | null, child: NavChild | null) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (mod && !child && mod.children?.length) {
          event.preventDefault();
          this.toggleModule(mod, event);
        }
        break;

      case 'Escape':
        if (mod) {
          event.preventDefault();
          this.expandedModules.delete(mod.id);
          this.saveState();
          this.cdr.markForCheck();
          // Return focus to the parent trigger
          const trigger = document.querySelector<HTMLElement>(`[aria-controls="navgroup-${mod.id}"]`);
          trigger?.focus();
        }
        break;

      case 'ArrowDown':
        event.preventDefault();
        this.moveFocus(event.target as HTMLElement, 1);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(event.target as HTMLElement, -1);
        break;

      case 'ArrowRight':
        if (mod && !child && !this.expandedModules.has(mod.id)) {
          event.preventDefault();
          this.toggleModule(mod, event);
        }
        break;

      case 'ArrowLeft':
        if (mod && this.expandedModules.has(mod.id)) {
          event.preventDefault();
          this.expandedModules.delete(mod.id);
          this.saveState();
          this.cdr.markForCheck();
        }
        break;
    }
  }

  private moveFocus(current: HTMLElement, direction: 1 | -1) {
    const focusable = Array.from(
      document.querySelectorAll<HTMLElement>('.nav-trigger, .nav-child-link'),
    ).filter(el => !el.closest('.nav-children[style*="height: 0"]') &&
                   getComputedStyle(el).display !== 'none');

    const idx = focusable.indexOf(current);
    const next = focusable[idx + direction];
    next?.focus();
  }

  // ─── TrackBy ────────────────────────────────────────────────────────────────

  trackById(_: number, mod: NavModule) { return mod.id; }
  trackByRoute(_: number, child: NavChild) { return child.route; }

  // ─── Persistence ────────────────────────────────────────────────────────────

  private saveState() {
    if (!this.policy.persistState) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.expandedModules]));
    } catch { /* quota exceeded or private mode */ }
  }

  private loadState(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

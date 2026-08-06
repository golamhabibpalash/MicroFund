import { Directive, ElementRef, OnDestroy, OnInit, Renderer2 } from '@angular/core';

interface DragState {
  startX: number;
  startY: number;
  baseTx: number;
  baseTy: number;
}

@Directive({
  selector: '.modal-content, .modal',
  standalone: true,
})
export class DraggableModalDirective implements OnInit, OnDestroy {
  private handle: HTMLElement | null = null;
  private state: DragState | null = null;
  private tx = 0;
  private ty = 0;
  private removeMove?: () => void;
  private removeUp?: () => void;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnInit(): void {
    const host = this.el.nativeElement;
    this.handle = host.querySelector('.modal-header');
    if (!this.handle) return;

    this.renderer.setStyle(this.handle, 'cursor', 'move');
    this.renderer.setStyle(this.handle, 'touchAction', 'none');
    this.renderer.setStyle(this.handle, 'userSelect', 'none');
    this.renderer.setStyle(this.handle, 'webkitUserSelect', 'none');
    this.renderer.setStyle(host, 'willChange', 'transform');

    this.handle.addEventListener('pointerdown', this.onPointerDown);
  }

  ngOnDestroy(): void {
    this.handle?.removeEventListener('pointerdown', this.onPointerDown);
    this.removeListeners();
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    if (!(event.target as HTMLElement).closest('button, a, input, select, textarea, label, [role="button"]')) {
      this.state = {
        startX: event.clientX,
        startY: event.clientY,
        baseTx: this.tx,
        baseTy: this.ty,
      };
      this.removeMove = this.renderer.listen('document', 'pointermove', this.onPointerMove);
      this.removeUp = this.renderer.listen('document', 'pointerup', this.onPointerUp);
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.state) return;
    const host = this.el.nativeElement;
    const rect = host.getBoundingClientRect();
    const dx = event.clientX - this.state.startX;
    const dy = event.clientY - this.state.startY;
    const naturalLeft = rect.left - this.tx;
    const naturalTop = rect.top - this.ty;
    const width = host.offsetWidth;
    const height = host.offsetHeight;
    const minVisible = 60;

    let left = naturalLeft + this.state.baseTx + dx;
    let top = naturalTop + this.state.baseTy + dy;

    left = Math.min(Math.max(left, minVisible - width), window.innerWidth - minVisible);
    top = Math.min(Math.max(top, minVisible), window.innerHeight - minVisible);

    this.tx = left - naturalLeft;
    this.ty = top - naturalTop;
    this.renderer.setStyle(host, 'transform', `translate(${this.tx}px, ${this.ty}px)`);
  };

  private onPointerUp = (): void => {
    this.state = null;
    this.removeListeners();
  };

  private removeListeners(): void {
    this.removeMove?.();
    this.removeMove = undefined;
    this.removeUp?.();
    this.removeUp = undefined;
  }
}

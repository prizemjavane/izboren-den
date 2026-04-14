import { Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTooltip]',
  standalone: true,
})
export class TooltipDirective implements OnDestroy {
  @Input('appTooltip') text = '';
  @Input() tooltipPosition: 'top' | 'bottom' = 'top';

  private tooltipEl: HTMLElement | null = null;
  private showListener: (() => void) | null = null;
  private hideListener: (() => void) | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {
    const host = this.el.nativeElement;
    this.renderer.setStyle(host, 'position', 'relative');

    this.showListener = this.renderer.listen(host, 'mouseenter', () => this.show());
    this.hideListener = this.renderer.listen(host, 'mouseleave', () => this.hide());
  }

  private show(): void {
    if (!this.text) return;
    this.hide();

    const tip = this.renderer.createElement('span');
    this.renderer.addClass(tip, 'app-tooltip');
    if (this.tooltipPosition === 'bottom') {
      this.renderer.addClass(tip, 'app-tooltip--bottom');
    }
    tip.textContent = this.text;
    this.renderer.appendChild(this.el.nativeElement, tip);
    this.tooltipEl = tip;

    requestAnimationFrame(() => {
      if (this.tooltipEl) {
        this.renderer.setStyle(this.tooltipEl, 'opacity', '1');
        this.renderer.setStyle(this.tooltipEl, 'visibility', 'visible');
      }
    });
  }

  private hide(): void {
    if (this.tooltipEl) {
      this.renderer.removeChild(this.el.nativeElement, this.tooltipEl);
      this.tooltipEl = null;
    }
  }

  ngOnDestroy(): void {
    this.hide();
    this.showListener?.();
    this.hideListener?.();
  }
}

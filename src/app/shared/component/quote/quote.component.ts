import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { BgDatePipe } from '@shared/pipe/bg-date.pipe';

export interface Quote {
  text: string;
  url: string;
  author: string;
  authorLink?: string;
  date: string;
}

@Component({
  selector: 'app-quote',
  imports: [NgClass, BgDatePipe],
  templateUrl: './quote.component.html',
  styleUrl: './quote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuoteComponent {
  @Input({ required: true }) quotes: Quote[] = [];

  activeIndex = 0;
  direction: 'next' | 'prev' = 'next';
  animating = false;

  get hasMultiple(): boolean {
    return this.quotes.length > 1;
  }

  goTo(index: number) {
    if (index === this.activeIndex || this.animating) return;
    this.direction = index > this.activeIndex ? 'next' : 'prev';
    this.animating = true;
    this.activeIndex = index;
    setTimeout(() => (this.animating = false), 500);
  }

  next() {
    if (this.animating) return;
    this.direction = 'next';
    this.animating = true;
    this.activeIndex = (this.activeIndex + 1) % this.quotes.length;
    setTimeout(() => (this.animating = false), 500);
  }

  prev() {
    if (this.animating) return;
    this.direction = 'prev';
    this.animating = true;
    this.activeIndex = (this.activeIndex - 1 + this.quotes.length) % this.quotes.length;
    setTimeout(() => (this.animating = false), 500);
  }
}

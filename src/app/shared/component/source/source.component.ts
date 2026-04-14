import { Component, Input } from '@angular/core';
import { BgDatePipe } from '@shared/pipe/bg-date.pipe';
import { ShortUrlPipe } from '@shared/pipe/short-url.pipe';

const STORAGE_KEY = 'visitedSources';

@Component({
  selector: 'app-source',
  imports: [BgDatePipe, ShortUrlPipe],
  templateUrl: './source.component.html',
  styleUrl: './source.component.scss',
})
export class SourceComponent {
  @Input() public data!: any;

  visitedUrls = new Set<string>();

  constructor() {
    this.loadVisited();
  }

  getLinks(item: any): string[] {
    if (Array.isArray(item.link)) return item.link;
    return item.link ? [item.link] : [];
  }

  isVisited(url: string): boolean {
    return this.visitedUrls.has(url);
  }

  allVisited(item: any): boolean {
    const links = this.getLinks(item);
    return links.length > 0 && links.every((url: string) => this.visitedUrls.has(url));
  }

  openAllLinks(links: string[]) {
    for (const url of links) {
      this.visitedUrls.add(url);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.visitedUrls]));
    window.open(links[0], '_blank');
  }

  openLink(url: string, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.markVisited(url);
    window.open(url, '_blank');
  }

  markVisited(url: string) {
    this.visitedUrls.add(url);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...this.visitedUrls]));
  }

  clearVisited() {
    this.visitedUrls.clear();
    localStorage.removeItem(STORAGE_KEY);
  }

  private loadVisited() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      this.visitedUrls = new Set(stored ? JSON.parse(stored) : []);
    } catch {
      this.visitedUrls = new Set();
    }
  }
}

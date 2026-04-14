import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { HeaderComponent } from '@shared/component/header/header.component';
import { DataService } from '@core/data.service';

@Component({
  selector: 'app-contrast',
  imports: [HeaderComponent, AsyncPipe],
  templateUrl: './contrast.component.html',
  styleUrl: './contrast.component.scss',
})
export class ContrastComponent {
  private dataService = inject(DataService);
  public lists$ = this.dataService.getData('contrast.json');

  onMouseMove(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    el.style.setProperty('--my', `${event.clientY - rect.top}px`);
  }

  onMouseLeave(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
  }
}

import { Component, Input } from '@angular/core';
import { thePrehod } from '@core/utils';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [RouterLink, RouterLinkActive],
  standalone: true,
})
export class HeaderComponent {
  @Input() public title!: string;

  public thePrehod = thePrehod();
}

import { Component } from '@angular/core';
import { environment } from '@env/environment';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly githubUrl = environment.githubUrl;
}

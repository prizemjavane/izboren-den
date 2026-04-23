import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import moment from 'moment';
import 'moment/locale/bg';
import { FooterComponent } from '@shared/component/footer/footer.component';
import { environment } from '@env/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly githubUrl = environment.githubUrl;

  constructor() {
    moment.locale('bg');
  }
}

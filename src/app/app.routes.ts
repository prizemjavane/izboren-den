import { Routes } from '@angular/router';
import { SimulatorComponent } from '@pages/simulator/simulator.component';
import { HistoryComponent } from '@pages/history/history.component';
import { ContrastComponent } from '@pages/contrast/contrast.component';
export const routes: Routes = [
  { path: '', redirectTo: 'history', pathMatch: 'full' },
  { path: 'history', component: HistoryComponent },
  { path: 'simulator', component: SimulatorComponent },
  { path: 'contrast', component: ContrastComponent },
];

import { Routes } from '@angular/router';
import { SimulatorComponent } from '@pages/simulator/simulator.component';
import { HistoryComponent } from '@pages/history/history.component';
import { ContrastComponent } from '@pages/contrast/contrast.component';
export const routes: Routes = [
  { path: '', component: SimulatorComponent },
  { path: 'history', component: HistoryComponent },
  { path: 'contrast', component: ContrastComponent },
];

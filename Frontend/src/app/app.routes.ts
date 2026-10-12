import { Routes } from '@angular/router';
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Overview · GPA Calculator',
  },
  {
    path: 'semesters',
    loadComponent: () =>
      import('./features/semesters/semesters.component').then((m) => m.SemestersComponent),
    title: 'Semesters · GPA Calculator',
  },
  {
    path: 'calculator',
    loadComponent: () =>
      import('./features/calculator/calculator.component').then((m) => m.CalculatorComponent),
    title: 'Calculator · GPA Calculator',
  },
  {
    path: 'simulator',
    loadComponent: () =>
      import('./features/simulator/simulator.component').then((m) => m.SimulatorComponent),
    title: 'What if? · GPA Calculator',
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./features/planner/planner.component').then((m) => m.PlannerComponent),
    title: 'Your goals · GPA Calculator',
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.component').then((m) => m.AnalyticsComponent),
    title: 'Analytics · GPA Calculator',
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./features/settings/settings.component').then((m) => m.SettingsComponent),
    title: 'Settings · GPA Calculator',
  },
  { path: '**', redirectTo: '' },
];

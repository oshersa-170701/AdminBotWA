import { Routes } from '@angular/router';
import { authGuard } from './auth-guard-guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.LoginPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'leads',
        loadComponent: () => import('./dashboard/leads/leads').then(m => m.LeadsComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./dashboard/products/products').then(m => m.ProductsComponent)
      },
      {
        path: 'quotes',
        loadComponent: () => import('./dashboard/quotes/quotes').then(m => m.QuotesComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./dashboard/settings/settings').then(m => m.SettingsComponent)
      }
      // Quitamos el redirectTo: 'leads' de aquí para que el dashboard inicie completamente limpio 
    ]
  }
];
import { Routes } from '@angular/router';
import { Login } from './public/login/login';
import { RecoverPassword } from './public/recover-password/recover-password';
import { NotFound } from './shared/pages/not-found/not-found';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  // Redirección inicial
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  /**
   * RUTAS PÚBLICAS (Sin autenticación)
   */
  // Ruta de login
  { path: 'login', component: Login },
  // Ruta de recueperación de contraseña
  { path: 'recover-password', component: RecoverPassword },
  { path: 'recuperar-contrasena', redirectTo: 'recover-password', pathMatch: 'full' },
  /**
   * RUTAS PROTEGIDAS
   */
  // ADMINISTRACIÓN
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./admin/home/home').then((m) => m.Home),
  },
  // USUARIO
  {
    path: 'user',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['usuario'] },
    loadComponent: () => import('./user/home/home').then((m) => m.Home),
  },
  /**
   * MANEJO DE RUTAS NO ENCONTRADAS (404)
   */
  { path: '404', component: NotFound },
  { path: '**', component: NotFound },
];

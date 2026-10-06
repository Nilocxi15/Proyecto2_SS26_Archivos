import { Routes } from '@angular/router';
import { Login } from './public/login/login';
import { RecoverPassword } from './public/recover-password/recover-password';
import { NotFound } from './shared/pages/not-found/not-found';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'recover-password', component: RecoverPassword },
  { path: 'recuperar-contrasena', redirectTo: 'recover-password', pathMatch: 'full' },
  { path: '404', component: NotFound },
  { path: '**', component: NotFound },
];

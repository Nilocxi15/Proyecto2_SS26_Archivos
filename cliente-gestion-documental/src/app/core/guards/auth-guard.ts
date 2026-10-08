import {inject} from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Token } from '../services/token';

export const authGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  // Si existe token activo en el almacenamiento, se permite el acceso
  if (tokenService.hasToken()) {
    return true;
  }

  // Si no hay token de sesión, bloquear la navegación y redirigir al login
  return router.createUrlTree(['/login']);
};

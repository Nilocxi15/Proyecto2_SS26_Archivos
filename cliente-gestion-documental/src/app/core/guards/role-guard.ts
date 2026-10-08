import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Token } from '../services/token';

/**
 * Guard de protección de rutas basado en roles (RBAC)
 * Permite definir en route.data roles requeridos (ej. data: { roles: ['administrador'] })
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(Token);
  const router = inject(Router);

  // 1. Verificar si hay sesión activa
  if (!tokenService.hasToken()) {
    return router.createUrlTree(['/login']);
  }

  // 2. Extraer roles permitidos definidos en la ruta
  const rolesPermitidos = (route.data?.['roles'] as string[]) || [];

  if (rolesPermitidos.length === 0) {
    return true; // No se especificaron restricciones específicas
  }

  const rolActual = tokenService.getUserRole();

  // 3. Validar si el rol actual está incluido en los permitidos
  if (rolActual && rolesPermitidos.includes(rolActual)) {
    return true;
  }

  // 4. Si no tiene el rol necesario, redirigir a la raíz o vista principal
  return router.createUrlTree(['/']);
};

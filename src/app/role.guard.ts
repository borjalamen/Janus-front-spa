import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService, Rol } from './auth.service';

/**
 * Guard de autorización basado en roles.
 * 
 * Verifica que el usuario esté autenticado y tenga uno de los roles permitidos.
 * Si no cumple los requisitos, redirige a /home.
 * 
 * Uso en las rutas:
 * { 
 *   path: 'procedimientos', 
 *   component: ProcedimientosComponent,
 *   canActivate: [roleGuard],
 *   data: { roles: ['admin', 'devops'] }
 * }
 */
export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. Verificar que el usuario esté autenticado
  const currentUser = auth.currentUserValue;
  if (!currentUser) {
    console.warn('[RoleGuard] Usuario no autenticado. Redirigiendo a /home');
    return router.createUrlTree(['/home']);
  }

  // 2. Obtener los roles permitidos desde la configuración de la ruta
  const allowedRoles = (route.data['roles'] as Rol[]) || [];

  // 3. Si no hay roles especificados, permitir acceso (solo autenticación)
  if (allowedRoles.length === 0) {
    return true;
  }

  // 4. Verificar que el usuario tenga uno de los roles permitidos
  const userRole = currentUser.rol;
  if (allowedRoles.includes(userRole)) {
    return true;
  }

  // 5. Usuario autenticado pero sin permisos suficientes
  console.warn(
    `[RoleGuard] Acceso denegado. Usuario: ${currentUser.username} (${userRole}). Roles requeridos: ${allowedRoles.join(', ')}`
  );
  
  return router.createUrlTree(['/home']);
};

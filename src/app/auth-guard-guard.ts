import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const user = localStorage.getItem('user');

  if (user) {
    return true; // Permitir el acceso si hay sesión activa
  } else {
    // Si no está logueado, lo mandamos al login
    router.navigateByUrl('/login', { replaceUrl: true });
    return false;
  }
};
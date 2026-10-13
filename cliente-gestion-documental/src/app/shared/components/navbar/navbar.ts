import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

export type NavSection =
  'my-files' | 'shared' | 'trash' | 'users' | 'activity' | 'reports' | 'profile';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  // Entrada para indicar si la vista corresponde a un administrador
  readonly isAdmin = input<boolean>(false);

  // Computa si el usuario actual es administrador (por input o por sesión autenticada)
  readonly isEffectiveAdmin = computed(() => {
    const role = this.currentUser()?.rol;
    return this.isAdmin() || role === 'administrador' || role === ('admin' as any);
  });

  // Navegación entre secciones
  readonly activeSection = input<NavSection>('my-files');
  readonly sectionChange = output<NavSection>();

  selectSection(section: NavSection): void {
    this.sectionChange.emit(section);
  }

  logout(): void {
    this.authService.logout();
  }
}

import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  // Navegación entre secciones
  readonly activeSection = input<'my-files' | 'shared' | 'trash'>('my-files');
  readonly sectionChange = output<'my-files' | 'shared' | 'trash'>();

  selectSection(section: 'my-files' | 'shared' | 'trash'): void {
    this.sectionChange.emit(section);
  }

  logout(): void {
    this.authService.logout();
  }
}

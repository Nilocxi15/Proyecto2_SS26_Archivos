import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { UserProfileResponse } from '../../../core/models/auth.models';

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfile implements OnInit {
  private readonly authService = inject(AuthService);

  // Estado del perfil del usuario y estadísticas de almacenamiento
  readonly profile = signal<UserProfileResponse | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  // Formulario de cambio de contraseña
  readonly currentPassword = signal<string>('');
  readonly newPassword = signal<string>('');
  readonly confirmPassword = signal<string>('');
  readonly isChangingPassword = signal<boolean>(false);
  readonly passwordError = signal<string | null>(null);
  readonly passwordSuccess = signal<string | null>(null);

  // Alternadores de visibilidad de contraseñas
  readonly showCurrentPassword = signal<boolean>(false);
  readonly showNewPassword = signal<boolean>(false);
  readonly showConfirmPassword = signal<boolean>(false);

  ngOnInit(): void {
    this.loadProfileData();
  }

  /**
   * Carga la información del perfil del usuario y el uso de almacenamiento
   */
  loadProfileData(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.authService.getProfile().subscribe({
      next: (response) => {
        this.profile.set(response);
        this.isLoading.set(false);
      },
      error: (err) => {
        const msg =
          err?.error?.mensaje || 'Error al obtener los datos del perfil desde el servidor';
        this.loadError.set(msg);
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Procesa la solicitud para cambiar la contraseña
   */
  onChangePassword(): void {
    const current = this.currentPassword().trim();
    const newPass = this.newPassword().trim();
    const confirm = this.confirmPassword().trim();

    this.passwordError.set(null);
    this.passwordSuccess.set(null);

    if (!current || !newPass || !confirm) {
      this.passwordError.set('Todos los campos de contraseña son obligatorios');
      return;
    }

    if (newPass.length < 6) {
      this.passwordError.set('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPass !== confirm) {
      this.passwordError.set('La nueva contraseña y su confirmación no coinciden');
      return;
    }

    if (current === newPass) {
      this.passwordError.set('La nueva contraseña debe ser diferente a la contraseña actual');
      return;
    }

    this.isChangingPassword.set(true);

    this.authService.changePassword({ currentPassword: current, newPassword: newPass }).subscribe({
      next: (res) => {
        this.isChangingPassword.set(false);
        this.passwordSuccess.set(res?.mensaje || 'Contraseña actualizada exitosamente');
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
      },
      error: (err) => {
        this.isChangingPassword.set(false);
        const msg =
          err?.error?.mensaje || 'Error al actualizar la contraseña. Verifica tu contraseña actual';
        this.passwordError.set(msg);
      },
    });
  }

  /**
   * Formatea cantidades en bytes a unidades legibles (B, KB, MB, GB)
   */
  formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Formatea marcas de tiempo ISO a formato legible en español
   */
  formatDate(isoString?: string): string {
    if (!isoString) return 'No disponible';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Determina la clase de color de la barra de progreso de almacenamiento
   */
  getStorageProgressClass(percentage: number): string {
    if (percentage >= 90) return 'bg-danger';
    if (percentage >= 70) return 'bg-warning';
    return 'bg-primary';
  }
}

import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagementService } from '../../services/user-management.service';
import { ManagedUser } from '../../models/user-management.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement {
  readonly userService = inject(UserManagementService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  // Filtros y Búsqueda
  readonly searchTerm = signal<string>('');
  readonly roleFilter = signal<'all' | 'administrador' | 'usuario'>('all');
  readonly statusFilter = signal<'all' | 'activo' | 'inactivo'>('all');
  readonly sortBy = signal<'name' | 'date' | 'storage'>('name');

  // Notificaciones temporales
  readonly successNotification = signal<string | null>(null);
  readonly errorNotification = signal<string | null>(null);

  // Estado del Modal de Creación
  readonly isCreateModalVisible = signal<boolean>(false);
  readonly createName = signal<string>('');
  readonly createLastName = signal<string>('');
  readonly createEmail = signal<string>('');
  readonly createPassword = signal<string>('');
  readonly createRole = signal<'administrador' | 'usuario'>('usuario');
  readonly createStorageMb = signal<number>(500);
  readonly createError = signal<string | null>(null);

  // Estado del Modal de Edición
  readonly isEditModalVisible = signal<boolean>(false);
  readonly editingUserId = signal<string | null>(null);
  readonly editName = signal<string>('');
  readonly editLastName = signal<string>('');
  readonly editEmail = signal<string>('');
  readonly editRole = signal<'administrador' | 'usuario'>('usuario');
  readonly editStorageMb = signal<number>(500);
  readonly editStatus = signal<'activo' | 'inactivo'>('activo');
  readonly editError = signal<string | null>(null);

  // Estado del Modal de Borrado Lógico (Desactivación)
  readonly isDeleteModalVisible = signal<boolean>(false);
  readonly targetUser = signal<ManagedUser | null>(null);
  readonly deleteError = signal<string | null>(null);

  // Lista filtrada y ordenada reactivamente
  readonly filteredUsers = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();
    const sort = this.sortBy();
  });

  // OPERACIÓN CREATE (Crear Usuario)
  openCreateModal(): void {
    this.createName.set('');
    this.createLastName.set('');
    this.createEmail.set('');
    this.createPassword.set('');
    this.createRole.set('usuario');
    this.createStorageMb.set(500);
    this.createError.set(null);
    this.isCreateModalVisible.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalVisible.set(false);
    this.createError.set(null);
  }

  confirmCreateUser(): void {
    const name = this.createName().trim();
    const lastName = this.createLastName().trim();
    const email = this.createEmail().trim().toLowerCase();
    const password = this.createPassword().trim();
    const role = this.createRole();
    const storageLimitBytes = (this.createStorageMb() || 500) * 1024 * 1024;

    if (!name || !lastName || !email || !password) {
      this.createError.set('Todos los campos son obligatorios');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.createError.set('Por favor, ingresa un correo electrónico válido');
      return;
    }

    if (password.length < 6) {
      this.createError.set('La contraseña debe tener un mínimo de 6 caracteres');
      return;
    }

    this.closeCreateModal();
    this.showSuccess(`Usuario "${name} ${lastName}" creado exitosamente`);
  }

  // OPERACIÓN UPDATE (Editar Usuario)
  openEditModal(user: ManagedUser): void {
    this.editingUserId.set(user._id);
    this.editName.set(user.name);
    this.editLastName.set(user.lastName);
    this.editEmail.set(user.email);
    this.editRole.set(user.role);
    this.editStorageMb.set(Math.round(user.storageLimitBytes / (1024 * 1024)));
    this.editStatus.set(user.status);
    this.editError.set(null);
    this.isEditModalVisible.set(true);
  }

  closeEditModal(): void {
    this.isEditModalVisible.set(false);
    this.editingUserId.set(null);
    this.editError.set(null);
  }

  confirmEditUser(): void {
    const id = this.editingUserId();
    if (!id) return;

    const name = this.editName().trim();
    const lastName = this.editLastName().trim();
    const role = this.editRole();
    const status = this.editStatus();
    const storageLimitBytes = (this.editStorageMb() || 500) * 1024 * 1024;

    if (!name || !lastName) {
      this.editError.set('El nombre y apellido son obligatorios');
      return;
    }

    // Evitar que el administrador actual se inactive a sí mismo accidentalmente
    const activeUserId = this.currentUser()?._id;
    if (id === activeUserId && status === 'inactivo') {
      this.editError.set('No puedes desactivar tu propia cuenta mientras tienes la sesión activa');
      return;
    }

    this.closeEditModal();
    this.showSuccess(`Usuario "${name} ${lastName}" actualizado exitosamente`);
  }

  // OPERACIÓN DELETE (Borrado Lógico / Desactivar / Reactivar)
  openDeleteModal(user: ManagedUser): void {
    const activeUserId = this.currentUser()?._id;
    if (user._id === activeUserId) {
      this.showError('No puedes desactivar tu propia cuenta activa');
      return;
    }

    this.targetUser.set(user);
    this.deleteError.set(null);
    this.isDeleteModalVisible.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalVisible.set(false);
    this.targetUser.set(null);
    this.deleteError.set(null);
  }

  confirmToggleStatus(): void {
    const user = this.targetUser();
    if (!user) return;

    const isDeactivating = user.status === 'activo';
    this.closeDeleteModal();

    if (isDeactivating) {
      this.showSuccess(`Usuario "${user.name} ${user.lastName}" desactivado lógicamente`);
    } else {
      this.showSuccess(`Usuario "${user.name} ${user.lastName}" reactivado exitosamente`);
    }
  }

  // Utilidades y Notificaciones
  private showSuccess(message: string): void {
    this.successNotification.set(message);
    setTimeout(() => this.successNotification.set(null), 4000);
  }

  private showError(message: string): void {
    this.errorNotification.set(message);
    setTimeout(() => this.errorNotification.set(null), 4000);
  }

  formatStorage(bytes: number): string {
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(mb)} MB`;
  }

  formatDate(isoString: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  getInitials(name: string, lastName: string): string {
    const n = name ? name.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return `${n}${l}` || 'U';
  }
}

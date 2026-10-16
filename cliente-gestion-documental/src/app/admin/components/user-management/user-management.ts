import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserManagementService } from '../../../core/services/user-management.service';
import { ManagedUser } from '../../../core/models/user-management.models';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  readonly userService = inject(UserManagementService);
  private readonly authService = inject(AuthService);

  readonly currentUser = this.authService.currentUser;

  // Filtros y Búsqueda
  readonly searchTerm = signal<string>('');
  readonly roleFilter = signal<'all' | 'admin' | 'usuario'>('all');
  readonly statusFilter = signal<'all' | 'activo' | 'inactivo'>('all');
  readonly sortBy = signal<'name' | 'date' | 'storage'>('name');

  // Notificaciones temporales
  readonly successNotification = signal<string | null>(null);
  readonly errorNotification = signal<string | null>(null);

  // Visibilidad y control de modales Bootstrap
  readonly isFormModalVisible = signal<boolean>(false);
  readonly isDeleteModalVisible = signal<boolean>(false);

  // Formulario único para modal Bootstrap (Crear / Editar)
  readonly isEditMode = signal<boolean>(false);
  readonly editingUserId = signal<string | null>(null);
  readonly formName = signal<string>('');
  readonly formLastName = signal<string>('');
  readonly formEmail = signal<string>('');
  readonly formPassword = signal<string>('');
  readonly formRole = signal<'admin' | 'usuario'>('usuario');
  readonly formStorageMb = signal<number>(500);
  readonly formStatus = signal<'activo' | 'inactivo'>('activo');
  readonly formError = signal<string | null>(null);
  readonly isSubmittingForm = signal<boolean>(false);

  // Modal de Confirmación de Borrado Lógico / Reactivación
  readonly targetUser = signal<ManagedUser | null>(null);
  readonly deleteError = signal<string | null>(null);
  readonly isSubmittingDelete = signal<boolean>(false);

  // Lista filtrada y ordenada reactivamente
  readonly filteredUsers = computed(() => {
    const list = this.userService.users();
    const text = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();
    const sort = this.sortBy();

    const filtered = list.filter((user) => {
      const matchesSearch =
        !text ||
        user.name?.toLowerCase().includes(text) ||
        user.lastName?.toLowerCase().includes(text) ||
        user.email?.toLowerCase().includes(text);

      const matchesRole = role === 'all' || user.role === role;
      const matchesStatus = status === 'all' || user.status === status;

      return matchesSearch && matchesRole && matchesStatus;
    });

    return filtered.sort((a, b) => {
      if (sort === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sort === 'storage') {
        return (b.storageLimitBytes || 0) - (a.storageLimitBytes || 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.loadUsers().subscribe({
      error: (err) => {
        this.showError(err.error?.mensaje || 'Error al sincronizar los usuarios con el servidor');
      },
    });
  }

  // Apertura de Modal Crear
  openCreateModal(): void {
    this.isEditMode.set(false);
    this.editingUserId.set(null);
    this.formName.set('');
    this.formLastName.set('');
    this.formEmail.set('');
    this.formPassword.set('');
    this.formRole.set('usuario');
    this.formStorageMb.set(500);
    this.formStatus.set('activo');
    this.formError.set(null);
    this.isSubmittingForm.set(false);
    this.isFormModalVisible.set(true);
  }

  // Apertura de Modal Editar
  openEditModal(user: ManagedUser): void {
    this.isEditMode.set(true);
    this.editingUserId.set(user._id);
    this.formName.set(user.name);
    this.formLastName.set(user.lastName);
    this.formEmail.set(user.email);
    this.formPassword.set('');
    this.formRole.set(user.role);
    this.formStorageMb.set(Math.round((user.storageLimitBytes || 524288000) / (1024 * 1024)));
    this.formStatus.set(user.status);
    this.formError.set(null);
    this.isSubmittingForm.set(false);
    this.isFormModalVisible.set(true);
  }

  closeFormModal(): void {
    this.isFormModalVisible.set(false);
    this.formError.set(null);
  }

  // Guardar usuario (Crear o Editar según el modo)
  saveUser(): void {
    const name = this.formName().trim();
    const lastName = this.formLastName().trim();
    const role = this.formRole();
    const status = this.formStatus();
    const storageLimitBytes = (this.formStorageMb() || 500) * 1024 * 1024;

    if (!name || !lastName) {
      this.formError.set('El nombre y apellido son obligatorios');
      return;
    }

    if (this.isEditMode()) {
      const id = this.editingUserId();
      if (!id) return;

      const activeUserId = this.currentUser()?._id;
      if (id === activeUserId && status === 'inactivo') {
        this.formError.set(
          'No puedes desactivar tu propia cuenta mientras tienes la sesión activa',
        );
        return;
      }

      this.isSubmittingForm.set(true);
      this.userService
        .updateUser(id, {
          name,
          lastName,
          role,
          status,
          storageLimitBytes,
        })
        .subscribe({
          next: () => {
            this.isSubmittingForm.set(false);
            this.closeFormModal();
            this.showSuccess(`Usuario "${name} ${lastName}" actualizado exitosamente`);
          },
          error: (err) => {
            this.isSubmittingForm.set(false);
            this.formError.set(err.error?.mensaje || 'No fue posible actualizar al usuario');
          },
        });
    } else {
      const email = this.formEmail().trim().toLowerCase();
      const password = this.formPassword().trim();

      if (!email || !password) {
        this.formError.set('El correo y la contraseña son obligatorios');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.formError.set('Por favor, ingresa un correo electrónico válido');
        return;
      }

      if (password.length < 6) {
        this.formError.set('La contraseña debe tener un mínimo de 6 caracteres');
        return;
      }

      this.isSubmittingForm.set(true);
      this.userService
        .createUser({
          name,
          lastName,
          email,
          password,
          role,
          storageLimitBytes,
        })
        .subscribe({
          next: () => {
            this.isSubmittingForm.set(false);
            this.closeFormModal();
            this.showSuccess(`Usuario "${name} ${lastName}" registrado exitosamente`);
          },
          error: (err) => {
            this.isSubmittingForm.set(false);
            this.formError.set(err.error?.mensaje || 'No fue posible registrar al usuario');
          },
        });
    }
  }

  // Modal Confirmar Borrado Lógico / Reactivación
  openDeleteModal(user: ManagedUser): void {
    const activeUserId = this.currentUser()?._id;
    if (user._id === activeUserId) {
      this.showError('No puedes desactivar tu propia cuenta activa');
      return;
    }

    this.targetUser.set(user);
    this.deleteError.set(null);
    this.isSubmittingDelete.set(false);
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

    this.isSubmittingDelete.set(true);
    this.userService.toggleUserStatus(user._id).subscribe({
      next: () => {
        this.isSubmittingDelete.set(false);
        const isDeactivating = user.status === 'activo';
        this.closeDeleteModal();

        if (isDeactivating) {
          this.showSuccess(`Usuario "${user.name} ${user.lastName}" desactivado lógicamente`);
        } else {
          this.showSuccess(`Usuario "${user.name} ${user.lastName}" reactivado exitosamente`);
        }
      },
      error: (err) => {
        this.isSubmittingDelete.set(false);
        this.deleteError.set(err.error?.mensaje || 'Error al cambiar el estado del usuario');
      },
    });
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

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateUserDto, ManagedUser, UpdateUserDto } from '../models/user-management.models';

interface ApiResponse<T> {
  status: string;
  mensaje?: string;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  // Estado reactivo con Signals
  readonly users = signal<ManagedUser[]>([]);
  readonly isLoading = signal<boolean>(false);

  // Métricas computadas (KPIs)
  readonly totalUsers = computed(() => this.users().length);
  readonly activeUsers = computed(() => this.users().filter((u) => u.status === 'activo').length);
  readonly inactiveUsers = computed(
    () => this.users().filter((u) => u.status === 'inactivo').length,
  );
  readonly adminUsers = computed(
    () => this.users().filter((u) => u.role === 'admin').length
  );

  /**
   * Carga los usuarios desde el backend
   */
  loadUsers(): Observable<ApiResponse<ManagedUser[]>> {
    this.isLoading.set(true);
    return this.http.get<ApiResponse<ManagedUser[]>>(this.apiUrl).pipe(
      tap({
        next: (res) => {
          this.users.set(res.data);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      }),
    );
  }

  /**
   * Registra un nuevo usuario
   */
  createUser(dto: CreateUserDto): Observable<ApiResponse<ManagedUser>> {
    return this.http.post<ApiResponse<ManagedUser>>(this.apiUrl, dto).pipe(
      tap((res) => {
        this.users.update((current) => [res.data, ...current]);
      }),
    );
  }

  /**
   * Actualiza los datos de un usuario
   */
  updateUser(id: string, dto: UpdateUserDto): Observable<ApiResponse<ManagedUser>> {
    return this.http.put<ApiResponse<ManagedUser>>(`${this.apiUrl}/${id}`, dto).pipe(
      tap((res) => {
        this.users.update((current) => current.map((u) => (u._id === id ? res.data : u)));
      }),
    );
  }

  /**
   * Borrado lógico (desactivación) de un usuario
   */
  softDeleteUser(id: string): Observable<ApiResponse<ManagedUser>> {
    return this.http.delete<ApiResponse<ManagedUser>>(`${this.apiUrl}/${id}`).pipe(
      tap((res) => {
        this.users.update((current) => current.map((u) => (u._id === id ? res.data : u)));
      }),
    );
  }

  /**
   * Alterna el estado activo / inactivo (borrado lógico o reactivación)
   */
  toggleUserStatus(id: string): Observable<ApiResponse<ManagedUser>> {
    return this.http.patch<ApiResponse<ManagedUser>>(`${this.apiUrl}/${id}/status`, {}).pipe(
      tap((res) => {
        this.users.update((current) => current.map((u) => (u._id === id ? res.data : u)));
      }),
    );
  }
}

import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginRequest, LoginResponse, RegistroRequest, Usuario } from '../models/auth.models';
import { Token } from './token';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(Token);
  private readonly router = inject(Router);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Estado reactivo del usuario en memoria con Angular Signals
  readonly currentUser = signal<Usuario | null>(this.tokenService.getUser());
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => {
    const rol = this.currentUser()?.rol;
    return rol === 'administrador' || rol === ('admin' as any);
  });

  /**
   * Autentica al usuario contra la API del backend
   * @param credentials Datos de inicio de sesión (email y password)
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res.token && res.usuario) {
          this.tokenService.saveToken(res.token);
          this.tokenService.saveUser(res.usuario);
          this.currentUser.set(res.usuario);
        }
      })
    );
  }

  /**
   * Registra un nuevo usuario en el sistema
   */
  registro(data: RegistroRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/registro`, data).pipe(
      tap((res) => {
        if (res.token && res.usuario) {
          this.tokenService.saveToken(res.token);
          this.tokenService.saveUser(res.usuario);
          this.currentUser.set(res.usuario);
        }
      })
    );
  }

  /**
   * Obtiene el perfil actualizado del usuario desde el backend
   */
  obtenerPerfil(): Observable<{ status: string; usuario: Usuario }> {
    return this.http.get<{ status: string; usuario: Usuario }>(`${this.apiUrl}/perfil`).pipe(
      tap((res) => {
        if (res.usuario) {
          this.tokenService.saveUser(res.usuario);
          this.currentUser.set(res.usuario);
        }
      })
    );
  }

  /**
   * Cierra la sesión activa del usuario y redirige al login
   */
  logout(): void {
    this.tokenService.clear();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}

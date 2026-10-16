import { Injectable } from '@angular/core';
import { Usuario } from '../models/auth.models';

@Injectable({
  providedIn: 'root',
})
export class Token {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  saveToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  saveUser(user: Usuario): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): Usuario | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? (JSON.parse(userJson) as Usuario) : null;
  }

  getUserRole(): 'admin' | 'usuario' | null {
    return this.getUser()?.role ?? null;
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  clear(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserStorageReportItem {
  userId: string;
  userName: string;
  userEmail: string;
  role?: string;
  isActive?: boolean;
  fileCount: number;
  totalSizeBytes: number;
  lastActivityAt?: string | null;
}

interface ApiResponse<T> {
  status: string;
  data: T;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  // Estado reactivo para el Top 10 usuarios con mayor cantidad de archivos
  readonly storageTopUsers = signal<UserStorageReportItem[]>([]);
  readonly isLoadingStorageTop = signal<boolean>(false);
  readonly lastUpdatedAt = signal<Date | null>(null);

  /**
   * Obtiene los 10 usuarios con mayor cantidad de archivos almacenados desde el backend
   */
  getTopUsersByFiles(): Observable<ApiResponse<UserStorageReportItem[]>> {
    this.isLoadingStorageTop.set(true);
    return this.http
      .get<ApiResponse<UserStorageReportItem[]>>(`${this.apiUrl}/users/top-files`)
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.storageTopUsers.set(res.data);
              this.lastUpdatedAt.set(new Date());
            }
            this.isLoadingStorageTop.set(false);
          },
          error: () => {
            this.isLoadingStorageTop.set(false);
          },
        }),
      );
  }
}

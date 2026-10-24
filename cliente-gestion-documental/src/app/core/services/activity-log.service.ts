import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  ActivityLogItem,
  ActivityAction,
  ActivityResourceType,
} from '../../admin/components/activity-log/activity-log.models';

interface ApiResponse<T> {
  status: string;
  data: T;
  mensaje?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ActivityLogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/activity-logs`;

  readonly logs = signal<ActivityLogItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly lastUpdatedAt = signal<Date | null>(null);

  // Variable temporal de datos
  private readonly dataTest: ActivityLogItem[] = []

  /**
   * Carga el registro de actividades desde el backend, con fallback a los datos iniciales
   * estructurados mientras el endpoint del backend no esté conectado.
   */
  loadLogs(): Observable<ActivityLogItem[]> {
    this.isLoading.set(true);

    return this.http.get<ApiResponse<ActivityLogItem[]>>(this.apiUrl).pipe(
      map((res) => {
        if (res && res.data && Array.isArray(res.data)) {
          return res.data;
        }
        return this.dataTest;
      }),
      catchError(() => {
        // En caso de que el backend no tenga aún implementada la ruta, usar los registros de auditoría
        return of(this.dataTest);
      }),
      tap((data) => {
        this.logs.set(data);
        this.isLoading.set(false);
        this.lastUpdatedAt.set(new Date());
      })
    );
  }
}

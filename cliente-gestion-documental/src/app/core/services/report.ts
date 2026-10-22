import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  UserStorageReportItem,
  UserSharedReportItem,
} from '../../admin/components/system-reports/components/user-reports/user-reports.models';
import {
  FileTypeReportItem,
  DateRangeFileItem,
} from '../../admin/components/system-reports/components/storage-reports/storage-reports.models';

export type {
  UserStorageReportItem,
  UserSharedReportItem,
  FileTypeReportItem,
  DateRangeFileItem,
};

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

  // Estado reactivo para el ranking de usuarios con más recursos compartidos
  readonly sharedTopUsers = signal<UserSharedReportItem[]>([]);
  readonly isLoadingSharedTop = signal<boolean>(false);
  readonly lastUpdatedSharedAt = signal<Date | null>(null);

  // Estado reactivo para archivos agrupados por tipo
  readonly filesByType = signal<FileTypeReportItem[]>([]);
  readonly isLoadingFilesByType = signal<boolean>(false);
  readonly lastUpdatedFilesByTypeAt = signal<Date | null>(null);

  // Estado reactivo para archivos almacenados dentro de un rango de fechas
  readonly filesByDateRange = signal<DateRangeFileItem[]>([]);
  readonly isLoadingDateRange = signal<boolean>(false);
  readonly lastUpdatedDateRangeAt = signal<Date | null>(null);

  /**
   * Obtiene los archivos almacenados dentro de un rango de fechas
   */
  getFilesByDateRange(
    startDate?: string,
    endDate?: string,
  ): Observable<ApiResponse<DateRangeFileItem[]>> {
    this.isLoadingDateRange.set(true);
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http
      .get<ApiResponse<DateRangeFileItem[]>>(`${this.apiUrl}/storage/by-date-range`, { params })
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.filesByDateRange.set(res.data);
              this.lastUpdatedDateRangeAt.set(new Date());
            }
            this.isLoadingDateRange.set(false);
          },
          error: () => {
            this.isLoadingDateRange.set(false);
          },
        }),
      );
  }

  /**
   * Obtiene la cantidad de archivos agrupados por tipo y volumen de almacenamiento
   */
  getFilesGroupedByType(): Observable<ApiResponse<FileTypeReportItem[]>> {
    this.isLoadingFilesByType.set(true);
    return this.http
      .get<ApiResponse<FileTypeReportItem[]>>(`${this.apiUrl}/storage/by-type`)
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.filesByType.set(res.data);
              this.lastUpdatedFilesByTypeAt.set(new Date());
            }
            this.isLoadingFilesByType.set(false);
          },
          error: () => {
            this.isLoadingFilesByType.set(false);
          },
        }),
      );
  }

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

  /**
   * Obtiene los usuarios con mayor cantidad de recursos compartidos desde el backend
   */
  getTopUsersBySharedResources(): Observable<ApiResponse<UserSharedReportItem[]>> {
    this.isLoadingSharedTop.set(true);
    return this.http
      .get<ApiResponse<UserSharedReportItem[]>>(`${this.apiUrl}/users/top-shared`)
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.sharedTopUsers.set(res.data);
              this.lastUpdatedSharedAt.set(new Date());
            }
            this.isLoadingSharedTop.set(false);
          },
          error: () => {
            this.isLoadingSharedTop.set(false);
          },
        }),
      );
  }
}

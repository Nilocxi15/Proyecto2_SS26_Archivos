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
  FileOperationsItem,
} from '../../admin/components/system-reports/components/storage-reports/storage-reports.models';
import {
  MostSharedFileReportItem,
  UserResourceSharedItem,
  UserResourceReceivedItem,
  UserSelectOption,
} from '../../admin/components/system-reports/components/sharing-reports/sharing-reports.models';

export type {
  UserStorageReportItem,
  UserSharedReportItem,
  FileTypeReportItem,
  DateRangeFileItem,
  FileOperationsItem,
  MostSharedFileReportItem,
  UserResourceSharedItem,
  UserResourceReceivedItem,
  UserSelectOption,
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

  // Estado reactivo para archivos con mayor cantidad de operaciones registradas
  readonly filesByOperations = signal<FileOperationsItem[]>([]);
  readonly isLoadingFilesByOperations = signal<boolean>(false);
  readonly lastUpdatedFilesByOperationsAt = signal<Date | null>(null);

  // Estado reactivo para archivos compartidos con mayor cantidad de usuarios
  readonly mostSharedFiles = signal<MostSharedFileReportItem[]>([]);
  readonly isLoadingMostSharedFiles = signal<boolean>(false);
  readonly lastUpdatedMostSharedFilesAt = signal<Date | null>(null);

  // Estado reactivo para usuarios en selectores de reportes
  readonly usersForSelect = signal<UserSelectOption[]>([]);
  readonly isLoadingUsersForSelect = signal<boolean>(false);

  // Estado reactivo para recursos compartidos por un usuario
  readonly resourcesSharedByUser = signal<UserResourceSharedItem[]>([]);
  readonly isLoadingSharedByUser = signal<boolean>(false);
  readonly lastUpdatedSharedByUserAt = signal<Date | null>(null);

  // Estado reactivo para recursos recibidos por un usuario
  readonly resourcesReceivedByUser = signal<UserResourceReceivedItem[]>([]);
  readonly isLoadingReceivedByUser = signal<boolean>(false);
  readonly lastUpdatedReceivedByUserAt = signal<Date | null>(null);

  /**
   * Obtiene la lista ligera de usuarios activos para selectores de reportes
   */
  getUsersForSelect(): Observable<ApiResponse<UserSelectOption[]>> {
    this.isLoadingUsersForSelect.set(true);
    return this.http
      .get<ApiResponse<UserSelectOption[]>>(`${this.apiUrl}/users/select-options`)
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.usersForSelect.set(res.data);
            }
            this.isLoadingUsersForSelect.set(false);
          },
          error: () => {
            this.isLoadingUsersForSelect.set(false);
          },
        }),
      );
  }

  /**
   * Obtiene los recursos compartidos por un usuario seleccionado
   */
  getResourcesSharedByUser(userId: string): Observable<ApiResponse<UserResourceSharedItem[]>> {
    this.isLoadingSharedByUser.set(true);
    const params = new HttpParams().set('userId', userId);
    return this.http
      .get<ApiResponse<UserResourceSharedItem[]>>(`${this.apiUrl}/sharing/by-user`, { params })
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.resourcesSharedByUser.set(res.data);
              this.lastUpdatedSharedByUserAt.set(new Date());
            }
            this.isLoadingSharedByUser.set(false);
          },
          error: () => {
            this.isLoadingSharedByUser.set(false);
          },
        }),
      );
  }

  /**
   * Obtiene los recursos compartidos recibidos por un usuario seleccionado
   */
  getResourcesReceivedByUser(userId: string): Observable<ApiResponse<UserResourceReceivedItem[]>> {
    this.isLoadingReceivedByUser.set(true);
    const params = new HttpParams().set('userId', userId);
    return this.http
      .get<ApiResponse<UserResourceReceivedItem[]>>(`${this.apiUrl}/sharing/received-by-user`, { params })
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.resourcesReceivedByUser.set(res.data);
              this.lastUpdatedReceivedByUserAt.set(new Date());
            }
            this.isLoadingReceivedByUser.set(false);
          },
          error: () => {
            this.isLoadingReceivedByUser.set(false);
          },
        }),
      );
  }

  /**
   * Obtiene los archivos compartidos con mayor cantidad de usuarios
   */
  getMostSharedFiles(): Observable<ApiResponse<MostSharedFileReportItem[]>> {
    this.isLoadingMostSharedFiles.set(true);
    return this.http
      .get<ApiResponse<MostSharedFileReportItem[]>>(`${this.apiUrl}/sharing/most-shared-files`)
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.mostSharedFiles.set(res.data);
              this.lastUpdatedMostSharedFilesAt.set(new Date());
            }
            this.isLoadingMostSharedFiles.set(false);
          },
          error: () => {
            this.isLoadingMostSharedFiles.set(false);
          },
        }),
      );
  }

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
   * Obtiene los archivos con mayor cantidad de operaciones registradas
   */
  getFilesByOperations(): Observable<ApiResponse<FileOperationsItem[]>> {
    this.isLoadingFilesByOperations.set(true);
    return this.http
      .get<ApiResponse<FileOperationsItem[]>>(`${this.apiUrl}/storage/by-operations`)
      .pipe(
        tap({
          next: (res) => {
            if (res.status === 'success' && res.data) {
              this.filesByOperations.set(res.data);
              this.lastUpdatedFilesByOperationsAt.set(new Date());
            }
            this.isLoadingFilesByOperations.set(false);
          },
          error: () => {
            this.isLoadingFilesByOperations.set(false);
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

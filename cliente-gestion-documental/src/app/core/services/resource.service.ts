import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BreadcrumbItem,
  CreateFileRequest,
  CreateFolderRequest,
  FileItem,
  FolderItem,
  MisArchivosResponse,
} from '../models/resource.models';

@Injectable({
  providedIn: 'root',
})
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/resources`;

  // Estado reactivo centralizado con Angular Signals (Mis Archivos)
  readonly folders = signal<FolderItem[]>([]);
  readonly files = signal<FileItem[]>([]);
  readonly currentFolder = signal<FolderItem | null>(null);
  readonly breadcrumbs = signal<BreadcrumbItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  // Estado reactivo centralizado para "Compartido conmigo"
  readonly sharedFolders = signal<FolderItem[]>([]);
  readonly sharedFiles = signal<FileItem[]>([]);
  readonly sharedCurrentFolder = signal<FolderItem | null>(null);
  readonly sharedBreadcrumbs = signal<BreadcrumbItem[]>([]);
  readonly isSharedLoading = signal<boolean>(false);
  readonly sharedError = signal<string | null>(null);

  /**
   * Carga los archivos y carpetas del usuario según el folderId (raíz si es null o vacío)
   * @param folderId ID opcional de la carpeta actual
   */
  loadMisArchivos(folderId?: string | null): Observable<MisArchivosResponse> {
    this.isLoading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (folderId) {
      params = params.set('folderId', folderId);
    }

    return this.http.get<MisArchivosResponse>(`${this.apiUrl}/mis-archivos`, { params }).pipe(
      tap((res) => {
        if (res.status === 'success' && res.data) {
          this.currentFolder.set(res.data.currentFolder);
          this.breadcrumbs.set(res.data.breadcrumbs || []);
          this.folders.set(res.data.folders || []);
          this.files.set(res.data.files || []);
        }
        this.isLoading.set(false);
      }),
      catchError((err) => {
        const errorMsg =
          err?.error?.mensaje || 'Error al cargar los archivos y carpetas desde el servidor';
        this.error.set(errorMsg);
        this.isLoading.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Carga los archivos y carpetas compartidos con el usuario autenticado
   * @param folderId ID opcional de la carpeta compartida a explorar
   */
  loadCompartidoConmigo(folderId?: string | null): Observable<MisArchivosResponse> {
    this.isSharedLoading.set(true);
    this.sharedError.set(null);

    let params = new HttpParams();
    if (folderId) {
      params = params.set('folderId', folderId);
    }

    return this.http.get<MisArchivosResponse>(`${this.apiUrl}/compartido-conmigo`, { params }).pipe(
      tap((res) => {
        if (res.status === 'success' && res.data) {
          this.sharedCurrentFolder.set(res.data.currentFolder);
          this.sharedBreadcrumbs.set(res.data.breadcrumbs || []);
          this.sharedFolders.set(res.data.folders || []);
          this.sharedFiles.set(res.data.files || []);
        }
        this.isSharedLoading.set(false);
      }),
      catchError((err) => {
        const errorMsg =
          err?.error?.mensaje ||
          'Error al cargar los documentos y carpetas compartidos desde el servidor';
        this.sharedError.set(errorMsg);
        this.isSharedLoading.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Crea una nueva carpeta en el backend y refresca la vista
   * @param data Datos de la carpeta a crear
   */
  createFolder(data: CreateFolderRequest): Observable<any> {
    this.isLoading.set(true);
    return this.http.post<any>(`${this.apiUrl}/folders`, data).pipe(
      tap(() => {
        // Refrescar el contenido de la ubicación actual tras la creación exitosa
        const currentId = this.currentFolder()?._id || null;
        this.loadMisArchivos(currentId).subscribe();
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Sube un archivo digital (.txt o .md) al backend y refresca la vista
   * @param data Contenido y metadatos del archivo a registrar
   */
  uploadFile(data: CreateFileRequest): Observable<any> {
    this.isLoading.set(true);
    return this.http.post<any>(`${this.apiUrl}/files`, data).pipe(
      tap(() => {
        // Refrescar el contenido de la ubicación actual tras la subida exitosa
        const currentId = this.currentFolder()?._id || null;
        this.loadMisArchivos(currentId).subscribe();
      }),
      catchError((err) => {
        this.isLoading.set(false);
        return throwError(() => err);
      }),
    );
  }
}

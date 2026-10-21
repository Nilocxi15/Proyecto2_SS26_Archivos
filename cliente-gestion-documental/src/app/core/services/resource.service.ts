import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActiveWorkspaceContext,
  BreadcrumbItem,
  CreateFileRequest,
  CreateFolderRequest,
  FileComment,
  FileDownloadResponse,
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

  // Estado reactivo centralizado para "Papelera"
  readonly trashFolders = signal<FolderItem[]>([]);
  readonly trashFiles = signal<FileItem[]>([]);
  readonly trashCurrentFolder = signal<FolderItem | null>(null);
  readonly trashBreadcrumbs = signal<BreadcrumbItem[]>([]);
  readonly isTrashLoading = signal<boolean>(false);
  readonly trashError = signal<string | null>(null);

  // Estado reactivo para el visor/editor de documentos (Workspace tipo Google Docs)
  readonly activeWorkspace = signal<ActiveWorkspaceContext | null>(null);

  /**
   * Abre un archivo en la vista de espacio de trabajo (lectura, edición, comentarios y permisos)
   */
  openFileInWorkspace(file: FileItem, origin: 'my-files' | 'shared'): void {
    this.activeWorkspace.set({ file: { ...file }, origin });
  }

  /**
   * Cierra el espacio de trabajo activo y regresa al listado de origen
   */
  closeFileWorkspace(): void {
    this.activeWorkspace.set(null);
  }

  /**
   * Obtiene el detalle completo de un archivo (contenido, comentarios y usuarios con acceso)
   */
  getFileDetails(fileId: string): Observable<{ status: string; data: FileItem }> {
    return this.http.get<{ status: string; data: FileItem }>(`${this.apiUrl}/files/${fileId}`).pipe(
      tap((res) => {
        if (res.status === 'success' && res.data) {
          this.updateFileInMemory(res.data);
        }
      }),
    );
  }

  /**
   * Guarda cambios realizados al archivo (nombre, contenido y/o etiquetas)
   */
  saveFileChanges(
    fileId: string,
    data: { name?: string; content?: string; tags?: string[] },
  ): Observable<{ status: string; mensaje: string; data: FileItem }> {
    return this.http
      .put<{ status: string; mensaje: string; data: FileItem }>(
        `${this.apiUrl}/files/${fileId}`,
        data,
      )
      .pipe(
        tap((res) => {
          if (res.status === 'success' && res.data) {
            this.updateFileInMemory(res.data);
          }
        }),
      );
  }

  /**
   * Agrega un nuevo comentario al archivo
   */
  addFileComment(
    fileId: string,
    content: string,
  ): Observable<{ status: string; mensaje: string; data: FileComment }> {
    return this.http.post<{ status: string; mensaje: string; data: FileComment }>(
      `${this.apiUrl}/files/${fileId}/comments`,
      { content },
    );
  }

  /**
   * Elimina un comentario de un archivo
   */
  deleteFileComment(
    fileId: string,
    commentId: string,
  ): Observable<{ status: string; mensaje: string }> {
    return this.http.delete<{ status: string; mensaje: string }>(
      `${this.apiUrl}/files/${fileId}/comments/${commentId}`,
    );
  }

  /**
   * Comparte un recurso (archivo o carpeta) con un usuario mediante su correo electrónico
   */
  shareResource(
    resourceId: string,
    data: { email: string; permission: string },
  ): Observable<{ status: string; mensaje: string; data: any }> {
    return this.http.post<{ status: string; mensaje: string; data: any }>(
      `${this.apiUrl}/${resourceId}/share`,
      data,
    );
  }

  /**
   * Revoca el acceso a un colaborador en un archivo o carpeta
   */
  removeSharedUser(
    resourceId: string,
    userId: string,
  ): Observable<{ status: string; mensaje: string; data: any }> {
    return this.http.delete<{ status: string; mensaje: string; data: any }>(
      `${this.apiUrl}/${resourceId}/share/${userId}`,
    );
  }

  /**
   * Obtiene el contenido textual (.txt o .md) del archivo desde el servidor sin disparar descarga del navegador
   */
  fetchFileContent(fileId: string): Observable<FileDownloadResponse> {
    return this.http.get<FileDownloadResponse>(`${this.apiUrl}/files/${fileId}/download`);
  }

  /**
   * Actualiza en memoria los cambios realizados al documento en el espacio de trabajo
   */
  updateFileInMemory(updatedFile: FileItem): void {
    const currentWs = this.activeWorkspace();
    if (currentWs && currentWs.file._id === updatedFile._id) {
      this.activeWorkspace.set({
        ...currentWs,
        file: { ...currentWs.file, ...updatedFile },
      });
    }

    this.files.update((list) =>
      list.map((item) => (item._id === updatedFile._id ? { ...item, ...updatedFile } : item)),
    );

    this.sharedFiles.update((list) =>
      list.map((item) => (item._id === updatedFile._id ? { ...item, ...updatedFile } : item)),
    );
  }

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
   * Carga los archivos y carpetas en la papelera (isTrash: true) del usuario autenticado
   * @param folderId ID opcional de la carpeta en papelera a explorar
   */
  loadPapelera(folderId?: string | null): Observable<MisArchivosResponse> {
    this.isTrashLoading.set(true);
    this.trashError.set(null);

    let params = new HttpParams();
    if (folderId) {
      params = params.set('folderId', folderId);
    }

    return this.http.get<MisArchivosResponse>(`${this.apiUrl}/papelera`, { params }).pipe(
      tap((res) => {
        if (res.status === 'success' && res.data) {
          this.trashCurrentFolder.set(res.data.currentFolder);
          this.trashBreadcrumbs.set(res.data.breadcrumbs || []);
          this.trashFolders.set(res.data.folders || []);
          this.trashFiles.set(res.data.files || []);
        }
        this.isTrashLoading.set(false);
      }),
      catchError((err) => {
        const errorMsg =
          err?.error?.mensaje || 'Error al cargar los recursos de la papelera desde el servidor';
        this.trashError.set(errorMsg);
        this.isTrashLoading.set(false);
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

  /**
   * Descarga un archivo activo (no en papelera) con su respectiva extensión y contenido
   * @param file Archivo a descargar
   */
  downloadFile(file: FileItem): Observable<FileDownloadResponse> {
    if (file.isTrash) {
      return throwError(
        () => new Error('No es posible descargar un archivo que se encuentra en la papelera'),
      );
    }

    return this.http.get<FileDownloadResponse>(`${this.apiUrl}/files/${file._id}/download`).pipe(
      tap((res) => {
        if (res.status === 'success' && res.data) {
          const { fileName, content, mimeType } = res.data;
          const blob = new Blob([content ?? ''], {
            type: mimeType || 'text/plain; charset=utf-8',
          });
          const url = window.URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = fileName;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          window.URL.revokeObjectURL(url);
        }
      }),
    );
  }

  /**
   * Mueve un recurso (archivo o carpeta) a la papelera (moveToTrash: true) o lo restaura (moveToTrash: false)
   * @param resourceId ID del archivo o carpeta
   * @param moveToTrash true para enviar a papelera, false para restaurar
   */
  toggleTrash(resourceId: string, moveToTrash: boolean): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${resourceId}/trash`, { moveToTrash }).pipe(
      tap(() => {
        if (moveToTrash) {
          const currentId = this.currentFolder()?._id || null;
          this.loadMisArchivos(currentId).subscribe();
        } else {
          const currentTrashId = this.trashCurrentFolder()?._id || null;
          this.loadPapelera(currentTrashId).subscribe();
        }
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }

  /**
   * Elimina físicamente (de forma permanente) un archivo o carpeta que se encuentre en la papelera
   * @param resourceId ID del archivo o carpeta en la papelera
   */
  deleteResourcePermanently(resourceId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${resourceId}`).pipe(
      tap(() => {
        const currentTrashId = this.trashCurrentFolder()?._id || null;
        this.loadPapelera(currentTrashId).subscribe();
      }),
      catchError((err) => {
        return throwError(() => err);
      }),
    );
  }
}

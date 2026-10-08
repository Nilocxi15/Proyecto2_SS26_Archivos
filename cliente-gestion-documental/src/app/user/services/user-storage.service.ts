import { Injectable, inject, signal } from '@angular/core';
import { FileItem, FolderItem } from '../../core/models/resource.models';
import { AuthService } from '../../core/services/auth.service';

/**
 * Servicio reactivo para gestionar el estado de archivos y carpetas en frontend
 */
@Injectable({
  providedIn: 'root'
})
export class UserStorageService {
  private readonly authService = inject(AuthService);

  // Listas reactivas en memoria
  readonly folders = signal<FolderItem[]>([]);
  readonly files = signal<FileItem[]>([]);

  /**
   * Crea una nueva carpeta en la ubicación especificada
   */
  createFolder(name: string, parentFolderId: string | null, currentPath: string): FolderItem {
    const user = this.authService.currentUser();
    const newPath = parentFolderId ? `${currentPath}/${name.trim()}` : `/${name.trim()}`;

    const newFolder: FolderItem = {
      id: 'c_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: name.trim(),
      ownerId: user?._id || 'user_local',
      parentFolderId,
      path: newPath,
      itemCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.folders.update((prev) => [...prev, newFolder]);

    // Incrementar el contador de la carpeta contenedora si existe
    if (parentFolderId) {
      this.updateFolderItemCount(parentFolderId, 1);
    }

    return newFolder;
  }

  /**
   * Sube un archivo digital en memoria
   */
  uploadFile(
    name: string,
    extension: '.txt' | '.md',
    size: number,
    content: string,
    folderId: string | null,
    currentPath: string
  ): FileItem {
    const user = this.authService.currentUser();
    const newPath = folderId ? `${currentPath}/${name}` : `/${name}`;

    const newFile: FileItem = {
      id: 'a_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name,
      extension,
      size,
      ownerId: user?._id || 'user_local',
      ownerName: user?.nombre || 'Usuario',
      folderId,
      path: newPath,
      content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.files.update((prev) => [...prev, newFile]);

    if (folderId) {
      this.updateFolderItemCount(folderId, 1);
    }

    return newFile;
  }

  /**
   * Actualiza el contador de elementos de una carpeta
   */
  private updateFolderItemCount(folderId: string, delta: number): void {
    this.folders.update((items) =>
      items.map((item) =>
        item.id === folderId ? { ...item, itemCount: Math.max(0, item.itemCount + delta) } : item
      )
    );
  }
}

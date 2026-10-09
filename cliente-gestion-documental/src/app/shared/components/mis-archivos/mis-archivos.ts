import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileItem, FolderItem } from '../../../core/models/resource.models';
import { UserStorageService } from '../../../user/services/user-storage.service';

@Component({
  selector: 'app-mis-archivos',
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-archivos.html',
  styleUrl: './mis-archivos.css'
})
export class MisArchivos {
  private readonly storageService = inject(UserStorageService);

  // Filtros, búsqueda y modo de vista
  readonly searchTerm = signal<string>('');
  readonly typeFilter = signal<'all' | 'folders' | 'txt' | 'md'>('all');
  readonly sortBy = signal<'name' | 'date' | 'size'>('name');
  readonly viewMode = signal<'grid' | 'table'>('grid');

  // Navegación jerárquica de carpetas
  readonly currentFolder = signal<FolderItem | null>(null);

  // Estado del modal de nueva carpeta
  readonly isNewFolderModalVisible = signal<boolean>(false);
  readonly newFolderName = signal<string>('');
  readonly newFolderError = signal<string | null>(null);

  // Estado del modal de subida de archivo
  readonly isUploadFileModalVisible = signal<boolean>(false);
  readonly selectedUploadFile = signal<File | null>(null);
  readonly uploadFileError = signal<string | null>(null);

  // Estado del modal de detalles técnicos
  readonly selectedFolderDetail = signal<FolderItem | null>(null);
  readonly selectedFileDetail = signal<FileItem | null>(null);
  readonly isDetailModalVisible = signal<boolean>(false);

  // Notificación de éxito
  readonly successNotification = signal<string | null>(null);

  // Ruta textual actual para breadcrumbs
  readonly currentPathText = computed(() => {
    return this.currentFolder() ? this.currentFolder()!.path : '';
  });

  // Carpetas filtradas y ordenadas reactivamente
  readonly filteredFolders = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const filter = this.typeFilter();

    if (filter === 'txt' || filter === 'md') {
      return [];
    }

    const currentFolderId = this.currentFolder()?.id || null;

    let items = this.storageService.folders().filter(
      (folder) => folder.parentFolderId === currentFolderId && folder.name.toLowerCase().includes(text)
    );

    if (this.sortBy() === 'name') {
      items = items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return items;
  });

  // Archivos filtrados y ordenados reactivamente
  readonly filteredFiles = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const filter = this.typeFilter();

    if (filter === 'folders') {
      return [];
    }

    const currentFolderId = this.currentFolder()?.id || null;

    let items = this.storageService.files().filter((file) => {
      const isSameLocation = file.folderId === currentFolderId;
      const matchesSearch = file.name.toLowerCase().includes(text);

      if (filter === 'txt') return isSameLocation && matchesSearch && file.extension === '.txt';
      if (filter === 'md') return isSameLocation && matchesSearch && file.extension === '.md';
      return isSameLocation && matchesSearch;
    });

    if (this.sortBy() === 'name') {
      items = items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } else if (this.sortBy() === 'size') {
      items = items.sort((a, b) => b.size - a.size);
    }

    return items;
  });

  // Navegación entre carpetas
  openFolder(folder: FolderItem): void {
    this.currentFolder.set(folder);
  }

  goToRoot(): void {
    this.currentFolder.set(null);
  }

  // CREAR NUEVA CARPETA
  openNewFolderModal(): void {
    this.newFolderName.set('');
    this.newFolderError.set(null);
    this.isNewFolderModalVisible.set(true);
  }

  closeNewFolderModal(): void {
    this.isNewFolderModalVisible.set(false);
    this.newFolderError.set(null);
  }

  confirmCreateFolder(): void {
    const folderName = this.newFolderName().trim();
    if (!folderName) {
      this.newFolderError.set('El nombre de la carpeta no puede estar vacío');
      return;
    }

    const parentFolderId = this.currentFolder()?.id || null;
    const currentPath = this.currentFolder() ? this.currentFolder()!.path : '';

    this.storageService.createFolder(folderName, parentFolderId, currentPath);
    this.closeNewFolderModal();
    this.showNotification(`Carpeta "${folderName}" creada exitosamente`);
  }

  // SUBIR ARCHIVO (.TXT Y .MD EXCLUSIVAMENTE)
  openUploadFileModal(): void {
    this.selectedUploadFile.set(null);
    this.uploadFileError.set(null);
    this.isUploadFileModalVisible.set(true);
  }

  closeUploadFileModal(): void {
    this.isUploadFileModalVisible.set(false);
    this.selectedUploadFile.set(null);
    this.uploadFileError.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    const fileName = file.name.toLowerCase();

    // Restricción estricta de extensiones: únicamente .txt y .md permitidos
    const isTxt = fileName.endsWith('.txt');
    const isMd = fileName.endsWith('.md');

    if (!isTxt && !isMd) {
      this.uploadFileError.set('Formato no permitido. Únicamente se admiten archivos .txt y .md');
      this.selectedUploadFile.set(null);
      input.value = ''; // Resetear el selector para impedir el archivo inválido
      return;
    }

    this.uploadFileError.set(null);
    this.selectedUploadFile.set(file);
  }

  confirmUploadFile(): void {
    const file = this.selectedUploadFile();
    if (!file) {
      this.uploadFileError.set('Debes seleccionar un archivo .txt o .md');
      return;
    }

    const extension: '.txt' | '.md' = file.name.toLowerCase().endsWith('.md') ? '.md' : '.txt';
    const folderId = this.currentFolder()?.id || null;
    const currentPath = this.currentFolder() ? this.currentFolder()!.path : '';

    // Lectura del archivo como texto
    const reader = new FileReader();
    reader.onload = () => {
      const content = (reader.result as string) || '';
      this.storageService.uploadFile(
        file.name,
        extension,
        file.size,
        content,
        folderId,
        currentPath
      );
      this.closeUploadFileModal();
      this.showNotification(`Archivo "${file.name}" cargado exitosamente`);
    };
    reader.readAsText(file);
  }

  // MODAL DE DETALLES
  openFolderDetails(folder: FolderItem): void {
    this.selectedFolderDetail.set(folder);
    this.selectedFileDetail.set(null);
    this.isDetailModalVisible.set(true);
  }

  openFileDetails(file: FileItem): void {
    this.selectedFileDetail.set(file);
    this.selectedFolderDetail.set(null);
    this.isDetailModalVisible.set(true);
  }

  closeDetailsModal(): void {
    this.isDetailModalVisible.set(false);
    this.selectedFolderDetail.set(null);
    this.selectedFileDetail.set(null);
  }

  // Notificación temporal
  private showNotification(message: string): void {
    this.successNotification.set(message);
    setTimeout(() => {
      this.successNotification.set(null);
    }, 3500);
  }

  // Utilidades de formato
  formatFileSize(bytes?: number): string {
    if (bytes === undefined || bytes === null) return '-';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  formatDate(isoString?: string): string {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

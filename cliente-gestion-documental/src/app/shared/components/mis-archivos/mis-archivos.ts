import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbItem, FileItem, FolderItem } from '../../../core/models/resource.models';
import { ResourceService } from '../../../core/services/resource.service';

@Component({
  selector: 'app-mis-archivos',
  imports: [CommonModule, FormsModule],
  templateUrl: './mis-archivos.html',
  styleUrl: './mis-archivos.css',
})
export class MisArchivos implements OnInit {
  readonly resourceService = inject(ResourceService);

  // Filtros, búsqueda y modo de vista
  readonly searchTerm = signal<string>('');
  readonly typeFilter = signal<'all' | 'folders' | 'txt' | 'md'>('all');
  readonly sortBy = signal<'name' | 'date' | 'size'>('name');
  readonly viewMode = signal<'grid' | 'table'>('grid');

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

  // Estado del modal de confirmación para mover a la papelera
  readonly isTrashModalVisible = signal<boolean>(false);
  readonly resourceToTrash = signal<{
    id: string;
    name: string;
    type: 'folder' | 'file';
  } | null>(null);

  // Notificación de éxito
  readonly successNotification = signal<string | null>(null);

  // Exposición de señales del servicio
  readonly isLoading = this.resourceService.isLoading;
  readonly currentFolder = this.resourceService.currentFolder;
  readonly breadcrumbs = this.resourceService.breadcrumbs;
  readonly serviceError = this.resourceService.error;

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

    let items = this.resourceService
      .folders()
      .filter((folder) => folder.name.toLowerCase().includes(text));

    if (this.sortBy() === 'name') {
      items = items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = items.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
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

    let items = this.resourceService.files().filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(text);
      const ext = file.extension.replace('.', '').toLowerCase();

      if (filter === 'txt') return matchesSearch && ext === 'txt';
      if (filter === 'md') return matchesSearch && ext === 'md';
      return matchesSearch;
    });

    if (this.sortBy() === 'name') {
      items = items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = items.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } else if (this.sortBy() === 'size') {
      items = items.sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    }

    return items;
  });

  ngOnInit(): void {
    // Carga inicial en la raíz de Mis Archivos
    this.resourceService.loadMisArchivos().subscribe();
  }

  // Navegación entre carpetas
  openFolder(folder: FolderItem): void {
    this.resourceService.loadMisArchivos(folder._id).subscribe();
  }

  goToRoot(): void {
    this.resourceService.loadMisArchivos(null).subscribe();
  }

  goToBreadcrumb(crumb: BreadcrumbItem): void {
    this.resourceService.loadMisArchivos(crumb._id).subscribe();
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

    const parentId = this.currentFolder()?._id || null;

    this.resourceService.createFolder({ name: folderName, parentId }).subscribe({
      next: () => {
        this.closeNewFolderModal();
        this.showNotification(`Carpeta "${folderName}" creada exitosamente`);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'Error al crear la carpeta en el servidor';
        this.newFolderError.set(msg);
      },
    });
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

    const extension = file.name.toLowerCase().endsWith('.md') ? 'md' : 'txt';
    const folderId = this.currentFolder()?._id || null;

    // Lectura del archivo como texto
    const reader = new FileReader();
    reader.onload = () => {
      const content = (reader.result as string) || '';

      this.resourceService
        .uploadFile({
          name: file.name,
          extension,
          content,
          folderId,
        })
        .subscribe({
          next: () => {
            this.closeUploadFileModal();
            this.showNotification(`Archivo "${file.name}" cargado exitosamente`);
          },
          error: (err) => {
            const msg = err?.error?.mensaje || 'Error al subir el archivo al servidor';
            this.uploadFileError.set(msg);
          },
        });
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

  // DESCARGAR ARCHIVO (solo archivos que no estén en la papelera)
  downloadFile(file: FileItem): void {
    if (file.isTrash) {
      this.resourceService.error.set(
        'No es posible descargar un archivo que se encuentra en la papelera',
      );
      return;
    }

    this.resourceService.downloadFile(file).subscribe({
      next: (res) => {
        const downloadedName = res.data?.fileName || file.name;
        this.showNotification(`Archivo "${downloadedName}" descargado exitosamente`);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'Error al descargar el archivo desde el servidor';
        this.resourceService.error.set(msg);
      },
    });
  }

  // MOVER A LA PAPELERA (BORRADO LÓGICO)
  openTrashModal(resource: FolderItem | FileItem, type: 'folder' | 'file'): void {
    this.resourceToTrash.set({
      id: resource._id,
      name: resource.name,
      type,
    });
    this.isTrashModalVisible.set(true);
  }

  closeTrashModal(): void {
    this.isTrashModalVisible.set(false);
    this.resourceToTrash.set(null);
  }

  confirmMoveToTrash(): void {
    const target = this.resourceToTrash();
    if (!target) return;

    this.resourceService.toggleTrash(target.id, true).subscribe({
      next: () => {
        const label = target.type === 'folder' ? 'Carpeta' : 'Archivo';
        this.closeTrashModal();
        this.closeDetailsModal();
        this.showNotification(`${label} "${target.name}" movido a la papelera`);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'Error al mover el recurso a la papelera';
        this.resourceService.error.set(msg);
        this.closeTrashModal();
      },
    });
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
      minute: '2-digit',
    });
  }

  normalizeExtension(ext?: string): string {
    if (!ext) return '';
    return ext.startsWith('.') ? ext : `.${ext}`;
  }
}

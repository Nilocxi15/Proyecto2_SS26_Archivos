import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbItem, FileItem, FolderItem } from '../../../core/models/resource.models';
import { ResourceService } from '../../../core/services/resource.service';

@Component({
  selector: 'app-compartido-conmigo',
  imports: [CommonModule, FormsModule],
  templateUrl: './compartido-conmigo.html',
  styleUrl: './compartido-conmigo.css',
})
export class CompartidoConmigo implements OnInit {
  readonly resourceService = inject(ResourceService);

  // Filtros, búsqueda y modo de vista
  readonly searchTerm = signal<string>('');
  readonly typeFilter = signal<'all' | 'folders' | 'txt' | 'md'>('all');
  readonly sortBy = signal<'name' | 'date' | 'size'>('name');
  readonly viewMode = signal<'grid' | 'table'>('grid');

  // Estado del modal de detalles técnicos
  readonly selectedFolderDetail = signal<FolderItem | null>(null);
  readonly selectedFileDetail = signal<FileItem | null>(null);
  readonly isDetailModalVisible = signal<boolean>(false);

  // Notificación de éxito
  readonly successNotification = signal<string | null>(null);

  // Exposición de señales del servicio para Compartido conmigo
  readonly isLoading = this.resourceService.isSharedLoading;
  readonly currentFolder = this.resourceService.sharedCurrentFolder;
  readonly breadcrumbs = this.resourceService.sharedBreadcrumbs;
  readonly serviceError = this.resourceService.sharedError;

  // Ruta textual actual para breadcrumbs
  readonly currentPathText = computed(() => {
    return this.currentFolder() ? this.currentFolder()!.path : '';
  });

  // Carpetas compartidas filtradas y ordenadas reactivamente
  readonly filteredFolders = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const filter = this.typeFilter();

    if (filter === 'txt' || filter === 'md') {
      return [];
    }

    let items = this.resourceService
      .sharedFolders()
      .filter(
        (folder) =>
          folder.name.toLowerCase().includes(text) ||
          (folder.ownerName && folder.ownerName.toLowerCase().includes(text)),
      );

    if (this.sortBy() === 'name') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = [...items].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return items;
  });

  // Archivos compartidos filtrados y ordenados reactivamente
  readonly filteredFiles = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const filter = this.typeFilter();

    if (filter === 'folders') {
      return [];
    }

    let items = this.resourceService.sharedFiles().filter((file) => {
      const matchesSearch =
        file.name.toLowerCase().includes(text) ||
        (file.ownerName && file.ownerName.toLowerCase().includes(text));
      const ext = file.extension.replace('.', '').toLowerCase();

      if (filter === 'txt') return matchesSearch && ext === 'txt';
      if (filter === 'md') return matchesSearch && ext === 'md';
      return matchesSearch;
    });

    if (this.sortBy() === 'name') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = [...items].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    } else if (this.sortBy() === 'size') {
      items = [...items].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    }

    return items;
  });

  ngOnInit(): void {
    this.resourceService.loadCompartidoConmigo().subscribe();
  }

  // Navegación entre carpetas compartidas
  openFolder(folder: FolderItem): void {
    this.resourceService.loadCompartidoConmigo(folder._id).subscribe();
  }

  goToRoot(): void {
    this.resourceService.loadCompartidoConmigo(null).subscribe();
  }

  goToBreadcrumb(crumb: BreadcrumbItem): void {
    this.resourceService.loadCompartidoConmigo(crumb._id).subscribe();
  }

  refreshView(): void {
    const currentId = this.currentFolder()?._id || null;
    this.resourceService.loadCompartidoConmigo(currentId).subscribe();
  }

  // ABRIR ARCHIVO COMPARTIDO EN EL ESPACIO DE TRABAJO (SEGÚN PERMISOS)
  openFileWorkspace(file: FileItem): void {
    this.closeDetailsModal();
    this.resourceService.openFileInWorkspace(file, 'shared');
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

  // DESCARGAR ARCHIVO COMPARTIDO (solo archivos que no estén en la papelera)
  downloadFile(file: FileItem): void {
    if (file.isTrash) {
      this.resourceService.sharedError.set(
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
        this.resourceService.sharedError.set(msg);
      },
    });
  }

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

  formatPermissionLabel(permission?: string): string {
    if (permission === 'edicion') return 'Edición';
    if (permission === 'comentar') return 'Comentarios';
    return 'Lectura';
  }
}

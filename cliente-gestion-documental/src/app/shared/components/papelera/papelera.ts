import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbItem, FileItem, FolderItem } from '../../../core/models/resource.models';
import { ResourceService } from '../../../core/services/resource.service';

@Component({
  selector: 'app-papelera',
  imports: [CommonModule, FormsModule],
  templateUrl: './papelera.html',
  styleUrl: './papelera.css',
})
export class Papelera implements OnInit {
  readonly resourceService = inject(ResourceService);

  // Filtros, búsqueda y modo de vista
  readonly searchTerm = signal<string>('');
  readonly typeFilter = signal<'all' | 'folders' | 'txt' | 'md'>('all');
  readonly sortBy = signal<'name' | 'date' | 'size'>('date');
  readonly viewMode = signal<'grid' | 'table'>('grid');

  // Estado del modal de detalles técnicos
  readonly selectedFolderDetail = signal<FolderItem | null>(null);
  readonly selectedFileDetail = signal<FileItem | null>(null);
  readonly isDetailModalVisible = signal<boolean>(false);

  // Notificación de éxito
  readonly successNotification = signal<string | null>(null);

  // Exposición de señales del servicio para Papelera
  readonly isLoading = this.resourceService.isTrashLoading;
  readonly currentFolder = this.resourceService.trashCurrentFolder;
  readonly breadcrumbs = this.resourceService.trashBreadcrumbs;
  readonly serviceError = this.resourceService.trashError;

  // Ruta textual actual para breadcrumbs
  readonly currentPathText = computed(() => {
    return this.currentFolder() ? this.currentFolder()!.path : '';
  });

  // Carpetas en papelera filtradas y ordenadas reactivamente
  readonly filteredFolders = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const filter = this.typeFilter();

    if (filter === 'txt' || filter === 'md') {
      return [];
    }

    let items = this.resourceService
      .trashFolders()
      .filter((folder) => folder.name.toLowerCase().includes(text));

    if (this.sortBy() === 'name') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = [...items].sort(
        (a, b) =>
          new Date(b.trashedAt || b.updatedAt).getTime() -
          new Date(a.trashedAt || a.updatedAt).getTime(),
      );
    }

    return items;
  });

  // Archivos en papelera filtrados y ordenados reactivamente
  readonly filteredFiles = computed(() => {
    const text = this.searchTerm().toLowerCase().trim();
    const filter = this.typeFilter();

    if (filter === 'folders') {
      return [];
    }

    let items = this.resourceService.trashFiles().filter((file) => {
      const matchesSearch = file.name.toLowerCase().includes(text);
      const ext = file.extension.replace('.', '').toLowerCase();

      if (filter === 'txt') return matchesSearch && ext === 'txt';
      if (filter === 'md') return matchesSearch && ext === 'md';
      return matchesSearch;
    });

    if (this.sortBy() === 'name') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.sortBy() === 'date') {
      items = [...items].sort(
        (a, b) =>
          new Date(b.trashedAt || b.updatedAt).getTime() -
          new Date(a.trashedAt || a.updatedAt).getTime(),
      );
    } else if (this.sortBy() === 'size') {
      items = [...items].sort((a, b) => (b.sizeBytes || 0) - (a.sizeBytes || 0));
    }

    return items;
  });

  ngOnInit(): void {
    this.resourceService.loadPapelera().subscribe();
  }

  // Navegación entre carpetas en la papelera
  openFolder(folder: FolderItem): void {
    this.resourceService.loadPapelera(folder._id).subscribe();
  }

  goToRoot(): void {
    this.resourceService.loadPapelera(null).subscribe();
  }

  goToBreadcrumb(crumb: BreadcrumbItem): void {
    this.resourceService.loadPapelera(crumb._id).subscribe();
  }

  refreshView(): void {
    const currentId = this.currentFolder()?._id || null;
    this.resourceService.loadPapelera(currentId).subscribe();
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

  // RESTAURAR RECURSO DESDE LA PAPELERA
  restoreResource(resource: FolderItem | FileItem, type: 'folder' | 'file'): void {
    this.resourceService.toggleTrash(resource._id, false).subscribe({
      next: () => {
        const label = type === 'folder' ? 'Carpeta' : 'Archivo';
        const gender = type === 'folder' ? 'restaurada' : 'restaurado';
        this.closeDetailsModal();
        this.showNotification(`${label} "${resource.name}" ${gender} exitosamente`);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'Error al restaurar el recurso desde la papelera';
        this.resourceService.trashError.set(msg);
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

  formatDate(isoString?: string | null): string {
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

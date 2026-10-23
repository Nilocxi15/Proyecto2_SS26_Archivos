import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../../../core/services/report';
import {
  SharingReportView,
  MostSharedFileReportItem,
  UserResourceSharedItem,
  UserResourceReceivedItem,
  UserSelectOption,
} from './sharing-reports.models';

@Component({
  selector: 'app-sharing-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './sharing-reports.html',
  styleUrl: './sharing-reports.css',
})
export class SharingReports implements OnInit {
  private readonly reportService = inject(ReportService);

  // Pestaña activa dentro del apartado de reportes de compartición
  readonly activeSubReport = signal<SharingReportView>('most-shared-files');

  // Estado reactivo vinculado al servicio para archivos más compartidos
  readonly mostSharedFiles = this.reportService.mostSharedFiles;
  readonly isLoadingMostSharedFiles = this.reportService.isLoadingMostSharedFiles;
  readonly lastUpdatedMostSharedFilesAt = this.reportService.lastUpdatedMostSharedFilesAt;

  // Selector de usuario para los subreportes 2 y 3 (vinculado a la lista ligera de usuarios activos)
  readonly selectedUserId = signal<string>('');
  readonly availableUsers = this.reportService.usersForSelect;
  readonly isLoadingUsersForSelect = this.reportService.isLoadingUsersForSelect;

  // Estado reactivo vinculado al servicio para recursos compartidos por usuario
  readonly resourcesSharedByUser = this.reportService.resourcesSharedByUser;
  readonly isLoadingSharedByUser = this.reportService.isLoadingSharedByUser;
  readonly lastUpdatedSharedByUserAt = this.reportService.lastUpdatedSharedByUserAt;

  // Colección reactiva para reporte 3 (recursos recibidos por usuario)
  readonly resourcesReceivedByUser = this.reportService.resourcesReceivedByUser;
  readonly isLoadingReceivedByUser = this.reportService.isLoadingReceivedByUser;
  readonly lastUpdatedReceivedByUserAt = this.reportService.lastUpdatedReceivedByUserAt;

  // KPIs computados para recursos recibidos por el usuario seleccionado
  readonly receivedByUserFilesCount = computed(
    () => this.resourcesReceivedByUser().filter((r) => r.resourceType === 'file').length,
  );

  readonly receivedByUserFoldersCount = computed(
    () => this.resourcesReceivedByUser().filter((r) => r.resourceType === 'folder').length,
  );

  // KPIs computados para recursos compartidos por el usuario seleccionado
  readonly sharedByUserFilesCount = computed(
    () => this.resourcesSharedByUser().filter((r) => r.resourceType === 'file').length,
  );

  readonly sharedByUserFoldersCount = computed(
    () => this.resourcesSharedByUser().filter((r) => r.resourceType === 'folder').length,
  );

  // --- REPORTE 1: Archivos más compartidos ---
  readonly mostSharedSearchTerm = signal<string>('');
  readonly mostSharedCurrentPage = signal<number>(1);
  readonly mostSharedPageSize = signal<number>(5);

  readonly filteredMostSharedFiles = computed(() => {
    const term = this.mostSharedSearchTerm().toLowerCase().trim();
    const list = this.mostSharedFiles();
    if (!term) return list;
    return list.filter(
      (item) =>
        (item.fileName || '').toLowerCase().includes(term) ||
        (item.ownerName || '').toLowerCase().includes(term) ||
        (item.extension || '').toLowerCase().includes(term),
    );
  });

  readonly totalMostSharedPages = computed(() => {
    const count = this.filteredMostSharedFiles().length;
    const size = this.mostSharedPageSize();
    return Math.ceil(count / size) || 1;
  });

  readonly paginatedMostSharedFiles = computed(() => {
    const total = this.totalMostSharedPages();
    const page = Math.min(Math.max(1, this.mostSharedCurrentPage()), total);
    const size = this.mostSharedPageSize();
    const start = (page - 1) * size;
    return this.filteredMostSharedFiles().slice(start, start + size);
  });

  readonly mostSharedStartIndex = computed(() => {
    if (this.filteredMostSharedFiles().length === 0) return 0;
    return (this.mostSharedCurrentPage() - 1) * this.mostSharedPageSize() + 1;
  });

  readonly mostSharedEndIndex = computed(() => {
    return Math.min(
      this.mostSharedCurrentPage() * this.mostSharedPageSize(),
      this.filteredMostSharedFiles().length,
    );
  });

  readonly visibleMostSharedPagesArray = computed(() => {
    const total = this.totalMostSharedPages();
    const current = this.mostSharedCurrentPage();
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  });

  // --- REPORTE 2: Recursos compartidos por un usuario seleccionado ---
  readonly sharedByUserSearchTerm = signal<string>('');
  readonly sharedByUserCurrentPage = signal<number>(1);
  readonly sharedByUserPageSize = signal<number>(5);

  readonly filteredResourcesSharedByUser = computed(() => {
    const term = this.sharedByUserSearchTerm().toLowerCase().trim();
    const list = this.resourcesSharedByUser();
    if (!term) return list;
    return list.filter(
      (item) =>
        (item.resourceName || '').toLowerCase().includes(term) ||
        (item.folderPath || '').toLowerCase().includes(term) ||
        (item.resourceType || '').toLowerCase().includes(term),
    );
  });

  readonly totalSharedByUserPages = computed(() => {
    const count = this.filteredResourcesSharedByUser().length;
    const size = this.sharedByUserPageSize();
    return Math.ceil(count / size) || 1;
  });

  readonly paginatedResourcesSharedByUser = computed(() => {
    const total = this.totalSharedByUserPages();
    const page = Math.min(Math.max(1, this.sharedByUserCurrentPage()), total);
    const size = this.sharedByUserPageSize();
    const start = (page - 1) * size;
    return this.filteredResourcesSharedByUser().slice(start, start + size);
  });

  readonly sharedByUserStartIndex = computed(() => {
    if (this.filteredResourcesSharedByUser().length === 0) return 0;
    return (this.sharedByUserCurrentPage() - 1) * this.sharedByUserPageSize() + 1;
  });

  readonly sharedByUserEndIndex = computed(() => {
    return Math.min(
      this.sharedByUserCurrentPage() * this.sharedByUserPageSize(),
      this.filteredResourcesSharedByUser().length,
    );
  });

  readonly visibleSharedByUserPagesArray = computed(() => {
    const total = this.totalSharedByUserPages();
    const current = this.sharedByUserCurrentPage();
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  });

  // --- REPORTE 3: Recursos recibidos por un usuario seleccionado ---
  readonly receivedByUserSearchTerm = signal<string>('');
  readonly receivedByUserCurrentPage = signal<number>(1);
  readonly receivedByUserPageSize = signal<number>(5);

  readonly filteredResourcesReceivedByUser = computed(() => {
    const term = this.receivedByUserSearchTerm().toLowerCase().trim();
    const list = this.resourcesReceivedByUser();
    if (!term) return list;
    return list.filter(
      (item) =>
        (item.resourceName || '').toLowerCase().includes(term) ||
        (item.ownerName || '').toLowerCase().includes(term) ||
        (item.folderPath || '').toLowerCase().includes(term),
    );
  });

  readonly totalReceivedByUserPages = computed(() => {
    const count = this.filteredResourcesReceivedByUser().length;
    const size = this.receivedByUserPageSize();
    return Math.ceil(count / size) || 1;
  });

  readonly paginatedResourcesReceivedByUser = computed(() => {
    const total = this.totalReceivedByUserPages();
    const page = Math.min(Math.max(1, this.receivedByUserCurrentPage()), total);
    const size = this.receivedByUserPageSize();
    const start = (page - 1) * size;
    return this.filteredResourcesReceivedByUser().slice(start, start + size);
  });

  readonly receivedByUserStartIndex = computed(() => {
    if (this.filteredResourcesReceivedByUser().length === 0) return 0;
    return (this.receivedByUserCurrentPage() - 1) * this.receivedByUserPageSize() + 1;
  });

  readonly receivedByUserEndIndex = computed(() => {
    return Math.min(
      this.receivedByUserCurrentPage() * this.receivedByUserPageSize(),
      this.filteredResourcesReceivedByUser().length,
    );
  });

  readonly visibleReceivedByUserPagesArray = computed(() => {
    const total = this.totalReceivedByUserPages();
    const current = this.receivedByUserCurrentPage();
    const pages: number[] = [];

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);

    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }

    for (let p = start; p <= end; p++) {
      pages.push(p);
    }
    return pages;
  });

  // Estados computados de carga y última consulta
  readonly currentIsLoading = computed(() => {
    if (this.activeSubReport() === 'most-shared-files') {
      return this.isLoadingMostSharedFiles();
    }
    if (this.activeSubReport() === 'shared-by-user') {
      return this.isLoadingSharedByUser();
    }
    if (this.activeSubReport() === 'received-by-user') {
      return this.isLoadingReceivedByUser();
    }
    return false;
  });

  readonly currentLastUpdatedAt = computed(() => {
    if (this.activeSubReport() === 'most-shared-files') {
      return this.lastUpdatedMostSharedFilesAt();
    }
    if (this.activeSubReport() === 'shared-by-user') {
      return this.lastUpdatedSharedByUserAt();
    }
    if (this.activeSubReport() === 'received-by-user') {
      return this.lastUpdatedReceivedByUserAt();
    }
    return null;
  });

  ngOnInit(): void {
    this.loadMostSharedFiles();
    this.loadUsersForSelect();
  }

  loadUsersForSelect(): void {
    this.reportService.getUsersForSelect().subscribe();
  }

  loadMostSharedFiles(): void {
    this.reportService.getMostSharedFiles().subscribe({
      next: () => {
        this.mostSharedCurrentPage.set(1);
      },
    });
  }

  loadResourcesSharedByUser(): void {
    const userId = this.selectedUserId();
    if (!userId) return;
    this.reportService.getResourcesSharedByUser(userId).subscribe({
      next: () => {
        this.sharedByUserCurrentPage.set(1);
      },
    });
  }

  loadResourcesReceivedByUser(): void {
    const userId = this.selectedUserId();
    if (!userId) return;
    this.reportService.getResourcesReceivedByUser(userId).subscribe({
      next: () => {
        this.receivedByUserCurrentPage.set(1);
      },
    });
  }

  switchSubReport(view: SharingReportView): void {
    this.activeSubReport.set(view);
    if (view === 'most-shared-files' && this.mostSharedFiles().length === 0) {
      this.loadMostSharedFiles();
    } else if (view === 'shared-by-user') {
      if (this.availableUsers().length === 0) {
        this.loadUsersForSelect();
      }
      if (this.selectedUserId() && this.resourcesSharedByUser().length === 0) {
        this.loadResourcesSharedByUser();
      }
    } else if (view === 'received-by-user') {
      if (this.availableUsers().length === 0) {
        this.loadUsersForSelect();
      }
      if (this.selectedUserId() && this.resourcesReceivedByUser().length === 0) {
        this.loadResourcesReceivedByUser();
      }
    }
  }

  refreshActiveReport(): void {
    if (this.activeSubReport() === 'most-shared-files') {
      this.loadMostSharedFiles();
    } else if (this.activeSubReport() === 'shared-by-user') {
      this.loadResourcesSharedByUser();
    } else if (this.activeSubReport() === 'received-by-user') {
      this.loadResourcesReceivedByUser();
    }
  }

  onUserSelect(userId: string): void {
    this.selectedUserId.set(userId);
    this.sharedByUserCurrentPage.set(1);
    this.receivedByUserCurrentPage.set(1);
    if (this.activeSubReport() === 'shared-by-user') {
      this.loadResourcesSharedByUser();
    } else if (this.activeSubReport() === 'received-by-user') {
      this.loadResourcesReceivedByUser();
    }
  }

  onMostSharedSearch(term: string): void {
    this.mostSharedSearchTerm.set(term);
    this.mostSharedCurrentPage.set(1);
  }

  setMostSharedPageSize(size: any): void {
    this.mostSharedPageSize.set(Number(size));
    this.mostSharedCurrentPage.set(1);
  }

  goToMostSharedPage(page: number): void {
    if (page >= 1 && page <= this.totalMostSharedPages()) {
      this.mostSharedCurrentPage.set(page);
    }
  }

  onSharedByUserSearch(term: string): void {
    this.sharedByUserSearchTerm.set(term);
    this.sharedByUserCurrentPage.set(1);
  }

  setSharedByUserPageSize(size: any): void {
    this.sharedByUserPageSize.set(Number(size));
    this.sharedByUserCurrentPage.set(1);
  }

  goToSharedByUserPage(page: number): void {
    if (page >= 1 && page <= this.totalSharedByUserPages()) {
      this.sharedByUserCurrentPage.set(page);
    }
  }

  onReceivedByUserSearch(term: string): void {
    this.receivedByUserSearchTerm.set(term);
    this.receivedByUserCurrentPage.set(1);
  }

  setReceivedByUserPageSize(size: any): void {
    this.receivedByUserPageSize.set(Number(size));
    this.receivedByUserCurrentPage.set(1);
  }

  goToReceivedByUserPage(page: number): void {
    if (page >= 1 && page <= this.totalReceivedByUserPages()) {
      this.receivedByUserCurrentPage.set(page);
    }
  }

  formatBytes(bytes?: number): string {
    if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  formatDate(dateStr?: string | null): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getFileIcon(extension?: string): string {
    const ext = (extension || '').toLowerCase().replace('.', '');
    switch (ext) {
      case 'txt':
        return 'bi-file-earmark-text-fill text-secondary';
      case 'md':
        return 'bi-filetype-md text-info';
      default:
        return 'bi-file-earmark-fill text-primary';
    }
  }

  getPermissionBadgeClass(permission?: string): string {
    switch (permission) {
      case 'edicion':
        return 'bg-warning-subtle text-warning-emphasis';
      case 'comentar':
        return 'bg-primary-subtle text-primary-emphasis';
      case 'lectura':
      default:
        return 'bg-success-subtle text-success-emphasis';
    }
  }

  getPermissionLabel(permission?: string): string {
    switch (permission) {
      case 'edicion':
        return 'Edición';
      case 'comentar':
        return 'Comentar';
      case 'lectura':
      default:
        return 'Lectura';
    }
  }
}

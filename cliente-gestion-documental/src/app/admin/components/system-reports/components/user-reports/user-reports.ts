import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../../../core/services/report';
import { UserReportView } from './user-reports.models';

@Component({
  selector: 'app-user-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-reports.html',
  styleUrl: './user-reports.css',
})
export class UserReports implements OnInit {
  private readonly reportService = inject(ReportService);

  // Pestaña activa dentro del subreporte de usuarios
  readonly activeSubReport = signal<UserReportView>('storage-top10');

  // Datos reactivos vinculados al servicio de reportes (Almacenamiento)
  readonly storageTopUsers = this.reportService.storageTopUsers;
  readonly isLoadingStorage = this.reportService.isLoadingStorageTop;
  readonly lastUpdatedStorageAt = this.reportService.lastUpdatedAt;

  // Datos reactivos vinculados al servicio de reportes (Compartición)
  readonly sharedTopUsers = this.reportService.sharedTopUsers;
  readonly isLoadingShared = this.reportService.isLoadingSharedTop;
  readonly lastUpdatedSharedAt = this.reportService.lastUpdatedSharedAt;

  // Estado de paginación y filtro para el reporte de compartición
  readonly sharedSearchTerm = signal<string>('');
  readonly sharedCurrentPage = signal<number>(1);
  readonly sharedPageSize = signal<number>(5);

  // Lista de compartición filtrada por el buscador
  readonly filteredSharedUsers = computed(() => {
    const term = this.sharedSearchTerm().toLowerCase().trim();
    const list = this.sharedTopUsers();
    if (!term) return list;
    return list.filter(
      (item) =>
        (item.userName || '').toLowerCase().includes(term) ||
        (item.userEmail || '').toLowerCase().includes(term),
    );
  });

  // Total de páginas computado
  readonly totalSharedPages = computed(() => {
    const count = this.filteredSharedUsers().length;
    const size = this.sharedPageSize();
    return Math.ceil(count / size) || 1;
  });

  // Elementos correspondientes a la página activa
  readonly paginatedSharedUsers = computed(() => {
    const total = this.totalSharedPages();
    const page = Math.min(Math.max(1, this.sharedCurrentPage()), total);
    const size = this.sharedPageSize();
    const start = (page - 1) * size;
    return this.filteredSharedUsers().slice(start, start + size);
  });

  // Índices para resumen de paginación
  readonly sharedStartIndex = computed(() => {
    if (this.filteredSharedUsers().length === 0) return 0;
    return (this.sharedCurrentPage() - 1) * this.sharedPageSize() + 1;
  });

  readonly sharedEndIndex = computed(() => {
    return Math.min(
      this.sharedCurrentPage() * this.sharedPageSize(),
      this.filteredSharedUsers().length,
    );
  });

  // Botones de página visibles en la barra de paginación
  readonly visiblePagesArray = computed(() => {
    const total = this.totalSharedPages();
    const current = this.sharedCurrentPage();
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

  // Estado computado del reporte activo
  readonly currentIsLoading = computed(() =>
    this.activeSubReport() === 'storage-top10'
      ? this.isLoadingStorage()
      : this.isLoadingShared(),
  );

  readonly currentLastUpdatedAt = computed(() =>
    this.activeSubReport() === 'storage-top10'
      ? this.lastUpdatedStorageAt()
      : this.lastUpdatedSharedAt(),
  );

  ngOnInit(): void {
    this.loadTopStorageUsers();
  }

  switchSubReport(view: UserReportView): void {
    this.activeSubReport.set(view);
    if (view === 'storage-top10' && this.storageTopUsers().length === 0) {
      this.loadTopStorageUsers();
    } else if (view === 'shared-ranking' && this.sharedTopUsers().length === 0) {
      this.loadTopSharedUsers();
    }
  }

  loadTopStorageUsers(): void {
    this.reportService.getTopUsersByFiles().subscribe();
  }

  loadTopSharedUsers(): void {
    this.reportService.getTopUsersBySharedResources().subscribe({
      next: () => {
        this.sharedCurrentPage.set(1);
      },
    });
  }

  refreshActiveReport(): void {
    if (this.activeSubReport() === 'storage-top10') {
      this.loadTopStorageUsers();
    } else {
      this.loadTopSharedUsers();
    }
  }

  goToSharedPage(page: number): void {
    if (page >= 1 && page <= this.totalSharedPages()) {
      this.sharedCurrentPage.set(page);
    }
  }

  setSharedPageSize(size: any): void {
    this.sharedPageSize.set(Number(size));
    this.sharedCurrentPage.set(1);
  }

  onSharedSearch(term: string): void {
    this.sharedSearchTerm.set(term);
    this.sharedCurrentPage.set(1);
  }

  getGlobalRank(localIndex: number): number {
    return (this.sharedCurrentPage() - 1) * this.sharedPageSize() + localIndex + 1;
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
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportService } from '../../../../../core/services/report';
import {
  StorageReportView,
  FileTypeReportItem,
  DateRangeFileItem,
  FileOperationsItem,
} from './storage-reports.models';

@Component({
  selector: 'app-storage-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './storage-reports.html',
  styleUrl: './storage-reports.css',
})
export class StorageReports implements OnInit {
  private readonly reportService = inject(ReportService);

  // Pestaña activa dentro del apartado de reportes de archivos y almacenamiento
  readonly activeSubReport = signal<StorageReportView>('by-type');

  // Estado reactivo vinculado al servicio para archivos por tipo
  readonly filesByType = this.reportService.filesByType;
  readonly isLoadingFilesByType = this.reportService.isLoadingFilesByType;
  readonly lastUpdatedFilesByTypeAt = this.reportService.lastUpdatedFilesByTypeAt;

  // Estado reactivo vinculado al servicio para archivos por rango de fechas
  readonly filesByDateRange = this.reportService.filesByDateRange;
  readonly isLoadingDateRange = this.reportService.isLoadingDateRange;
  readonly lastUpdatedDateRangeAt = this.reportService.lastUpdatedDateRangeAt;

  // Filtros para el reporte por rango de fechas
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');

  // Estado de paginación y búsqueda para el reporte de rango de fechas
  readonly dateRangeSearchTerm = signal<string>('');
  readonly dateRangeCurrentPage = signal<number>(1);
  readonly dateRangePageSize = signal<number>(5);

  // Estado reactivo vinculado al servicio para archivos con mayor cantidad de operaciones
  readonly filesByOperations = this.reportService.filesByOperations;
  readonly isLoadingFilesByOperations = this.reportService.isLoadingFilesByOperations;
  readonly lastUpdatedFilesByOperationsAt = this.reportService.lastUpdatedFilesByOperationsAt;

  // Estado de paginación y búsqueda para el reporte de operaciones
  readonly operationsSearchTerm = signal<string>('');
  readonly operationsCurrentPage = signal<number>(1);
  readonly operationsPageSize = signal<number>(5);

  // Totales computados para KPIs del reporte por tipo
  readonly totalFilesCount = computed(() =>
    this.filesByType().reduce((acc, curr) => acc + curr.fileCount, 0),
  );

  readonly grandTotalSizeBytes = computed(() =>
    this.filesByType().reduce((acc, curr) => acc + curr.totalSizeBytes, 0),
  );

  // Totales computados para KPIs del reporte por rango de fechas
  readonly totalDateRangeSizeBytes = computed(() =>
    this.filesByDateRange().reduce((acc, curr) => acc + curr.sizeBytes, 0),
  );

  // Lista de archivos en rango de fechas filtrada por búsqueda reactiva
  readonly filteredDateRangeFiles = computed(() => {
    const term = this.dateRangeSearchTerm().toLowerCase().trim();
    const list = this.filesByDateRange();
    if (!term) return list;
    return list.filter(
      (file) =>
        (file.fileName || '').toLowerCase().includes(term) ||
        (file.ownerName || '').toLowerCase().includes(term) ||
        (file.folderPath || '').toLowerCase().includes(term) ||
        (file.extension || '').toLowerCase().includes(term),
    );
  });

  // Total de páginas computado
  readonly totalDateRangePages = computed(() => {
    const count = this.filteredDateRangeFiles().length;
    const size = this.dateRangePageSize();
    return Math.ceil(count / size) || 1;
  });

  // Elementos correspondientes a la página activa
  readonly paginatedDateRangeFiles = computed(() => {
    const total = this.totalDateRangePages();
    const page = Math.min(Math.max(1, this.dateRangeCurrentPage()), total);
    const size = this.dateRangePageSize();
    const start = (page - 1) * size;
    return this.filteredDateRangeFiles().slice(start, start + size);
  });

  // Índices para resumen de paginación
  readonly dateRangeStartIndex = computed(() => {
    if (this.filteredDateRangeFiles().length === 0) return 0;
    return (this.dateRangeCurrentPage() - 1) * this.dateRangePageSize() + 1;
  });

  readonly dateRangeEndIndex = computed(() => {
    return Math.min(
      this.dateRangeCurrentPage() * this.dateRangePageSize(),
      this.filteredDateRangeFiles().length,
    );
  });

  // Botones de página visibles en la barra de paginación
  readonly visibleDateRangePagesArray = computed(() => {
    const total = this.totalDateRangePages();
    const current = this.dateRangeCurrentPage();
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

  // Lista de archivos con operaciones filtrada por búsqueda reactiva
  readonly filteredOperationsFiles = computed(() => {
    const term = this.operationsSearchTerm().toLowerCase().trim();
    const list = this.filesByOperations();
    if (!term) return list;
    return list.filter(
      (file) =>
        (file.fileName || '').toLowerCase().includes(term) ||
        (file.ownerName || '').toLowerCase().includes(term) ||
        (file.lastOperationType || '').toLowerCase().includes(term) ||
        (file.extension || '').toLowerCase().includes(term),
    );
  });

  // Total de páginas computado para operaciones
  readonly totalOperationsPages = computed(() => {
    const count = this.filteredOperationsFiles().length;
    const size = this.operationsPageSize();
    return Math.ceil(count / size) || 1;
  });

  // Elementos correspondientes a la página activa en operaciones
  readonly paginatedOperationsFiles = computed(() => {
    const total = this.totalOperationsPages();
    const page = Math.min(Math.max(1, this.operationsCurrentPage()), total);
    const size = this.operationsPageSize();
    const start = (page - 1) * size;
    return this.filteredOperationsFiles().slice(start, start + size);
  });

  // Índices para resumen de paginación de operaciones
  readonly operationsStartIndex = computed(() => {
    if (this.filteredOperationsFiles().length === 0) return 0;
    return (this.operationsCurrentPage() - 1) * this.operationsPageSize() + 1;
  });

  readonly operationsEndIndex = computed(() => {
    return Math.min(
      this.operationsCurrentPage() * this.operationsPageSize(),
      this.filteredOperationsFiles().length,
    );
  });

  // Botones de página visibles para operaciones
  readonly visibleOperationsPagesArray = computed(() => {
    const total = this.totalOperationsPages();
    const current = this.operationsCurrentPage();
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

  // Suma total de operaciones registradas computada
  readonly totalOperationsSum = computed(() =>
    this.filesByOperations().reduce((acc, curr) => acc + curr.operationsCount, 0),
  );

  // Estados computados según la pestaña activa
  readonly currentIsLoading = computed(() => {
    if (this.activeSubReport() === 'by-type') {
      return this.isLoadingFilesByType();
    }
    if (this.activeSubReport() === 'by-date-range') {
      return this.isLoadingDateRange();
    }
    if (this.activeSubReport() === 'by-operations') {
      return this.isLoadingFilesByOperations();
    }
    return false;
  });

  readonly currentLastUpdatedAt = computed(() => {
    if (this.activeSubReport() === 'by-type') {
      return this.lastUpdatedFilesByTypeAt();
    }
    if (this.activeSubReport() === 'by-date-range') {
      return this.lastUpdatedDateRangeAt();
    }
    if (this.activeSubReport() === 'by-operations') {
      return this.lastUpdatedFilesByOperationsAt();
    }
    return null;
  });

  ngOnInit(): void {
    this.loadFilesByType();
  }

  loadFilesByType(): void {
    this.reportService.getFilesGroupedByType().subscribe();
  }

  loadFilesByDateRange(): void {
    this.reportService
      .getFilesByDateRange(this.startDate(), this.endDate())
      .subscribe({
        next: () => {
          this.dateRangeCurrentPage.set(1);
        },
      });
  }

  loadFilesByOperations(): void {
    this.reportService.getFilesByOperations().subscribe({
      next: () => {
        this.operationsCurrentPage.set(1);
      },
    });
  }

  switchSubReport(view: StorageReportView): void {
    this.activeSubReport.set(view);
    if (view === 'by-type' && this.filesByType().length === 0) {
      this.loadFilesByType();
    } else if (view === 'by-date-range' && this.filesByDateRange().length === 0) {
      this.loadFilesByDateRange();
    } else if (view === 'by-operations' && this.filesByOperations().length === 0) {
      this.loadFilesByOperations();
    }
  }

  refreshActiveReport(): void {
    if (this.activeSubReport() === 'by-type') {
      this.loadFilesByType();
    } else if (this.activeSubReport() === 'by-date-range') {
      this.loadFilesByDateRange();
    } else if (this.activeSubReport() === 'by-operations') {
      this.loadFilesByOperations();
    }
  }

  applyDateFilter(): void {
    this.loadFilesByDateRange();
  }

  clearDateFilter(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.dateRangeSearchTerm.set('');
    this.loadFilesByDateRange();
  }

  goToDateRangePage(page: number): void {
    if (page >= 1 && page <= this.totalDateRangePages()) {
      this.dateRangeCurrentPage.set(page);
    }
  }

  setDateRangePageSize(size: any): void {
    this.dateRangePageSize.set(Number(size));
    this.dateRangeCurrentPage.set(1);
  }

  onDateRangeSearch(term: string): void {
    this.dateRangeSearchTerm.set(term);
    this.dateRangeCurrentPage.set(1);
  }

  goToOperationsPage(page: number): void {
    if (page >= 1 && page <= this.totalOperationsPages()) {
      this.operationsCurrentPage.set(page);
    }
  }

  setOperationsPageSize(size: any): void {
    this.operationsPageSize.set(Number(size));
    this.operationsCurrentPage.set(1);
  }

  onOperationsSearch(term: string): void {
    this.operationsSearchTerm.set(term);
    this.operationsCurrentPage.set(1);
  }

  clearOperationsSearch(): void {
    this.operationsSearchTerm.set('');
    this.operationsCurrentPage.set(1);
  }

  getActionLabel(action?: string): string {
    switch (action) {
      case 'crear':
        return 'Creación';
      case 'modificar':
        return 'Modificación';
      case 'mover':
        return 'Movimiento';
      case 'eliminar':
        return 'Eliminación';
      case 'restaurar':
        return 'Restauración';
      case 'compartir':
        return 'Compartición';
      case 'descargar':
        return 'Descarga';
      default:
        return action || 'Operación';
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
}

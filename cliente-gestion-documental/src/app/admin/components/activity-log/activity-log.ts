import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityLogService } from '../../../core/services/activity-log.service';
import {
  ActivityLogItem,
  ActivityAction,
  ActivityResourceType,
  ActivityCategoryFilter,
} from './activity-log.models';

@Component({
  selector: 'app-activity-log',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-log.html',
  styleUrl: './activity-log.css',
})
export class ActivityLog implements OnInit {
  private readonly activityService = inject(ActivityLogService);

  // Estado del servicio
  readonly logs = this.activityService.logs;
  readonly isLoading = this.activityService.isLoading;
  readonly lastUpdatedAt = this.activityService.lastUpdatedAt;

  // Filtros reactivos
  readonly searchTerm = signal<string>('');
  readonly categoryFilter = signal<ActivityCategoryFilter>('all');
  readonly actionFilter = signal<'all' | ActivityAction>('all');
  readonly startDate = signal<string>('');
  readonly endDate = signal<string>('');
  readonly sortOrder = signal<'desc' | 'asc'>('desc');

  // Paginación reactiva
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly pageSizeOptions = [5, 10, 20, 50];

  // Modal de detalles
  readonly selectedLog = signal<ActivityLogItem | null>(null);

  // Lista de categorías para las pestañas superiores
  readonly categories: { id: ActivityCategoryFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'Todas las actividades', icon: 'bi-clock-history' },
    { id: 'archivo', label: 'Archivos', icon: 'bi-file-earmark-text' },
    { id: 'carpeta', label: 'Carpetas', icon: 'bi-folder' },
    { id: 'compartido', label: 'Recursos Compartidos', icon: 'bi-share' },
  ];

  // Lista de tipos de acciones disponibles para el selector
  readonly actionsList: { id: 'all' | ActivityAction; label: string }[] = [
    { id: 'all', label: 'Todas las operaciones' },
    { id: 'crear', label: 'Creación (crear)' },
    { id: 'modificar', label: 'Modificación (modificar)' },
    { id: 'mover', label: 'Movimiento / Traslado (mover)' },
    { id: 'eliminar', label: 'Eliminación (eliminar)' },
    { id: 'restaurar', label: 'Restauración (restaurar)' },
    { id: 'compartir', label: 'Compartición (compartir)' },
    { id: 'descargar', label: 'Descarga (descargar)' },
  ];

  ngOnInit(): void {
    this.refreshLogs();
  }

  refreshLogs(): void {
    this.activityService.loadLogs().subscribe();
  }

  // MÉTRICAS / KPIS GLOBALES COMPUTADOS
  readonly totalCount = computed(() => this.logs().length);

  readonly filesCount = computed(
    () => this.logs().filter((item) => item.resourceType === 'archivo').length
  );

  readonly foldersCount = computed(
    () => this.logs().filter((item) => item.resourceType === 'carpeta').length
  );

  readonly sharesCount = computed(
    () =>
      this.logs().filter(
        (item) => item.action === 'compartir' || !!item.details?.['sharedToUserId']
      ).length
  );

  readonly uniqueUsersCount = computed(() => {
    const userIds = new Set(this.logs().map((item) => item.userId));
    return userIds.size;
  });

  // REGISTROS FILTRADOS REACTIVAMENTE
  readonly filteredLogs = computed(() => {
    const items = this.logs();
    const term = this.searchTerm().trim().toLowerCase();
    const cat = this.categoryFilter();
    const act = this.actionFilter();
    const start = this.startDate();
    const end = this.endDate();
    const order = this.sortOrder();

    return items
      .filter((item) => {
        // Filtro por categoría principal
        if (cat === 'archivo' && item.resourceType !== 'archivo') {
          return false;
        }
        if (cat === 'carpeta' && item.resourceType !== 'carpeta') {
          return false;
        }
        if (cat === 'compartido') {
          const isShareAction = item.action === 'compartir';
          const hasShareDetails = !!item.details?.['sharedToUserId'];
          if (!isShareAction && !hasShareDetails) {
            return false;
          }
        }

        // Filtro por tipo de acción
        if (act !== 'all' && item.action !== act) {
          return false;
        }

        // Filtro por fecha inicial
        if (start) {
          const itemDate = new Date(item.timestamp).getTime();
          const filterStartDate = new Date(`${start}T00:00:00`).getTime();
          if (itemDate < filterStartDate) {
            return false;
          }
        }

        // Filtro por fecha final
        if (end) {
          const itemDate = new Date(item.timestamp).getTime();
          const filterEndDate = new Date(`${end}T23:59:59.999`).getTime();
          if (itemDate > filterEndDate) {
            return false;
          }
        }

        // Filtro de búsqueda por texto libre
        if (term) {
          const matchUser =
            item.userName.toLowerCase().includes(term) ||
            item.userEmail.toLowerCase().includes(term) ||
            (item.userRole && item.userRole.toLowerCase().includes(term));

          const matchResource =
            item.resourceName.toLowerCase().includes(term) ||
            item.resourceType.toLowerCase().includes(term) ||
            item.resourceId.toLowerCase().includes(term);

          const matchAction =
            item.action.toLowerCase().includes(term) ||
            this.getActionLabel(item.action).toLowerCase().includes(term);

          const matchDetails = item.details
            ? JSON.stringify(item.details).toLowerCase().includes(term)
            : false;

          if (!matchUser && !matchResource && !matchAction && !matchDetails) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return order === 'desc' ? timeB - timeA : timeA - timeB;
      });
  });

  // PAGINACIÓN COMPUTADA
  readonly totalPages = computed(() => {
    const total = this.filteredLogs().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  readonly paginatedLogs = computed(() => {
    const list = this.filteredLogs();
    const page = Math.min(this.currentPage(), this.totalPages());
    const size = this.pageSize();
    const startIndex = (page - 1) * size;
    return list.slice(startIndex, startIndex + size);
  });

  readonly paginationInfo = computed(() => {
    const total = this.filteredLogs().length;
    if (total === 0) {
      return { start: 0, end: 0, total: 0 };
    }
    const page = Math.min(this.currentPage(), this.totalPages());
    const size = this.pageSize();
    const start = (page - 1) * size + 1;
    const end = Math.min(start + size - 1, total);
    return { start, end, total };
  });

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (current > 3) {
        pages.push('...');
      }
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (current < total - 2) {
        pages.push('...');
      }
      pages.push(total);
    }
    return pages;
  });

  // MANEJO DE EVENTOS Y SELECCIONES
  setCategory(cat: ActivityCategoryFilter): void {
    this.categoryFilter.set(cat);
    this.currentPage.set(1);
  }

  setAction(act: 'all' | ActivityAction): void {
    this.actionFilter.set(act);
    this.currentPage.set(1);
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  goToPage(page: number | string): void {
    if (typeof page === 'number') {
      const target = Math.max(1, Math.min(page, this.totalPages()));
      this.currentPage.set(target);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.categoryFilter.set('all');
    this.actionFilter.set('all');
    this.startDate.set('');
    this.endDate.set('');
    this.sortOrder.set('desc');
    this.currentPage.set(1);
  }

  openDetails(log: ActivityLogItem): void {
    this.selectedLog.set(log);
  }

  closeDetails(): void {
    this.selectedLog.set(null);
  }

  // HELPERS DE PRESENTACIÓN Y FORMATO
  getActionLabel(action: ActivityAction): string {
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
        return action;
    }
  }

  getActionBadgeClass(action: ActivityAction): string {
    switch (action) {
      case 'crear':
        return 'badge-action-create';
      case 'modificar':
        return 'badge-action-modify';
      case 'mover':
        return 'badge-action-move';
      case 'eliminar':
        return 'badge-action-delete';
      case 'restaurar':
        return 'badge-action-restore';
      case 'compartir':
        return 'badge-action-share';
      case 'descargar':
        return 'badge-action-download';
      default:
        return 'bg-secondary-subtle text-secondary';
    }
  }

  getResourceTypeBadgeClass(type: ActivityResourceType): string {
    return type === 'carpeta'
      ? 'bg-warning-subtle text-warning-emphasis'
      : 'bg-primary-subtle text-primary';
  }

  getUserInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  getDetailsSummary(item: ActivityLogItem): string {
    const details = item.details || {};
    switch (item.action) {
      case 'compartir':
        if (details.sharedToUserName) {
          const perm = details.permission ? ` (${details.permission})` : '';
          return `Compartido con ${details.sharedToUserName}${perm}`;
        }
        return 'Recurso compartido con otro usuario';
      case 'mover':
        if (details.fromFolderName && details.toFolderName) {
          return `De "${details.fromFolderName}" a "${details.toFolderName}"`;
        }
        return 'Recurso trasladado de carpeta';
      case 'modificar':
        if (details.field === 'name' && details.oldName && details.newName) {
          return `Renombrado: "${details.oldName}" -> "${details.newName}"`;
        }
        if (details.comment) {
          return String(details.comment);
        }
        return 'Contenido o metadatos modificados';
      case 'eliminar':
        return details.moveToTrash
          ? 'Enviado a la papelera de reciclaje'
          : 'Eliminación del recurso';
      case 'restaurar':
        return 'Restaurado desde la papelera de reciclaje';
      case 'descargar':
        return 'Archivo descargado localmente';
      case 'crear':
        return `Creación de ${item.resourceType}`;
      default:
        return item.resourceName;
    }
  }

  formatDate(dateValue: string | Date): string {
    if (!dateValue) return '-';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return String(dateValue);
    return d.toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  getRelativeTime(dateValue: string | Date): string {
    if (!dateValue) return '';
    const now = new Date().getTime();
    const past = new Date(dateValue).getTime();
    if (isNaN(past)) return '';
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 30) return `Hace ${diffDays} días`;
    const diffMonths = Math.floor(diffDays / 30);
    return `Hace ${diffMonths} ${diffMonths === 1 ? 'mes' : 'meses'}`;
  }
}

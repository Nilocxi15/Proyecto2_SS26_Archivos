import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  FileComment,
  FileItem,
  ResourcePermission,
  SharedUserEntry,
} from '../../../core/models/resource.models';
import { ResourceService } from '../../../core/services/resource.service';
import { AuthService } from '../../../core/services/auth.service';

export type WorkspaceAccessRole = 'propietario' | 'edicion' | 'comentar' | 'lectura';
export type SidePanelTab = 'comments' | 'info' | null;

@Component({
  selector: 'app-file-workspace',
  imports: [CommonModule, FormsModule],
  templateUrl: './file-workspace.html',
  styleUrl: './file-workspace.css',
})
export class FileWorkspace implements OnInit {
  readonly resourceService = inject(ResourceService);
  readonly authService = inject(AuthService);

  // Evento opcional al cerrar el espacio de trabajo
  readonly closed = output<void>();

  // Estado de carga del contenido del documento
  readonly isLoadingContent = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  // Estado editable del documento
  readonly fileTitle = signal<string>('');
  readonly isEditingTitle = signal<boolean>(false);
  readonly documentContent = signal<string>('');
  readonly savedContent = signal<string>('');
  readonly savedTitle = signal<string>('');
  readonly tags = signal<string[]>([]);
  readonly savedTags = signal<string[]>([]);
  readonly newTagInput = signal<string>('');

  // Configuración visual del espacio de trabajo
  readonly activeSidePanel = signal<SidePanelTab>('comments');
  readonly isSaving = signal<boolean>(false);
  readonly lastSavedAt = signal<string | null>(null);

  // Estado de comentarios del documento
  readonly comments = signal<FileComment[]>([]);
  readonly newCommentText = signal<string>('');
  readonly isAddingComment = signal<boolean>(false);
  readonly isDeletingCommentId = signal<string | null>(null);

  // Estado del modal de Compartir e Invitar usuarios
  readonly isShareModalVisible = signal<boolean>(false);
  readonly sharedUsers = signal<SharedUserEntry[]>([]);
  readonly inviteEmail = signal<string>('');
  readonly invitePermission = signal<ResourcePermission>('lectura');
  readonly shareError = signal<string | null>(null);
  readonly isSharing = signal<boolean>(false);

  // Modal de confirmación al salir con cambios sin guardar
  readonly isUnsavedExitModalVisible = signal<boolean>(false);

  // Notificación flotante
  readonly notification = signal<string | null>(null);

  // Contexto actual del archivo abierto
  readonly workspaceContext = this.resourceService.activeWorkspace;
  readonly currentFile = computed<FileItem | null>(() => this.workspaceContext()?.file ?? null);
  readonly originSection = computed<'my-files' | 'shared'>(
    () => this.workspaceContext()?.origin ?? 'my-files',
  );

  // Determina si el archivo es Markdown (.md)
  readonly isMarkdown = computed<boolean>(() => {
    const ext = (this.currentFile()?.extension || '').replace('.', '').toLowerCase();
    return ext === 'md';
  });

  // Rol efectivo del usuario sobre el documento
  readonly effectiveRole = computed<WorkspaceAccessRole>(() => {
    const file = this.currentFile();
    const user = this.authService.currentUser();
    if (!file) return 'lectura';

    const currentUserId = user?._id || (user as any)?.id;
    if (this.originSection() === 'my-files' || (currentUserId && file.ownerId === currentUserId)) {
      return 'propietario';
    }

    const perm = file.myPermission;
    if (perm === 'edicion') return 'edicion';
    if (perm === 'comentar') return 'comentar';
    return 'lectura';
  });

  // Capacidades derivadas según el permiso del usuario
  readonly isOwner = computed<boolean>(() => this.effectiveRole() === 'propietario');
  readonly canEdit = computed<boolean>(() => {
    const role = this.effectiveRole();
    return role === 'propietario' || role === 'edicion';
  });
  readonly canComment = computed<boolean>(() => {
    const role = this.effectiveRole();
    return role === 'propietario' || role === 'edicion' || role === 'comentar';
  });
  readonly canManageSharing = computed<boolean>(() => this.effectiveRole() === 'propietario');

  // Indicador reactivo de cambios pendientes por guardar
  readonly hasUnsavedChanges = computed<boolean>(() => {
    if (!this.canEdit()) return false;
    const contentDiff = this.documentContent() !== this.savedContent();
    const titleDiff = this.isOwner() && this.fileTitle().trim() !== this.savedTitle().trim();
    const tagsDiff =
      this.isOwner() && JSON.stringify(this.tags()) !== JSON.stringify(this.savedTags());
    return contentDiff || titleDiff || tagsDiff;
  });

  // Tamaño actual en bytes del contenido
  readonly currentSizeBytes = computed<number>(() => {
    return new Blob([this.documentContent() || '']).size;
  });

  ngOnInit(): void {
    this.initializeWorkspace();
  }

  private initializeWorkspace(): void {
    const file = this.currentFile();
    if (!file) return;

    this.fileTitle.set(file.name);
    this.savedTitle.set(file.name);
    this.tags.set([...(file.tags || [])]);
    this.savedTags.set([...(file.tags || [])]);
    this.lastSavedAt.set(file.updatedAt);

    // Inicializar usuarios con acceso
    const initialShared: SharedUserEntry[] = (file.sharedWith || []).map((entry: any) => ({
      userId:
        typeof entry.userId === 'object' && entry.userId !== null
          ? (entry.userId as any)._id
          : entry.userId,
      userName: entry.userName || `Usuario (${String(entry.userId).slice(-6)})`,
      userEmail: entry.userEmail || '',
      permission: entry.permission || 'lectura',
    }));
    this.sharedUsers.set(initialShared);

    // Inicializar comentarios existentes del archivo
    this.comments.set([...(file.comments || [])]);

    // Si ya viene el contenido en memoria lo usamos de inmediato
    if (typeof file.content === 'string') {
      this.documentContent.set(file.content);
      this.savedContent.set(file.content);
    }

    // Consultar detalles frescos y actualizados desde el backend
    this.loadFileDetailsFromServer(file._id);
  }

  loadFileDetailsFromServer(fileId: string): void {
    this.isLoadingContent.set(true);
    this.loadError.set(null);

    this.resourceService.getFileDetails(fileId).subscribe({
      next: (res) => {
        const file = res.data;
        if (file) {
          this.fileTitle.set(file.name);
          this.savedTitle.set(file.name);
          const content = file.content ?? '';
          this.documentContent.set(content);
          this.savedContent.set(content);
          this.tags.set([...(file.tags || [])]);
          this.savedTags.set([...(file.tags || [])]);
          this.lastSavedAt.set(file.updatedAt);

          if (file.comments) {
            this.comments.set(file.comments);
          }
          if (file.sharedWith) {
            const mappedShared: SharedUserEntry[] = (file.sharedWith as any[]).map(
              (entry: any) => ({
                userId:
                  typeof entry.userId === 'object' && entry.userId !== null
                    ? (entry.userId as any)._id
                    : entry.userId,
                userName: entry.userName || 'Usuario',
                userEmail: entry.userEmail || '',
                permission: entry.permission || 'lectura',
              }),
            );
            this.sharedUsers.set(mappedShared);
          }
          this.resourceService.updateFileInMemory(file);
        }
        this.isLoadingContent.set(false);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'No se pudo sincronizar el archivo desde el servidor.';
        this.loadError.set(msg);
        this.isLoadingContent.set(false);
      },
    });
  }

  // EDICIÓN DE CONTENIDO
  onContentChange(newValue: string): void {
    if (!this.canEdit()) return;
    this.documentContent.set(newValue);
  }

  // EDICIÓN DEL TÍTULO DEL ARCHIVO (SOLO PROPIETARIO)
  startEditingTitle(): void {
    if (!this.isOwner()) return;
    this.isEditingTitle.set(true);
  }

  finishEditingTitle(): void {
    const clean = this.fileTitle().trim();
    if (!clean) {
      this.fileTitle.set(this.savedTitle());
    } else {
      this.fileTitle.set(clean);
    }
    this.isEditingTitle.set(false);
  }

  // GUARDAR CAMBIOS DEL DOCUMENTO
  saveChanges(onSuccess?: () => void): void {
    const file = this.currentFile();
    if (!file || !this.canEdit()) return;

    const cleanTitle = this.fileTitle().trim() || file.name;
    this.fileTitle.set(cleanTitle);
    this.isSaving.set(true);

    const payload: { name?: string; content?: string; tags?: string[] } = {
      content: this.documentContent(),
    };

    if (this.isOwner()) {
      payload.name = cleanTitle;
      payload.tags = this.tags();
    }

    this.resourceService.saveFileChanges(file._id, payload).subscribe({
      next: (res) => {
        const updated = res.data;
        const nowIso = updated?.updatedAt || new Date().toISOString();
        this.savedContent.set(this.documentContent());
        this.savedTitle.set(cleanTitle);
        this.savedTags.set([...this.tags()]);
        this.lastSavedAt.set(nowIso);
        this.isSaving.set(false);

        if (updated) {
          this.resourceService.updateFileInMemory(updated);
        }
        this.showNotification('Cambios guardados correctamente en el documento');
        onSuccess?.();
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg = err?.error?.mensaje || 'Error al guardar los cambios en el archivo';
        this.showNotification(msg);
      },
    });
  }

  // ETIQUETAS (TAGS)
  addTag(): void {
    if (!this.isOwner()) return;
    const raw = this.newTagInput().trim().replace(/^#/, '');
    if (!raw) return;
    if (!this.tags().includes(raw)) {
      this.tags.update((list) => [...list, raw]);
    }
    this.newTagInput.set('');
  }

  removeTag(tag: string): void {
    if (!this.isOwner()) return;
    this.tags.update((list) => list.filter((t) => t !== tag));
  }

  // GESTIÓN DE COMENTARIOS
  toggleSidePanel(tab: Exclude<SidePanelTab, null>): void {
    if (this.activeSidePanel() === tab) {
      this.activeSidePanel.set(null);
    } else {
      this.activeSidePanel.set(tab);
    }
  }

  addComment(): void {
    const file = this.currentFile();
    if (!file || !this.canComment()) return;
    const text = this.newCommentText().trim();
    if (!text) return;

    this.isAddingComment.set(true);
    this.resourceService.addFileComment(file._id, text).subscribe({
      next: (res) => {
        this.isAddingComment.set(false);
        if (res.data) {
          this.comments.update((list) => [res.data, ...list]);
        }
        this.newCommentText.set('');
        this.showNotification('Comentario agregado al documento');
      },
      error: (err) => {
        this.isAddingComment.set(false);
        const msg = err?.error?.mensaje || 'No se pudo agregar el comentario';
        this.showNotification(msg);
      },
    });
  }

  /**
   * Verifica si el usuario autenticado es el propietario/autor de un comentario específico
   */
  isCommentOwner(comment: FileComment): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    const currentUserId = String(user._id || (user as any).id || '');
    const authorIdStr =
      typeof comment.authorId === 'object' && comment.authorId !== null
        ? String((comment.authorId as any)._id || '')
        : String(comment.authorId || '');

    if (currentUserId && authorIdStr && currentUserId === authorIdStr) {
      return true;
    }
    if (
      user.email &&
      comment.authorEmail &&
      user.email.toLowerCase() === comment.authorEmail.toLowerCase()
    ) {
      return true;
    }
    return false;
  }

  deleteComment(comment: FileComment): void {
    const file = this.currentFile();
    if (!file || !this.isCommentOwner(comment)) return;

    this.isDeletingCommentId.set(comment._id);
    this.resourceService.deleteFileComment(file._id, comment._id).subscribe({
      next: () => {
        this.isDeletingCommentId.set(null);
        this.comments.update((list) => list.filter((c) => c._id !== comment._id));
        this.showNotification('Comentario eliminado');
      },
      error: (err) => {
        this.isDeletingCommentId.set(null);
        const msg = err?.error?.mensaje || 'No se pudo eliminar el comentario';
        this.showNotification(msg);
      },
    });
  }

  // COMPARTIR Y GESTIONAR PERMISOS
  openShareModal(): void {
    this.inviteEmail.set('');
    this.invitePermission.set('lectura');
    this.shareError.set(null);
    this.isShareModalVisible.set(true);
  }

  closeShareModal(): void {
    this.isShareModalVisible.set(false);
    this.shareError.set(null);
  }

  inviteCollaborator(): void {
    const file = this.currentFile();
    if (!file || !this.canManageSharing()) return;

    const emailOrUser = this.inviteEmail().trim().toLowerCase();
    if (!emailOrUser) {
      this.shareError.set('Ingresa el correo electrónico del usuario que deseas invitar');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailOrUser)) {
      this.shareError.set('Ingresa un formato de correo electrónico válido (ejemplo@dominio.com)');
      return;
    }

    const currentUserEmail = this.authService.currentUser()?.email?.toLowerCase();
    if (currentUserEmail && emailOrUser === currentUserEmail) {
      this.shareError.set('Ya eres el propietario de este documento');
      return;
    }

    this.isSharing.set(true);
    this.shareError.set(null);

    this.resourceService
      .shareResource(file._id, { email: emailOrUser, permission: this.invitePermission() })
      .subscribe({
        next: (res) => {
          this.isSharing.set(false);
          if (res.data?.sharedWith) {
            this.sharedUsers.set(res.data.sharedWith);
          }
          this.inviteEmail.set('');
          this.showNotification(
            `Se otorgó permiso de ${this.formatPermissionLabel(this.invitePermission())} a ${emailOrUser}`,
          );
        },
        error: (err) => {
          this.isSharing.set(false);
          const msg = err?.error?.mensaje || 'No se pudo compartir el archivo con el usuario';
          this.shareError.set(msg);
        },
      });
  }

  updateCollaboratorPermission(userId: string, permission: ResourcePermission): void {
    const file = this.currentFile();
    if (!file || !this.canManageSharing()) return;

    const entry = this.sharedUsers().find((u) => u.userId === userId);
    if (!entry || !entry.userEmail) {
      return;
    }

    this.resourceService.shareResource(file._id, { email: entry.userEmail, permission }).subscribe({
      next: (res) => {
        if (res.data?.sharedWith) {
          this.sharedUsers.set(res.data.sharedWith);
        }
        this.showNotification('Nivel de permiso actualizado');
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'No se pudo actualizar el permiso';
        this.showNotification(msg);
      },
    });
  }

  removeCollaborator(userId: string): void {
    const file = this.currentFile();
    if (!file || !this.canManageSharing()) return;

    this.resourceService.removeSharedUser(file._id, userId).subscribe({
      next: (res) => {
        if (res.data?.sharedWith) {
          this.sharedUsers.set(res.data.sharedWith);
        } else {
          this.sharedUsers.update((list) => list.filter((u) => u.userId !== userId));
        }
        this.showNotification('Acceso revocado para el usuario seleccionado');
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'No se pudo revocar el acceso del usuario';
        this.showNotification(msg);
      },
    });
  }

  // DESCARGAR DOCUMENTO
  downloadCurrentFile(): void {
    const file = this.currentFile();
    if (!file) return;

    const ext = (file.extension || 'txt').replace('.', '').toLowerCase();
    const suffix = `.${ext}`;
    const cleanName = (this.fileTitle() || file.name || 'documento').trim();
    const fileName = cleanName.toLowerCase().endsWith(suffix) ? cleanName : `${cleanName}${suffix}`;

    const mimeType = ext === 'md' ? 'text/markdown; charset=utf-8' : 'text/plain; charset=utf-8';
    const blob = new Blob([this.documentContent() ?? ''], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);

    this.showNotification(`Archivo "${fileName}" descargado exitosamente`);
  }

  // SALIR DEL ESPACIO DE TRABAJO
  requestCloseWorkspace(): void {
    if (this.hasUnsavedChanges()) {
      this.isUnsavedExitModalVisible.set(true);
      return;
    }
    this.confirmCloseWorkspace();
  }

  confirmCloseWorkspace(): void {
    this.isUnsavedExitModalVisible.set(false);
    this.resourceService.closeFileWorkspace();
    this.closed.emit();
  }

  saveAndCloseWorkspace(): void {
    if (this.hasUnsavedChanges()) {
      this.saveChanges(() => {
        this.confirmCloseWorkspace();
      });
    } else {
      this.confirmCloseWorkspace();
    }
  }

  private syncMetadataToMemory(): void {
    const file = this.currentFile();
    if (!file) return;
    this.resourceService.updateFileInMemory({
      ...file,
      tags: [...this.tags()],
      comments: [...this.comments()],
      sharedWith: [...this.sharedUsers()],
    });
  }

  private showNotification(message: string): void {
    this.notification.set(message);
    setTimeout(() => {
      this.notification.set(null);
    }, 3500);
  }

  // Utilidades de formato visual
  formatRoleLabel(role: WorkspaceAccessRole): string {
    switch (role) {
      case 'propietario':
        return 'Propietario';
      case 'edicion':
        return 'Permiso de Edición';
      case 'comentar':
        return 'Solo Comentarios';
      default:
        return 'Solo Lectura';
    }
  }

  formatPermissionLabel(permission?: string): string {
    if (permission === 'edicion') return 'Edición';
    if (permission === 'comentar') return 'Comentar';
    return 'Lectura';
  }

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

  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}

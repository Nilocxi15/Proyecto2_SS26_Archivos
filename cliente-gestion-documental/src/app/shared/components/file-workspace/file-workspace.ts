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
  readonly newTagInput = signal<string>('');

  // Configuración visual del espacio de trabajo
  readonly activeSidePanel = signal<SidePanelTab>('comments');
  readonly isSaving = signal<boolean>(false);
  readonly lastSavedAt = signal<string | null>(null);

  // Estado de comentarios del documento
  readonly comments = signal<FileComment[]>([]);
  readonly newCommentText = signal<string>('');

  // Estado del modal de Compartir e Invitar usuarios
  readonly isShareModalVisible = signal<boolean>(false);
  readonly sharedUsers = signal<SharedUserEntry[]>([]);
  readonly inviteEmail = signal<string>('');
  readonly invitePermission = signal<ResourcePermission>('lectura');
  readonly shareError = signal<string | null>(null);

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
    return (
      this.documentContent() !== this.savedContent() ||
      this.fileTitle().trim() !== this.savedTitle().trim()
    );
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
    this.lastSavedAt.set(file.updatedAt);

    // Inicializar usuarios con acceso
    const initialShared: SharedUserEntry[] = (file.sharedWith || []).map((entry) => ({
      userId: entry.userId,
      userName: entry.userName || `Usuario (${entry.userId.slice(-6)})`,
      userEmail: entry.userEmail || 'usuario@organizacion.com',
      permission: entry.permission || 'lectura',
    }));
    this.sharedUsers.set(initialShared);

    // Inicializar comentarios existentes del archivo
    this.comments.set([...(file.comments || [])]);

    // Si ya viene el contenido en memoria lo usamos; si no, lo consultamos al servidor
    if (typeof file.content === 'string') {
      this.documentContent.set(file.content);
      this.savedContent.set(file.content);
    } else {
      this.loadFileContentFromServer(file._id);
    }
  }

  loadFileContentFromServer(fileId: string): void {
    this.isLoadingContent.set(true);
    this.loadError.set(null);

    this.resourceService.fetchFileContent(fileId).subscribe({
      next: (res) => {
        const content = res.data?.content ?? '';
        this.documentContent.set(content);
        this.savedContent.set(content);
        this.isLoadingContent.set(false);
      },
      error: (err) => {
        const msg =
          err?.error?.mensaje || 'No se pudo cargar el contenido del archivo desde el servidor.';
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
  saveChanges(): void {
    const file = this.currentFile();
    if (!file || !this.canEdit()) return;

    const cleanTitle = this.fileTitle().trim() || file.name;
    this.fileTitle.set(cleanTitle);
    this.isSaving.set(true);

    const updatedContent = this.documentContent();
    const updatedBytes = new Blob([updatedContent]).size;
    const nowIso = new Date().toISOString();

    const updatedFile: FileItem = {
      ...file,
      name: cleanTitle,
      content: updatedContent,
      sizeBytes: updatedBytes,
      tags: [...this.tags()],
      comments: [...this.comments()],
      sharedWith: [...this.sharedUsers()],
      updatedAt: nowIso,
    };

    // Actualización reactiva inmediata en el estado del cliente
    setTimeout(() => {
      this.savedContent.set(updatedContent);
      this.savedTitle.set(cleanTitle);
      this.lastSavedAt.set(nowIso);
      this.isSaving.set(false);
      this.resourceService.updateFileInMemory(updatedFile);
      this.showNotification('Cambios guardados correctamente en el documento');
    }, 250);
  }

  // ETIQUETAS (TAGS)
  addTag(): void {
    if (!this.isOwner()) return;
    const raw = this.newTagInput().trim().replace(/^#/, '');
    if (!raw) return;
    if (!this.tags().includes(raw)) {
      this.tags.update((list) => [...list, raw]);
      this.syncMetadataToMemory();
    }
    this.newTagInput.set('');
  }

  removeTag(tag: string): void {
    if (!this.isOwner()) return;
    this.tags.update((list) => list.filter((t) => t !== tag));
    this.syncMetadataToMemory();
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
    if (!this.canComment()) return;
    const text = this.newCommentText().trim();
    if (!text) return;

    const user = this.authService.currentUser();
    const authorName = user
      ? `${user.name || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Usuario Actual';

    const newComment: FileComment = {
      _id: `comment-${Date.now()}`,
      authorId: user?._id || (user as any)?.id || 'current-user',
      authorName,
      authorEmail: user?.email,
      content: text,
      createdAt: new Date().toISOString(),
    };

    this.comments.update((list) => [newComment, ...list]);
    this.newCommentText.set('');
    this.syncMetadataToMemory();
    this.showNotification('Comentario agregado al documento');
  }

  /**
   * Verifica si el usuario autenticado es el propietario/autor de un comentario específico
   */
  isCommentOwner(comment: FileComment): boolean {
    const user = this.authService.currentUser();
    const currentUserId = user?._id || (user as any)?.id || 'current-user';
    if (comment.authorId && comment.authorId === currentUserId) {
      return true;
    }
    if (user?.email && comment.authorEmail && user.email === comment.authorEmail) {
      return true;
    }
    return false;
  }

  deleteComment(comment: FileComment): void {
    if (!this.isCommentOwner(comment)) return;
    this.comments.update((list) => list.filter((c) => c._id !== comment._id));
    this.syncMetadataToMemory();
    this.showNotification('Comentario eliminado');
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
    if (!this.canManageSharing()) return;

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

    const exists = this.sharedUsers().some(
      (u) => (u.userEmail || '').toLowerCase() === emailOrUser,
    );
    if (exists) {
      this.shareError.set(
        'Este usuario ya cuenta con acceso al documento. Puedes cambiar su permiso en la lista inferior.',
      );
      return;
    }

    const displayName = emailOrUser
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    const newEntry: SharedUserEntry = {
      userId: `user-${Date.now()}`,
      userName: displayName,
      userEmail: emailOrUser,
      permission: this.invitePermission(),
    };

    this.sharedUsers.update((list) => [...list, newEntry]);
    this.inviteEmail.set('');
    this.shareError.set(null);
    this.syncMetadataToMemory();
    this.showNotification(
      `Se otorgó permiso de ${this.formatPermissionLabel(newEntry.permission)} a ${emailOrUser}`,
    );
  }

  updateCollaboratorPermission(userId: string, permission: ResourcePermission): void {
    if (!this.canManageSharing()) return;
    this.sharedUsers.update((list) =>
      list.map((u) => (u.userId === userId ? { ...u, permission } : u)),
    );
    this.syncMetadataToMemory();
    this.showNotification('Nivel de permiso actualizado');
  }

  removeCollaborator(userId: string): void {
    if (!this.canManageSharing()) return;
    this.sharedUsers.update((list) => list.filter((u) => u.userId !== userId));
    this.syncMetadataToMemory();
    this.showNotification('Acceso revocado para el usuario seleccionado');
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
    this.saveChanges();
    setTimeout(() => {
      this.confirmCloseWorkspace();
    }, 280);
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

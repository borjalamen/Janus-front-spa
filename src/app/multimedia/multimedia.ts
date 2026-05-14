import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../local-storage.service';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';

export interface MultimediaItem {
  id: string;
  // Legacy fields (from manifest.json / old API)
  title?: string;
  file?: string;
  thumbnail?: string;
  duration?: string;
  // New volume-based fields
  fileName?: string;
  displayName?: string;
  description?: string;
  category?: string;
  sizeBytes?: number;
  mimeType?: string;
  filePath?: string;
  uploadedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // Fallback-only: ruta dentro de assets/multimedia/
  _assetFile?: string;
}

@Component({
  selector: 'app-multimedia',
  templateUrl: './multimedia.html',
  styleUrls: ['./multimedia.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class MultimediaComponent implements OnInit {
  private readonly apiUrl = environment.baseUrl + 'media/videos';
  private readonly STORAGE_KEY_QUERY = 'multimedia_query';

  searchText = '';
  items: MultimediaItem[] = [];
  loading = true;
  loadError = false;
  backendAvailable = true;

  // Player popup
  playing?: MultimediaItem;
  playerReady = false;
  playerError = false;

  // Upload
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  uploading = false;
  uploadError = '';
  newDisplayName = '';
  newDescription = '';
  newCategory = '';
  newDuration = '';
  selectedFile: File | null = null;
  selectedThumb: File | null = null;

  // Per-row state
  downloading: Record<string, boolean> = {};
  deleting:    Record<string, boolean> = {};

  constructor(
    private readonly http: HttpClient,
    private readonly storage: LocalStorageService,
    private readonly auth: AuthService
  ) {}

  get canEdit(): boolean {
    return this.backendAvailable && (this.auth.isAdmin || this.auth.isDevOps);
  }

  get currentUsername(): string {
    return this.auth.currentUserValue?.username ?? '';
  }

  ngOnInit(): void {
    this.searchText = (this.storage.get(this.STORAGE_KEY_QUERY) as string) || '';
    this.loadItems();
  }

  loadItems(): void {
    this.loading = true;
    this.loadError = false;
    this.http.get<MultimediaItem[]>(this.apiUrl).subscribe({
      next: data => {
        this.backendAvailable = true;
        this.items = (data ?? []).map(item => this.normalizeItem(item));
        this.loading = false;
      },
      error: () => {
        this.backendAvailable = false;
        this.loadFromManifest();
      }
    });
  }

  private loadFromManifest(): void {
    interface ManifestItem {
      id: string; title: string; description?: string;
      file: string; thumbnail?: string; duration?: string;
    }
    this.http.get<ManifestItem[]>('assets/multimedia/manifest.json').subscribe({
      next: docs => {
        this.items = (docs ?? []).map(d => ({
          id: d.id,
          title: d.title,
          displayName: d.title,
          description: d.description,
          duration: d.duration,
          thumbnail: d.thumbnail,
          mimeType: this.guessMime(d.file),
          _assetFile: d.file
        } satisfies MultimediaItem));
        this.loading = false;
      },
      error: () => { this.items = []; this.loading = false; this.loadError = true; }
    });
  }

  private normalizeItem(item: MultimediaItem): MultimediaItem {
    // Asegurar que displayName tenga valor
    if (!item.displayName) item.displayName = item.title ?? item.fileName ?? '';
    return item;
  }

  // â”€â”€ Filtrado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  setSearchText(value: string): void {
    this.searchText = (value || '').trim();
    this.storage.set(this.STORAGE_KEY_QUERY, this.searchText);
  }

  get filteredItems(): MultimediaItem[] {
    const q = this.searchText.toLowerCase();
    if (!q) return this.items;
    return this.items.filter(i =>
      [i.displayName, i.title, i.fileName, i.description, i.category, i.uploadedBy]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }

  // â”€â”€ Helpers: tipo de fichero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  isVideo(item: MultimediaItem): boolean {
    if (item.mimeType) return item.mimeType.startsWith('video/');
    const src = item._assetFile ?? item.file ?? item.fileName ?? '';
    const ext = src.split('.').pop()?.toLowerCase() ?? '';
    return ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv'].includes(ext);
  }

  private guessMime(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    const map: Record<string, string> = {
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
      avi: 'video/x-msvideo', mkv: 'video/x-matroska', ogv: 'video/ogg',
      pdf: 'application/pdf', doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png'
    };
    return map[ext] ?? 'application/octet-stream';
  }

  mimeIcon(item: MultimediaItem): string {
    if (this.isVideo(item)) return 'smart_display';
    const m = item.mimeType ?? '';
    if (m.includes('pdf')) return 'picture_as_pdf';
    if (m.includes('word') || m.includes('document')) return 'description';
    if (m.includes('excel') || m.includes('spreadsheet')) return 'table_chart';
    if (m.includes('image')) return 'image';
    return 'insert_drive_file';
  }

  thumbnailUrl(item: MultimediaItem): string | null {
    if (!item.thumbnail) return null;
    // Si tiene filePath (estÃ¡ en volumen), usar el endpoint thumbnail
    if (item.filePath && !item._assetFile) {
      return `${this.apiUrl}/${item.id}/thumbnail`;
    }
    // asset relativo
    return item.thumbnail;
  }

  // â”€â”€ Abrir item (ojo / doble clic) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  openItem(item: MultimediaItem): void {
    if (this.isVideo(item)) {
      this.openPlayer(item);
    } else {
      const url = item._assetFile
        ? item._assetFile
        : `${this.apiUrl}/${item.id}/stream`;
      window.open(url, '_blank');
    }
  }

  // â”€â”€ Player popup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  openPlayer(item: MultimediaItem): void {
    this.playing = item;
    this.playerReady = true;
    this.playerError = false;
  }

  closePlayer(): void {
    this.playing = undefined;
    this.playerReady = false;
    this.playerError = false;
  }

  onPlayerError(): void {
    this.playerError = true;
  }

  playerSrc(item: MultimediaItem): string {
    if (item._assetFile) return item._assetFile;
    return `${this.apiUrl}/${item.id}/stream`;
  }

  // â”€â”€ Descarga â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  download(item: MultimediaItem): void {
    this.downloading[item.id] = true;
    if (item._assetFile) {
      // Asset estÃ¡tico: descarga directa
      const a = document.createElement('a');
      a.href = item._assetFile;
      a.download = item.fileName ?? item.title ?? item.id;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.downloading[item.id] = false;
      return;
    }
    const url = `${this.apiUrl}/${item.id}/stream`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.fileName ?? item.displayName ?? item.id;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        this.downloading[item.id] = false;
      },
      error: () => { this.downloading[item.id] = false; }
    });
  }

  // â”€â”€ Eliminar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  delete(item: MultimediaItem): void {
    if (!confirm(`Â¿Eliminar "${item.displayName ?? item.title}"?`)) return;
    this.deleting[item.id] = true;
    this.http.delete(`${this.apiUrl}/${item.id}`).subscribe({
      next: () => {
        this.items = this.items.filter(i => i.id !== item.id);
        this.deleting[item.id] = false;
      },
      error: () => { this.deleting[item.id] = false; }
    });
  }

  // â”€â”€ Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    if (this.selectedFile && !this.newDisplayName) {
      this.newDisplayName = this.selectedFile.name.replace(/\.[^.]+$/, '');
    }
  }

  onThumbSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedThumb = input.files?.[0] ?? null;
  }

  uploadItem(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadError = '';

    const fd = new FormData();
    fd.append('file', this.selectedFile);
    if (this.selectedThumb) fd.append('thumbnail', this.selectedThumb);
    fd.append('displayName', this.newDisplayName || this.selectedFile.name);
    fd.append('description', this.newDescription);
    fd.append('category', this.newCategory);
    if (this.newDuration) fd.append('duration', this.newDuration);
    fd.append('uploadedBy', this.currentUsername);

    this.http.post<MultimediaItem>(this.apiUrl, fd).subscribe({
      next: item => {
        this.items = [this.normalizeItem(item), ...this.items];
        this.resetUploadForm();
        this.uploading = false;
      },
      error: err => {
        this.uploadError = err?.error ?? 'Error subiendo fichero';
        this.uploading = false;
      }
    });
  }

  private resetUploadForm(): void {
    this.selectedFile = null;
    this.selectedThumb = null;
    this.newDisplayName = '';
    this.newDescription = '';
    this.newCategory = '';
    this.newDuration = '';
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  // â”€â”€ Formato â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  formatSize(bytes?: number): string {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  getLabel(item: MultimediaItem): string {
    return item.displayName || item.title || item.fileName || '';
  }
}


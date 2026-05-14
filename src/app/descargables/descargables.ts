import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../local-storage.service';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';

export interface RecursoDescargable {
  id: string;
  fileName: string;
  displayName: string;
  description?: string;
  category?: string;
  sizeBytes?: number;
  mimeType?: string;
  filePath?: string;
  uploadedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  // solo para registros que vienen del fallback de assets
  _assetPath?: string;
}

@Component({
  selector: 'app-descargables',
  standalone: true,
  templateUrl: './descargables.html',
  styleUrls: ['./descargables.css'],
  imports: [
    CommonModule,
    TranslateModule,
    MatIconModule,
    MatButtonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    BuscadorComponent
  ]
})
export class DescargablesComponent implements OnInit {
  private readonly STORAGE_KEY_FILTER = 'descargables_filter_v2';
  private readonly apiUrl = environment.baseUrl + 'recursos-descargables';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  searchText = '';
  recursos: RecursoDescargable[] = [];
  loading = true;
  loadError = false;

  // upload
  uploading = false;
  uploadError = '';
  newDisplayName = '';
  newDescription = '';
  newCategory = '';
  selectedFile: File | null = null;

  // si el backend no responde se usa este flag para desactivar subida/borrado
  backendAvailable = true;

  // acciones por id
  downloading: Record<string, boolean> = {};
  deleting: Record<string, boolean> = {};

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
    this.searchText = (this.storage.get(this.STORAGE_KEY_FILTER) as string) || '';
    this.loadRecursos();
  }

  loadRecursos(): void {
    this.loading = true;
    this.loadError = false;
    this.http.get<RecursoDescargable[]>(this.apiUrl).subscribe({
      next: data => {
        this.backendAvailable = true;
        this.recursos = data ?? [];
        this.loading = false;
      },
      error: () => {
        // Backend no disponible → fallback a assets/documents/index.json
        this.backendAvailable = false;
        this.loadFromAssets();
      }
    });
  }

  private loadFromAssets(): void {
    interface AssetDoc {
      name: string; path: string; size?: number;
      description?: string; descriptionKey?: string; modified?: string;
    }
    this.http.get<AssetDoc[]>('assets/documents/index.json').subscribe({
      next: docs => {
        this.recursos = (docs ?? []).map((d, i) => ({
          id: 'asset-' + i,
          fileName: d.path,
          displayName: d.name,
          description: d.description,
          sizeBytes: d.size,
          createdAt: d.modified,
          _assetPath: d.path
        }));
        this.loading = false;
      },
      error: () => { this.recursos = []; this.loading = false; this.loadError = true; }
    });
  }

  setSearchText(value: string): void {
    this.searchText = (value || '').trim();
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchText);
  }

  get filteredRecursos(): RecursoDescargable[] {
    const q = this.searchText.toLowerCase();
    if (!q) return this.recursos;
    return this.recursos.filter(r =>
      [r.displayName, r.fileName, r.description, r.category, r.uploadedBy]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }

  /** Abre el documento en una pestaña del navegador (para ver PDFs, imágenes, etc.) */
  openInTab(rec: RecursoDescargable): void {
    const url = rec._assetPath
      ? `assets/documents/${rec._assetPath}`
      : `${this.apiUrl}/${rec.id}/file?inline=true`;
    window.open(url, '_blank');
  }

  download(rec: RecursoDescargable): void {
    this.downloading[rec.id] = true;
    // Si es un recurso de assets (fallback), descarga desde assets/
    const url = rec._assetPath
      ? `assets/documents/${rec._assetPath}`
      : `${this.apiUrl}/${rec.id}/file`;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = rec.fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        this.downloading[rec.id] = false;
      },
      error: () => { this.downloading[rec.id] = false; }
    });
  }

  delete(rec: RecursoDescargable): void {
    if (!confirm(`¿Eliminar "${rec.displayName}"?`)) return;
    this.deleting[rec.id] = true;
    this.http.delete(`${this.apiUrl}/${rec.id}`).subscribe({
      next: () => {
        this.recursos = this.recursos.filter(r => r.id !== rec.id);
        this.deleting[rec.id] = false;
      },
      error: () => { this.deleting[rec.id] = false; }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    if (this.selectedFile && !this.newDisplayName) {
      this.newDisplayName = this.selectedFile.name;
    }
  }

  uploadRecurso(): void {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadError = '';

    const fd = new FormData();
    fd.append('file', this.selectedFile);
    fd.append('displayName', this.newDisplayName || this.selectedFile.name);
    fd.append('description', this.newDescription);
    fd.append('category', this.newCategory);
    fd.append('uploadedBy', this.currentUsername);

    this.http.post<RecursoDescargable>(this.apiUrl, fd).subscribe({
      next: rec => {
        this.recursos = [rec, ...this.recursos];
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
    this.newDisplayName = '';
    this.newDescription = '';
    this.newCategory = '';
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

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

  mimeIcon(mime?: string): string {
    if (!mime) return 'insert_drive_file';
    if (mime.includes('pdf')) return 'picture_as_pdf';
    if (mime.includes('word') || mime.includes('document')) return 'description';
    if (mime.includes('excel') || mime.includes('spreadsheet') || mime.includes('csv')) return 'table_chart';
    if (mime.includes('image')) return 'image';
    if (mime.includes('text')) return 'article';
    return 'insert_drive_file';
  }
}


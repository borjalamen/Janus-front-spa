import { Component, OnInit } from '@angular/core';
import { BuscadorComponent } from '../buscador/buscador';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../local-storage.service';

interface DocumentoIndexItem {
  name: string;
  path: string;
  size?: number;
  description?: string;
  descriptionKey?: string;
  modified?: string;
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
  private readonly STORAGE_KEY_FILTER = 'descargables_filter_v1';

  searchText = '';
  documentos: DocumentoIndexItem[] = [];
  loading = true;
  loadError = false;
  downloading: { [path: string]: boolean } = {};

  constructor(
    private http: HttpClient,
    private translate: TranslateService,
    private storage: LocalStorageService
  ) {}

  ngOnInit(): void {
    // recuperar filtre guardat
    const savedFilter = (this.storage.get(this.STORAGE_KEY_FILTER) as string) || '';
    this.searchText = savedFilter || '';

    const url = 'assets/documents/index.json';
    console.debug('Descargables: fetching', url);
    this.http.get<DocumentoIndexItem[]>(url)
      .subscribe({
        next: data => {
          console.debug('Descargables: index loaded', data);
          this.documentos = data ?? [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Descargables: error loading index', err);
          this.documentos = [];
          this.loading = false;
          this.loadError = true;
        }
      });
  }

  // desar i actualitzar text de cerca
  setSearchText(value: string) {
    this.searchText = (value || '').trim();
    this.storage.set(this.STORAGE_KEY_FILTER, this.searchText);
  }

  download(doc: DocumentoIndexItem) {
    const url = `assets/documents/${doc.path}`;
    this.downloading[doc.path] = true;
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.path;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
        this.downloading[doc.path] = false;
      },
      error: err => {
        console.error('Descarga fallida', err);
        this.downloading[doc.path] = false;
      }
    });
  }

  formatSize(bytes?: number): string {
    if (!bytes && bytes !== 0) return '';
    const kb = 1024;
    if (bytes < kb) return bytes + ' B';
    const mb = kb * kb;
    if (bytes < mb) return (bytes / kb).toFixed(1) + ' KB';
    return (bytes / mb).toFixed(2) + ' MB';
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch (e) {
      return iso;
    }
  }

  get filteredDocuments(): DocumentoIndexItem[] {
    const q = (this.searchText || '').trim().toLowerCase();
    if (!q) return this.documentos;
    return this.documentos.filter(doc => {
      const parts: string[] = [];
      parts.push(doc.name || '');
      parts.push(doc.path || '');
      if (doc.descriptionKey) parts.push(doc.descriptionKey);
      try {
        const trans = this.translate.instant(doc.descriptionKey || '');
        if (trans) parts.push(trans);
      } catch {}
      if (doc.description) parts.push(doc.description);
      if (doc.modified) parts.push(doc.modified);
      if (doc.size != null) parts.push(String(doc.size));

      const hay = parts.join(' ').toLowerCase();
      return hay.includes(q);
    });
  }
}

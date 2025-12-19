import { Component, OnInit } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { HttpClient } from '@angular/common/http';

interface DocumentoIndexItem {
  name: string;
  path: string;
  size?: number;
  description?: string;
}

@Component({
  selector: 'app-descargables',
  standalone: true,
  templateUrl: './descargables.html',
  styleUrls: ['./descargables.css'],
  imports: [CommonModule, TranslateModule, MatIconModule, MatButtonModule]
})
export class DescargablesComponent implements OnInit {
  documentos: DocumentoIndexItem[] = [];
  loading = true;
  loadError = false;
  downloading: { [path: string]: boolean } = {};

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
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
}

// src/app/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// cada document és només el nom del fitxer
export type BackendDocument = string;

@Injectable({ providedIn: 'root' })
export class DocumentService {
  // http://localhost:8080/api/ + documentos = http://localhost:8080/api/documentos
  private baseUrl = `${environment.baseUrl}documentos`;

  constructor(private http: HttpClient) {}

  // GET /getAllFolders
  getAllFolders(): Observable<(string | number)[]> {
    const url = `${this.baseUrl}/getAllFolders`;
    console.log('🔗 GET getAllFolders:', url);
    return this.http.get<(string | number)[]>(url);
  }

  // GET /getAllFiles?idProyecto=...
  getAllFiles(projectId: string | number): Observable<BackendDocument[]> {
    const params = new HttpParams().set('idProyecto', String(projectId));
    const url = `${this.baseUrl}/getAllFiles`;
    console.log('🔗 GET getAllFiles:', url, 'idProyecto:', projectId);
    return this.http.get<BackendDocument[]>(url, { params });
  }

  // POST /uploadDoc  (idProyecto + documento)
  uploadDocument(projectId: string | number, file: File) {
    const formData = new FormData();
    formData.append('idProyecto', String(projectId));
    formData.append('documento', file);

    const url = `${this.baseUrl}/uploadDoc`;
    console.log('🔗 POST uploadDoc:', url);
    return this.http.post(url, formData, {
      responseType: 'text'
    });
  }

  // DELETE /deleteFile?idProyecto=...&nombreArchivo=...
  deleteDocument(projectId: string | number, fileName: string) {
    const params = new HttpParams()
      .set('idProyecto', String(projectId))
      .set('nombreArchivo', fileName);

    const url = `${this.baseUrl}/deleteFile`;
    console.log('🔗 DELETE deleteFile:', url);
    return this.http.delete(url, {
      params,
      responseType: 'text'
    });
  }

  // DELETE /deleteAllFiles?idProyecto=...
  deleteProjectFiles(projectId: string | number) {
    const params = new HttpParams().set('idProyecto', String(projectId));
    const url = `${this.baseUrl}/deleteAllFiles`;
    console.log('🔗 DELETE deleteAllFiles:', url);
    return this.http.delete(url, {
      params,
      responseType: 'text'
    });
  }
}

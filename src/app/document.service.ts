// src/app/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// cada document és només el nom del fitxer
export type BackendDocument = string;

@Injectable({ providedIn: 'root' })
export class DocumentService {
  // En loc: http://localhost:8080/api/documentos
  private baseUrl = `${environment.baseUrl}/documentos`;

  constructor(private http: HttpClient) {}

  // GET /getAllFolders
  getAllFolders(): Observable<(string | number)[]> {
    return this.http.get<(string | number)[]>(`${this.baseUrl}/getAllFolders`);
  }

  // GET /getAllFiles?idProyecto=...
  getAllFiles(projectId: string | number): Observable<BackendDocument[]> {
    const params = new HttpParams().set('idProyecto', String(projectId));
    return this.http.get<BackendDocument[]>(`${this.baseUrl}/getAllFiles`, { params });
  }

  // POST /uploadDoc  (idProyecto + documento)
  uploadDocument(projectId: string | number, file: File) {
    const formData = new FormData();
    formData.append('idProyecto', String(projectId));
    formData.append('documento', file);

    return this.http.post(`${this.baseUrl}/uploadDoc`, formData, {
      responseType: 'text'
    });
  }

  // DELETE /deleteFile?idProyecto=...&nombreArchivo=...
  deleteDocument(projectId: string | number, fileName: string) {
    const params = new HttpParams()
      .set('idProyecto', String(projectId))
      .set('nombreArchivo', fileName);

    return this.http.delete(`${this.baseUrl}/deleteFile`, {
      params,
      responseType: 'text'
    });
  }

  // DELETE /deleteAllFiles?idProyecto=...
  deleteProjectFiles(projectId: string | number) {
    const params = new HttpParams().set('idProyecto', String(projectId));
    return this.http.delete(`${this.baseUrl}/deleteAllFiles`, {
      params,
      responseType: 'text'
    });
  }
}

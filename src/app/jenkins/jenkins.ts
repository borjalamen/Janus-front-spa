// src/app/jenkins/jenkins.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../auth.service';
import { environment } from '../../environments/environment';
import { Subscription } from 'rxjs';
import { BuscadorComponent } from '../buscador/buscador';
import { LocalStorageService } from '../local-storage.service';

interface JenkinsItem {
  id?: string;
  name: string;
  url: string;
  selected: boolean;
}

@Component({
  selector: 'app-jenkins',
  imports: [FormsModule, CommonModule, TranslateModule, MatIconModule, BuscadorComponent],
  standalone: true,
  templateUrl: './jenkins.html',
  styleUrls: ['./jenkins.css'],
})
export class Jenkins implements OnInit, OnDestroy {
  popupOpen = false;
  newName = '';
  newUrl = '';
  customJenkins: JenkinsItem[] = [];
  filteredJenkins: JenkinsItem[] = [];
  deletePopupOpen = false;
  jenkinsToDelete: JenkinsItem | null = null;
  deleteMode = false;

  // per saber si estem creant o editant
  editingJenkins: JenkinsItem | null = null;

  // baseUrl: http://localhost:8080/api/jenkins
  private baseUrl = `${environment.baseUrl}jenkins`;

  userRole: string = 'invitado';
  private authSubscription?: Subscription;

  private readonly STORAGE_KEY_JENKINS = 'jenkins_list';
  private readonly STORAGE_KEY_FILTER = 'jenkins_filter';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private storage: LocalStorageService
  ) {}

  ngOnInit() {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.userRole = user?.rol || 'invitado';
    });

    // restaurar filtre i llista de localStorage si existeixen
    const savedList = this.storage.getObject<JenkinsItem[]>(this.STORAGE_KEY_JENKINS);
    const savedFilter = this.storage.get(this.STORAGE_KEY_FILTER);

    if (savedList && savedList.length) {
      this.customJenkins = savedList;
      this.filteredJenkins = [...this.customJenkins];
    } else {
      this.loadFromBackend();
    }

    if (savedFilter) {
      this.filtrar(savedFilter);
    }
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  get canEditJenkins(): boolean {
    return this.userRole === 'admin' || this.userRole === 'devops';
  }

  // ========================
  //   MÉTODOS BACKEND
  // ========================

  loadFromBackend() {
    this.http.get<any[]>(`${this.baseUrl}/all`).subscribe({
      next: (data) => {
        this.customJenkins = data.map(d => ({
          id: d.id,
          name: d.nombre,
          url: d.url,
          selected: false
        }));
        this.filteredJenkins = [...this.customJenkins];
        this.saveListToLocalStorage();
      },
      error: (err) => console.error('Error cargando Jenkins', err)
    });
  }

  private saveListToLocalStorage() {
    this.storage.setObject(this.STORAGE_KEY_JENKINS, this.customJenkins);
  }

  // FILTRAR
  filtrar(query: string) {
    const q = (query || '').toLowerCase().trim();
    this.storage.set(this.STORAGE_KEY_FILTER, q);
    if (!q) {
      this.filteredJenkins = [...this.customJenkins];
    } else {
      this.filteredJenkins = this.customJenkins.filter(jk =>
        jk.name.toLowerCase().includes(q) ||
        jk.url.toLowerCase().includes(q)
      );
    }
  }

  // CREATE + UPDATE
  savePopup() {
    const body = {
      idProyecto: 'PROY-2025-X',
      nombre: this.newName,
      url: this.newUrl
    };

    // UPDATE
    if (this.editingJenkins && this.editingJenkins.id) {
      this.http.put<any>(`${this.baseUrl}/update/${this.editingJenkins.id}`, body)
        .subscribe({
          next: (updated) => {
            this.editingJenkins!.name = updated.nombre;
            this.editingJenkins!.url = updated.url;
            this.saveListToLocalStorage();
            this.closePopup();
            this.editingJenkins = null;
          },
          error: (err) => console.error('Error actualizando Jenkins', err)
        });
    } else {
      // CREATE
      this.http.post<any>(`${this.baseUrl}/create`, body).subscribe({
        next: (created) => {
          const newItem: JenkinsItem = {
            id: created.id,
            name: created.nombre,
            url: created.url,
            selected: false
          };
          this.customJenkins.push(newItem);
          this.filteredJenkins.push(newItem);
          this.saveListToLocalStorage();
          this.closePopup();
        },
        error: (err) => console.error('Error creando Jenkins', err)
      });
    }
  }

  // DELETE (individual o múltiple)
  deleteJenkins() {
    // individual
    if (this.jenkinsToDelete && this.jenkinsToDelete.id) {
      this.http.delete(`${this.baseUrl}/delete/${this.jenkinsToDelete.id}`)
        .subscribe({
          next: () => {
            this.customJenkins = this.customJenkins.filter(j => j !== this.jenkinsToDelete);
            this.filteredJenkins = this.filteredJenkins.filter(j => j !== this.jenkinsToDelete);
            this.saveListToLocalStorage();
            this.deletePopupOpen = false;
            this.jenkinsToDelete = null;
            this.deleteMode = false;
          },
          error: (err) => console.error('Error borrando Jenkins', err)
        });
      return;
    }

    // múltiples
    const toDelete = this.customJenkins.filter(jk => jk.selected && jk.id);
    const idsToDelete = toDelete.map(jk => jk.id);

    toDelete.forEach(jk => {
      this.http.delete(`${this.baseUrl}/delete/${jk.id}`).subscribe({
        next: () => {
          this.customJenkins = this.customJenkins.filter(j => j.id !== jk.id);
          this.filteredJenkins = this.filteredJenkins.filter(j => j.id !== jk.id);
          this.saveListToLocalStorage();
        },
        error: (err) => console.error('Error borrando Jenkins', err)
      });
    });

    this.deletePopupOpen = false;
    this.jenkinsToDelete = null;
    this.deleteMode = false;
  }

  // ========================
  //   POPUPS Y SELECCIÓN
  // ========================

  openPopupForCreate() {
    this.editingJenkins = null;
    this.newName = '';
    this.newUrl = '';
    this.popupOpen = true;
  }

  openPopupForEdit(jk: JenkinsItem, event: Event) {
    event.stopPropagation();
    if (!this.canEditJenkins) return;

    this.editingJenkins = jk;
    this.newName = jk.name;
    this.newUrl = jk.url;
    this.popupOpen = true;
  }

  closePopup() {
    this.popupOpen = false;
    this.newName = '';
    this.newUrl = '';
    this.editingJenkins = null;
  }

  onJenkinsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log('Fitxer seleccionat:', file);
    }
  }

  toggleDeleteMode() {
    this.deleteMode = !this.deleteMode;

    if (!this.deleteMode) {
      this.customJenkins.forEach(jk => jk.selected = false);
    }
  }

  toggleSelect(jk: { selected?: boolean }) {
    if (this.deleteMode) {
      jk.selected = !jk.selected;
    }
  }

  confirmDelete(jk?: JenkinsItem) {
    this.jenkinsToDelete = jk || null;
    this.deletePopupOpen = true;
  }

  cancelDelete() {
    this.deletePopupOpen = false;
    this.jenkinsToDelete = null;
  }

  openJenkins(jk: JenkinsItem, event: Event) {
    if (!this.deleteMode) {
      window.open(jk.url, '_blank');
    } else {
      this.toggleSelect(jk);
      event.preventDefault();
    }
  }
}

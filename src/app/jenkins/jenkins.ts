import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../auth.service';
import { Subscription } from 'rxjs';

interface JenkinsItem {
  id?: string;      
  name: string;
  url: string;
  selected: boolean;
}

@Component({
  selector: 'app-jenkins',
  imports: [FormsModule, CommonModule, TranslateModule],
  standalone: true,
  templateUrl: './jenkins.html',
  styleUrls: ['./jenkins.css'],
})
export class Jenkins implements OnInit, OnDestroy {

  popupOpen = false;
  newName = '';
  newUrl = '';
  customJenkins: JenkinsItem[] = [];
  deletePopupOpen = false;
  jenkinsToDelete: JenkinsItem | null = null;
  deleteMode = false;

  private baseUrl = 'http://localhost:8080/api/jenkins';

  userRole: string = 'invitado';
  private authSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Subscriu-te als canvis d'usuari
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.userRole = user?.rol || 'invitado';
    });

    this.loadFromBackend();
  }

  ngOnDestroy() {
    // Neteja la subscripció
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
      },
      error: (err) => console.error('Error cargando Jenkins', err)
    });
  }

  savePopup() {
    const body = {
      idProyecto: 'PROY-2025-X',   
      nombre: this.newName,
      url: this.newUrl
    };

    this.http.post<any>(`${this.baseUrl}/create`, body).subscribe({
      next: (created) => {
        this.customJenkins.push({
          id: created.id,     
          name: created.nombre,
          url: created.url,
          selected: false
        });
        this.closePopup();
      },
      error: (err) => console.error('Error creando Jenkins', err)
    });
  }

  deleteJenkins() {
    if (this.jenkinsToDelete && this.jenkinsToDelete.id) {
      this.http.delete(`${this.baseUrl}/delete/${this.jenkinsToDelete.id}`).subscribe({
        next: () => {
          this.customJenkins = this.customJenkins.filter(j => j !== this.jenkinsToDelete);
          this.deletePopupOpen = false;
          this.jenkinsToDelete = null;
          this.deleteMode = false;
        },
        error: (err) => console.error('Error borrando Jenkins', err)
      });
      return;
    }

    const toDelete = this.customJenkins.filter(jk => jk.selected && jk.id);
    toDelete.forEach(jk => {
      this.http.delete(`${this.baseUrl}/delete/${jk.id}`).subscribe({
        next: () => {
          this.customJenkins = this.customJenkins.filter(j => j.id !== jk.id);
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

  openPopup() {
    this.popupOpen = true;
  }

  closePopup() {
    this.popupOpen = false;
    this.newName = '';
    this.newUrl = '';
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

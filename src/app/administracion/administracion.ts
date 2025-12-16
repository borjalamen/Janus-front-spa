import { Component, OnInit } from '@angular/core';
import { BuscadorComponent } from '../buscador/buscador';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth.service';

interface UsuariBackend {
  id?: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  status: string;
}

@Component({
  selector: 'app-administracion',
  templateUrl: './administracion.html',
  styleUrls: ['./administracion.css'],
  standalone: true,
  imports: [BuscadorComponent, CommonModule, MatIconModule, FormsModule, TranslateModule]
})
export class AdministracionComponent implements OnInit {
  title = 'Administración';

  mostrarPopup = false;
  mostrarPopupDelete = false;

  nouUsuari = {
    nombre: '',
    contrasenya: '',
    email: '',
    rols: {
      admin: false,
      consultor: false,
      devops: false
    }
  };

  usuaris: UsuariBackend[] = [];
  usuarisFiltrats: UsuariBackend[] = [];

  usuariEditant: UsuariBackend | null = null;
  usuariAEsborrar: UsuariBackend | null = null;

  private baseUrl = `${environment.baseUrl}users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarUsuaris();
  }

  // ===== ROLES FRONT =====
  get canEdit(): boolean {
    return this.authService.canEdit; // admin o devops
  }

  // ===== BACKEND =====

  carregarUsuaris() {
    this.http.get<UsuariBackend[]>(`${this.baseUrl}/all`).subscribe({
      next: data => {
        this.usuaris = data;
        this.usuarisFiltrats = [...this.usuaris];
      },
      error: err => console.error('Error carregant usuaris', err)
    });
  }

  guardarUsuari() {
    const rolsSeleccionats = Object.entries(this.nouUsuari.rols)
      .filter(([_, v]) => v)
      .map(([k]) => {
        if (k === 'admin') return 'ADMIN';
        if (k === 'consultor') return 'CONSULTOR';
        return 'DEV';
      });

    if (!this.nouUsuari.nombre || !this.nouUsuari.contrasenya || rolsSeleccionats.length === 0) {
      alert('Introduce nombre, contraseña y al menos un rol');
      return;
    }

    const body = {
      username: this.nouUsuari.nombre,
      password: this.nouUsuari.contrasenya,
      fullName: this.nouUsuari.nombre,
      email: this.nouUsuari.email || `${this.nouUsuari.nombre.toLowerCase()}@minsait.com`,
      roles: rolsSeleccionats,
      status: 'ACTIVE'
    };

    if (this.usuariEditant && this.usuariEditant.id) {
      // UPDATE
      this.http.put<UsuariBackend>(`${this.baseUrl}/update/${this.usuariEditant.id}`, body)
        .subscribe({
          next: updated => {
            const idx = this.usuaris.findIndex(u => u.id === updated.id);
            if (idx !== -1) this.usuaris[idx] = updated;
            this.usuarisFiltrats = [...this.usuaris];
            this.tancarPopup();
          },
          error: err => console.error('Error actualitzant usuari', err)
        });
    } else {
      // CREATE
      this.http.post<UsuariBackend>(`${this.baseUrl}/create`, body).subscribe({
        next: created => {
          this.usuaris.push(created);
          this.usuarisFiltrats = [...this.usuaris];
          this.tancarPopup();
        },
        error: err => console.error('Error creant usuari', err)
      });
    }
  }

  esborrarUsuari() {
    if (!this.usuariAEsborrar || !this.usuariAEsborrar.id) {
      this.mostrarPopupDelete = false;
      return;
    }

    this.http.delete(`${this.baseUrl}/delete/${this.usuariAEsborrar.id}`).subscribe({
      next: () => {
        this.usuaris = this.usuaris.filter(u => u.id !== this.usuariAEsborrar!.id);
        this.usuarisFiltrats = [...this.usuaris];
        this.mostrarPopupDelete = false;
        this.usuariAEsborrar = null;
      },
      error: err => console.error('Error esborrant usuari', err)
    });
  }

  // ===== FRONT =====

  filtrar(valor: string) {
    if (!valor) {
      this.usuarisFiltrats = [...this.usuaris];
    } else {
      const v = valor.toLowerCase();
      this.usuarisFiltrats = this.usuaris.filter(u =>
        u.fullName.toLowerCase().includes(v) ||
        u.roles.join(', ').toLowerCase().includes(v) ||
        u.email.toLowerCase().includes(v)
      );
    }
  }

  obrirPopupCrear() {
    this.usuariEditant = null;
    this.nouUsuari = {
      nombre: '',
      contrasenya: '',
      email: '',
      rols: { admin: false, consultor: false, devops: false }
    };
    this.mostrarPopup = true;
  }

  obrirPopupEditar(usuari: UsuariBackend) {
    this.usuariEditant = usuari;
    this.nouUsuari = {
      nombre: usuari.username,
      contrasenya: '',
      email: usuari.email,
      rols: {
        admin: usuari.roles.includes('ADMIN'),
        consultor: usuari.roles.includes('CONSULTOR'),
        devops: usuari.roles.includes('DEV')
      }
    };
    this.mostrarPopup = true;
  }

  tancarPopup() {
    this.mostrarPopup = false;
    this.usuariEditant = null;
  }

  confirmarEsborrar(usuari: UsuariBackend) {
    this.usuariAEsborrar = usuari;
    this.mostrarPopupDelete = true;
  }

  cancelarEsborrar() {
    this.mostrarPopupDelete = false;
    this.usuariAEsborrar = null;
  }
}

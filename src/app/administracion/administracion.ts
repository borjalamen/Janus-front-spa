import { Component, OnInit } from '@angular/core';
import { BuscadorComponent } from '../buscador/buscador';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
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
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    TranslateModule,
    BuscadorComponent,
    MatSlideToggleModule
  ]
})
export class AdministracionComponent implements OnInit {
  title = 'Administración';

  // CONTROL DE PESTAÑAS (SCENARIOS)
  // Options: 'USERS', 'APP', 'PARAM', 'DB'
  activeTab: string = 'USERS';

  // ESTADOS POPUPS USUARIOS
  mostrarPopup = false;
  mostrarPopupDelete = false; // Ahora actuará como "Inhabilitar"

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

  // ESTADOS NUEVAS SECCIONES
  selectedRoleToDisable: string = '';
  appVersion: string = '1.0.2'; // Ejemplo

  private baseUrl = `${environment.baseUrl}/users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarUsuaris();
  }

  get canEdit(): boolean {
    return this.authService.canEdit; 
  }

  // ===== NAVEGACIÓN =====
  cambiarTab(tab: string) {
    this.activeTab = tab;
  }

  // ===== LOGICA USUARIOS (Scenario 1) =====
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
      this.http.put<UsuariBackend>(`${this.baseUrl}/update/${this.usuariEditant.id}`, body)
        .subscribe({
          next: updated => {
            const idx = this.usuaris.findIndex(u => u.id === updated.id);
            if (idx !== -1) this.usuaris[idx] = updated;
            this.filtrar(''); 
            this.tancarPopup();
          },
          error: err => console.error('Error actualitzant usuari', err)
        });
    } else {
      this.http.post<UsuariBackend>(`${this.baseUrl}/create`, body).subscribe({
        next: created => {
          this.usuaris.push(created);
          this.filtrar('');
          this.tancarPopup();
        },
        error: err => console.error('Error creant usuari', err)
      });
    }
  }

  // Scenario 1: "Inhabilitar usuario" (Reutilizamos la lógica de borrar o hacemos update status)
  inhabilitarUsuari() {
    if (!this.usuariAEsborrar || !this.usuariAEsborrar.id) {
      this.mostrarPopupDelete = false;
      return;
    }
    // NOTA: Aquí podrías llamar a un endpoint /disable en vez de /delete si existiera.
    // Mantenemos delete como pedía tu lógica original, pero la UI dirá "Inhabilitar".
    this.http.delete(`${this.baseUrl}/delete/${this.usuariAEsborrar.id}`).subscribe({
      next: () => {
        this.usuaris = this.usuaris.filter(u => u.id !== this.usuariAEsborrar!.id);
        this.filtrar('');
        this.mostrarPopupDelete = false;
        this.usuariAEsborrar = null;
      },
      error: err => console.error('Error inhabilitando usuari', err)
    });
  }

  filtrar(valor: string) {
    // Si valor viene de un evento, asegúrate de capturarlo, si viene directo es string
    // Ajuste simple:
    const v = typeof valor === 'string' ? valor.toLowerCase() : ''; 
    
    if (!v) {
      this.usuarisFiltrats = [...this.usuaris];
    } else {
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

  confirmarInhabilitar(usuari: UsuariBackend) {
    this.usuariAEsborrar = usuari;
    this.mostrarPopupDelete = true;
  }

  tancarPopup() {
    this.mostrarPopup = false;
    this.usuariEditant = null;
  }

  cancelarInhabilitar() {
    this.mostrarPopupDelete = false;
    this.usuariAEsborrar = null;
  }

  // ===== NUEVAS FUNCIONES (DUMMY) =====
  
  // Scenario 2: App
  inhabilitarPorRol() {
    alert(`Inhabilitando acceso para el rol: ${this.selectedRoleToDisable}`);
  }

  // Scenario 3: Parametrización
  cambiarVersion() {
    alert(`Versión cambiada exitosamente a: ${this.appVersion}`);
  }

  // Scenario 4: BBDD (Visual Only)
  accionBBDD(tipo: string) {
    console.log(`Acción de BBDD solicitada: ${tipo}`);
  }
}
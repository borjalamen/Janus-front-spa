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
  cvPath?: string;
}

interface BackupVersion {
  id: string;
  fecha: string;
  descripcion: string;
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

  // ESTADOS BBDD
  mostrarPopupBorrado = false;
  mostrarPopupRestore = false;
  mostrarPopupBackup = false;
  
  opcionesBorrado = [
    { value: 'usuarios', label: 'Usuarios inactivos' },
    { value: 'documentos', label: 'Documentos huérfanos' },
    { value: 'logs', label: 'Logs antiguos' },
    { value: 'sesiones', label: 'Sesiones expiradas' },
    { value: 'todos', label: 'Todos los registros marcados' }
  ];
  selectedBorrado: string[] = [];

  opcionesBackup = [
    { value: 'usuarios', label: 'Usuarios' },
    { value: 'documentos', label: 'Documentos' },
    { value: 'configuracion', label: 'Configuración' },
    { value: 'completo', label: 'Backup completo' }
  ];
  selectedBackup: string[] = [];

  versionesRestore: BackupVersion[] = [];
  selectedRestore: string = '';

  private baseUrl = `${environment.baseUrl}users`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.carregarUsuaris();
    this.cargarVersion();
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

  // ===== NUEVAS FUNCIONES =====
  
  // Scenario 2: App - Quitar rol de los usuarios
  inhabilitarPorRol() {
    if (!this.selectedRoleToDisable) {
      alert('Por favor, selecciona un rol para inhabilitar');
      return;
    }

    const usuariosConRol = this.usuaris.filter(u => u.roles.includes(this.selectedRoleToDisable));
    
    if (usuariosConRol.length === 0) {
      alert(`No hay usuarios con el rol ${this.selectedRoleToDisable}`);
      return;
    }

    const confirmacion = confirm(`¿Estás seguro de quitar el rol ${this.selectedRoleToDisable} a ${usuariosConRol.length} usuario(s)?`);
    if (!confirmacion) return;

    let completados = 0;
    let errores = 0;

    usuariosConRol.forEach(usuari => {
      const nuevosRoles = usuari.roles.filter(r => r !== this.selectedRoleToDisable);
      
      const body = {
        username: usuari.username,
        fullName: usuari.fullName,
        email: usuari.email,
        roles: nuevosRoles.length > 0 ? nuevosRoles : ['CONSULTOR'], // Si queda sin roles, asignar CONSULTOR
        status: usuari.status
      };

      this.http.put<UsuariBackend>(`${this.baseUrl}/update/${usuari.id}`, body)
        .subscribe({
          next: updated => {
            const idx = this.usuaris.findIndex(u => u.id === updated.id);
            if (idx !== -1) this.usuaris[idx] = updated;
            completados++;
            if (completados + errores === usuariosConRol.length) {
              this.filtrar('');
              alert(`Rol ${this.selectedRoleToDisable} eliminado de ${completados} usuario(s)${errores > 0 ? `. Errores: ${errores}` : ''}`);
              this.selectedRoleToDisable = '';
            }
          },
          error: err => {
            console.error('Error actualizando usuario', err);
            errores++;
            if (completados + errores === usuariosConRol.length) {
              this.filtrar('');
              alert(`Rol ${this.selectedRoleToDisable} eliminado de ${completados} usuario(s). Errores: ${errores}`);
            }
          }
        });
    });
  }

  // Scenario 3: Parametrización
  cambiarVersion() {
    if (!this.appVersion || this.appVersion.trim() === '') {
      alert('Por favor, introduce una versión válida');
      return;
    }

    const body = { version: this.appVersion.trim() };
    
    this.http.put<any>(`${environment.baseUrl}config/version`, body)
      .subscribe({
        next: () => {
          alert(`Versión actualizada exitosamente a: ${this.appVersion}`);
        },
        error: err => {
          console.error('Error actualizando versión', err);
          alert('Error al actualizar la versión');
        }
      });
  }

  // Cargar la versión actual desde el backend
  cargarVersion() {
    this.http.get<string>(`${environment.baseUrl}config/parametrization/version`, { responseType: 'text' as 'json' })
      .subscribe({
        next: version => {
          this.appVersion = version;
        },
        error: err => console.error('Error cargando versión', err)
      });
  }

  // Scenario 4: BBDD
  accionBBDD(tipo: string) {
    console.log(`Acción de BBDD solicitada: ${tipo}`);
    if (tipo === 'borrado') {
      this.selectedBorrado = [];
      this.mostrarPopupBorrado = true;
    } else if (tipo === 'restore') {
      this.cargarVersionesRestore();
      this.selectedRestore = '';
      this.mostrarPopupRestore = true;
    } else if (tipo === 'backup') {
      this.selectedBackup = [];
      this.mostrarPopupBackup = true;
    }
  }

  cargarVersionesRestore() {
    // Simular carga de versiones desde el backend
    this.http.get<BackupVersion[]>(`${environment.baseUrl}db/backups`).subscribe({
      next: versions => {
        this.versionesRestore = versions;
      },
      error: () => {
        // Si falla, mostrar versiones de ejemplo
        this.versionesRestore = [
          { id: 'bk_001', fecha: '2026-01-27 10:30', descripcion: 'Backup automático' },
          { id: 'bk_002', fecha: '2026-01-26 18:00', descripcion: 'Backup pre-actualización' },
          { id: 'bk_003', fecha: '2026-01-25 12:00', descripcion: 'Backup completo semanal' }
        ];
      }
    });
  }

  ejecutarBorrado() {
    if (this.selectedBorrado.length === 0) {
      alert('Selecciona al menos un tipo de registro para borrar');
      return;
    }
    const confirmacion = confirm(`¿Estás seguro de eliminar permanentemente: ${this.selectedBorrado.join(', ')}?`);
    if (!confirmacion) return;

    this.http.post(`${environment.baseUrl}db/borrado-fisico`, { tipos: this.selectedBorrado }).subscribe({
      next: () => {
        alert('Borrado físico ejecutado correctamente');
        this.mostrarPopupBorrado = false;
      },
      error: err => {
        console.error('Error en borrado físico', err);
        alert('Error al ejecutar el borrado físico');
      }
    });
  }

  ejecutarRestore() {
    if (!this.selectedRestore) {
      alert('Selecciona una versión para restaurar');
      return;
    }
    const version = this.versionesRestore.find(v => v.id === this.selectedRestore);
    const confirmacion = confirm(`¿Estás seguro de restaurar a la versión: ${version?.fecha}?`);
    if (!confirmacion) return;

    this.http.post(`${environment.baseUrl}db/restore`, { backupId: this.selectedRestore }).subscribe({
      next: () => {
        alert('Base de datos restaurada correctamente');
        this.mostrarPopupRestore = false;
      },
      error: err => {
        console.error('Error en restore', err);
        alert('Error al restaurar la base de datos');
      }
    });
  }

  ejecutarBackup() {
    if (this.selectedBackup.length === 0) {
      alert('Selecciona al menos un elemento para incluir en el backup');
      return;
    }

    this.http.post(`${environment.baseUrl}db/backup`, { elementos: this.selectedBackup }).subscribe({
      next: () => {
        alert('Backup generado correctamente');
        this.mostrarPopupBackup = false;
      },
      error: err => {
        console.error('Error generando backup', err);
        alert('Error al generar el backup');
      }
    });
  }

  cerrarPopupBBDD() {
    this.mostrarPopupBorrado = false;
    this.mostrarPopupRestore = false;
    this.mostrarPopupBackup = false;
  }

  toggleSeleccionBorrado(valor: string) {
    const idx = this.selectedBorrado.indexOf(valor);
    if (idx > -1) {
      this.selectedBorrado.splice(idx, 1);
    } else {
      this.selectedBorrado.push(valor);
    }
  }

  toggleSeleccionBackup(valor: string) {
    const idx = this.selectedBackup.indexOf(valor);
    if (idx > -1) {
      this.selectedBackup.splice(idx, 1);
    } else {
      this.selectedBackup.push(valor);
    }
  }

  // Obtener fecha de la versión seleccionada
  get fechaRestoreSeleccionada(): string {
    const version = this.versionesRestore.find(v => v.id === this.selectedRestore);
    return version?.fecha || '';
  }

  // Ver CV del usuario
  verCV(usuari: UsuariBackend) {
    if (usuari.cvPath) {
      window.open(`${environment.baseUrl}files/cv/${usuari.id}`, '_blank');
    }
  }
}
import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatSidenavModule } from "@angular/material/sidenav";
import { MatListModule } from "@angular/material/list";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonModule } from "@angular/material/button"; 
import { MatIconModule } from "@angular/material/icon";
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { LoginDialogComponent } from './login-dialog/login-dialog';
import { DocumentsComponent } from './documents/documents';
import { ProjectsComponent } from './projects/projects';
import { ProcedimientosComponent } from './procedimientos/procedimientos';
import { FormacionComponent } from './formacion/formacion';
import { PlanificacionComponent } from './planificacion/planificacion';
import { AdministracionComponent } from './administracion/administracion';
import { BuscadorComponent } from './buscador/buscador';
import { ApiService } from './api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    RouterModule,
    MatSidenavModule,
    MatListModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    LoginDialogComponent,
    DocumentsComponent,
    ProjectsComponent,
    ProcedimientosComponent,
    FormacionComponent,
    PlanificacionComponent,
    AdministracionComponent,
    BuscadorComponent,
  ]
})
export class AppComponent implements OnInit {
  title = 'JanusHUB.v1';
  activeSection: string = 'home';
  appVersion: string | null = null;
  isScrolled: boolean = false;

  // Variables de login
  username: string | null = null;
  rol: string | null = null;

  constructor(public dialog: MatDialog, private api: ApiService) {}

  ngOnInit() {
    this.api.fetchVersion().subscribe({
      next: (version) => {
        this.appVersion = version?.trim() || 'Desconocida';
      },
      error: (err) => {
        this.appVersion = 'No disponible';
        console.error('Error obteniendo versión:', err);
      }
    });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollY = window.pageYOffset
      || document.documentElement.scrollTop
      || document.body.scrollTop
      || 0;
    this.isScrolled = scrollY > 20; 
  }

  // Abrir el diálogo de login
  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '400px',
      maxHeight: 'none',
      panelClass: 'login-model'
    });

    // Recoger el resultado al cerrar el diálogo
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.username = result.username;
        this.rol = result.rol;
        console.log('Usuario:', this.username, 'Rol:', this.rol);

        // Ajustar el menú según rol
        this.ajustarMenuPorRol();
      }
    });
  }

  // Ajusta la visibilidad de secciones según rol
  private ajustarMenuPorRol() {
    // Por ejemplo, aquí podrías activar/desactivar secciones
    // Actualmente, solo logueamos
    console.log('Ajustando menú para rol:', this.rol);
    // Si quieres, puedes agregar flags como:
    // this.showAdministracion = this.rol === 'Administrador';
    // this.showBitacora = this.rol === 'Administrador' || this.rol === 'Devops';
  }

  setActive(section: string) {
    this.activeSection = section;
  }

  logout() {
    this.username = null;
    this.rol = null;
    this.activeSection = 'home';
    console.log('Usuario desconectado');
  }
}

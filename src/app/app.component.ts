import { Component, OnInit } from '@angular/core';
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
import { RouterModule } from '@angular/router';
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

  constructor(public dialog: MatDialog, private api: ApiService) {}

  ngOnInit() {
    this.api.fetchVersion().subscribe({
      next: (version) => {
        const sanitized = version?.trim();
        this.appVersion = sanitized || 'Desconeguda';
      },
      error: (err) => {
        this.appVersion = 'No disponible';
        console.error('Error obtenint versió:', err);
      }
    });
  }

  openLoginDialog(): void {
    this.dialog.open(LoginDialogComponent, {
      width: '400px',
      maxHeight: 'none',
      panelClass: 'login-model'
    });
  }

  setActive(section: string) {
    this.activeSection = section;
  }
}
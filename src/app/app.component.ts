import { Component } from '@angular/core';
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
    BuscadorComponent 
  ]
})
export class AppComponent {
  title = 'JanusHUB.v1';
  activeSection: string = 'home'; // controla què es mostra

  constructor(public dialog: MatDialog) {}

  openLoginDialog(): void {
    this.dialog.open(LoginDialogComponent, {
      width: '400px',
      maxHeight: 'none',
      panelClass: 'login-model'
    });
  }

  // Funció per canviar secció
  setActive(section: string) {
    this.activeSection = section;
  }
}

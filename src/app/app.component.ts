import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';

import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';

import { LoginDialogComponent } from './login-dialog/login-dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,       // necessari per usar [routerLink]
    RouterOutlet,

    // Angular Material
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,

    // Componente de diàleg
    LoginDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username: string = '';
  rol: Rol = 'invitado';
  appVersion: string | null = null;

  constructor(private dialog: MatDialog) {}

  // Obrir el diàleg de login, permet tancar fent clic fora
  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '350px',
      disableClose: false  // <-- ara es pot tancar clicant fora
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.username = result.username;
        this.rol = result.rol;
        console.log("Usuario logueado:", this.username);
        console.log("Rol asignado:", this.rol);
      }
    });
  }

  logout(): void {
    this.username = '';
    this.rol = 'invitado';
    console.log("Se ha cerrado sesión, rol actual:", this.rol);
  }

  canShow(menuItem: string): boolean {
    switch (menuItem) {
      case 'bienvenida': return true;
      case 'proyectos': return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'procedimientos': return ['devops', 'admin'].includes(this.rol);
      case 'documentos': return ['devops', 'admin'].includes(this.rol);
      case 'formacion': return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'planificacion': return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'administracion': return ['admin'].includes(this.rol);
      case 'bitacora': return ['devops', 'admin'].includes(this.rol);
      default: return false;
    }
  }
}

import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule } from '@angular/router';
import { LoginDialogComponent } from './login-dialog/login-dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    LoginDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username: string = '';
  rol: Rol = 'invitado';
  appVersion: string = '1.0.0';

  constructor(private dialog: MatDialog) {}

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Recibimos username y rol desde el diálogo
        this.username = result.username;
        this.rol = result.rol;
      }
    });
  }

  // Función para determinar si un menú puede ser accedido
  canAccess(menuItem: string): boolean {
    switch(menuItem) {
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

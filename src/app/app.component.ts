import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';        // ⬅ NECESARIO
import { MatSidenavModule } from '@angular/material/sidenav';  // ⬅ NECESARIO
import { Router } from '@angular/router';
import { LoginDialogComponent } from './login-dialog/login-dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,      // ⬅ IMPORTANTE
    MatSidenavModule,   // ⬅ IMPORTANTE
    LoginDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  username: string = '';
  rol: Rol = 'invitado';

  constructor(
    private dialog: MatDialog,
    private router: Router
  ) {}

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.username = result.username;
        this.rol = result.rol;
      }
    });
  }

  navegar(ruta: string) {
    this.router.navigate([`/${ruta}`]);
  }

  canShow(menuItem: string): boolean {
    switch(menuItem) {
      case 'bienvenida': return true;
      case 'proyectos':
        return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'procedimientos':
        return ['devops', 'admin'].includes(this.rol);
      case 'documentos':
        return ['devops', 'admin'].includes(this.rol);
      case 'formacion':
        return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'planificacion':
        return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'administracion':
        return ['admin'].includes(this.rol);
      case 'bitacora':
        return ['devops', 'admin'].includes(this.rol);
      default:
        return false;
    }
  }
}

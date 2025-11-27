import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';   // <-- NECESARIO para mat-nav-list
import { LoginDialogComponent } from './login-dialog/login-dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,           // <-- IMPORT SOLUCIÓN ERROR
    LoginDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  username: string = '';
  rol: Rol = 'invitado';   // Rol inicial para usuarios no logueados
  isScrolled = false;

  constructor(private dialog: MatDialog) {
    // Listener para cambiar estilo de toolbar si haces scroll
    window.addEventListener('scroll', () => {
      this.isScrolled = window.scrollY > 10;
    });
  }

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {

        // Guardamos datos de login
        this.username = result.username;
        this.rol = result.rol;

        console.log("Usuario logueado:", this.username, "Rol:", this.rol);
      }
    });
  }

  // Control universal de permisos del menú
  canShow(menuItem: string): boolean {
    switch(menuItem) {
      case 'bienvenida': 
        return true;

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
        return this.rol === 'admin';

      case 'bitacora':
        return ['devops', 'admin'].includes(this.rol);

      default:
        return false;
    }
  }
}

import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { LoginDialogComponent } from './login-dialog/login-dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, LoginDialogComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username: string = '';
  rol: Rol = 'invitado';

  constructor(private dialog: MatDialog, private router: Router) {}

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.username = result.username;
        this.rol = result.rol;
      }
    });
  }

  /** 🔐 Permisos por rol */
  puedeAcceder(ruta: string): boolean {
    const permisos = {
      invitado: ['home'],
      consultor: ['home', 'projects', 'formacion', 'planificacion'],
      devops: ['home', 'projects', 'procedimientos', 'documents', 'formacion', 'planificacion', 'bitacora'],
      admin: ['home', 'projects', 'procedimientos', 'documents', 'formacion', 'planificacion', 'administracion', 'bitacora']
    };

    return permisos[this.rol].includes(ruta);
  }

  /** 🚦 Control de navegación */
  navegar(ruta: string): void {
    if (this.puedeAcceder(ruta)) {
      this.router.navigate([`/${ruta}`]);
    } else {
      alert("❌ No tienes permisos para acceder a esta sección.");
      this.router.navigate(['/home']);
    }
  }
}

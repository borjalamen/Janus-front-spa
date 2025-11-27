import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { RouterModule, Router } from '@angular/router';
import { LoginDialogComponent } from './login-dialog/login-dialog';
import { MatDialog } from '@angular/material/dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    RouterModule,
    LoginDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username: string = '';
  rol: Rol = 'invitado';
  appVersion = '1.0.0';

  constructor(private router: Router, private dialog: MatDialog) {}

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent);

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.username = result.username;
        this.rol = result.rol;
      }
    });
  }

  canAccess(menuItem: string): boolean {
    switch(menuItem) {
      case 'home': return true;
      case 'projects': return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'procedimientos': return ['devops', 'admin'].includes(this.rol);
      case 'documents': return ['devops', 'admin'].includes(this.rol);
      case 'formacion': return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'planificacion': return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'administracion': return ['admin'].includes(this.rol);
      case 'bitacora': return ['devops', 'admin'].includes(this.rol);
      default: return false;
    }
  }

  tryNavigate(menuItem: string): void {
    if(this.canAccess(menuItem)) {
      this.router.navigate([menuItem === 'home' ? '/' : menuItem]);
    } else {
      alert('No tienes permiso para acceder a esta sección.');
    }
  }
}

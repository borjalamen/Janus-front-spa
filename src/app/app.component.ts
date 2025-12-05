import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

// Angular Material Sidenav + List
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

// Router (routerLink, router-outlet)
import {
  RouterLink,
  RouterLinkWithHref,
  RouterOutlet
} from '@angular/router';

import { LoginDialogComponent } from './login-dialog/login-dialog';
import { UsuarioComponent } from './usuari/usuari';
import { HttpClient } from '@angular/common/http';

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
    RouterOutlet,
    RouterLink,
    RouterLinkWithHref,
    LoginDialogComponent,
    UsuarioComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username: string = '';
  rol: Rol = 'admin';
  showUserMenu = false;

  userMenuOpen = false;
  appVersion?: string;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient          // 👈 afegit
  ) {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.username = user.username;
      this.rol = user.rol;
    }

    // cridem al backend per la versió
    this.loadVersion();
  }

  // 🔹 Crida al back per obtenir la versió
  loadVersion() {
  console.log('CRIDANT /api/config/all');

  this.http.get<any>('http://localhost:8080/api/config/all')
    .subscribe({
      next: (data) => {
        console.log('RESPUESTA VERSION:', data);
        this.appVersion = data[0]; 
      },
      error: (err) => {
        console.error('ERROR VERSION:', err);
        this.appVersion = 'error obteniendo versión';
      }
    });
}

  openLoginDialog(): void {
    const dialogRef = this.dialog.open(LoginDialogComponent, {
      width: '400px',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.username = result.username;
        this.rol = result.rol;
      } else {
        // Si es tanca el popup sense login → usuario invitado
        this.username = '';
        this.rol = 'invitado';
      }
    });
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.userMenuOpen = this.showUserMenu;
  }

  logout() {
    localStorage.removeItem('user');

    this.username = '';
    this.rol = 'invitado';
    this.showUserMenu = false;
    this.userMenuOpen = false;

    localStorage.setItem('user', JSON.stringify({
      username: '',
      rol: 'invitado'
    }));

    this.router.navigate(['/home']);
  }

  canShow(menuItem: string): boolean {
    switch (menuItem) {
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
        case 'infraestructura':
          return ['devops', 'admin','consultor'].includes(this.rol);
      default:
        return false;
    }
  }

  abrirSeccionUsuario() {
    this.showUserMenu = false;
    this.userMenuOpen = false;
    this.router.navigate(['/usuario']);
  }
}

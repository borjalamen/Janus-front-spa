import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';

// 👇 Angular Material Sidenav + List
import {
  MatSidenavModule
} from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

// 👇 Router (routerLink, router-outlet)
import {
  RouterLink,
  RouterLinkWithHref,
  RouterOutlet
} from '@angular/router';

import { LoginDialogComponent } from './login-dialog/login-dialog';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatSidenavModule,    // 👈 para mat-sidenav-container, mat-sidenav, mat-sidenav-content
    MatListModule,       // 👈 para mat-nav-list
    RouterOutlet,        // 👈 para <router-outlet>
    RouterLink,          // 👈 para [routerLink]
    RouterLinkWithHref,  // 👈 opcional pero recomendable
    LoginDialogComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  username: string = '';
  rol: Rol = 'admin';
  showUserMenu = false;

  // 👇 propiedades que faltaban en el template
  userMenuOpen = false;
  appVersion?: string;

  constructor(private dialog: MatDialog) {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.username = user.username;
      this.rol = user.rol;
    }
    if (!savedUser) {
      this.openLoginDialog();
    }
  }

openLoginDialog(): void {
  const dialogRef = this.dialog.open(LoginDialogComponent, {
    width: '400px',
    disableClose: true
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
      default:
        return false;
    }
  }
}

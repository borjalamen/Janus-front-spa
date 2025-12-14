import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import {
  RouterLink,
  RouterLinkWithHref,
  RouterOutlet
} from '@angular/router';
import { LoginDialogComponent } from './login-dialog/login-dialog';
import { HttpClient } from '@angular/common/http';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { HostListener } from '@angular/core';
import { AuthService } from './auth.service';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslateModule,
    MatSidenavModule,
    MatListModule,
    RouterOutlet,
    RouterLink,
    RouterLinkWithHref
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy {
  clipOpen = false;
  username: string = '';
  rol: Rol = 'invitado';
  showUserMenu = false;
  userMenuOpen = false;
  appVersion?: string;

  private authSubscription?: Subscription;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient,
    public translate: TranslateService,
    private authService: AuthService  // ⬅ Afegit
  ) {
    this.translate.addLangs(['es', 'ca', 'en']);
    const saved = localStorage.getItem('lang');
    const browserLang = this.translate.getBrowserLang();
    const defaultLang = saved ?? browserLang ?? 'es';
    this.translate.setDefaultLang('es');
    this.translate.use(defaultLang.match(/en|es|ca/) ? defaultLang : 'es');

    // ⬅ Subscriu-te als canvis d'usuari
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.username = user.username;
        this.rol = user.rol;
      } else {
        this.username = '';
        this.rol = 'invitado';
      }
    });

    this.loadVersion();
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  translateLanguage(lang: string) {
    if (!lang) return;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  toggleClip(): void {
    this.clipOpen = !this.clipOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clip = document.querySelector('.clip-helper');
    const popup = document.querySelector('.clip-popup');
    if (!clip || !popup) return;
    if (clip.contains(target) || popup.contains(target)) {
      return;
    }
    this.clipOpen = false;
  }

  loadVersion() {
    console.log('CRIDANT /api/config/all');

    this.http.get<any>(`${environment.baseUrl}config/all`)
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
      if (!result?.success) {
        // Si es tanca sense login → invitado
        this.authService.logout();
      }
      // Si hi ha success, ja s'ha fet login al LoginDialogComponent
    });
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.userMenuOpen = this.showUserMenu;
  }

  logout() {
    this.authService.logout();  

    this.showUserMenu = false;
    this.userMenuOpen = false;

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

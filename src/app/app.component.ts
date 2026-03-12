import { Component, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Router, RouterLink, RouterLinkWithHref, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

import { HttpClient } from '@angular/common/http';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';

import { LoginDialogComponent } from './login-dialog/login-dialog';
import { AuthService } from './auth.service';
import { LoggerService } from './logger.service';
import { LocalStorageService } from './local-storage.service';
import { AiService } from './ai.service';
import { SpinnerComponent } from './spinner.component';
import { SpinnerService } from './spinner.service';
import { MENU_GROUPS } from './menu.groups';
import { environment } from '../environments/environment';
import { ApiService } from './api.service';
import { AvatarService } from './avatar.service';

type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatExpansionModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatSelectModule,
    TranslateModule,
    MatSidenavModule,
    MatListModule,
    RouterOutlet,
    RouterLink,
    RouterLinkWithHref,
    SpinnerComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnDestroy, OnInit {
  clipOpen = false;
  username: string = '';
  rol: Rol = 'invitado';
  showUserMenu = false;
  userMenuOpen = false;
  appVersion?: string;

  avatarPreview: string | null = null;

  private authSubscription?: Subscription;
  private versionSubscription?: Subscription;
  private avatarSub?: Subscription;

  public menuGroups = MENU_GROUPS;
  public expandedGroups: { [id: string]: boolean } = {};

  aiMessages: { from: 'user' | 'ai', text: string }[] = [];
  userInput = '';
  private greeted = false;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient,
    private ai: AiService,
    public translate: TranslateService,
    private authService: AuthService,
    private storage: LocalStorageService,
    private logger: LoggerService,
    private apiService: ApiService,
    private avatarService: AvatarService
  ) {
    this.translate.addLangs(['es', 'ca', 'en']);
    const saved = this.storage.get('lang');
    const browserLang = this.translate.getBrowserLang();
    const defaultLang = (saved ?? browserLang ?? 'es').toString();
    this.translate.setDefaultLang('es');
    const matched = defaultLang.match(/en|es|ca/);
    const initial = (matched && matched[0]) ? matched[0] : 'es';
    this.translate.use(initial);

    // Cada cop que canvia l’usuari (login / logout)
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.username = user.username;
        this.rol = user.rol as Rol;

        // 1) intentar carregar avatar des de localStorage.user
        try {
          const savedUser = this.storage.get('user');
          if (savedUser) {
            const u = JSON.parse(savedUser);
            if (u?.avatarPath && u?.username) {
              const url =
                `${environment.baseUrl}profile/image?username=${encodeURIComponent(u.username)}`;
              this.avatarPreview = url;
              this.storage.set('userAvatar', url);
              this.avatarService.setAvatar(url);
              return;
            }
          }
        } catch (e) {
          console.error('Error parsejant user per carregar avatar a currentUser$', e);
        }

        // 2) fallback: avatar ja guardat
        const savedAvatar = this.storage.get('userAvatar');
        if (savedAvatar) {
          this.avatarPreview = savedAvatar;
          this.avatarService.setAvatar(savedAvatar);
        } else {
          this.avatarPreview = null;
          this.avatarService.setAvatar(null);
        }

      } else {
        // Logout
        this.username = '';
        this.rol = 'invitado';
        this.avatarPreview = null;
        this.avatarService.setAvatar(null);
        try { this.storage.remove('userAvatar'); } catch {}
        try { localStorage.removeItem('userAvatar'); } catch {}
      }
    });

    this.loadVersion();
  }

  ngOnInit(): void {
    this.versionSubscription = this.apiService.version$.subscribe(v => {
      if (v) this.appVersion = v;
    });

    try {
      const raw = this.storage.get('menu.expanded');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') this.expandedGroups = parsed;
      }
    } catch (e) { }

    for (const g of this.menuGroups) {
      if (this.expandedGroups[g.id] === undefined) this.expandedGroups[g.id] = false;
    }

    // Canvis en viu d’avatar des del servei (perfil)
    this.avatarSub = this.avatarService.avatar$.subscribe(url => {
      this.avatarPreview = url;
    });
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.versionSubscription?.unsubscribe();
    this.avatarSub?.unsubscribe();
  }

  isGroupOpen(id: string): boolean {
    return !!this.expandedGroups[id];
  }

  toggleGroup(id: string): void {
    const wasOpen = this.expandedGroups[id];
    for (const key in this.expandedGroups) {
      this.expandedGroups[key] = false;
    }
    if (!wasOpen) {
      this.expandedGroups[id] = true;
    }
    try { this.storage.setObject('menu.expanded', this.expandedGroups); } catch (e) { }
  }

  setGroupOpen(id: string, open: boolean) {
    this.expandedGroups[id] = open;
    try { this.storage.setObject('menu.expanded', this.expandedGroups); } catch (e) { }
  }

  getVisibleItems(group: any) {
    return group.items.filter((it: any) => {
      if (it.requiresCheck) return this.canShow(it.id);
      return true;
    });
  }

  getVisibleCount(group: any): number {
    return this.getVisibleItems(group).length;
  }

  hasVisibleItems(group: any): boolean {
    return this.getVisibleCount(group) > 0;
  }

  isRouteActive(route: string): boolean {
    return this.router.url === route;
  }

  translateLanguage(lang: string) {
    if (!lang) return;
    this.translate.use(lang).subscribe({
      next: () => {
        this.storage.set('lang', lang);
      },
      error: (err) => {
        console.error('❌ Error al cambiar idioma:', err);
      }
    });
  }

  toggleClip(): void {
    this.clipOpen = !this.clipOpen;
    if (this.clipOpen) {
      setTimeout(() => this.showGreeting(), 50);
    }
  }

  sendToAi() {
    const text = this.userInput?.trim();
    if (!text) return;
    this.aiMessages.push({ from: 'user', text });
    this.userInput = '';

    this.ai.query(text).subscribe({
      next: res => {
        const answer = res?.answer ?? 'No hay respuesta';
        this.aiMessages.push({ from: 'ai', text: answer });
        setTimeout(() => this.scrollMessagesToBottom(), 10);
        this.speak(answer);
      },
      error: err => {
        const msg = this.translate.instant('CLIP.ERROR_QUERY');
        this.aiMessages.push({ from: 'ai', text: msg });
        console.error(err);
      }
    });
  }

  onEnter(ev: Event) {
    const ke = ev as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.sendToAi();
  }

  private showGreeting() {
    if (this.greeted) return;
    const hello = this.translate.instant('CLIP.HELLO');
    this.aiMessages.push({ from: 'ai', text: hello });
    this.greeted = true;
    setTimeout(() => this.scrollMessagesToBottom(), 20);
  }

  private scrollMessagesToBottom() {
    try {
      const container = document.querySelector('.messages');
      if (container) (container as HTMLElement).scrollTop = container.scrollHeight;
    } catch (e) { }
  }

  speak(text: string) {
    try {
      const synth = (window as any).speechSynthesis;
      if (!synth) return;
      const ut = new SpeechSynthesisUtterance(text);
      ut.lang = this.translate.currentLang || 'es-ES';
      synth.cancel();
      synth.speak(ut);
    } catch (e) {
      this.logger.warn('TTS no disponible', e);
    }
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

  speakLast() {
    const last = this.aiMessages.length ? this.aiMessages[this.aiMessages.length - 1].text : null;
    const content = last ?? this.translate.instant('CLIP.HELLO');
    this.speak(content);
  }

  loadVersion() {
    this.http.get<any>(`${environment.baseUrl}config/all`).subscribe({
      next: (data) => {
        this.appVersion = data[0]?.version || 'sin versión';
        this.apiService.setVersion(this.appVersion ?? '');
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
        this.authService.logout();
      }
    });
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
    this.userMenuOpen = this.showUserMenu;
  }

  logout() {
    this.authService.logout();

    this.avatarPreview = null;
    this.avatarService.setAvatar(null);
    try { this.storage.remove('userAvatar'); } catch {}
    try { localStorage.removeItem('userAvatar'); } catch {}

    this.showUserMenu = false;
    this.userMenuOpen = false;
    this.router.navigate(['/home']);
  }

  canShow(menuItem: string): boolean {
    switch (menuItem) {
      case 'bienvenida': return true;
      case 'proyectos':
        return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'scrum':
        return ['devops', 'admin'].includes(this.rol);
      case 'estimacion':
        return ['devops', 'admin'].includes(this.rol);
      case 'procedimientos':
        return ['devops', 'admin'].includes(this.rol);
      case 'documentos':
        return ['devops', 'admin'].includes(this.rol);
      case 'formacion':
        return true;
      case 'planificacion':
        return ['devops', 'admin'].includes(this.rol);
      case 'multimedia':
        return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'administracion':
        return ['admin'].includes(this.rol);
      case 'bitacora':
        return ['devops', 'admin'].includes(this.rol);
      case 'peticion':
        return true;
      case 'unete':
        return true;
      case 'infraestructura':
        return ['devops', 'admin'].includes(this.rol);
      case 'herramientas':
        return ['devops', 'admin'].includes(this.rol);
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

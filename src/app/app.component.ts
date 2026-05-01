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
import { NotificationService, AppNotification } from './notification.service';

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

  quotes: { quote: string; author: string }[] = [];
  currentQuote: { quote: string; author: string } | null = null;
  quoteVisible = false;
  private quoteIndex = 0;
  private quoteTimer?: ReturnType<typeof setTimeout>;

  private authSubscription?: Subscription;
  private versionSubscription?: Subscription;
  private avatarSub?: Subscription;
  private notifSub?: Subscription;

  // ── Notificaciones push ──
  notifPanelOpen = false;
  notifications: AppNotification[] = [];
  notifUnreadCount = 0;

  public menuGroups = MENU_GROUPS;
  public expandedGroups: { [id: string]: boolean } = {};

  aiMessages: { from: 'user' | 'ai' | 'action', text: string }[] = [];
  userInput = '';
  aiLoading = false;
  private greeted = false;
  attachedFile: { name: string, content: string } | null = null;
  attachError: string | null = null;

  // ── Redimensionado del popup ──
  popupWidth = 610;
  popupHeight = 530;
  private isResizing = false;
  private resizeStartX = 0;
  private resizeStartY = 0;
  private resizeStartW = 0;
  private resizeStartH = 0;

  onResizeStart(e: MouseEvent): void {
    e.preventDefault();
    this.isResizing = true;
    this.resizeStartX = e.clientX;
    this.resizeStartY = e.clientY;
    this.resizeStartW = this.popupWidth;
    this.resizeStartH = this.popupHeight;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.isResizing) return;
    // El popup está anclado abajo-derecha: mover el handle a la izquierda/arriba agranda el popup
    const dx = e.clientX - this.resizeStartX;
    const dy = e.clientY - this.resizeStartY;
    this.popupWidth  = Math.max(300, Math.min(window.innerWidth  - 150, this.resizeStartW - dx));
    this.popupHeight = Math.max(320, Math.min(window.innerHeight -  40, this.resizeStartH - dy));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizing = false;
  }

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
    private avatarService: AvatarService,
    public notificationService: NotificationService
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
        // conectar WS de notificaciones al hacer login (con username para filtro por rol)
        this.notificationService.connect(user.username);
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
        // Logout — desconectar WS y limpiar notificaciones
        this.notificationService.disconnect();
        this.notificationService.clearAll();
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

    // Suscripción a notificaciones push
    this.notifSub = this.notificationService.notifications$.subscribe(notifs => {
      this.notifications = notifs;
      this.notifUnreadCount = notifs.filter(n => !n.read).length;
    });

    // Si ya hay sesión activa al arrancar, conectar WS con el username guardado
    const existingUser = this.authService.currentUserValue;
    if (existingUser) {
      this.notificationService.connect(existingUser.username);
    }

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
    // Frases célebres
    this.http.get<{ quote: string; author: string }[]>('assets/quotes.json').subscribe(data => {
      this.quotes = data.sort(() => Math.random() - 0.5);
      if (this.quotes.length > 0) {
        this.currentQuote = this.quotes[0];
        this.quoteVisible = true;
        this.scheduleNextQuote();
      }
    });
  }

  private scheduleNextQuote(): void {
    this.quoteTimer = setTimeout(() => {
      this.quoteVisible = false;
      setTimeout(() => {
        let nextIndex: number;
        do {
          nextIndex = Math.floor(Math.random() * this.quotes.length);
        } while (nextIndex === this.quoteIndex && this.quotes.length > 1);
        this.quoteIndex = nextIndex;
        this.currentQuote = this.quotes[this.quoteIndex];
        this.quoteVisible = true;
        this.scheduleNextQuote();
      }, 900);
    }, 6000);
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
    this.versionSubscription?.unsubscribe();
    this.avatarSub?.unsubscribe();
    this.notifSub?.unsubscribe();
    this.notificationService.disconnect();
    if (this.quoteTimer) clearTimeout(this.quoteTimer);
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
    if ((!text && !this.attachedFile) || this.aiLoading) return;

    let question = text || 'Analiza este fichero: describe qué hace, cómo está estructurado y si ves algo que mejorar.';
    let displayText = text || '(sin mensaje)';

    if (this.attachedFile) {
      const fileBlock = `\n\n[FICHERO ADJUNTO: ${this.attachedFile.name}]\n\`\`\`\n${this.attachedFile.content}\n\`\`\``;
      question += fileBlock;
      displayText += ` 📎 ${this.attachedFile.name}`;
      this.attachedFile = null;
    }

    this.aiMessages.push({ from: 'user', text: displayText });
    this.userInput = '';
    this.aiLoading = true;
    setTimeout(() => this.scrollMessagesToBottom(), 10);

    this.ai.query(question, this.username, this.rol).subscribe({
      next: res => {
        this.aiLoading = false;
        const answer = res?.answer ?? 'No hay respuesta';
        this.aiMessages.push({ from: 'ai', text: answer });
        if (res?.actionResult) {
          this.aiMessages.push({ from: 'action', text: res.actionResult });
        }
        setTimeout(() => this.scrollMessagesToBottom(), 10);
        this.speak(answer);
      },
      error: err => {
        this.aiLoading = false;
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

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const ALLOWED_EXTENSIONS = new Set([
      'txt','md','log','js','mjs','ts','java','py','cs','go','rs','cpp','c','h',
      'php','rb','json','yaml','yml','xml','toml','ini','env','properties','csv',
      'sql','html','css','scss','sh','bat','ps1'
    ]);
    const ext = (file.name.split('.').pop() ?? '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      this.attachError = `Formato no permitido: .${ext || '?'}. Solo se admiten ficheros de texto (txt, json, yaml, java, ts, py…)`;
      input.value = '';
      return;
    }
    const MAX_BYTES = 120 * 1024; // 120 KB
    if (file.size > MAX_BYTES) {
      this.attachError = `El fichero "${file.name}" pesa ${(file.size / 1024).toFixed(0)} KB. El límite es 120 KB — adjunta un fragmento más pequeño.`;
      input.value = '';
      return;
    }
    this.attachError = null;
    const reader = new FileReader();
    reader.onload = (e) => {
      let content = (e.target?.result as string) ?? '';
      const MAX_CHARS = 4000;
      if (content.length > MAX_CHARS) {
        content = content.substring(0, MAX_CHARS);
        this.attachError = `"${file.name}" es extenso — se enviarán los primeros 4.000 caracteres para no saturar el modelo.`;
      }
      this.attachedFile = { name: file.name, content };
    };
    reader.readAsText(file, 'utf-8');
    input.value = '';
  }

  removeAttachedFile() {
    this.attachedFile = null;
    this.attachError = null;
  }

  downloadMessage(text: string) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ianushub-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

    // Cerrar panel de notificaciones si se hace clic fuera
    if (this.notifPanelOpen) {
      const bellContainer = document.querySelector('.notif-bell-container');
      if (bellContainer && !bellContainer.contains(target)) {
        this.notifPanelOpen = false;
      }
    }

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

  onAvatarLoadError() {
    // Si la imagen de avatar falla al cargar, mostrar el icono por defecto
    this.avatarPreview = null;
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
      case 'dashboard': return true;
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

  // ── Notificaciones push ──────────────────────────────────────────

  toggleNotifPanel(): void {
    this.notifPanelOpen = !this.notifPanelOpen;
    if (this.notifPanelOpen) {
      this.notificationService.markAllRead();
    }
  }

  closeNotifPanel(): void {
    this.notifPanelOpen = false;
  }

  clearNotifications(): void {
    this.notificationService.clearAll();
  }

  navigateToNotif(link: string): void {
    this.notifPanelOpen = false;
    if (link) {
      this.router.navigate([link]);
    }
  }

  sendTestNotification(): void {
    this.http.get(`${environment.baseUrl}notifications/test`).subscribe({
      next: () => { /* la notificación llegará por WS */ },
      error: (err) => console.error('Error enviando test:', err)
    });
  }
}

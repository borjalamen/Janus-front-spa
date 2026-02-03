import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
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
import { LoggerService } from './logger.service';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';
import { FormsModule } from '@angular/forms';
import { AiService } from './ai.service';
import { SpinnerComponent } from './spinner.component';
import { SpinnerService } from './spinner.service';
import { MENU_GROUPS } from './menu.groups';
import { OnInit } from '@angular/core';

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
    MatFormFieldModule,
    MatSelectModule,
    TranslateModule,
    MatSidenavModule,
    MatListModule,
    RouterOutlet,
    RouterLink,
    RouterLinkWithHref
    ,
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

  private authSubscription?: Subscription;

  constructor(
    private dialog: MatDialog,
    private router: Router,
    private http: HttpClient,
    private ai: AiService,
    public translate: TranslateService,
    private authService: AuthService,  // ⬅ Afegit
    private logger: LoggerService
  ) {
    this.translate.addLangs(['es', 'ca', 'en']);
    const saved = localStorage.getItem('lang');
    const browserLang = this.translate.getBrowserLang();
    const defaultLang = (saved ?? browserLang ?? 'es').toString();
    this.translate.setDefaultLang('es');
    // Ensure we pass the short code ('en'|'es'|'ca') to the loader — avoid full tags like 'es-ES'
    const matched = defaultLang.match(/en|es|ca/);
    const initial = (matched && matched[0]) ? matched[0] : 'es';
    this.translate.use(initial);

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
  // menu grouping (visual only)
  public menuGroups = MENU_GROUPS;
  // track expanded/collapsed state per group (false = collapsed)
  public expandedGroups: { [id: string]: boolean } = {};

  ngOnInit(): void {
    // initialize all groups collapsed by default
    for (const g of this.menuGroups) {
      this.expandedGroups[g.id] = false;
    }
  }

  isGroupOpen(id: string): boolean {
    return !!this.expandedGroups[id];
  }

  toggleGroup(id: string): void {
    this.expandedGroups[id] = !this.expandedGroups[id];
  }
    // Chat state
    aiMessages: { from: 'user'|'ai', text: string }[] = [];
    userInput = '';
    // reference flag to indicate whether initial greeting has been shown
    private greeted = false;

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  translateLanguage(lang: string) {
    console.log('Cambiando idioma a:', lang);
    console.log('Idioma actual antes:', this.translate.currentLang);
    if (!lang) return;
    this.translate.use(lang).subscribe({
      next: () => {
        console.log('✅ Idioma cambiado exitosamente a:', lang);
        console.log('Idioma actual después:', this.translate.currentLang);
        localStorage.setItem('lang', lang);
      },
      error: (err) => {
        console.error('❌ Error al cambiar idioma:', err);
      }
    });
  }

  toggleClip(): void {
    this.clipOpen = !this.clipOpen;
    if (this.clipOpen) {
      // show greeting once
      setTimeout(() => this.showGreeting(), 50);
    }
  }
  
    sendToAi(){
      const text = this.userInput?.trim();
      if(!text) return;
      this.aiMessages.push({ from: 'user', text });
      this.userInput = '';
      // call backend
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

    onEnter(ev: Event){
      // Event comes from template; cast to KeyboardEvent to access keys
      const ke = ev as KeyboardEvent;
      // Allow Shift+Enter for new line
      if (ke.shiftKey) return;
      ke.preventDefault();
      this.sendToAi();
    }

    private showGreeting(){
      if(this.greeted) return;
      const hello = this.translate.instant('CLIP.HELLO');
      this.aiMessages.push({ from: 'ai', text: hello });
      this.greeted = true;
      setTimeout(() => this.scrollMessagesToBottom(), 20);
    }

    private scrollMessagesToBottom(){
      try{
        const container = document.querySelector('.messages');
        if(container) container.scrollTop = container.scrollHeight;
      }catch(e){/* ignore */}
    }
  
    // Text-to-speech via Web Speech API
    speak(text: string){
      try{
        const synth = (window as any).speechSynthesis;
        if(!synth) return;
        const ut = new SpeechSynthesisUtterance(text);
        ut.lang = this.translate.currentLang || 'es-ES';
        synth.cancel();
        synth.speak(ut);
      }catch(e){
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

  speakLast(){
    const last = this.aiMessages.length ? this.aiMessages[this.aiMessages.length-1].text : null;
    const content = last ?? this.translate.instant('CLIP.HELLO');
    this.speak(content);
  }

  loadVersion() {
    console.log('CRIDANT /api/config/all');
    this.http.get<any>(`${environment.baseUrl}config/all`).subscribe({
      next: (data) => {
        console.log('RESPUESTA VERSION:', data);
        // El backend devuelve un array con @JsonValue, así que data[0] ya es la versión directamente
        this.appVersion = data[0] || 'sin versión';
        console.log('VERSION ASIGNADA:', this.appVersion);
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
      case 'multimedia':
        return ['consultor', 'devops', 'admin'].includes(this.rol);
      case 'administracion':
        return ['admin'].includes(this.rol);
      case 'bitacora':
        return ['devops', 'admin'].includes(this.rol);
      case 'infraestructura':
        return ['devops', 'admin','consultor'].includes(this.rol);
      case 'herramientas':
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

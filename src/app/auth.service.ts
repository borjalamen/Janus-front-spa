import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { Router } from "@angular/router";
import { LocalStorageService } from "./local-storage.service";

export type Rol = "invitado" | "consultor" | "devops" | "admin" | "manager" | "team";

export interface User {
  id: string;
  username: string;
  rol: Rol;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  avatarPath?: string;
  cvPath?: string;
  roles?: string[];
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  constructor(
    private router: Router,
    private storage: LocalStorageService,
  ) {
    const userStr = this.storage.get("user");
    const token = this.storage.get("jwt_token");

    if (userStr && token) {
      // Sesión completa: usuario + token válidos
      try {
        const user: User = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (e) {
        console.error("Error carregant usuari", e);
        this.storage.remove("user");
        this.storage.remove("jwt_token");
      }
    } else if (userStr && !token) {
      // Sesión antigua sin token (pre-JWT): limpiar y forzar nuevo login
      this.storage.remove("user");
    }
  }

  // REP el user COMPLET (amb id) i el guarda
  setLoggedUser(user: User) {
    this.storage.setObject('user', user);
    this.currentUserSubject.next(user);
  }

  setToken(token: string): void {
    this.storage.set('jwt_token', token);
  }

  getToken(): string | null {
    return this.storage.get('jwt_token');
  }

  logout() {
    this.storage.remove('user');
    this.storage.remove('jwt_token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/home']);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAdmin(): boolean {
    return this.currentUserValue?.rol === "admin";
  }

  get isDevOps(): boolean {
    return this.currentUserValue?.rol === "devops";
  }

  get isManager(): boolean {
    return this.currentUserValue?.rol === "manager";
  }

  get isTeam(): boolean {
    return this.currentUserValue?.rol === "team";
  }

  get canEdit(): boolean {
    const rol = this.currentUserValue?.rol;
    return rol === "admin" || rol === "devops";
  }
  hasRole(role: Rol): boolean {
    return this.currentUserValue?.rol === role;
  }

  hasAnyRole(roles: Rol[]): boolean {
    const currentRol = this.currentUserValue?.rol;
    return !!currentRol && roles.includes(currentRol);
  }

  /** Admin/DevOps: gestión completa. MANAGER/TEAM usan canEditProject por proyecto. */
  get canManageProjects(): boolean {
    return this.hasAnyRole(["admin", "devops"]);
  }

  /**
   * Comprueba si el usuario logado tiene acceso de edición sobre un proyecto concreto.
   * Admin/DevOps: siempre sí. MANAGER: si su email aparece en el equipo del proyecto.
   */
  canEditProject(project: { equipoMinsait?: Array<{email?: string}> | null; responsableProyecto?: {email?: string} | null; responsableTecnico?: {email?: string} | null }): boolean {
    if (this.canManageProjects) return true;
    if (!this.isManager) return false;
    const email = this.currentUserValue?.email?.toLowerCase();
    if (!email) return false;
    return this.isEmailInProject(email, project);
  }

  /** Devuelve true si el email del usuario aparece en cualquier campo de equipo del proyecto. */
  isEmailInProject(userEmail: string, project: { equipoMinsait?: Array<{email?: string}> | null; responsableProyecto?: {email?: string} | null; responsableTecnico?: {email?: string} | null }): boolean {
    const email = userEmail.toLowerCase();
    if (project.equipoMinsait?.some(m => m.email?.toLowerCase() === email)) return true;
    if (project.responsableProyecto?.email?.toLowerCase() === email) return true;
    if (project.responsableTecnico?.email?.toLowerCase() === email) return true;
    return false;
  }
}

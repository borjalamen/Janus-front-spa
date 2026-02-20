import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { LocalStorageService } from './local-storage.service';

export type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

export interface User {
  username: string;
  rol: Rol;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> =
    this.currentUserSubject.asObservable();

  constructor(private router: Router, private storage: LocalStorageService) {
    const userStr = this.storage.get('user');
    if (userStr) {
      try {
        this.currentUserSubject.next(JSON.parse(userStr));
      } catch (e) {
        console.error('Error carregant usuari', e);
      }
    }
  }

  login(username: string, rol: Rol) {
    const user: User = { username, rol };
    this.storage.setObject('user', user);
    this.currentUserSubject.next(user);
  }

  logout() {
    this.storage.remove('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/home']);
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAdmin(): boolean {
    return this.currentUserValue?.rol === 'admin';
  }

  get isDevOps(): boolean {
    return this.currentUserValue?.rol === 'devops';
  }

  get canEdit(): boolean {
    const rol = this.currentUserValue?.rol;
    return rol === 'admin' || rol === 'devops';
  }
}

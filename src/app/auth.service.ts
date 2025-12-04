import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type Rol = 'invitado' | 'consultor' | 'devops' | 'admin';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  username: string;
  roles: Rol;   // o string si al back ve com cadena
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth/signin';

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(this.apiUrl, credentials);
  }
}
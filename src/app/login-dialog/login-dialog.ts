import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService, Rol, User } from '../auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    FormsModule,
    CommonModule,
    MatDialogModule,
    TranslateModule
  ],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css'],
})
export class LoginDialogComponent implements OnInit, OnDestroy {
  username = '';
  password = '';
  error = '';

  constructor(
    public dialogRef: MatDialogRef<LoginDialogComponent>,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  login() {
  this.error = '';

  // 1) Validar usuari + contrasenya
  this.http.post<any>(
    `${environment.baseUrl}auth/signin`,
    {
      username: this.username,
      password: this.password
    }
  ).subscribe({
    next: () => {
      // 2) Un cop signin OK, demanem el perfil complet
      this.http.get<any>(
        `${environment.baseUrl}profile`,
        { params: { username: this.username } }
      ).subscribe({
        next: (profile) => {
          const rolesArray: string[] = profile.roles || [];
          const rolesStr = rolesArray.join(',');

          let rolFront: Rol = 'invitado';
          if (rolesStr.includes('ADMIN')) {
            rolFront = 'admin';
          } else if (rolesStr.includes('DEVOPS')) {
            rolFront = 'devops';
          } else if (rolesStr.includes('CONSULTOR')) {
            rolFront = 'consultor';
          }

          const userToStore: User = {
            id: profile.id,
            username: profile.username,
            rol: rolFront,
            fullName: profile.fullName,
            email: profile.email,
            phone: profile.phone,
            status: profile.status,
            avatarPath: profile.avatarPath,
            cvPath: profile.cvPath,
            roles: profile.roles
          };

          this.authService.setLoggedUser(userToStore);

          this.dialogRef.close({
            success: true,
            username: profile.username,
            rol: rolFront
          });
        },
        error: () => {
          this.error = 'No se pudo cargar el perfil del usuario.';
        }
      });
    },
    error: () => {
      this.error = 'Usuario o contraseña inválidos';
    }
  });
}
;
}




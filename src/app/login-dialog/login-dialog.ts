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
import { AuthService, Rol } from '../auth.service';

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

    this.http.post<{ username: string; roles: string[] }>(
      'http://localhost:8080/api/auth/signin',
      {
        username: this.username,
        password: this.password
      }
    ).subscribe({
      next: (user) => {
        const rolesArray = user.roles || [];
        const rolesStr = rolesArray.join(',');

        let rolFront: Rol = 'invitado';
        if (rolesStr.includes('ADMIN')) {
          rolFront = 'admin';
        } else if (rolesStr.includes('DEVOPS')) {
          rolFront = 'devops';
        } else if (rolesStr.includes('CONSULTOR')) {
          rolFront = 'consultor';
        }

        // Actualitza servei + localStorage
        this.authService.login(user.username, rolFront);

        // Tanca el diàleg informant del resultat
        this.dialogRef.close({
          success: true,
          username: user.username,
          rol: rolFront
        });
      },
      error: () => {
        this.error = 'Usuario o contraseña inválidos';
      }
    });
  }
}

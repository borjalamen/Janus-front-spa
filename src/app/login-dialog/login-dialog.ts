import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

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
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  ngOnDestroy(): void {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  login() {
    this.error = '';

    // LOGIN LOCAL, SENSE BACKEND
    if (this.username === 'admin' && this.password === 'admin') {
      this.authService.login('admin', 'admin');

      this.dialogRef.close({
        success: true,
        username: 'admin',
        rol: 'admin'
      });

      this.router.navigate(['/bienvenida']);
      return;
    }

    if (this.username === 'user' && this.password === 'user') {
      this.authService.login('user', 'consultor');

      this.dialogRef.close({
        success: true,
        username: 'user',
        rol: 'consultor'
      });

      this.router.navigate(['/bienvenida']);
      return;
    }

    // Si no coincideix amb cap usuari local
    this.error = 'Usuario o contraseña inválidos';
  }
}

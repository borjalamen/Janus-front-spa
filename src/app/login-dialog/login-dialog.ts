import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    MatDialogModule
  ],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css'],
})
export class LoginDialogComponent implements OnInit, OnDestroy {
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

  ngOnInit(): void {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }

  ngOnDestroy(): void {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }

  login() {
    // Usuaris simulats amb rol assignat
    const usersSimulats = [
      { username: 'janus', password: '1234', rol: 'admin' },
      { username: 'consultor', password: 'abcd', rol: 'consultor' },
      { username: 'devops', password: 'xyz', rol: 'devops' }
    ];

    const usuariTrobat = usersSimulats.find(
      u => u.username === this.username && u.password === this.password
    );

    if (usuariTrobat) {
      // Tanquem el diàleg i retornem l'usuari amb el seu rol
      this.dialogRef.close({ username: usuariTrobat.username, rol: usuariTrobat.rol });
    } else {
      this.error = 'Usuario o contraseña inválidos';
    }
  }
}

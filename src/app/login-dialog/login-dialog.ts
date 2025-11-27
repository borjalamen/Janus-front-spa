import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css']
})
export class LoginDialogComponent {
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

  login() {
    // Simulamos usuarios con rol
    const users = [
      { username: 'admin', password: '1234', rol: 'admin' },
      { username: 'devops', password: '1234', rol: 'devops' },
      { username: 'consultor', password: '1234', rol: 'consultor' }
    ];

    const user = users.find(u => u.username === this.username && u.password === this.password);

    if (user) {
      this.dialogRef.close({ username: user.username, rol: user.rol });
    } else {
      this.error = 'Usuario o contraseña incorrectos';
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}

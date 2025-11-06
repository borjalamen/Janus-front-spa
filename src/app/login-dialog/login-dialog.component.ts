import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login-dialog',
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css']
})
export class LoginDialogComponent {
  username: string = '';
  password: string = '';
  error: string = '';

  constructor(
    private dialogRef: MatDialogRef<LoginDialogComponent>,
    private translate: TranslateService
  ) {}

  login(): void {
   
    if (!this.username || !this.password) {
      this.error = this.translate.instant('LOGIN.ERROR_EMPTY');
      return;
    }

   
    if (this.username === 'admin' && this.password === '1234') {
      // en caso de éxito se cierra el modal y devuelve datos simulados
      this.dialogRef.close({
        username: this.username,
        role: 'Administrador'
      });
    } else {
      // en caso de error se muestra mensaje traducido
      this.error = this.translate.instant('LOGIN.ERROR_INVALID');
    }
  }
}

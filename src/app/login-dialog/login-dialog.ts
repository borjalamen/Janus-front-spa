import { Component } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, FormsModule, CommonModule, MatDialogModule],
  templateUrl: './login-dialog.html',
  styleUrls: ['./login-dialog.css'],
})
export class LoginDialogComponent {
  username:string = '';
  password:string = '';
  error:string =''
  
  constructor(public dialogRef: MatDialogRef<LoginDialogComponent>) {}

  login() {
    if (this.username === 'Janus' && this.password === '1234') {
      this.dialogRef.close(true);
    } else {
      this.error = 'Invalid username or password';
    }
  }

}

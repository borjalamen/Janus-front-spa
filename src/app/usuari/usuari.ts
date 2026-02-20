import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './usuari.html',
  styleUrls: ['./usuari.css']
})
export class UsuarioComponent {
  username: string;
  rol: string;

  constructor(private storage: LocalStorageService) {
    const savedUser = this.storage.get('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.username = user.username ?? 'Sin usuario';
      this.rol = user.rol ?? 'Sin rol';
    } else {
      this.username = 'Sin usuario';
      this.rol = 'Sin rol';
    }
  }
}

import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LocalStorageService } from '../local-storage.service';

@Component({
  selector: 'app-peticion',
  standalone: true,
  templateUrl: './peticion.html',
  styleUrls: ['./peticion.css'],
  imports: [CommonModule, FormsModule, MatIconModule, TranslateModule]
})
export class PeticionComponent implements OnInit {

  private readonly STORAGE_KEY = 'peticionForm';

  form = {
    asunto: '',
    descripcion: ''
  };

  constructor(private storage: LocalStorageService) {}

  ngOnInit(): void {
    const saved = this.storage.getObject<typeof this.form>(this.STORAGE_KEY);
    if (saved) {
      this.form = saved;
    }
  }

  saveDraft(): void {
    this.storage.setObject(this.STORAGE_KEY, this.form);
  }

  resetForm(): void {
    this.form = { asunto: '', descripcion: '' };
    this.storage.remove(this.STORAGE_KEY);
  }

  // exemple d’enviament (a adaptar quan tinguis backend)
  submit(): void {
    if (!this.form.asunto || !this.form.descripcion) {
      alert('Falta asunto o descripción');
      return;
    }
    console.log('Petición enviada:', this.form);
    this.resetForm();
    alert('Petición enviada (demo).');
  }
}

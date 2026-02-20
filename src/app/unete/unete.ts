import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { LocalStorageService } from '../local-storage.service';

@Component({
  selector: 'app-unete',
  standalone: true,
  templateUrl: './unete.html',
  styleUrls: ['./unete.css'],
  imports: [
    MatIconModule,
    TranslateModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ]
})
export class UneteComponent implements OnInit, OnDestroy {
  sending: boolean = false;
  recipient = 'contacto@janushub.local';

  private STORAGE_KEY = 'uneteForm';

  form = {
    fullName: '',
    email: '',
    role: '',
    projectCode: '',
    projectName: '',
    comments: ''
  };

  roleOptions = [
    { value: 'invitado', label: 'Invitado' },
    { value: 'consultor', label: 'Consultor' },
    { value: 'devops', label: 'DevOps' },
    { value: 'admin', label: 'Admin' }
  ];

  constructor(private storage: LocalStorageService) {}

  ngOnInit(): void {
    const saved = this.storage.getObject<typeof this.form>(this.STORAGE_KEY);
    if (saved) {
      this.form = saved;
    }
  }

  ngOnDestroy(): void {
    // opcional: guardar quan surts del component
    this.saveDraft();
  }

  private saveDraft(): void {
    this.storage.setObject(this.STORAGE_KEY, this.form);
  }

  sendMail() {
    if (!this.form.fullName || !this.form.email) {
      alert('Por favor, indica nombre completo y email.');
      return;
    }

    // guardar l’últim estat abans d’enviar
    this.saveDraft();

    (async () => {
      try {
        (this as any).sending = true;
        const resp = await fetch('/api/contact/unete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        });
        if (resp.ok) {
          alert('Correo enviado correctamente. Gracias.');
          this.resetForm();
        } else {
          const txt = await resp.text();
          alert('Error enviando correo: ' + txt);
        }
      } catch (err: any) {
        alert('Error en la petición: ' + (err?.message || err));
      } finally {
        (this as any).sending = false;
      }
    })();
  }

  resetForm() {
    this.form = {
      fullName: '',
      email: '',
      role: '',
      projectCode: '',
      projectName: '',
      comments: ''
    };
    this.storage.remove(this.STORAGE_KEY);
  }
}

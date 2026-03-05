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
  toastMsg = '';
  toastOk = true;
  private _toastTimer: any = null;
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
    console.log('UneteComponent ngOnInit');
    const saved = this.storage.getObject<typeof this.form>(this.STORAGE_KEY);
    console.log('UneteComponent saved draft =', saved);
    if (saved) {
      this.form = saved;
    }
  }

  ngOnDestroy(): void {
    console.log('UneteComponent ngOnDestroy');
    this.saveDraft();
  }

  private saveDraft(): void {
    console.log('Guardant draft en localStorage', this.form);
    this.storage.setObject(this.STORAGE_KEY, this.form);
  }

  // Es crida cada vegada que canvia algun camp del formulari
  onFormChange(): void {
    this.saveDraft();
  }

  sendMail() {
    if (!this.form.fullName || !this.form.fullName.trim()) {
      this.showToast('⚠️ Por favor, indica el nombre completo.', false);
      return;
    }
    
    if (!this.form.email || !this.form.email.trim()) {
      this.showToast('⚠️ Por favor, indica un email válido.', false);
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.form.email)) {
      this.showToast('⚠️ Por favor, indica un email válido.', false);
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
          this.showToast('✅ Solicitud enviada correctamente. Un administrador la revisará pronto.', true);
          this.resetForm();
        } else if (resp.status === 400) {
          const txt = await resp.text();
          this.showToast('⚠️ ' + txt, false);
        } else {
          const txt = await resp.text();
          this.showToast('❌ Error al procesar la solicitud: ' + txt, false);
        }
      } catch (err: any) {
        this.showToast('❌ Error en la petición: ' + (err?.message || err), false);
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

  showToast(msg: string, ok = true) {
    this.toastMsg = msg;
    this.toastOk = ok;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastMsg = '', 3500);
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
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
    CommonModule,
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
  sending = false;
  toastMsg = '';
  toastOk = true;
  private _toastTimer: any = null;
  recipient = 'contacto@janushub.local';

  mostrarPopupCredenciales = false;
  credencialesPopup: { username: string; password: string } | null = null;

  private STORAGE_KEY = 'uneteForm';

  showErrors = false;

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
    this.saveDraft();
  }

  private saveDraft(): void {
    this.storage.setObject(this.STORAGE_KEY, this.form);
  }

  onFormChange(): void {
    this.saveDraft();
    if (this.showErrors) {
      this.showErrors = true;
    }
  }

  validateEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const trimmed = email.trim();
    if (!trimmed) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }

  sendMail() {
    this.showErrors = true;

    const fullNameOk = !!this.form.fullName?.trim();
    const emailOk = this.validateEmail(this.form.email);

    if (!fullNameOk) {
      this.showToast('⚠️ Por favor, indica el nombre completo.', false);
      return;
    }

    if (!emailOk) {
      this.showToast('⚠️ Por favor, indica un email válido.', false);
      return;
    }

    this.saveDraft();
    const emailSnapshot = this.form.email;

    (this as any).sending = true;
    (async () => {
      try {
        const resp = await fetch('/api/contact/unete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        });
        if (resp.ok) {
          const data = await resp.json().catch(() => ({}));
          const username = (emailSnapshot || '').split('@')[0];
          const password = data.password || data.credentials?.password || '';
          this.credencialesPopup = { username, password };
          this.mostrarPopupCredenciales = true;
          this.resetForm();
          this.showErrors = false;
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

  cerrarPopupCredenciales() {
    this.mostrarPopupCredenciales = false;
    this.credencialesPopup = null;
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
    this.showErrors = false;
    this.storage.remove(this.STORAGE_KEY);
  }

  showToast(msg: string, ok = true) {
    this.toastMsg = msg;
    this.toastOk = ok;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (this.toastMsg = ''), 3500);
  }
}

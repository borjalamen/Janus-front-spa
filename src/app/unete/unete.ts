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

const PENDING_REQUEST_KEY = 'unetePendingRequest';

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

  // Estat de la sol·licitud pendent
  pendingEmail: string | null = null;
  pendingName: string | null = null;
  requestStatus: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | null = null;
  checkingStatus = false;

  // Popup credencials quan s'aprova
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

    // Comprovar si hi ha una sol·licitud pendent guardada
    const pending = this.storage.getObject<{ email: string; name: string }>(PENDING_REQUEST_KEY);
    if (pending?.email) {
      this.pendingEmail = pending.email;
      this.pendingName = pending.name;
      this.checkRequestStatus();
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
  }

  validateEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const trimmed = email.trim();
    if (!trimmed) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }

  // Comprova l'estat de la sol·licitud pendent al backend
  checkRequestStatus(): void {
    if (!this.pendingEmail) return;
    this.checkingStatus = true;

    fetch(`/api/join-requests/by-email/${encodeURIComponent(this.pendingEmail)}`)
      .then(res => {
        if (!res.ok) throw new Error('No trobat');
        return res.json();
      })
      .then(data => {
        this.checkingStatus = false;
        this.requestStatus = data.estado?.toUpperCase() || 'PENDIENTE';

        if (this.requestStatus === 'APROBADA') {
          // Generar les credencials igual que fa el backend
          const username = (this.pendingName || data.fullName || '')
            .replaceAll(' ', '').toLowerCase();
          const password = (this.pendingName || data.fullName || '') + '1234';
          this.credencialesPopup = { username, password };
          this.mostrarPopupCredenciales = true;
          // Esborrar la sol·licitud pendent del localStorage
          this.storage.remove(PENDING_REQUEST_KEY);
          this.pendingEmail = null;
          this.pendingName = null;
          this.requestStatus = null;
        } else if (this.requestStatus === 'RECHAZADA') {
          // Esborrar la sol·licitud pendent
          this.storage.remove(PENDING_REQUEST_KEY);
          this.pendingEmail = null;
          this.pendingName = null;
          this.requestStatus = null;
        }
      })
      .catch(() => {
        this.checkingStatus = false;
        this.requestStatus = 'PENDIENTE';
      });
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
    const nameSnapshot = this.form.fullName;

    this.sending = true;

    fetch('/api/contact/unete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.form)
    })
      .then(async resp => {
        if (resp.ok) {
          // Guardar la sol·licitud pendent al localStorage
          this.storage.setObject(PENDING_REQUEST_KEY, {
            email: emailSnapshot,
            name: nameSnapshot
          });
          this.pendingEmail = emailSnapshot;
          this.pendingName = nameSnapshot;
          this.requestStatus = 'PENDIENTE';
          this.resetForm();
          this.showErrors = false;
        } else if (resp.status === 400) {
          const txt = await resp.text();
          this.showToast('⚠️ ' + txt, false);
        } else {
          const txt = await resp.text();
          this.showToast('❌ Error al procesar la solicitud: ' + txt, false);
        }
      })
      .catch(err => {
        this.showToast('❌ Error en la petición: ' + (err?.message || err), false);
      })
      .finally(() => {
        this.sending = false;
      });
  }

  cerrarPopupCredenciales() {
    this.mostrarPopupCredenciales = false;
    this.credencialesPopup = null;
  }

  cancelarSolicitud() {
    this.storage.remove(PENDING_REQUEST_KEY);
    this.pendingEmail = null;
    this.pendingName = null;
    this.requestStatus = null;
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
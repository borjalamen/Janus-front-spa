import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { LocalStorageService } from '../local-storage.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { FormsModule } from '@angular/forms';
import { AvatarService } from '../avatar.service';

interface StoredUser {
  id: string;
  username: string;
  rol: string;
  fullName?: string;
  email?: string;
  phone?: string;
  status?: string;
  avatarPath?: string;
  cvPath?: string;
  roles?: string[];
}

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule, FormsModule],
  templateUrl: './usuari.html',
  styleUrls: ['./usuari.css']
})
export class UsuarioComponent {
  username = 'Sin usuario';
  rol = 'Sin rol';

  userId?: string;
  hasCv = false;

  updatingAvatar = false;
  updatingPassword = false;
  updatingCv = false;

  avatarPreview: string | null = null;

  msg?: string;
  msgError?: string;

  showPasswordForm = false;
  passwordForm = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  editMode = false;
  profileForm = {
    fullName: '',
    email: '',
    phone: ''
  };

  private storedUser?: StoredUser;

  constructor(
    private storage: LocalStorageService,
    private http: HttpClient,
    private avatarService: AvatarService
  ) {
    const savedUser = this.storage.get('user');
    console.log('UsuarioComponent savedUser string =', savedUser);

    if (savedUser) {
      try {
        const user: StoredUser = JSON.parse(savedUser);
        this.storedUser = user;
        console.log('UsuarioComponent user obj =', user);

        this.username = user.username ?? this.username;
        this.rol = user.rol ?? this.rol;
        this.userId = user.id;
        console.log('UsuarioComponent userId =', this.userId);

        this.hasCv = !!user.cvPath;

        this.profileForm.fullName = user.fullName || '';
        this.profileForm.email = user.email || '';
        this.profileForm.phone = user.phone || '';

        if (user.avatarPath) {
          const url =
            `${environment.baseUrl}profile/image?username=${encodeURIComponent(this.username)}`;
          this.avatarPreview = url;

          this.storage.set('userAvatar', this.avatarPreview);
          this.avatarService.setAvatar(this.avatarPreview);
        }
      } catch (e) {
        console.error('Error parseando user de localStorage', e);
      }
    } else {
      console.warn('No hay nada en localStorage con la clave "user"');
    }
  }

  get userInfo() {
    return {
      fullName: this.storedUser?.fullName || this.username,
      email: this.storedUser?.email,
      phone: this.storedUser?.phone,
      status: this.storedUser?.status,
      rol: this.rol
    };
  }

  private ensureUserId(): boolean {
    if (!this.userId) {
      console.error(
        'UsuarioComponent: userId undefined. localStorage.user =',
        this.storage.get('user')
      );
      this.msgError = 'No se ha encontrado el identificador de usuario.';
      return false;
    }
    return true;
  }

  /* ===========================
     AVATAR
     =========================== */
  onAvatarSelected(event: Event): void {
    if (!this.ensureUserId()) return;

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      this.msgError = 'La imagen es demasiado grande (máx. 2MB).';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;

      this.storage.set('userAvatar', this.avatarPreview);
      this.avatarService.setAvatar(this.avatarPreview);
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', this.username);

    this.updatingAvatar = true;
    this.msg = undefined;
    this.msgError = undefined;

    this.http.post(
      `${environment.baseUrl}profile/image`,
      formData,
      { responseType: 'text' }
    ).subscribe({
      next: (res) => {
        console.log('Respuesta avatar =', res);
        this.updatingAvatar = false;
        this.msg = 'Imagen actualizada correctamente.';

        if (this.storedUser) {
          this.storedUser.avatarPath = 'true';
          this.storage.setObject('user', this.storedUser);
        }

        const url =
          `${environment.baseUrl}profile/image?username=${encodeURIComponent(this.username)}`;
        this.avatarPreview = url;
        this.storage.set('userAvatar', url);
        this.avatarService.setAvatar(url);
      },
      error: (err) => {
        console.error('Error subiendo avatar', err);
        this.updatingAvatar = false;
        this.msgError = 'No se pudo actualizar la imagen.';
      }
    });
  }

  /* ===========================
     CONTRASEÑA
     =========================== */
  openChangePassword(): void {
    this.showPasswordForm = true;
    this.msg = undefined;
    this.msgError = undefined;
  }

  cancelPasswordForm(): void {
    this.showPasswordForm = false;
    this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  }

  submitPasswordForm(): void {
    if (!this.ensureUserId()) return;

    const { oldPassword, newPassword, confirmPassword } = this.passwordForm;
    if (!oldPassword || !newPassword || !confirmPassword) {
      this.msgError = 'Todos los campos de contraseña son obligatorios.';
      return;
    }
    if (newPassword !== confirmPassword) {
      this.msgError = 'Las contraseñas no coinciden.';
      return;
    }

    const body = {
      currentPassword: oldPassword,
      newPassword: newPassword
    };

    this.updatingPassword = true;
    this.msg = undefined;
    this.msgError = undefined;

    this.http.put(
      `${environment.baseUrl}profile/password`,
      body,
      { params: { username: this.username }, responseType: 'text' }
    ).subscribe({
      next: (res) => {
        console.log('Respuesta cambio password =', res);
        this.updatingPassword = false;
        this.msg = 'Contraseña actualizada correctamente.';
        this.cancelPasswordForm();
      },
      error: (err) => {
        console.error('Error actualizando contraseña', err);
        this.updatingPassword = false;
        this.msgError = 'No se pudo actualizar la contraseña.';
      }
    });
  }

  /* ===========================
     CV
     =========================== */
  onCvSelected(event: Event): void {
    if (!this.ensureUserId()) return;

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (file.size > 5 * 1024 * 1024) {
      this.msgError = 'El CV es demasiado grande (máx. 5MB).';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', this.username);

    this.updatingCv = true;
    this.msg = undefined;
    this.msgError = undefined;

    this.http.post(
      `${environment.baseUrl}profile/cv`,
      formData,
      { responseType: 'text' }
    ).subscribe({
      next: (res) => {
        console.log('Respuesta CV =', res);
        this.updatingCv = false;
        this.msg = 'CV actualizado correctamente.';
        this.hasCv = true;

        if (this.storedUser) {
          this.storedUser.cvPath = 'true';
          this.storage.setObject('user', this.storedUser);
        }
      },
      error: (err) => {
        console.error('Error actualizando CV', err);
        this.updatingCv = false;
        this.msgError = 'No se pudo actualizar el CV.';
      }
    });
  }

  downloadCV(): void {
    if (!this.ensureUserId()) return;
    window.open(
      `${environment.baseUrl}profile/cv?username=${encodeURIComponent(this.username)}`,
      '_blank'
    );
  }

  /* ===========================
     PERFIL
     =========================== */
  toggleEditProfile(): void {
    this.editMode = !this.editMode;
    this.msg = undefined;
    this.msgError = undefined;

    if (!this.editMode && this.storedUser) {
      this.profileForm.fullName = this.storedUser.fullName || '';
      this.profileForm.email = this.storedUser.email || '';
      this.profileForm.phone = this.storedUser.phone || '';
    }
  }

  saveProfile(): void {
    if (!this.ensureUserId()) return;

    const body = {
      fullName: this.profileForm.fullName,
      email: this.profileForm.email,
      phone: this.profileForm.phone
    };

    this.msg = undefined;
    this.msgError = undefined;

    this.http.put(
      `${environment.baseUrl}profile`,
      body,
      { params: { username: this.username } }
    ).subscribe({
      next: (updated: any) => {
        console.log('Respuesta actualización perfil =', updated);

        this.storedUser = {
          ...this.storedUser!,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone
        };

        this.storage.setObject('user', this.storedUser);
        this.editMode = false;
        this.msg = 'Perfil actualizado correctamente.';
      },
      error: (err) => {
        console.error('Error actualizando perfil', err);
        this.msgError = 'No se pudo actualizar el perfil.';
      }
    });
  }
}

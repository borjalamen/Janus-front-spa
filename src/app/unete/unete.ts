import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-unete',
  standalone: true,
  templateUrl: './unete.html',
  styleUrls: ['./unete.css'],
  imports: [MatIconModule, TranslateModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule]
})
export class UneteComponent {
  // Cambia este email por el destinatario real si lo deseas
  recipient = 'contacto@janushub.local';

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

  sendMail() {
    // Validación mínima
    if (!this.form.fullName || !this.form.email) {
      alert('Por favor, indica nombre completo y email.');
      return;
    }

    const subject = `Solicitud Únete - ${this.form.projectName || this.form.projectCode || ''}`;
    const bodyLines = [
      `Nombre completo: ${this.form.fullName}`,
      `Email: ${this.form.email}`,
      `Rol sugerido: ${this.form.role}`,
      `Código de proyecto: ${this.form.projectCode}`,
      `Nombre del proyecto: ${this.form.projectName}`,
      `Comentarios:`,
      `${this.form.comments}`
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    const mailto = `mailto:${encodeURIComponent(this.recipient)}?subject=${encodeURIComponent(subject)}&body=${body}`;
    // Abrir cliente de correo
    window.location.href = mailto;
  }

  resetForm() {
    this.form = { fullName: '', email: '', role: '', projectCode: '', projectName: '', comments: '' };
  }
}

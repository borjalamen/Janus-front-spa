import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { LocalStorageService } from '../local-storage.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-peticion',
  standalone: true,
  templateUrl: './peticion.html',
  styleUrls: ['./peticion.css'],
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    TranslateModule
  ]
})
export class PeticionComponent implements OnInit {
  private readonly STORAGE_KEY = 'peticionForm';

  form = {
    requesterName: '',
    requesterEmail: '',
    projectName: '',
    projectCode: '',
    jiraTask: '',
    comments: '',
    devopsAssignee: 'Cualquiera'
  };

  deadline: Date | null = null;

  devopsOptions: string[] = [
    'Cualquiera',
    'Fernando Silvano Gil',
    'Raúl Gallego',
    'Rubén Planté',
    'Borja Lara'
  ];
  attachments: Array<{ name: string; size: number; type: string; file?: File }> = [];

  showErrors = false;

  constructor(
    private storage: LocalStorageService,
    private dialog: MatDialog,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const saved = this.storage.getObject<typeof this.form>(this.STORAGE_KEY);
    if (saved) {
      this.form = saved;
    }
  }

  onFormChange(): void {
    this.storage.setObject(this.STORAGE_KEY, this.form);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    files.forEach(f => {
      this.attachments.push({ name: f.name, size: f.size, type: f.type, file: f });
    });
    if (input) input.value = '';
  }

  removeAttachment(idx: number): void {
    this.attachments.splice(idx, 1);
  }

  isValid(): boolean {
    // Check all required fields have content
    const allFieldsFilled = [
      this.form.requesterName,
      this.form.requesterEmail,
      this.form.projectName,
      this.form.projectCode,
      this.form.jiraTask,
      this.form.comments
    ].every(v => !!v && !!String(v).trim());

    if (!allFieldsFilled) {
      return false;
    }

    // Validate email format
    if (!this.validateEmail(this.form.requesterEmail)) {
      return false;
    }

    // JIRA task just needs to have content, no strict URL validation
    return !!this.form.jiraTask.trim();
  }

  resetForm(): void {
    this.form = {
      requesterName: '',
      requesterEmail: '',
      projectName: '',
      projectCode: '',
      jiraTask: '',
      comments: '',
      devopsAssignee: 'Cualquiera'
    };
    this.attachments = [];
    this.deadline = null;
    this.showErrors = false;
    this.storage.remove(this.STORAGE_KEY);
  }

  confirmAndSubmit(): void {
    if (!this.isValid()) {
      this.showErrors = true;
      return;
    }

    const dialogRef = this.dialog.open(PeticionConfirmDialog, {
      data: {
        deadline: this.deadline
      },
      width: '420px'
    });

    dialogRef.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.submitInternal();
    });
  }

  private submitInternal(): void {
    const payload = {
      ...this.form,
      deadline: this.deadline ? this.deadline.toISOString() : null,
      attachments: this.attachments.map(a => a.name)
    };

    this.http.post(`${environment.baseUrl}peticiones-tareas`, payload).subscribe({
      next: () => {
        alert('✅ Petición enviada correctamente. El equipo Janus la revisará lo antes posible.');
        this.resetForm();
      },
      error: err => {
        console.error('Error enviando petición', err);
        alert('❌ Error al enviar la petición. Revisa que el servidor esté disponible.');
      }
    });
  }

  validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email || '').trim());
  }

  validateUrl(url: string): boolean {
    try {
      const u = new URL(String(url || '').trim());
      return !!u.protocol && !!u.host;
    } catch {
      return false;
    }
  }

  isEmpty(v: string): boolean {
    return !v || !String(v).trim();
  }
}

@Component({
  selector: 'app-peticion-confirm-dialog',
  standalone: true,
  template: `
    <h3 class="dialog-title">Confirmar envío</h3>
    <p class="dialog-text">
      Estás a un click de enviar la petición, confirma que hay permisos de imputación en el JIRA propuesto,
      sino la petición será rechazada. Nuestro equipo se pondrá en contacto en cuanto pueda.
    </p>
    <p class="dialog-text">
      La fecha límite se usará para priorizar la tarea si es posible, pero el equipo Janus no asume que se finalizará en dicha fecha.
    </p>
    <p class="dialog-text">
      Fecha límite: {{ data?.deadline ? (data.deadline | date:'dd/MM/yyyy') : 'No indicada' }}
    </p>
    <div class="dialog-actions">
      <button mat-stroked-button (click)="close(false)">Cancelar</button>
      <button mat-flat-button color="primary" (click)="close(true)">Confirmar envío</button>
    </div>
  `,
  styles: [
    `
      :host { display: block; padding: 16px; background: #121417; color: #e5e7eb; }
      .dialog-title { margin: 0 0 8px; color: #FBC02D; }
      .dialog-text { margin: 0 0 10px; line-height: 1.4; }
      .dialog-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 12px; }
    `
  ],
  imports: [CommonModule, MatButtonModule, MatDialogModule]
})
export class PeticionConfirmDialog {
  constructor(private dialogRef: MatDialogRef<PeticionConfirmDialog>, @Inject(MAT_DIALOG_DATA) public data: any) {}
  close(val: boolean) { this.dialogRef.close(val); }
}

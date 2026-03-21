import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { SafePipe } from '../safe.pipe';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
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
    SafePipe,
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
    devopsAssignee: ''
  };

  deadline: Date | null = null;
  sending = false;

  // Opcions del select (es carreguen des de l’API)
  devopsOptions: string[] = [];

  attachments: Array<{
    name: string;
    size: number;
    type: string;
    file?: File;
    rawUrl?: string;
  }> = [];

  showErrors = false;
  previewPopup: { rawUrl: string; type: string; name: string } | null = null;

  toastMsg = '';
  toastOk = true;
  private _toastTimer: any = null;

  constructor(
    private storage: LocalStorageService,
    private dialog: MatDialog,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const saved = this.storage.getObject<typeof this.form>(this.STORAGE_KEY);
    if (saved) {
      this.form = saved;
    }

    this.loadDevopsUsers();
  }

  /**
   * Carrega només usuaris amb rol DEVOPS i omple el desplegable.
   */
  private loadDevopsUsers(): void {
    this.http
      .get<any[]>(`${environment.baseUrl}users/all`)
      .subscribe({
        next: users => {
          console.log('USUARIOS API', users);

          const devopsUsers = users.filter(u =>
            Array.isArray(u.roles) && u.roles.includes('DEVOPS')
          );

          this.devopsOptions = [
            'Cualquiera',
            ...devopsUsers.map(u => u.fullName)
          ];

          if (!this.devopsOptions.includes(this.form.devopsAssignee)) {
            this.form.devopsAssignee = 'Cualquiera';
          }
        },
        error: err => {
          console.error('Error cargando usuarios DevOps', err);
          this.devopsOptions = ['Cualquiera'];
        }
      });
  }

  onFormChange(): void {
    this.storage.setObject(this.STORAGE_KEY, this.form);
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    files.forEach(f => {
      const rawUrl =
        f.type.startsWith('image/') || f.type === 'application/pdf'
          ? URL.createObjectURL(f)
          : undefined;
      this.attachments.push({
        name: f.name,
        size: f.size,
        type: f.type,
        file: f,
        rawUrl
      });
    });
    if (input) input.value = '';
  }

  removeAttachment(idx: number): void {
    const a = this.attachments[idx];
    if (a.rawUrl) URL.revokeObjectURL(a.rawUrl);
    this.attachments.splice(idx, 1);
  }

  isValid(): boolean {
    const allFieldsFilled = [
      this.form.requesterName,
      this.form.requesterEmail,
      this.form.projectName,
      this.form.projectCode,
      this.form.jiraTask,
      this.form.devopsAssignee
    ].every(v => !!v && !!String(v).trim());

    if (!allFieldsFilled) return false;
    if (!this.validateEmail(this.form.requesterEmail)) return false;
    return true;
  }

  resetForm(): void {
    this.attachments.forEach(a => {
      if (a.rawUrl) URL.revokeObjectURL(a.rawUrl);
    });
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
    this.sending = false;
    this.storage.remove(this.STORAGE_KEY);
  }

  openPreview(a: { rawUrl?: string; type: string; name: string }) {
    if (a.rawUrl) {
      this.previewPopup = { rawUrl: a.rawUrl, type: a.type, name: a.name };
    }
  }

  closePreview() {
    this.previewPopup = null;
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
      width: '420px',
      panelClass: 'peticion-confirm-panel'
    });

    dialogRef.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.submitInternal();
    });
  }

  private submitInternal(): void {
    this.sending = true;

    const formData = new FormData();
    formData.append('requesterName', this.form.requesterName);
    formData.append('requesterEmail', this.form.requesterEmail);
    formData.append('projectName', this.form.projectName);
    formData.append('projectCode', this.form.projectCode);
    formData.append('jiraTask', this.form.jiraTask);

    if (this.form.comments) {
      formData.append('comments', this.form.comments);
    }
    formData.append('devopsAssignee', this.form.devopsAssignee || 'Cualquiera');

    if (this.deadline) {
      formData.append('deadline', this.deadline.toISOString());
    }

    this.attachments.forEach(a => {
      if (a.file) formData.append('files', a.file, a.name);
    });

    this.http.post(`${environment.baseUrl}peticiones-tareas`, formData).subscribe({
      next: () => {
        this.showToast(
          '✅ Petición enviada correctamente. El equipo Janus la revisará lo antes posible.'
        );
        this.resetForm();
      },
      error: err => {
        console.error('Error enviando petición', err);
        this.showToast(
          '❌ Error al enviar la petición. Revisa que el servidor esté disponible.',
          false
        );
        this.sending = false;
      }
    });
  }

  validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email || '').trim());
  }

  showToast(msg: string, ok = true) {
    this.toastMsg = msg;
    this.toastOk = ok;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => (this.toastMsg = ''), 3500);
  }
}

/* DIALOG DE CONFIRMACIÓ */
@Component({
  selector: 'app-peticion-confirm-dialog',
  standalone: true,
  template: `
    <div class="peticion-dialog-container">
      <h3 class="dialog-title">Confirmar envío</h3>
      <p class="dialog-text">
        Estás a un clic de enviar la petición. Confirma que hay permisos de imputación en el
        JIRA propuesto, de lo contrario la petición será rechazada.
      </p>
      <div class="peticion-dialog-info">
        <strong>Fecha límite:</strong>
        {{ data?.deadline ? (data.deadline | date: 'dd/MM/yyyy') : 'No indicada' }}
      </div>
      <div class="dialog-actions">
        <button class="peticion-btn peticion-secondary" (click)="close(false)">
          Cancelar
        </button>
        <button class="peticion-btn peticion-primary" (click)="close(true)">
          Confirmar envío
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .peticion-dialog-container {
        padding: 10px;
        background: #14161d;
        color: #e0e0e0;
      }
      .dialog-title {
        color: #fbc02d;
        font-size: 1.5rem;
        margin-top: 0;
      }
      .dialog-text {
        font-size: 0.95rem;
        line-height: 1.5;
        color: #9da3ae;
      }
      .peticion-dialog-info {
        margin: 15px 0;
        padding: 10px;
        background: rgba(251, 192, 45, 0.05);
        border-radius: 8px;
        border-left: 3px solid #fbc02d;
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      }
      .peticion-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        border: none;
      }
      .peticion-primary {
        background: #fbc02d;
        color: #101218;
      }
      .peticion-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
      }
    `
  ],
  imports: [CommonModule, MatButtonModule, MatDialogModule]
})
export class PeticionConfirmDialog {
  constructor(
    private dialogRef: MatDialogRef<PeticionConfirmDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  close(val: boolean) {
    this.dialogRef.close(val);
  }
}

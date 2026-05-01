import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../environments/environment';

type Estado = 'cargando' | 'ok' | 'ya-verificado' | 'error';

@Component({
  selector: 'app-verificar',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './verificar.html',
  styleUrls: ['./verificar.css']
})
export class VerificarEmailComponent implements OnInit {

  estado: Estado = 'cargando';
  errorMsg = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.estado = 'error';
      this.errorMsg = 'VERIFICAR.ERROR_NO_TOKEN';
      return;
    }

    this.http.get(`${environment.baseUrl}contact/verify-email`, { params: { token } })
      .subscribe({
        next: (res: any) => {
          if (res?.estado === 'PENDIENTE') {
            this.estado = 'ok';
          } else {
            // APROBADA / RECHAZADA → ya fue procesada antes
            this.estado = 'ya-verificado';
          }
        },
        error: (err) => {
          this.estado = 'error';
          this.errorMsg = err?.error || 'VERIFICAR.ERROR_GENERICO';
        }
      });
  }
}

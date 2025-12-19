import { Component, OnDestroy, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { SpinnerService } from './spinner.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, TranslateModule, AsyncPipe],
  template: `
    <div class="spinner-backdrop" *ngIf="spinner.visible$ | async" role="dialog" aria-modal="true">
      <div class="spinner-box" tabindex="0">
        <ng-container *ngIf="!useFallback">
          <img [src]="currentImage" class="spinner-clip" alt="clip" *ngIf="currentImage" />
        </ng-container>
        <ng-container *ngIf="useFallback">
          <mat-progress-spinner mode="indeterminate" diameter="96" strokeWidth="6"></mat-progress-spinner>
        </ng-container>
        <div class="spinner-text">{{ 'SPINNER.LOADING' | translate }}</div>
      </div>
    </div>
  `,
  styles: [
    `
      :host { position: relative; }
      .spinner-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.95);
        z-index: 999999;
        pointer-events: auto;
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
      }
      .spinner-box {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        padding: 32px 40px;
        border-radius: 22px;
        background: rgba(0,0,0,0.9);
        border: 1px solid rgba(255,255,255,0.04);
        box-shadow: 0 14px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.02), 0 0 30px rgba(255,215,64,0.06);
        transform: translateY(-8px);
        animation: popIn 220ms ease-out;
      }
      .spinner-box::before {
        content: '';
        position: absolute;
        left: -18px;
        top: -18px;
        right: -18px;
        bottom: -18px;
        border-radius: 26px;
        background: radial-gradient(circle at center, rgba(255,215,64,0.18), rgba(255,215,64,0.06) 30%, transparent 55%);
        filter: blur(12px);
        pointer-events: none;
        z-index: -1;
      }
      .spinner-clip { width: 160px; height: 160px; object-fit: contain; filter: drop-shadow(0 12px 30px rgba(0,0,0,0.45)); background: transparent; }
      .spinner-text {
        font-weight: 700;
        color: #ffffff;
        font-size: 16px;
        text-align: center;
        text-shadow: 0 2px 6px rgba(0,0,0,0.6);
      }
      @keyframes popIn {
        from { opacity: 0; transform: translateY(-18px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      /* Evitar que la app reciba clicks cuando el spinner está visible */
      body.no-scroll, html.no-scroll { overflow: hidden !important; }
    `
  ]
})
export class SpinnerComponent {
  images = ['assets/images/Clip.png', 'assets/images/Clip2.png'];
  currentImage: string | null = null;
  loadedImages: string[] = [];
  useFallback = false;
  private sub?: Subscription;
  private switchTimer?: ReturnType<typeof setInterval>;
  private pendingRaf1?: number;
  private pendingRaf2?: number;

  constructor(public spinner: SpinnerService, private ngZone: NgZone, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Preload images and detect load errors
    this.images.forEach(src => {
      const img = new Image();
      img.onload = () => {
        // image preloaded
        this.loadedImages.push(src);
      };
      img.onerror = () => {
        // image failed to load
      };
      img.src = src;
    });

    this.sub = this.spinner.visible$.subscribe(visible => {
      const doc = document.documentElement || document.body;
      if (visible) {
        // showing spinner

        // Forzar que el navegador pinte el overlay antes de que el contenido cambie:
        // hacemos dos requestAnimationFrame fuera de Angular y luego volvemos a entrar
        // para añadir la clase y arrancar la animación.
        this.ngZone.runOutsideAngular(() => {
          if (this.pendingRaf1) cancelAnimationFrame(this.pendingRaf1);
          if (this.pendingRaf2) cancelAnimationFrame(this.pendingRaf2);
          this.pendingRaf1 = requestAnimationFrame(() => {
            this.pendingRaf2 = requestAnimationFrame(() => {
              this.ngZone.run(() => {
                doc.classList.add('no-scroll');
                this.startSwitching();
                this.cdr.detectChanges();
              });
            });
          });
        });

      } else {
        // hiding spinner
        if (this.pendingRaf1) cancelAnimationFrame(this.pendingRaf1);
        if (this.pendingRaf2) cancelAnimationFrame(this.pendingRaf2);
        doc.classList.remove('no-scroll');
        this.stopSwitching();
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    const doc = document.documentElement || document.body;
    doc.classList.remove('no-scroll');
    this.stopSwitching();
  }

  private startSwitching() {
    // inicializar imagen y arrancar timer
    const available = this.loadedImages.length ? this.loadedImages : this.images;
    if (!available || available.length === 0) {
      this.useFallback = true;
      return;
    }
    this.useFallback = false;
    this.currentImage = available[0];
    this.stopSwitching();
    this.switchTimer = setInterval(() => {
      const idx = available.indexOf(this.currentImage || '') || 0;
      const next = (idx + 1) % available.length;
      this.currentImage = available[next];
    }, 600);
  }

  private stopSwitching() {
    if (this.switchTimer) {
      clearInterval(this.switchTimer);
      this.switchTimer = undefined;
    }
    this.currentImage = null;
  }
}

import { bootstrapApplication } from '@angular/platform-browser';
import { importProvidersFrom } from '@angular/core';
import { AppComponent } from './app/app.component';
import { provideRouter } from "@angular/router";
import { HomeComponent } from './app/home/home';
import { DocumentsComponent } from './app/documents/documents';
import { UsuarioComponent } from "./app/usuari/usuari";
import { ProjectsComponent } from './app/projects/projects';
import { ProjectDetailComponent } from './app/projects/project-detail';
import { ProcedimientosComponent } from './app/procedimientos/procedimientos';
import { FormacionComponent } from './app/formacion/formacion';
import { PlanificacionComponent } from './app/planificacion/planificacion';
import { MultimediaComponent } from './app/multimedia/multimedia';
import { AdministracionComponent } from './app/administracion/administracion';
// Peticion and Unete will be lazy-loaded via routes to avoid module resolution issues
import { UserProfileComponent } from './app/user-profile/user-profile';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

class CustomLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}
  getTranslation(lang: string): Observable<any> {
    return this.http.get(`./assets/i18n/${lang}.json`);
  }
}

export function httpLoaderFactory(http: HttpClient): TranslateLoader {
  return new CustomLoader(http);
}
import { BitacoraComponent as Bitacora} from './app/bitacora/bitacora';
import { Jenkins } from './app/jenkins/jenkins';
import { Infraestructura } from './app/infraestructura/infraestructura';
import { Herramientas } from './app/herramientas/herramientas';
import { DescargablesComponent } from './app/descargables/descargables';
import { spinnerInterceptor } from './app/spinner.interceptor';
import installNetworkSpinner from './app/network-spinner-patch';
import { APP_INITIALIZER } from '@angular/core';
import { SpinnerService } from './app/spinner.service';

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient]
      }
    })),
    provideRouter([
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'usuario', component: UsuarioComponent },
      {path: 'projects', component: ProjectsComponent },
      {path: 'projects/:code', component: ProjectDetailComponent },
      {path: 'procedimientos', component: ProcedimientosComponent },
      {path: 'formacion', component: FormacionComponent },
      {path: 'planificacion', component: PlanificacionComponent },
      {path: 'multimedia', component: MultimediaComponent },
      { path: 'administracion', component: AdministracionComponent },
      { path: 'peticion', loadComponent: () => import('./app/peticion/peticion').then(m => m.PeticionComponent) },
      { path: 'unete', loadComponent: () => import('./app/unete/unete').then(m => m.UneteComponent) },
      { path: 'user-profile/:id', component: UserProfileComponent },
      { path: 'descargables', component: DescargablesComponent },
      { path: 'bitacora', component: Bitacora},
      {path: 'jenkins', component: Jenkins},
      {path: 'usuario', component: UsuarioComponent},
      {path: 'infraestructura', component: Infraestructura},
      {path: 'herramientas', component: Herramientas}
      ,{ path: 'scrum', loadComponent: () => import('./app/scrum/scrum').then(m => m.ScrumComponent) }
      ,{ path: 'estimacion', loadComponent: () => import('./app/estimacion/estimacion').then(m => m.EstimacionComponent) }
    ]),

    provideHttpClient(withInterceptors([spinnerInterceptor]))
    ,
    {
      provide: APP_INITIALIZER,
      useFactory: (spinner: SpinnerService) => () => {
        try { installNetworkSpinner(spinner); } catch (e) { /* ignore */ }
      },
      deps: [SpinnerService],
      multi: true
    }
  ]
})
  .catch((err) => console.error(err));
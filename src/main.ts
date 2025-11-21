import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from "@angular/router";
import { HomeComponent } from './app/home/home';
import { DocumentsComponent } from './app/documents/documents';
import { UsuariComponent } from "./app/usuari/usuari";
import { ProjectsComponent } from './app/projects/projects';
import { ProcedimientosComponent } from './app/procedimientos/procedimientos';
import { FormacionComponent } from './app/formacion/formacion';
import { PlanificacionComponent } from './app/planificacion/planificacion';
import { AdministracionComponent } from './app/administracion/administracion';
import { provideHttpClient } from '@angular/common/http';
import { BitacoraComponent as Bitacora} from './app/Bitacora/Bitacora';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'usuari', component: UsuariComponent },
      {path: 'projects', component: ProjectsComponent },
      {path: 'procedimientos', component: ProcedimientosComponent },
      {path: 'formacion', component: FormacionComponent },
      {path: 'planificacion', component: PlanificacionComponent },
      { path: 'administracion', component: AdministracionComponent },
      { path: 'bitacora', component: Bitacora}
    ]),

    provideHttpClient()
    
  ]
})
  .catch((err) => console.error(err));
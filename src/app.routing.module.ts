import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components principals 
import { Home } from './home/home';
import { Documents } from './documents/documents';
import { Projects } from './projects/projects.component.ts';
import { Procedimientos } from './procedimientos/procedimientos';
import { Formacion } from './formacion/formacion';
import { Planificacion } from './planificacion/planificacion';
import { Administracion } from './administracion/administracion';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: Home },
  { path: 'documents', component: Documents },
  { path: 'projects', component: Projects },
  { path: 'procedimientos', component: Procedimientos },
  { path: 'formacion', component: Formacion },
  { path: 'planificacion', component: Planificacion },
  { path: 'administracion', component: Administracion },
  { path: '**', redirectTo: '/home' } // ruta per defecte
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

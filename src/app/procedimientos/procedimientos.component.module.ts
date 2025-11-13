import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProcedimientosComponent } from './procedimientos';

const routes: Routes = [
  { path: '', component: ProcedimientosComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProcedimientosRoutingModule { }


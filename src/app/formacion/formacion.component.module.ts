import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormacionComponent } from './formacion';

const routes: Routes = [
  { path: '', component: FormacionComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormacionRoutingModule { }

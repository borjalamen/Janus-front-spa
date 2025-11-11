import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from "@angular/router";
import { HomeComponent } from './app/home/home';
import { DocumentsComponent } from './app/documents/documents';
import { UsuariComponent } from "./app/usuari/usuari";
import { provideAnimations } from '@angular/platform-browser/animations'; // ← Importa animaciones

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter([
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'documents', component: DocumentsComponent },
      { path: 'usuari', component: UsuariComponent }
    ]),
    provideAnimations() // ← Añade el provider aquí
  ]
})
  .catch((err) => console.error(err));
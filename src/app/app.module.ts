import { NgModule } from '@angular/core'; // decorador que define un modulo Angular 
import { BrowserModule } from '@angular/platform-browser'; // base que ejecuta correr las aplicaciones 

import { AppComponent } from './app.component'; // componente raiz de la aplicación

@NgModule({ // definición modulo metadatos
  declarations: [AppComponent],
  imports: [
    BrowserModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

import { NgModule } from '@angular/core'; // decorador que define un modulo Angular 
import { BrowserModule } from '@angular/platform-browser'; // base que ejecuta correr las aplicaciones 
import { HttpClientModule, HttpClient } from '@angular/common/http'; // es registrado en el servicio httpclient y proveedores relacionados para hacer peticiones HTTP
// httpclient es la clase que realiza las llamadas HTTP 
import { AppComponent } from './app.component'; // componente raiz de la aplicación

// Importaciones para traducción
import { TranslateModule, TranslateLoader } from '@ngx-translate/core'; // importación de los elementos principales del modulo de traducción y la interfaz TranslateLoader que define cargar las traducciones
import { TranslateHttpLoader } from '@ngx-translate/http-loader'; // la implementación que aporta TranslateLoader carga los archivos JSON a traves de httpclient desde la ruta src/assets/texts/*.json

// la función sera exportada para hacer una compilación anticipada para ser analizada
export function HttpLoaderFactory(http: HttpClient) { 
  return new TranslateHttpLoader(http, './assets/i18n/', '.json'); // crea una instancia 
}

@NgModule({ // definición modulo metadatos
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule, // carga archivos JSON
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}

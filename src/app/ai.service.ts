import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private baseUrl = `${environment.baseUrl}ai`;

  constructor(private http: HttpClient, private translate: TranslateService) {}

  // Envía una consulta al backend AI
  query(text: string): Observable<{ answer: string }> {
    return this.queryWithAppContext(text);
  }

  // Diccionario local con explicaciones por cada elemento del menú (IAnusHub)
  private menuContext: Record<string,string> = {
    'home': 'Inicio: Panel principal con un resumen de la actividad reciente, accesos rápidos a las secciones y métricas clave del sistema.',
    'formacion': 'Formación: Gestión de rutas formativas y cursos. Permite crear rutas, añadir formaciones, organizar y exportar listados. Ideal para curación y seguimiento de material de aprendizaje.',
    'proyectos': 'Proyectos: Lista de proyectos activos con su estado, responsables y enlaces a documentación relacionada.',
    'procedimientos': 'Procedimientos: Repositorio de procedimientos operativos y guías internas, con capacidad de búsqueda y versionado.',
    'bitacora': 'Bitácora: Registro de eventos y cambios relevantes del sistema, útil para auditoría y trazabilidad.',
    'administracion': 'Administración: Ajustes de la aplicación, gestión de usuarios y permisos, y configuración de integraciones externas.',
    'descargables': 'Descargables: Área para gestionar y acceder a archivos y recursos que los usuarios pueden descargar.',
    'buscador': 'Buscador: Herramienta para localizar rápidamente cursos, rutas y documentos dentro de la aplicación mediante texto libre.'
  };

  // Mapa de las claves del menú (según `MENU` en i18n) y su correspondiente clave en IANUSHUB
  private menuKeyMap: Record<string,string> = {
    'WELCOME': 'HOME',
    'PROJECTS': 'PROYECTOS',
    'PROCEDURES': 'PROCEDIMIENTOS',
    'DOCUMENTS': 'DOCUMENTS',
    'TRAINING': 'FORMACION',
    'PLANNING': 'PLANNING',
    'MULTIMEDIA': 'MULTIMEDIA',
    'ADMIN': 'ADMINISTRACION',
    'LOGBOOK': 'BITACORA',
    'INFRASTRUCTURE': 'INFRASTRUCTURE',
    'DESCARGABLES': 'DESCARGABLES'
  };

  // Construye un resumen legible del menú usando traducciones y explicaciones IAnusHub cuando estén disponibles
  private getMenuSummary(): string {
    const keys = Object.keys(this.menuKeyMap);
    const lines: string[] = [];
    for (const k of keys) {
      const label = this.translate.instant(`MENU.${k}`) || k;
      const ianuKey = this.menuKeyMap[k];
      let explanation = this.translate.instant(`IANUSHUB.${ianuKey}`);
      if (!explanation || explanation === `IANUSHUB.${ianuKey}`) {
        // fallback to local menuContext by normalized key
        const fallbackKey = (ianuKey || '').toLowerCase();
        explanation = this.menuContext[fallbackKey] || '';
      }
      lines.push(`${label}: ${explanation}`);
    }
    // añadir buscador/otros si existen
    const buscador = this.translate.instant('IANUSHUB.BUSCADOR');
    if (buscador && buscador !== 'IANUSHUB.BUSCADOR') lines.push(`Buscar: ${buscador}`);
    return lines.join('\n');
  }

  // Devuelve la explicación local para un elemento del menú. Si no existe, devuelve un texto genérico.
  explainMenuItem(key: string): { item: string, explanation: string } {
    const raw = (key || '').toUpperCase();
    // intenta traducción localizada IANUSHUB
    const ianu = this.translate.instant(`IANUSHUB.${raw}`);
    if (ianu && ianu !== `IANUSHUB.${raw}`) return { item: raw, explanation: ianu };
    // fallback a menuContext
    const k = raw.toLowerCase();
    const explanation = this.menuContext[k] || this.translate.instant('CLIP.ERROR_QUERY') || 'Lo siento, no tengo una descripción específica para ese elemento del menú.';
    return { item: raw, explanation };
  }

  // Envía una consulta al backend AI incluyendo contexto de la app para mejorar la respuesta.
  queryWithAppContext(text: string): Observable<{ answer: string }> {
    // Construimos un prompt enriquecido que incluye un resumen del menú y ejemplos de cómo responder
    const menuSummary = this.getMenuSummary();
    const contextPrompt = `Eres IAnusHub, la IA experta en la aplicación Janus. A continuación tienes el resumen de las secciones del menú:\n${menuSummary}\n\nResponde siempre con foco en la aplicación y, si el usuario pide "explica <elemento>", responde con el párrafo explicativo correspondiente. Pregunta: ${text}`;
    return this.http.post<{ answer: string }>(`${this.baseUrl}/query`, {
      question: contextPrompt
    });
  }
}

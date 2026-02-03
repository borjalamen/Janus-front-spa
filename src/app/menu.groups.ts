// Archivo generado: agrupación de bloques para el menú lateral
// No cambia rutas ni nombres existentes — solo contenedores visuales.

export interface MenuGroup {
  id: string;
  titleKey: string; // translation key (e.g. 'MENU.GROUPS.INICIO')
  items: string[]; // nombres exactos de los submenús existentes
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'inicio',
    titleKey: 'MENU.GROUPS.INICIO',
    items: ['Bienvenida']
  },
  {
    id: 'gestion_proyectos',
    titleKey: 'MENU.GROUPS.GESTION_PROYECTOS',
    items: ['Proyectos', 'Scrum', 'Estimación', 'Planificación']
  },
  {
    id: 'operacion_procesos',
    titleKey: 'MENU.GROUPS.OPERACION_PROCESOS',
    items: ['Procedimientos', 'Bitácora']
  },
  {
    id: 'infra_tools',
    titleKey: 'MENU.GROUPS.INFRA_HERRAMIENTAS',
    items: ['Infraestructura', 'Herramientas']
  },
  {
    id: 'conocimiento_formacion',
    titleKey: 'MENU.GROUPS.CONOCIMIENTO_FORMACION',
    items: ['Documentos', 'Formación']
  },
  {
    id: 'recursos',
    titleKey: 'MENU.GROUPS.RECURSOS',
    items: ['Multimedia', 'Descargables']
  },
  {
    id: 'administracion',
    titleKey: 'MENU.GROUPS.ADMINISTRACION',
    items: ['Administración']
  }
];

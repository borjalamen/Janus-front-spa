// Archivo generado: agrupación de bloques para el menú lateral
// No cambia rutas ni nombres existentes — solo contenedores visuales.

export interface MenuItem {
  id: string; // internal id used in canShow (lowercase, no accents)
  labelKey: string; // translation key, e.g. 'MENU.WELCOME'
  route: string;
  icon?: string;
  requiresCheck?: boolean; // whether visibility depends on canShow
}

export interface MenuGroup {
  id: string;
  titleKey: string; // translation key (e.g. 'MENU.GROUPS.INICIO')
  items: MenuItem[];
}

export const MENU_GROUPS: MenuGroup[] = [
  {
    id: 'inicio',
    titleKey: 'MENU.GROUPS.INICIO',
    items: [
      { id: 'bienvenida', labelKey: 'MENU.WELCOME', route: '/home', icon: 'home', requiresCheck: false }
    ]
  },
  {
    id: 'gestion_proyectos',
    titleKey: 'MENU.GROUPS.GESTION',
    items: [
      { id: 'proyectos', labelKey: 'MENU.PROJECTS', route: '/projects', icon: 'folder_open', requiresCheck: true },
      { id: 'scrum', labelKey: 'MENU.SCRUM', route: '/scrum', icon: 'view_week', requiresCheck: false },
      { id: 'estimacion', labelKey: 'MENU.ESTIMATION', route: '/estimacion', icon: 'timeline', requiresCheck: false },
      { id: 'planificacion', labelKey: 'MENU.PLANNING', route: '/planificacion', icon: 'event_note', requiresCheck: true }
    ]
  },
  {
    id: 'operacion_procesos',
    titleKey: 'MENU.GROUPS.OPERACIONES',
    items: [
      { id: 'procedimientos', labelKey: 'MENU.PROCEDURES', route: '/procedimientos', icon: 'assignment', requiresCheck: true },
      { id: 'bitacora', labelKey: 'MENU.LOGBOOK', route: '/bitacora', icon: 'bug_report', requiresCheck: true }
    ]
  },
  {
    id: 'infra_tools',
    titleKey: 'MENU.GROUPS.INFRAESTRUCTURA',
    items: [
      { id: 'infraestructura', labelKey: 'MENU.INFRASTRUCTURE', route: '/infraestructura', icon: 'storage', requiresCheck: true },
      { id: 'herramientas', labelKey: 'MENU.TOOLS', route: '/herramientas', icon: 'build', requiresCheck: true }
    ]
  },
  {
    id: 'conocimiento_formacion',
    titleKey: 'MENU.GROUPS.CONOCIMIENTO',
    items: [
      { id: 'documentos', labelKey: 'MENU.DOCUMENTS', route: '/documents', icon: 'upload_file', requiresCheck: true },
      { id: 'formacion', labelKey: 'MENU.TRAINING', route: '/formacion', icon: 'school', requiresCheck: true }
    ]
  },
  {
    id: 'recursos',
    titleKey: 'MENU.GROUPS.RECURSOS',
    items: [
      { id: 'multimedia', labelKey: 'MENU.MULTIMEDIA', route: '/multimedia', icon: 'perm_media', requiresCheck: true },
      { id: 'descargables', labelKey: 'MENU.DESCARGABLES', route: '/descargables', icon: 'download', requiresCheck: false }
    ]
  },
  {
    id: 'administracion',
    titleKey: 'MENU.GROUPS.ADMINISTRACION',
    items: [
      { id: 'administracion', labelKey: 'MENU.ADMIN', route: '/administracion', icon: 'admin_panel_settings', requiresCheck: true }
    ]
  }
  ,
  {
    id: 'contacto',
    titleKey: 'MENU.GROUPS.CONTACTO',
    items: [
      { id: 'peticion', labelKey: 'MENU.REQUEST', route: '/peticion', icon: 'send', requiresCheck: true },
      { id: 'unete', labelKey: 'MENU.JOIN', route: '/unete', icon: 'person_add', requiresCheck: true }
    ]
  }
];

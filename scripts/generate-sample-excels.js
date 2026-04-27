/**
 * Script para generar ficheros Excel de ejemplo para importación en JanusHub.
 * Ejecución: node scripts/generate-sample-excels.js
 */
const XLSX = require('xlsx');
const path = require('path');

// ─────────────────────────────────────────────────────────────
// 1. EXCEL DE CURSOS INDIVIDUALES  →  courses-sample.xlsx
// ─────────────────────────────────────────────────────────────
const courseRows = [
  ['name', 'link', 'description', 'tags (semicolon-separated)', 'location'],
  [
    'Docker para desarrolladores',
    'https://www.udemy.com/course/docker-para-desarrolladores',
    'Aprende a contenerizar aplicaciones con Docker desde cero hasta producción.',
    'docker;devops;contenedores',
    'Udemy'
  ],
  [
    'Kubernetes: de 0 a producción',
    'https://www.udemy.com/course/kubernetes-de-cero-a-produccion',
    'Orquestación de contenedores con Kubernetes en entornos reales.',
    'kubernetes;k8s;devops;cloud',
    'Udemy'
  ],
  [
    'Spring Boot 3 con Java 21',
    'https://www.linkedin.com/learning/spring-boot-3',
    'Desarrollo de APIs REST con Spring Boot 3 y las últimas funcionalidades de Java 21.',
    'java;spring;backend;rest',
    'LinkedIn Learning'
  ],
  [
    'Angular 20 avanzado',
    'https://www.pluralsight.com/courses/angular-advanced',
    'Signals, standalone components, control flow y SSR en Angular 20.',
    'angular;typescript;frontend',
    'Pluralsight'
  ],
  [
    'MongoDB Atlas para equipos',
    'https://learn.mongodb.com/learn/learning-path/mongodb-atlas',
    'Gestión de clústeres, índices y agregaciones en MongoDB Atlas.',
    'mongodb;nosql;bbdd',
    'MongoDB University'
  ],
  [
    'Git avanzado y GitFlow',
    'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow',
    'Flujos de trabajo, rebase interactivo, hooks y buenas prácticas.',
    'git;versionado;devops',
    'Atlassian'
  ],
  [
    'Clean Code y SOLID en Java',
    'https://www.udemy.com/course/clean-code-java',
    'Principios de código limpio y patrones de diseño aplicados en Java.',
    'java;cleancode;solid;arquitectura',
    'Udemy'
  ],
  [
    'AWS Cloud Practitioner',
    'https://aws.amazon.com/es/training/digital/aws-cloud-practitioner-essentials',
    'Fundamentos de AWS: compute, storage, networking y seguridad.',
    'aws;cloud;infraestructura',
    'AWS Training'
  ],
  [
    'Cypress: testing end-to-end',
    'https://learn.cypress.io',
    'Automatización de pruebas E2E para aplicaciones web modernas.',
    'testing;e2e;cypress;calidad',
    'Cypress.io'
  ],
  [
    'Scrum Master Certificación PSM I',
    'https://www.scrum.org/professional-scrum-master-i-certification',
    'Preparación para la certificación PSM I de Scrum.org.',
    'agile;scrum;certificacion',
    'Scrum.org'
  ],
];

const wsCourses = XLSX.utils.aoa_to_sheet(courseRows);
wsCourses['!cols'] = [
  { wch: 45 }, { wch: 65 }, { wch: 80 }, { wch: 45 }, { wch: 22 }
];
const wbCourses = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbCourses, wsCourses, 'Courses');
const coursesFile = path.join(__dirname, '..', 'courses-sample.xlsx');
XLSX.writeFile(wbCourses, coursesFile);
console.log('✔ Generado: courses-sample.xlsx');

// ─────────────────────────────────────────────────────────────
// 2. EXCEL DE TRAINING PATHS  →  training-paths-sample.xlsx
// ─────────────────────────────────────────────────────────────

// Hoja 1: Paths
const pathRows = [
  ['path_name', 'audience', 'objectives', 'prerequisites'],
  [
    'Backend Java',
    'Desarrolladores Java junior y senior',
    'Dominar el stack Java moderno: Spring Boot 3, Java 21, APIs REST, MongoDB y buenas prácticas de código.',
    'Conocimientos básicos de programación orientada a objetos'
  ],
  [
    'DevOps Essentials',
    'Desarrolladores y técnicos de sistemas',
    'Adquirir las competencias necesarias para implantar pipelines CI/CD, contenedores y orquestación en la nube.',
    'Experiencia básica con Linux y línea de comandos'
  ],
  [
    'Frontend Angular',
    'Desarrolladores frontend con base en HTML/CSS/JS',
    'Diseñar y desarrollar SPAs de producción con Angular 20, TypeScript y Material.',
    'JavaScript intermedio'
  ],
];

// Hoja 2: Courses (path_name, name, link, description, tags, location)
const pathCourseRows = [
  ['path_name', 'name', 'link', 'description', 'tags (semicolon-separated)', 'location'],
  // ── Backend Java ───────────────────────────────────────────
  [
    'Backend Java',
    'Spring Boot 3 con Java 21',
    'https://www.linkedin.com/learning/spring-boot-3',
    'Desarrollo de APIs REST con Spring Boot 3 y las últimas funcionalidades de Java 21.',
    'java;spring;backend;rest',
    'LinkedIn Learning'
  ],
  [
    'Backend Java',
    'Clean Code y SOLID en Java',
    'https://www.udemy.com/course/clean-code-java',
    'Principios de código limpio y patrones de diseño aplicados en Java.',
    'java;cleancode;solid;arquitectura',
    'Udemy'
  ],
  [
    'Backend Java',
    'MongoDB Atlas para equipos',
    'https://learn.mongodb.com/learn/learning-path/mongodb-atlas',
    'Gestión de clústeres, índices y agregaciones en MongoDB Atlas.',
    'mongodb;nosql;bbdd',
    'MongoDB University'
  ],
  [
    'Backend Java',
    'Git avanzado y GitFlow',
    'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow',
    'Flujos de trabajo, rebase interactivo, hooks y buenas prácticas.',
    'git;versionado;devops',
    'Atlassian'
  ],
  // ── DevOps Essentials ─────────────────────────────────────
  [
    'DevOps Essentials',
    'Docker para desarrolladores',
    'https://www.udemy.com/course/docker-para-desarrolladores',
    'Aprende a contenerizar aplicaciones con Docker desde cero hasta producción.',
    'docker;devops;contenedores',
    'Udemy'
  ],
  [
    'DevOps Essentials',
    'Kubernetes: de 0 a producción',
    'https://www.udemy.com/course/kubernetes-de-cero-a-produccion',
    'Orquestación de contenedores con Kubernetes en entornos reales.',
    'kubernetes;k8s;devops;cloud',
    'Udemy'
  ],
  [
    'DevOps Essentials',
    // Este curso ya existe en Backend Java → el importador lo reutilizará
    'Git avanzado y GitFlow',
    'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow',
    'Flujos de trabajo, rebase interactivo, hooks y buenas prácticas.',
    'git;versionado;devops',
    'Atlassian'
  ],
  [
    'DevOps Essentials',
    'AWS Cloud Practitioner',
    'https://aws.amazon.com/es/training/digital/aws-cloud-practitioner-essentials',
    'Fundamentos de AWS: compute, storage, networking y seguridad.',
    'aws;cloud;infraestructura',
    'AWS Training'
  ],
  // ── Frontend Angular ──────────────────────────────────────
  [
    'Frontend Angular',
    'Angular 20 avanzado',
    'https://www.pluralsight.com/courses/angular-advanced',
    'Signals, standalone components, control flow y SSR en Angular 20.',
    'angular;typescript;frontend',
    'Pluralsight'
  ],
  [
    'Frontend Angular',
    'Cypress: testing end-to-end',
    'https://learn.cypress.io',
    'Automatización de pruebas E2E para aplicaciones web modernas.',
    'testing;e2e;cypress;calidad',
    'Cypress.io'
  ],
  [
    'Frontend Angular',
    // Reutiliza curso ya existente en otros paths
    'Git avanzado y GitFlow',
    'https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow',
    'Flujos de trabajo, rebase interactivo, hooks y buenas prácticas.',
    'git;versionado;devops',
    'Atlassian'
  ],
  [
    'Frontend Angular',
    'Scrum Master Certificación PSM I',
    'https://www.scrum.org/professional-scrum-master-i-certification',
    'Preparación para la certificación PSM I de Scrum.org.',
    'agile;scrum;certificacion',
    'Scrum.org'
  ],
];

const wsPath    = XLSX.utils.aoa_to_sheet(pathRows);
const wsCourse2 = XLSX.utils.aoa_to_sheet(pathCourseRows);

wsPath['!cols']    = [{ wch: 30 }, { wch: 45 }, { wch: 80 }, { wch: 50 }];
wsCourse2['!cols'] = [{ wch: 30 }, { wch: 45 }, { wch: 65 }, { wch: 80 }, { wch: 45 }, { wch: 22 }];

const wbPaths = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbPaths, wsPath,    'Paths');
XLSX.utils.book_append_sheet(wbPaths, wsCourse2, 'Courses');

const pathsFile = path.join(__dirname, '..', 'training-paths-sample.xlsx');
XLSX.writeFile(wbPaths, pathsFile);
console.log('✔ Generado: training-paths-sample.xlsx');

console.log('\nNota: "Git avanzado y GitFlow" aparece en varios paths a propósito');
console.log('      para demostrar la deduplicación de cursos en el importador.');

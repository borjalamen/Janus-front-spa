import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { LocalStorageService } from '../local-storage.service';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  status: string;
  cvPath?: string;
  // Campos adicionales del perfil/curriculum
  experienceYears?: number;
  position?: string;
  department?: string;
  skills?: string[];
  certifications?: string[];
  education?: string;
  phone?: string;
  location?: string;
  bio?: string;
  joinDate?: string;
  proyectos?: number;
}

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css']
})
export class UserProfileComponent implements OnInit {
  user: UserProfile | null = null;
  loading = true;
  error = false;

  private baseUrl = `${environment.baseUrl}users`;

  // Datos de demostración hardcodeados para la presentación
  private usuariosDemoCV: UserProfile[] = [
    {
      id: 'demo-001',
      username: 'agarcia',
      fullName: 'Ana García López',
      email: 'agarcia@minsait.com',
      roles: ['ADMIN', 'DEV'],
      status: 'ACTIVE',
      cvPath: '/cvs/agarcia_cv.pdf',
      position: 'Tech Lead Senior',
      experienceYears: 8,
      department: 'Desarrollo',
      skills: ['Angular', 'Java', 'Spring Boot', 'AWS', 'Docker', 'Kubernetes'],
      certifications: ['AWS Solutions Architect', 'Scrum Master'],
      education: 'Ingeniería Informática - Universidad Politécnica de Madrid',
      phone: '+34 612 345 678',
      location: 'Madrid, España',
      bio: 'Apasionada por la tecnología con más de 8 años liderando equipos de desarrollo. Especializada en arquitecturas cloud y metodologías ágiles.',
      joinDate: '2018-03-15',
      proyectos: 12
    },
    {
      id: 'demo-002',
      username: 'cmartinez',
      fullName: 'Carlos Martínez Ruiz',
      email: 'cmartinez@minsait.com',
      roles: ['DEV'],
      status: 'ACTIVE',
      cvPath: '/cvs/cmartinez_cv.pdf',
      position: 'Full Stack Developer',
      experienceYears: 5,
      department: 'Desarrollo',
      skills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Azure', 'GraphQL'],
      certifications: ['Azure Developer Associate'],
      education: 'Grado en Ingeniería del Software - Universidad de Sevilla',
      phone: '+34 623 456 789',
      location: 'Sevilla, España',
      bio: 'Desarrollador full stack con pasión por crear aplicaciones web modernas y escalables.',
      joinDate: '2021-01-10',
      proyectos: 8
    },
    {
      id: 'demo-003',
      username: 'lrodriguez',
      fullName: 'Laura Rodríguez Sánchez',
      email: 'lrodriguez@minsait.com',
      roles: ['CONSULTOR'],
      status: 'ACTIVE',
      cvPath: '/cvs/lrodriguez_cv.pdf',
      position: 'Consultora IT Senior',
      experienceYears: 10,
      department: 'Consultoría',
      skills: ['SAP', 'Oracle', 'Power BI', 'SQL Server', 'Tableau', 'JIRA'],
      certifications: ['ITIL v4', 'PMP', 'SAP Certified Application Associate'],
      education: 'MBA - IE Business School | Ingeniería Industrial - Universidad Carlos III',
      phone: '+34 634 567 890',
      location: 'Barcelona, España',
      bio: 'Consultora con amplia experiencia en transformación digital y gestión de proyectos empresariales a gran escala.',
      joinDate: '2016-06-20',
      proyectos: 25
    },
    {
      id: 'demo-004',
      username: 'jfernandez',
      fullName: 'Javier Fernández Torres',
      email: 'jfernandez@minsait.com',
      roles: ['DEV'],
      status: 'ACTIVE',
      cvPath: '/cvs/jfernandez_cv.pdf',
      position: 'DevOps Engineer',
      experienceYears: 6,
      department: 'Infraestructura',
      skills: ['Jenkins', 'Terraform', 'Ansible', 'Python', 'Kubernetes', 'ArgoCD', 'GitLab CI'],
      certifications: ['CKA - Certified Kubernetes Administrator', 'AWS DevOps Professional'],
      education: 'Ingeniería de Telecomunicaciones - Universidad de Valencia',
      phone: '+34 645 678 901',
      location: 'Valencia, España',
      bio: 'Especialista en automatización y CI/CD. Comprometido con la cultura DevOps y la mejora continua de procesos.',
      joinDate: '2019-09-01',
      proyectos: 15
    },
    {
      id: 'demo-005',
      username: 'mlopez',
      fullName: 'María López Gómez',
      email: 'mlopez@minsait.com',
      roles: ['CONSULTOR', 'DEV'],
      status: 'ACTIVE',
      cvPath: '/cvs/mlopez_cv.pdf',
      position: 'Data Engineer',
      experienceYears: 4,
      department: 'Data & Analytics',
      skills: ['Python', 'Spark', 'Databricks', 'Azure Data Factory', 'SQL', 'Airflow'],
      certifications: ['Azure Data Engineer Associate', 'Databricks Certified Data Engineer'],
      education: 'Máster en Big Data - Universidad Complutense | Matemáticas - UAM',
      phone: '+34 656 789 012',
      location: 'Madrid, España',
      bio: 'Data Engineer con pasión por convertir datos en información valiosa para el negocio.',
      joinDate: '2022-02-14',
      proyectos: 7
    },
    {
      id: 'demo-006',
      username: 'pnavarro',
      fullName: 'Pedro Navarro Díaz',
      email: 'pnavarro@minsait.com',
      roles: ['DEV'],
      status: 'ACTIVE',
      cvPath: '/cvs/pnavarro_cv.pdf',
      position: 'Backend Developer',
      experienceYears: 3,
      department: 'Desarrollo',
      skills: ['Java', 'Spring Boot', 'PostgreSQL', 'RabbitMQ', 'Redis', 'Microservices'],
      certifications: ['Oracle Certified Professional Java SE 11'],
      education: 'Ingeniería Informática - Universidad de Granada',
      phone: '+34 667 890 123',
      location: 'Granada, España',
      bio: 'Desarrollador backend enfocado en crear APIs robustas y arquitecturas de microservicios.',
      joinDate: '2023-04-03',
      proyectos: 5
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private storage: LocalStorageService
  ) {}

  ngOnInit(): void {
    
    const currentUser = this.storage.getObject<{ id?: string }>('user');
    console.log('Usuario en localStorage:', currentUser);

    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadUserProfile(userId);
    } else {
      this.error = true;
      this.loading = false;
    }
  }

  loadUserProfile(userId: string): void {
    // Primero buscar en los datos de demostración
    const demoUser = this.usuariosDemoCV.find(u => u.id === userId);
    if (demoUser) {
      this.user = demoUser;
      this.loading = false;
      return;
    }

    // Si no está en demo, buscar en el backend
    this.http.get<UserProfile>(`${this.baseUrl}/${userId}`).subscribe({
      next: (data) => {
        this.user = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando perfil de usuario', err);
        this.error = true;
        this.loading = false;
      }
    });
  }

  getRolLabel(rol: string): string {
    const labels: { [key: string]: string } = {
      'ADMIN': 'Administrador',
      'CONSULTOR': 'Consultor',
      'DEV': 'DevOps'
    };
    return labels[rol] || rol;
  }

  downloadCV(): void {
    if (this.user?.cvPath && this.user?.id) {
      window.open(`${environment.baseUrl}files/cv/${this.user.id}`, '_blank');
    }
  }

  goBack(): void {
    this.router.navigate(['/administracion']);
  }

  getInitials(): string {
    if (!this.user?.fullName) return '?';
    const parts = this.user.fullName.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0]?.toUpperCase() || '?';
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent, NoopAnimationsModule] // ✅ standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

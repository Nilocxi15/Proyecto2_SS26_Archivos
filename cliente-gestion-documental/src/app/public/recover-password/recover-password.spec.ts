import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecoverPassword } from './recover-password';

describe('RecoverPassword', () => {
  let component: RecoverPassword;
  let fixture: ComponentFixture<RecoverPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecoverPassword],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RecoverPassword);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

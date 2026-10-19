import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Papelera } from './papelera';

describe('Papelera', () => {
  let component: Papelera;
  let fixture: ComponentFixture<Papelera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Papelera],
    }).compileComponents();

    fixture = TestBed.createComponent(Papelera);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

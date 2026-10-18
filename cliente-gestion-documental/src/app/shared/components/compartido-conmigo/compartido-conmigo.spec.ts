import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompartidoConmigo } from './compartido-conmigo';

describe('CompartidoConmigo', () => {
  let component: CompartidoConmigo;
  let fixture: ComponentFixture<CompartidoConmigo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompartidoConmigo],
    }).compileComponents();

    fixture = TestBed.createComponent(CompartidoConmigo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

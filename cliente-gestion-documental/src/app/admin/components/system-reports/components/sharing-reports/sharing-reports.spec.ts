import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharingReports } from './sharing-reports';

describe('SharingReports', () => {
  let component: SharingReports;
  let fixture: ComponentFixture<SharingReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharingReports],
    }).compileComponents();

    fixture = TestBed.createComponent(SharingReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

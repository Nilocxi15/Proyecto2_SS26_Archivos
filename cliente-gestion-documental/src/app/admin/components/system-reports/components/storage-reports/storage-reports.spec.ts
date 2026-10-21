import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StorageReports } from './storage-reports';

describe('StorageReports', () => {
  let component: StorageReports;
  let fixture: ComponentFixture<StorageReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorageReports],
    }).compileComponents();

    fixture = TestBed.createComponent(StorageReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivityReports } from './activity-reports';

describe('ActivityReports', () => {
  let component: ActivityReports;
  let fixture: ComponentFixture<ActivityReports>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActivityReports],
    }).compileComponents();

    fixture = TestBed.createComponent(ActivityReports);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

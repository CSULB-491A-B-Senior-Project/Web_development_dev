import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExploreCard } from './explore-card';

describe('ExploreCard', () => {
  let component: ExploreCard;
  let fixture: ComponentFixture<ExploreCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExploreCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExploreCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

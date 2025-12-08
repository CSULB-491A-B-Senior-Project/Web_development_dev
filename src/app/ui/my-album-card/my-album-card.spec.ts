import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyAlbumCard } from './my-album-card';

describe('MyAlbumCard', () => {
  let component: MyAlbumCard;
  let fixture: ComponentFixture<MyAlbumCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyAlbumCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MyAlbumCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

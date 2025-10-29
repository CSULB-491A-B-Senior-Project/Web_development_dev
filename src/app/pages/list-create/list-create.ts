import { Component, inject } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDropList, CdkDrag, CdkDragDrop, CdkDragHandle, moveItemInArray } from '@angular/cdk/drag-drop';

interface Artist { artistName: string; }
interface Album { id: string; name: string; releaseYear: number; artist: Artist; albumCover: string; }

const MOCK_ALBUMS: Album[] = [
  { id: 'p237', name: 'Morning Waves', releaseYear: 2019, artist: { artistName: 'The Coast' }, albumCover: 'https://picsum.photos/id/237/300/300' },
  { id: 'p1025', name: 'Neon Nights', releaseYear: 2021, artist: { artistName: 'City Lights' }, albumCover: 'https://picsum.photos/id/1025/300/300' },
  { id: 'p1069', name: 'Autumn Lines', releaseYear: 2018, artist: { artistName: 'Maple & Co.' }, albumCover: 'https://picsum.photos/id/1069/300/300' },
  { id: 'p1074', name: 'Orbit', releaseYear: 2020, artist: { artistName: 'Satellite 7' }, albumCover: 'https://picsum.photos/id/1074/300/300' },
  { id: 'p1084', name: 'Horizon', releaseYear: 2017, artist: { artistName: 'Wide Open' }, albumCover: 'https://picsum.photos/id/1084/300/300' },
  { id: 'p1027', name: 'Night Drive', releaseYear: 2016, artist: { artistName: 'FM 99' }, albumCover: 'https://picsum.photos/id/1027/300/300' },
  { id: 'p1021', name: 'Sunlit', releaseYear: 2015, artist: { artistName: 'Golden Hour' }, albumCover: 'https://picsum.photos/id/1021/300/300' },
  { id: 'p1011', name: 'Under Current', releaseYear: 2022, artist: { artistName: 'Riverton' }, albumCover: 'https://picsum.photos/id/1011/300/300' },
];

@Component({
  selector: 'app-list-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgFor, RouterLink, CdkDropList, CdkDrag, CdkDragHandle],
  // IMPORTANT: template file name the user wants
  templateUrl: './list-create.html',
  styleUrls: ['./list-create.scss']
})
export class ListCreateComponent {
  private fb = inject(FormBuilder);  // ✅ initialized before field initializers

  form: FormGroup = this.fb.group({
    listName: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
  });
  constructor() { }

  albumSearch = new FormControl<string>('', { nonNullable: true });
  showResults = false;
  results: Album[] = [];

  selected: Album[] = [MOCK_ALBUMS[0], MOCK_ALBUMS[1], MOCK_ALBUMS[2]]; // pre-seeded

  onSearchInput(value: string) {
    const q = (value || '').trim().toLowerCase();
    this.showResults = q.length > 0;
    if (!q) { this.results = []; return; }
    this.results = MOCK_ALBUMS.filter(a =>
      a.name.toLowerCase().includes(q) || a.artist.artistName.toLowerCase().includes(q)
    ).slice(0, 12);
  }

  addAlbum(album: Album) {
    if (!this.selected.some(a => a.id === album.id)) {
      this.selected = [...this.selected, album];
    }
    this.clearSearch();
  }

  removeAlbum(album: Album) {
    this.selected = this.selected.filter(a => a.id !== album.id);
  }

  drop(ev: CdkDragDrop<Album[]>) {
    // Reorder in-place
    moveItemInArray(this.selected, ev.previousIndex, ev.currentIndex);
    // Force change detection update
    this.selected = [...this.selected];
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const payload = {
      listName: this.form.value.listName,
      description: this.form.value.description,
      albumIds: this.selected.map(a => a.id)
    };
    console.log('[demo] Save List payload:', payload);
  }

  clearSearch() {
    this.albumSearch.setValue('');
    this.results = [];
    this.showResults = false;
  }
}

import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild, AfterViewInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDrag, CdkDropList, CdkDropListGroup, moveItemInArray, CdkDragDrop, CdkDragHandle, CdkDragPreview, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

// Mock interfaces, replace with your actual models
export interface Artist {
  id: string;
  artistName: string;
  artistImage: string;
}

export interface Album {
  id: string;
  name: string;
  albumCover: string;
  releaseYear: number;
  artist: { artistName: string };
}

export interface Song {
  id: string;
  name: string;
  artistName: string;
  albumCover: string;
}

@Component({
  selector: 'app-settings-profile',
  templateUrl: './settings-profile.html',
  styleUrl: './settings-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    CdkDropListGroup,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPreview,
    CdkDragPlaceholder,
    NgOptimizedImage, // This import makes the [ngSrc] directive work
  ],
})
export class SettingsProfile implements AfterViewInit {
  #fb = inject(FormBuilder);
  // Mock services - replace with your actual data services
  // #artistService = inject(ArtistService);
  // #albumService = inject(AlbumService);
  // #profileService = inject(ProfileService);

  // Signals for state management
  selectedFileName = signal('');
  favoriteArtists = signal<Artist[]>([]);
  favoriteAlbums = signal<Album[]>([]);
  favoriteSong = signal<Song | null>(null);
  songResults = signal<Song[]>([]);
  artistResults = signal<Artist[]>([]);
  albumResults = signal<Album[]>([]);
  showSongResults = signal(false);
  showArtistResults = signal(false);
  showAlbumResults = signal(false);

  // Forms
  bioForm = this.#fb.group({
    bio: ['', [Validators.maxLength(150)]],
  });
  songSearch = new FormControl('');
  artistSearch = new FormControl('');
  albumSearch = new FormControl('');

  // View Children
  bioTextarea = viewChild.required<ElementRef<HTMLTextAreaElement>>('bioTextarea');

  constructor() {
    this.loadInitialData();

    // Song search logic
    this.songSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.showSongResults.set(!!value)),
      switchMap(term => {
        if (!term) return of([]);
        // Replace with actual service call
        const mockSongs: Song[] = [
          { id: 's1', name: 'The Less I Know The Better', artistName: 'Tame Impala', albumCover: '/assets/currents.jpg' },
          { id: 's2', name: 'Pyramids', artistName: 'Frank Ocean', albumCover: '/assets/blonde.jpg' },
          { id: 's3', name: 'Digital Love', artistName: 'Daft Punk', albumCover: '/assets/discovery.jpg' },
        ];
        return of(mockSongs.filter(s => s.name.toLowerCase().includes(term.toLowerCase())));
      })
    ).subscribe(songs => this.songResults.set(songs));

    // Artist search logic
    this.artistSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.showArtistResults.set(!!value)),
      switchMap(term => {
        if (!term) return of([]);
        // Replace with actual service call: this.#artistService.search(term)
        const mockArtists: Artist[] = [
          { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
          { id: '2', artistName: 'Radiohead', artistImage: '/assets/radiohead.jpg' },
        ];
        return of(mockArtists.filter(a => a.artistName.toLowerCase().includes(term.toLowerCase())));
      })
    ).subscribe(artists => this.artistResults.set(artists));

    // Album search logic
    this.albumSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(value => this.showAlbumResults.set(!!value)),
      switchMap(term => {
        if (!term) return of([]);
        // Replace with actual service call: this.#albumService.search(term)
        const mockAlbums: Album[] = [
          { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: '/assets/currents.jpg' },
          { id: 'a2', name: 'In Rainbows', releaseYear: 2007, artist: { artistName: 'Radiohead' }, albumCover: '/assets/in-rainbows.jpg' },
        ];
        return of(mockAlbums.filter(a => a.name.toLowerCase().includes(term.toLowerCase())));
      })
    ).subscribe(albums => this.albumResults.set(albums));
  }

  ngAfterViewInit(): void {
    // Use setTimeout to ensure the initial resize happens after the view is fully rendered.
    setTimeout(() => this.autoResizeBio(), 0);
  }

  autoResizeBio(): void {
    const textarea = this.bioTextarea()?.nativeElement;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }

  loadInitialData() {
    // Mock loading data from a profile service
    const initialBio = 'This is my current bio. I love discovering new music and sharing my favorite tracks.';
    this.bioForm.patchValue({ bio: initialBio });
    this.favoriteArtists.set([
        { id: '3', artistName: 'Daft Punk', artistImage: '/assets/daft-punk.jpg' },
        { id: '1', artistName: 'Tame Impala', artistImage: '/assets/tame-impala.jpg' },
    ]);
    this.favoriteAlbums.set([
        { id: 'a3', name: 'Discovery', releaseYear: 2001, artist: { artistName: 'Daft Punk' }, albumCover: '/assets/discovery.jpg' },
        { id: 'a1', name: 'Currents', releaseYear: 2015, artist: { artistName: 'Tame Impala' }, albumCover: '/assets/currents.jpg' },
    ]);
    this.favoriteSong.set({ id: 's1', name: 'The Less I Know The Better', artistName: 'Tame Impala', albumCover: '/assets/currents.jpg' });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFileName.set(input.files[0].name);
    }
  }

  onBioSubmit(): void {
    if (this.bioForm.valid) {
      console.log('Saving bio:', this.bioForm.value.bio);
      // Call profile service to save bio
    }
  }

  selectSong(song: Song): void {
    this.favoriteSong.set(song);
    this.songSearch.setValue('');
  }

  clearFavoriteSong(): void {
    this.favoriteSong.set(null);
  }

  saveFavoriteSong(): void {
    console.log('Saving song:', this.favoriteSong());
    // Call profile service to save favorite song
  }

  addArtist(artist: Artist): void {
    if (!this.favoriteArtists().some(a => a.id === artist.id)) {
      this.favoriteArtists.update(artists => [...artists, artist]);
    }
    this.artistSearch.setValue('');
  }

  removeArtist(artistToRemove: Artist): void {
    this.favoriteArtists.update(artists => artists.filter(artist => artist.id !== artistToRemove.id));
  }

  addAlbum(album: Album): void {
    if (!this.favoriteAlbums().some(a => a.id === album.id)) {
      this.favoriteAlbums.update(albums => [...albums, album]);
    }
    this.albumSearch.setValue('');
  }

  removeAlbum(albumToRemove: Album): void {
    this.favoriteAlbums.update(albums => albums.filter(album => album.id !== albumToRemove.id));
  }

  dropArtist(event: CdkDragDrop<Artist[]>): void {
    this.favoriteArtists.update(artists => {
        const newArray = [...artists];
        moveItemInArray(newArray, event.previousIndex, event.currentIndex);
        return newArray;
    });
  }

  dropAlbum(event: CdkDragDrop<Album[]>): void {
     this.favoriteAlbums.update(albums => {
        const newArray = [...albums];
        moveItemInArray(newArray, event.previousIndex, event.currentIndex);
        return newArray;
    });
  }

  saveFavoriteArtists(): void {
    console.log('Saving artists:', this.favoriteArtists());
    // Call profile service to save artists
  }

  saveFavoriteAlbums(): void {
    console.log('Saving albums:', this.favoriteAlbums());
    // Call profile service to save albums
  }
}
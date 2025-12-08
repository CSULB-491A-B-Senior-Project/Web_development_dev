import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ArtistAlbum, ArtistDetails } from '../models/playlist.models';
import { ApiService } from '../api.service';

@Injectable({
    providedIn: 'root'
})
export class ArtistService {
    constructor(private api: ApiService) {}

    // GET ARTIST
    getArtists(): Observable<ArtistDetails[]> {
        return this.api.get<ArtistDetails[]>('/Artists');
    }

    // GET ARTIST WITH ID
    getArtist(id: string): Observable<ArtistDetails> {
        return this.api.get<ArtistDetails>(`/Artists/${id}`);
    }

    // GET ARTIST ALBUMS
    getArtistAlbums(id: string): Observable<ArtistAlbum[]> {
        return this.api.get<ArtistAlbum[]>(`/Artists/${id}/Albums`);
    }
}
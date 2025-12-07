import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Artist, Album, ArtistDetails } from '../models/playlist.models';
import { ApiService } from '../api.service';

@Injectable({
    providedIn: 'root'
})
export class ArtistService {
    constructor(private api: ApiService) {}

    // GET /v1/Artists
    getArtists(): Observable<ArtistDetails[]> {
        return this.api.get<ArtistDetails[]>('/Artists');
    }

    // GET /v1/Artists/{id}
    getArtist(id: string): Observable<ArtistDetails> {
        return this.api.get<ArtistDetails>(`/Artists/${id}`);
    }

    getArtistAlbums(id: string): Observable<Album[]> {
        return this.api.get<any[]>(`/Artists/${id}/Albums`);
    }
}
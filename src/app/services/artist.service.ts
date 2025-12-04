import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Artist, Album } from '../models/music.models';
import { ApiService } from '../api.service';

@Injectable({
    providedIn: 'root'
})
export class ArtistService {
    constructor(private api: ApiService) {}

    // GET /v1/Artists
    getArtists(): Observable<Artist[]> {
        return this.api.get<Artist[]>('/Artists');
    }

    // GET /v1/Artists/{id}
    getArtist(id: string): Observable<Artist> {
        return this.api.get<Artist>(`/Artists/${id}`);
    }

    // POST /v1/Artists
    createArtist(artist: Omit<Artist, 'artistId'>): Observable<Artist> {
        return this.api.post<Artist>('/Artists', artist);
    }

    // PUT /v1/Artists/{id}
    updateArtist(id: string, artist: Partial<Artist>): Observable<Artist> {
        return this.api.put<Artist>(`/Artists/${id}`, artist);
    }

    // DELETE /v1/Artists/{id}
    deleteArtist(id: string) {
        return this.api.delete(`/Artists/${id}`);
    }
}
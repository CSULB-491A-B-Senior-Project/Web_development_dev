export interface Artist {
  artistName: string;
}

export interface Track {
  id: string;
  name: string;
  duration: number;
  trackNumber: number;
  albumId: string;
}

export interface Album {
  id: string;
  title: string;
  releaseYear: number;
  artist: Artist;
  albumCover: string;
}
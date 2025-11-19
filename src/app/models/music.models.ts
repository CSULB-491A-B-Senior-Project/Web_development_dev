export interface Song {
  id: string;
  name: string;
  artistName: string;
  albumCover: string;
}

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
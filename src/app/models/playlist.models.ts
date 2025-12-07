export interface Artist {
  id: string;
  artistName: string;
}

export interface ArtistDetails {
  id: string;
  name: string;
  followerCount: number;
  imageUrl: string;
  albums: string[];
  details: string;
  profileUrl: string;
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
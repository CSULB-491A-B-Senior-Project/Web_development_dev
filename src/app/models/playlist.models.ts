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

export interface ArtistAlbum {
  id: string;
  title: string;
  artist: string;
  releaseDate: string;
  coverArt: string;
}

export interface Album {
  albumId: string;
  albumName: string;
  artistName: string;
  createdAt: number;
  albumImageUrl: string;
}

export interface myAlbum {
  id: string;
  name: string;
  description: string;
  userId: string;
}

export interface FavoriteSong {
  albumId: string;
  albumTitle: "Die On This Hill"
  id: string;
  name: string;
}
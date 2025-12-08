export interface Song {
  id: string;
  name: string;

  // Backwards compatible fields (keep these so existing services/components don't break)
  artistName?: string;
  albumCover?: string;

  // New, more robust fields (optional so existing code still works)
  artistNameCanonical?: string;
  albumCoverUrl?: string;
  durationMs?: number;
  trackNumber?: number;
  previewUrl?: string;

  // Raw provider payload for debugging (optional)
  raw?: unknown;
}

export interface Artist {
  id: string;

  // Backwards compatible alias
  artistName?: string;
  artistImage?: string;

  // Canonical fields
  name?: string;
  images?: string[];        // provider images (largest -> smallest)
  primaryImage?: string;    // convenience: images[0]
  genres?: string[];

  rank?: number;          

  raw?: unknown;
}

export interface ArtistInfo {
  id: string;
  artistName: string;
  artistImage: string;
  bio: string;
  followers: number;
  albums: Album[];
}

export interface Album {
  id: string;
  name: string;

  // Backwards compatible fields
  albumCover?: string;
  releaseYear?: number;
  artist?: { artistName?: string };

  // Canonical fields
  images?: string[];
  albumCoverUrl?: string;
  releaseDate?: string;
  totalTracks?: number;
  artistCanonical?: { id?: string; name?: string };

  raw?: unknown;
}

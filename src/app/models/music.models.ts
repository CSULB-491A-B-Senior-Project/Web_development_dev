// export interface Song {
//   id: string;
//   name: string;
//   artistName: string;
//   albumCover: string;
// }

// export interface Artist {
//   id: string;
//   artistName: string;
//   artistImage: string;
// }

// export interface Album {
//   id: string;
//   name: string;
//   albumCover: string;
//   releaseYear: number;
//   artist: { artistName: string };
// }
// music.models.ts
// src/app/models/music.models.ts

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

  raw?: unknown;
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

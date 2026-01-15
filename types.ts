
export type Platform = 'PS4' | 'PS5' | 'Both';

export interface GameUpdate {
  version: string;
  firmware: string;
  downloadUrl: string;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  downloadUrl: string;
  trailerUrl?: string;
  platform: Platform;
  category: string;
  rating: number;
  download_count: number;
  languages?: string[];
  updates?: GameUpdate[];
}

export interface GameReport {
  id: string;
  game_id: string;
  game_title?: string;
  user_id: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

export interface GameRequest {
  id: string;
  user_id: string;
  game_title: string;
  platform: Platform;
  status: 'pending' | 'added' | 'rejected';
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean; // admin@fpkg.com
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

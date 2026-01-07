
import { Game } from '../types';

export const INITIAL_GAMES: Game[] = [
  {
    id: '1',
    title: 'Marvel\'s Spider-Man 2',
    description: 'The next installment in the Marvel\'s Spider-Man franchise, featuring both Peter Parker and Miles Morales.',
    imageUrl: 'https://picsum.photos/seed/spiderman/600/400',
    downloadUrl: 'https://example.com/dl/sm2',
    platform: 'PS5',
    category: 'Action',
    rating: 4.9,
    // Fix: Added missing required download_count property
    download_count: 15420
  },
  {
    id: '2',
    title: 'God of War Ragnarök',
    description: 'Kratos and Atreus must journey to each of the Nine Realms in search of answers as Asgardian forces prepare for a prophesied battle.',
    imageUrl: 'https://picsum.photos/seed/godofwar/600/400',
    downloadUrl: 'https://example.com/dl/gowr',
    platform: 'Both',
    category: 'Adventure',
    rating: 5.0,
    // Fix: Added missing required download_count property
    download_count: 8930
  },
  {
    id: '3',
    title: 'Ghost of Tsushima',
    description: 'In the late 13th century, the Mongol empire has laid waste to entire nations throughout their campaign to conquer the East.',
    imageUrl: 'https://picsum.photos/seed/ghost/600/400',
    downloadUrl: 'https://example.com/dl/got',
    platform: 'Both',
    category: 'Open World',
    rating: 4.8,
    // Fix: Added missing required download_count property
    download_count: 12100
  },
  {
    id: '4',
    title: 'Horizon Forbidden West',
    description: 'Join Aloy as she braves the Forbidden West – a majestic but dangerous frontier that conceals mysterious new threats.',
    imageUrl: 'https://picsum.photos/seed/horizon/600/400',
    downloadUrl: 'https://example.com/dl/hfw',
    platform: 'Both',
    category: 'RPG',
    rating: 4.7,
    // Fix: Added missing required download_count property
    download_count: 6750
  },
  {
    id: '5',
    title: 'Ratchet & Clank: Rift Apart',
    description: 'Blast your way through an interdimensional adventure with Ratchet and Clank.',
    imageUrl: 'https://picsum.photos/seed/ratchet/600/400',
    downloadUrl: 'https://example.com/dl/rcra',
    platform: 'PS5',
    category: 'Platformer',
    rating: 4.6,
    // Fix: Added missing required download_count property
    download_count: 4200
  },
  {
    id: '6',
    title: 'The Last of Us Part II',
    description: 'Five years after their dangerous journey across the post-pandemic United States, Ellie and Joel have settled down.',
    imageUrl: 'https://picsum.photos/seed/tlou2/600/400',
    downloadUrl: 'https://example.com/dl/tlou2',
    platform: 'PS4',
    category: 'Action-Survival',
    rating: 4.9,
    // Fix: Added missing required download_count property
    download_count: 23150
  }
];

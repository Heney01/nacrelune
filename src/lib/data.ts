import { Gem, HandMetal, Ear } from 'lucide-react';
import type { JewelryType, Charm, CharmCategory } from './types';

export const CHARM_CATEGORIES: CharmCategory[] = ['Celestial', 'Nature', 'Symbols', 'Love'];

export const CHARMS: Charm[] = [
  { id: 'charm-1', name: 'Sunburst', imageUrl: 'https://placehold.co/100x100.png', description: 'A radiant sun charm.', category: 'Celestial' },
  { id: 'charm-2', name: 'Crescent Moon', imageUrl: 'https://placehold.co/100x100.png', description: 'A mystical moon charm.', category: 'Celestial' },
  { id: 'charm-3', name: 'Starry Night', imageUrl: 'https://placehold.co/100x100.png', description: 'A sparkling star charm.', category: 'Celestial' },
  { id: 'charm-4', name: 'Ocean Wave', imageUrl: 'https://placehold.co/100x100.png', description: 'A flowing wave charm.', category: 'Nature' },
  { id: 'charm-5', name: 'Forest Leaf', imageUrl: 'https://placehold.co/100x100.png', description: 'An elegant leaf charm.', category: 'Nature' },
  { id: 'charm-6', name: 'Heart Lock', imageUrl: 'https://placehold.co/100x100.png', description: 'A romantic heart lock.', category: 'Love' },
  { id: 'charm-7', name: 'Feather', imageUrl: 'https://placehold.co/100x100.png', description: 'A delicate feather.', category: 'Nature' },
  { id: 'charm-8', name: 'Infinity', imageUrl: 'https://placehold.co/100x100.png', description: 'A timeless infinity symbol.', category: 'Symbols' },
  { id: 'charm-9', name: 'Lotus Flower', imageUrl: 'https://placehold.co/100x100.png', description: 'A serene lotus blossom.', category: 'Nature' },
];

export const JEWELRY_TYPES: JewelryType[] = [
  {
    id: 'necklace',
    name: 'Necklaces',
    icon: Gem,
    models: [
      {
        id: 'necklace-1',
        name: 'Classic Chain',
        description: 'A timeless and versatile chain.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'necklace-2',
        name: 'Pendant Drop',
        description: 'Features a central point for a showcase charm.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'necklace-3',
        name: 'Beaded Strand',
        description: 'A delicate strand of fine beads.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
    ],
  },
  {
    id: 'bracelet',
    name: 'Bracelets',
    icon: HandMetal,
    models: [
      {
        id: 'bracelet-1',
        name: 'Charm Bangle',
        description: 'A solid bangle perfect for dangling charms.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'bracelet-2',
        name: 'Link Chain',
        description: 'A classic link chain to integrate charms into.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
       {
        id: 'bracelet-3',
        name: 'Leather Cord',
        description: 'A rustic and modern leather cord.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
    ],
  },
  {
    id: 'earrings',
    name: 'Earrings',
    icon: Ear,
    models: [
      {
        id: 'earrings-1',
        name: 'Hoop Dreams',
        description: 'Classic hoops to hang charms from.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'earrings-2',
        name: 'Dangle Hooks',
        description: 'Elegant hooks for creating drop earrings.',
        imageUrl: 'https://placehold.co/800x800.png',
      },
    ],
  },
];

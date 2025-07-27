
import { Gem, HandMetal, Ear } from 'lucide-react';
import type { JewelryType } from './types';

// This data is now fetched from Firebase, but kept here as a fallback or for reference.

export const JEWELRY_TYPES: JewelryType[] = [
  {
    id: 'necklace',
    name: 'Necklaces',
    icon: Gem,
    description: "Graceful chains and pendants.",
    models: [
      {
        id: 'necklace-1',
        name: 'Classic Chain',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'necklace-2',
        name: 'Pendant Drop',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'necklace-3',
        name: 'Beaded Strand',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
    ],
  },
  {
    id: 'bracelet',
    name: 'Bracelets',
    icon: HandMetal,
    description: "Elegant wristwear for any occasion.",
    models: [
      {
        id: 'bracelet-1',
        name: 'Charm Bangle',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'bracelet-2',
        name: 'Link Chain',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
       {
        id: 'bracelet-3',
        name: 'Leather Cord',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
    ],
  },
  {
    id: 'earring',
    name: 'Earrings',
    icon: Ear,
    description: "Stylish earrings to complete your look.",
    models: [
      {
        id: 'earrings-1',
        name: 'Hoop Dreams',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
      {
        id: 'earrings-2',
        name: 'Dangle Hooks',
        displayImageUrl: 'https://placehold.co/800x800.png',
        editorImageUrl: 'https://placehold.co/800x800.png',
      },
    ],
  },
];

    

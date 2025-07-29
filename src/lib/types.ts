

import { DocumentReference } from 'firebase/firestore';

export interface CharmCategory {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface Charm {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  categoryId: string;
  category?: DocumentReference; // Raw from firestore
  price?: number;
}

export interface JewelryModel {
  id: string;
  name:string;
  displayImageUrl: string;
  editorImageUrl: string;
  snapPath?: string;
  price?: number;
}

export interface JewelryType {
  id: 'necklace' | 'bracelet' | 'earring';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  models: JewelryModel[];
}

export interface PlacedCharm {
  id: string;
  charm: Charm;
  position: { x: number; y: number }; // As a percentage
  rotation: number;
  animation?: string;
}

export interface CartItem {
    id: string;
    model: JewelryModel;
    jewelryType: Omit<JewelryType, 'models' | 'icon'>;
    placedCharms: PlacedCharm[];
    previewImage: string; // URL to a generated preview of the final design
}

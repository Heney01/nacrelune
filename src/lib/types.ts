export type CharmCategory = 'Celestial' | 'Nature' | 'Symbols' | 'Love';

export interface Charm {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
  category: CharmCategory;
}

export interface JewelryModel {
  id: string;
  name: string;
  displayImageUrl: string;
  editorImageUrl: string;
}

export interface JewelryType {
  id: 'necklace' | 'bracelet' | 'earrings';
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  models: JewelryModel[];
}

export interface PlacedCharm {
  id: string;
  charm: Charm;
  position: { x: number; y: number };
  rotation: number;
}

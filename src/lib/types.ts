
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
  description: string;
  models: JewelryModel[];
}

export interface PlacedCharm {
  id: string;
  charm: Charm;
  // Position is stored as a ratio of the canvas size (0 to 1)
  position: { x: number; y: number }; 
  rotation: number;
}

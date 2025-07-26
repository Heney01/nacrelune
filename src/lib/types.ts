export interface Charm {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

export interface JewelryModel {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
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
}

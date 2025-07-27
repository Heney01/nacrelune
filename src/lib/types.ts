
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
  price?: number;
}

export interface JewelryModel {
  id: string;
  name: string;
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

export interface Order {
  id?: string;
  modelName: string;
  modelImage: string;
  charms: { name: string; imageUrl: string; price?: number }[];
  totalPrice: number;
  shippingInfo: {
    name: string;
    address: string;
    city: string;
    zip: string;
    country: string;
  };
  createdAt: any; // Firestore timestamp
}

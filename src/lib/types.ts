

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
  categoryIds: string[];
  categories?: DocumentReference[]; // Raw from firestore
  price?: number;
  quantity?: number;
  reorderUrl?: string;
  lastOrderedAt?: Date | null;
  restockedAt?: Date | null;
}

export interface JewelryModel {
  id: string;
  name:string;
  displayImageUrl: string;
  editorImageUrl: string;
  snapPath?: string;
  price?: number;
  quantity?: number;
  reorderUrl?: string;
  lastOrderedAt?: Date | null;
  restockedAt?: Date | null;
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

export interface GeneralPreferences {
  alertThreshold: number;
  criticalThreshold: number;
}

export type OrderStatus = 'commandée' | 'en cours de préparation' | 'expédiée' | 'livrée' | 'annulée';

export interface OrderItem {
    modelId: string;
    modelName: string;
    jewelryTypeId: string;
    jewelryTypeName: string;
    charmIds: string[];
    price: number;
    previewImageUrl: string;
    isCompleted: boolean;
    // Enriched data on the client:
    modelImageUrl?: string;
    charms?: Charm[];
}

export interface MailDelivery {
    state: 'SUCCESS' | 'ERROR' | 'PROCESSING' | 'PENDING' | string;
    startTime: Date | null;
    endTime: Date | null;
    error?: string | null;
    attempts: number;
}

export interface MailLog {
    id: string;
    to: string[];
    subject: string;
    delivery: MailDelivery | null;
}

export interface Order {
    id: string;
    orderNumber: string;
    createdAt: Date;
    customerEmail: string;
    totalPrice: number;
    items: OrderItem[];
    status: OrderStatus;
    shippingCarrier?: string;
    trackingNumber?: string;
    cancellationReason?: string;
    mailHistory?: MailLog[];
}

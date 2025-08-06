

import { DocumentReference } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  rewardPoints?: number;
  searchableTerms?: string[];
  likesCount?: number;
  creationSlots?: number;
  deleted?: boolean;
}

export interface CharmCategory {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
}

export interface Charm {
  id:string;
  name: string;
  imageUrl: string;
  description: string;
  categoryIds: string[];
  categories?: DocumentReference[]; // Raw from firestore
  price?: number;
  quantity?: number;
  width?: number; // in mm
  height?: number; // in mm
  reorderUrl?: string;
  lastOrderedAt?: Date | null;
  restockedAt?: Date | null;
}

// A simplified version of Charm for storing within a Creation, without date fields.
export interface CreationCharm {
  id: string;
  name: string;
  imageUrl: string;
  price?: number;
  width?: number; // in mm
  height?: number; // in mm
}


export interface JewelryModel {
  id: string;
  name:string;
  displayImageUrl: string;
  editorImageUrl: string;
  snapPath?: string;
  price?: number;
  quantity?: number;
  width?: number; // in mm
  height?: number; // in mm
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
  // Position is normalized relative to the model image's dimensions.
  // (0,0) is top-left, (1,1) is bottom-right.
  position: { x: number; y: number }; 
  rotation: number;
  animation?: string;
}

// PlacedCharm as stored within a Creation document
export interface PlacedCreationCharm {
  charmId: string;
   // Position is normalized relative to the model image's dimensions.
  // (0,0) is top-left, (1,1) is bottom-right.
  position: { x: number; y: number };
  rotation: number;
}


export interface CartItem {
    id: string;
    model: JewelryModel;
    jewelryType: Omit<JewelryType, 'models' | 'icon'>;
    placedCharms: PlacedCharm[];
    previewImage: string; // URL to a generated preview of the final design
    // For creations bought from other users
    creationId?: string;
    creator?: User;
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
    // For creations bought from other users
    creationId?: string;
    creatorId?: string;
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

export interface ShippingAddress {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    postalCode: string;
    country: string;
}

export type DeliveryMethod = 'home' | 'pickup';

export interface PickupPoint {
    id: string;
    name: string;
    address: string;
    postcode: string;
    city: string;
    country: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    createdAt: Date;
    customerEmail: string;
    userId?: string;
    subtotal: number; // New field: Total before any discounts
    totalPrice: number; // Final price paid by customer
    items: OrderItem[];
    status: OrderStatus;
    deliveryMethod: DeliveryMethod;
    shippingAddress?: ShippingAddress;
    shippingCarrier?: string;
    trackingNumber?: string;
    cancellationReason?: string;
    mailHistory?: MailLog[];
    paymentIntentId?: string;
    couponCode?: string;
    couponId?: string;
    pointsUsed?: number;
    pointsValue?: number;
}

export interface Coupon {
    id: string;
    code: string;
    discountType: 'percentage' | 'fixed';
    value: number;
    expiresAt?: Date;
    minPurchase?: number;
}


// NEW: Represents a user-published creation
export interface Creation {
    id: string;
    creatorId: string;
    name: string;
    jewelryTypeId: string;
    modelId: string;
    placedCharms: PlacedCreationCharm[];
    previewImageUrl: string;
    createdAt: Date;
    salesCount: number;
    likesCount: number;
    // Optional: Populated at runtime
    creator?: User;
    // Optional: Populated at runtime after hydrating with full charm details
    hydratedCharms?: PlacedCharm[];
}

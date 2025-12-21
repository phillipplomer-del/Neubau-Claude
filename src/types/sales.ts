/**
 * Sales department specific types
 * Based on "Offene_Lieferungen" (Open Deliveries)
 */

import { BaseEntry } from './common';

export type CommentStatus = 'none' | 'at-risk' | 'critical' | 'watched';

export interface SalesComment {
  id: string;
  name: string;
  comment: string;
  status: CommentStatus;
  createdAt: Date;
}

export interface SalesEntry extends BaseEntry {
  department: 'sales';

  // Comments & Status
  comments?: SalesComment[];
  commentStatus?: CommentStatus;

  // Delivery information
  deliveryNumber?: string;
  deliveryDate?: Date;
  requestedDeliveryDate?: Date;
  confirmedDeliveryDate?: Date;

  // Customer information
  customerNumber?: string;
  customerName?: string;
  country?: string;

  // Product information
  productDescription?: string;
  productGroup?: string;
  quantity?: number;
  unit?: string;

  // Pricing
  pricePerUnit?: number;
  totalPrice?: number;
  openTurnover?: number;
  remainingTurnover?: number;
  currency?: string;

  // Status & Delays
  status?: 'open' | 'in_progress' | 'delayed' | 'completed' | 'cancelled';
  deliveryStatus?: string;
  delayDays?: number;

  // Personnel
  projectManager?: string;
  processor?: string;

  // Additional fields
  notes?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SalesKPI {
  totalOpenDeliveries: number;
  totalValue: number;
  delayedDeliveries: number;
  deliveriesByStatus: Record<string, number>;
  averageDeliveryTime: number; // days
  currency: string;
}

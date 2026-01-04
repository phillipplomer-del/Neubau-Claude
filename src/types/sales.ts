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

  // Order information
  deliveryNumber?: string;
  bookingDate?: Date;  // Buchungsdatum (Auftragseingang)

  // Delivery information
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

// Extended KPIs for Sales Dashboard
export interface SalesDashboardKPIs {
  // Main KPIs
  pipelineValue: number;           // Offenes Auftragsvolumen
  monthlyOrders: number;           // Auftragseingang im aktuellen Monat
  planVsActualPercent: number;     // Plan/Ist in %
  openDeliveries: number;          // Offene Lieferungen
  delayedOrders: number;           // Verzögerte Aufträge
  averageMargin: number;           // Durchschnittliche Marge in %

  // Trends (Vergleich zum Vormonat)
  pipelineValueChange: number;     // % Änderung
  monthlyOrdersChange: number;     // % Änderung
  delayedOrdersChange: number;     // % Änderung

  // By Category
  byCategory: {
    A: { count: number; value: number };
    B: { count: number; value: number };
    C: { count: number; value: number };
  };

  // By Sales Rep
  bySalesRep: Array<{ name: string; count: number; value: number }>;

  // Revenue over time
  revenueByMonth: Array<{
    month: string;
    plan: number;
    actual: number;
  }>;

  // Pipeline stages
  pipelineStages: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
}

// Pipeline stage type
export type PipelineStage = 'quote' | 'order' | 'production' | 'ready' | 'delivered';

// Extended Sales Entry with dashboard fields
export interface SalesEntryExtended extends SalesEntry {
  // Dashboard-specific fields
  margin?: number;              // Marge in EUR
  marginPercent?: number;       // Marge in %
  salesRep?: string;            // Vertriebsmitarbeiter
  pipelineStage?: PipelineStage;
  plannedRevenue?: number;      // Plan-Umsatz
  actualRevenue?: number;       // Ist-Umsatz
  category?: 'A' | 'B' | 'C';   // Projektkategorie
}

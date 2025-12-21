/**
 * Production planning data repository
 */

import { BaseRepository } from './baseRepository';
import { STORE_NAMES, INDEX_NAMES } from '@/types/database';
import type { ProductionEntry } from '@/types/production';
import type { Artikelnummer, Projektnummer } from '@/types/common';

export class ProductionRepository extends BaseRepository<
  typeof STORE_NAMES.PRODUCTION
> {
  constructor() {
    super(STORE_NAMES.PRODUCTION);
  }

  /**
   * Find production entries by Artikelnummer
   */
  async findByArtikelnummer(
    artikelnummer: Artikelnummer
  ): Promise<ProductionEntry[]> {
    return this.findByIndex(
      INDEX_NAMES.ARTIKELNUMMER,
      artikelnummer
    ) as Promise<ProductionEntry[]>;
  }

  /**
   * Find production entries by Projektnummer
   */
  async findByProjektnummer(
    projektnummer: Projektnummer
  ): Promise<ProductionEntry[]> {
    return this.findByIndex(
      INDEX_NAMES.PROJEKTNUMMER,
      projektnummer
    ) as Promise<ProductionEntry[]>;
  }

  /**
   * Find production entries by status
   */
  async findByStatus(
    status: ProductionEntry['status']
  ): Promise<ProductionEntry[]> {
    return this.findByIndex(INDEX_NAMES.STATUS, status ?? '') as Promise<
      ProductionEntry[]
    >;
  }

  /**
   * Get active work orders (planned or in_progress)
   */
  async getActiveWorkOrders(): Promise<ProductionEntry[]> {
    const planned = await this.findByStatus('planned');
    const inProgress = await this.findByStatus('in_progress');
    return [...planned, ...inProgress];
  }

  /**
   * Get delayed work orders
   */
  async getDelayedWorkOrders(): Promise<ProductionEntry[]> {
    return this.findByStatus('delayed');
  }

  /**
   * Get completed work orders
   */
  async getCompletedWorkOrders(): Promise<ProductionEntry[]> {
    return this.findByStatus('completed');
  }
}

// Export singleton instance
export const productionRepository = new ProductionRepository();

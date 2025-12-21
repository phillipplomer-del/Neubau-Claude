/**
 * Sales data repository
 */

import { BaseRepository } from './baseRepository';
import { STORE_NAMES, INDEX_NAMES } from '@/types/database';
import type { SalesEntry } from '@/types/sales';
import type { Artikelnummer, Projektnummer } from '@/types/common';

export class SalesRepository extends BaseRepository<typeof STORE_NAMES.SALES> {
  constructor() {
    super(STORE_NAMES.SALES);
  }

  /**
   * Find sales entries by Artikelnummer
   */
  async findByArtikelnummer(
    artikelnummer: Artikelnummer
  ): Promise<SalesEntry[]> {
    return this.findByIndex(
      INDEX_NAMES.ARTIKELNUMMER,
      artikelnummer
    ) as Promise<SalesEntry[]>;
  }

  /**
   * Find sales entries by Projektnummer
   */
  async findByProjektnummer(
    projektnummer: Projektnummer
  ): Promise<SalesEntry[]> {
    return this.findByIndex(
      INDEX_NAMES.PROJEKTNUMMER,
      projektnummer
    ) as Promise<SalesEntry[]>;
  }

  /**
   * Find sales entries by status
   */
  async findByStatus(
    status: SalesEntry['status']
  ): Promise<SalesEntry[]> {
    return this.findByIndex(INDEX_NAMES.STATUS, status ?? '') as Promise<
      SalesEntry[]
    >;
  }

  /**
   * Get open deliveries (status = 'open' or 'in_progress')
   */
  async getOpenDeliveries(): Promise<SalesEntry[]> {
    const open = await this.findByStatus('open');
    const inProgress = await this.findByStatus('in_progress');
    return [...open, ...inProgress];
  }

  /**
   * Get delayed deliveries
   */
  async getDelayedDeliveries(): Promise<SalesEntry[]> {
    return this.findByStatus('delayed');
  }
}

// Export singleton instance
export const salesRepository = new SalesRepository();

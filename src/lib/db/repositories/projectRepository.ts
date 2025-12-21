/**
 * Project management data repository
 */

import { BaseRepository } from './baseRepository';
import { STORE_NAMES, INDEX_NAMES } from '@/types/database';
import type { ProjectManagementEntry } from '@/types/projectManagement';
import type { Artikelnummer, Projektnummer } from '@/types/common';

export class ProjectRepository extends BaseRepository<
  typeof STORE_NAMES.PROJECT_MANAGEMENT
> {
  constructor() {
    super(STORE_NAMES.PROJECT_MANAGEMENT);
  }

  /**
   * Find project entries by Artikelnummer
   */
  async findByArtikelnummer(
    artikelnummer: Artikelnummer
  ): Promise<ProjectManagementEntry[]> {
    return this.findByIndex(
      INDEX_NAMES.ARTIKELNUMMER,
      artikelnummer
    ) as Promise<ProjectManagementEntry[]>;
  }

  /**
   * Find project entries by Projektnummer
   */
  async findByProjektnummer(
    projektnummer: Projektnummer
  ): Promise<ProjectManagementEntry[]> {
    return this.findByIndex(
      INDEX_NAMES.PROJEKTNUMMER,
      projektnummer
    ) as Promise<ProjectManagementEntry[]>;
  }

  /**
   * Find projects by status
   */
  async findByStatus(
    status: ProjectManagementEntry['projectStatus']
  ): Promise<ProjectManagementEntry[]> {
    return this.findByIndex('projectStatus', status ?? '') as Promise<
      ProjectManagementEntry[]
    >;
  }

  /**
   * Get active projects
   */
  async getActiveProjects(): Promise<ProjectManagementEntry[]> {
    return this.findByStatus('active');
  }

  /**
   * Get completed projects
   */
  async getCompletedProjects(): Promise<ProjectManagementEntry[]> {
    return this.findByStatus('completed');
  }

  /**
   * Get projects at risk (high or critical risk level)
   */
  async getProjectsAtRisk(): Promise<ProjectManagementEntry[]> {
    const all = (await this.getAll()) as ProjectManagementEntry[];
    return all.filter(
      (project) => project.riskLevel === 'high' || project.riskLevel === 'critical'
    );
  }

  /**
   * Get projects over budget
   */
  async getProjectsOverBudget(): Promise<ProjectManagementEntry[]> {
    const all = (await this.getAll()) as ProjectManagementEntry[];
    return all.filter((project) => {
      if (
        project.plannedBudget &&
        project.actualCosts &&
        project.actualCosts > project.plannedBudget
      ) {
        return true;
      }
      return false;
    });
  }
}

// Export singleton instance
export const projectRepository = new ProjectRepository();

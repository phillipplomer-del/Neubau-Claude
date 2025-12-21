/**
 * Project management specific types
 * Based on "Controlling" data
 */

import { BaseEntry } from './common';

export interface ProjectManagementEntry extends BaseEntry {
  department: 'projectManagement';

  // Project information
  projectName?: string;
  projectDescription?: string;
  projectManager?: string;
  projectStatus?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

  // Dates
  plannedStartDate?: Date;
  actualStartDate?: Date;
  plannedEndDate?: Date;
  actualEndDate?: Date;

  // Budget and costs
  plannedBudget?: number;
  actualCosts?: number;
  budgetVariance?: number;
  currency?: string;

  // Revenue
  plannedRevenue?: number;
  actualRevenue?: number;
  revenueVariance?: number;

  // Profitability
  profitMargin?: number; // percentage
  roi?: number; // return on investment percentage

  // Progress tracking
  completionPercentage?: number;
  milestonesCompleted?: number;
  milestonesTotal?: number;

  // Risk management
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  // Additional fields
  client?: string;
  department?: string;
  category?: string;
  notes?: string;
}

export interface ProjectKPI {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalActualCosts: number;
  totalPlannedRevenue: number;
  totalActualRevenue: number;
  averageProfitMargin: number;
  averageCompletionRate: number;
  projectsOnBudget: number;
  projectsOverBudget: number;
  projectsAtRisk: number;
  currency: string;
}

// Milestone types
export interface Milestone {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  plannedDate: Date;
  actualDate?: Date;
  completed: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'missed';
}

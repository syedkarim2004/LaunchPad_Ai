import fs from 'fs';
import path from 'path';
import { ComplianceRule, RuleCondition, BusinessProfile } from '../types';
import logger from './logger';

/**
 * Rule Engine - Deterministic compliance checking
 * CRITICAL: This is the ONLY source of legal/compliance decisions
 * AI agents NEVER decide law, only this engine does
 */
class RuleEngine {
  private centralRules: ComplianceRule[] = [];
  private stateRules: Map<string, ComplianceRule[]> = new Map();
  private platformRules: any[] = [];

  constructor() {
    this.loadRules();
  }

  /**
   * Load all rules from JSON files
   */
  private loadRules(): void {
    try {
      // Load central rules
      const centralPath = path.join(__dirname, '../rules/central/centralRules.json');
      this.centralRules = JSON.parse(fs.readFileSync(centralPath, 'utf-8'));
      logger.info(`Loaded ${this.centralRules.length} central rules`);

      // Load state rules
      const statesDir = path.join(__dirname, '../rules/states');
      const states = fs.readdirSync(statesDir);
      
      states.forEach(state => {
        const statePath = path.join(statesDir, state);
        if (fs.statSync(statePath).isDirectory()) {
          const files = fs.readdirSync(statePath);
          files.forEach(file => {
            if (file.endsWith('.json')) {
              const rules = JSON.parse(fs.readFileSync(path.join(statePath, file), 'utf-8'));
              this.stateRules.set(state, rules);
              logger.info(`Loaded ${rules.length} rules for state ${state}`);
            }
          });
        }
      });

      // Load platform requirements
      const platformPath = path.join(__dirname, '../rules/platforms/platformRequirements.json');
      this.platformRules = JSON.parse(fs.readFileSync(platformPath, 'utf-8'));
      logger.info(`Loaded ${this.platformRules.length} platform rules`);

    } catch (error: any) {
      logger.error('Failed to load rules', { error: error.message });
      throw new Error('Rule Engine initialization failed');
    }
  }

  /**
   * Evaluate if a condition matches the business profile
   */
  private evaluateCondition(condition: RuleCondition, profile: BusinessProfile): boolean {
    const fieldValue = (profile as any)[condition.field];

    switch (condition.operator) {
      case '>':
        return fieldValue > condition.value;
      case '<':
        return fieldValue < condition.value;
      case '>=':
        return fieldValue >= condition.value;
      case '<=':
        return fieldValue <= condition.value;
      case '=':
        return fieldValue === condition.value;
      case '!=':
        return fieldValue !== condition.value;
      case 'includes':
        return Array.isArray(fieldValue) && fieldValue.includes(condition.value);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      default:
        return false;
    }
  }

  /**
   * Check if all conditions of a rule are satisfied
   */
  private checkRuleApplicability(rule: ComplianceRule, profile: BusinessProfile): boolean {
    // If no conditions, rule doesn't apply by default
    if (!rule.conditions || rule.conditions.length === 0) {
      return false;
    }

    // All conditions must be satisfied (AND logic)
    return rule.conditions.every(condition => this.evaluateCondition(condition, profile));
  }

  /**
   * Get all applicable compliances for a business profile
   */
  getApplicableCompliances(profile: BusinessProfile): ComplianceRule[] {
    const applicable: ComplianceRule[] = [];

    // Check central rules
    this.centralRules.forEach(rule => {
      if (this.checkRuleApplicability(rule, profile)) {
        applicable.push(rule);
      }
    });

    // Check state-specific rules
    if (profile.state) {
      const stateRules = this.stateRules.get(profile.state);
      if (stateRules) {
        stateRules.forEach(rule => {
          if (this.checkRuleApplicability(rule, profile)) {
            applicable.push(rule);
          }
        });
      }
    }

    logger.info(`Found ${applicable.length} applicable compliances`, {
      userId: profile.user_id,
      state: profile.state
    });

    return applicable;
  }

  /**
   * Get mandatory compliances only
   */
  getMandatoryCompliances(profile: BusinessProfile): ComplianceRule[] {
    const applicable = this.getApplicableCompliances(profile);
    return applicable.filter(rule => rule.mandatory);
  }

  /**
   * Get optional/recommended compliances
   */
  getOptionalCompliances(profile: BusinessProfile): ComplianceRule[] {
    const applicable = this.getApplicableCompliances(profile);
    return applicable.filter(rule => !rule.mandatory);
  }

  /**
   * Get specific compliance rule by ID
   */
  getComplianceById(complianceId: string): ComplianceRule | undefined {
    // Search in central rules
    let rule = this.centralRules.find(r => r.id === complianceId);
    if (rule) return rule;

    // Search in state rules
    for (const [, rules] of this.stateRules) {
      rule = rules.find(r => r.id === complianceId);
      if (rule) return rule;
    }

    return undefined;
  }

  /**
   * Get platform requirements
   */
  getPlatformRequirements(platformName: string): any {
    return this.platformRules.find(
      p => p.platform.toLowerCase() === platformName.toLowerCase()
    );
  }

  /**
   * Check platform eligibility based on compliances
   */
  checkPlatformEligibility(platformName: string, profile: BusinessProfile): {
    eligible: boolean;
    missing_compliances: string[];
    message: string;
  } {
    const platform = this.getPlatformRequirements(platformName);
    
    if (!platform) {
      return {
        eligible: false,
        missing_compliances: [],
        message: `Platform ${platformName} not found in our database`
      };
    }

    const applicableCompliances = this.getApplicableCompliances(profile);
    const complianceIds = applicableCompliances.map(c => c.id);
    
    const mandatoryCompliances = platform.requirements.mandatory_compliance || [];
    const missingCompliances = mandatoryCompliances.filter(
      (req: string) => !complianceIds.includes(req)
    );

    const eligible = missingCompliances.length === 0;

    return {
      eligible,
      missing_compliances: missingCompliances,
      message: eligible
        ? `You are eligible to onboard on ${platformName}`
        : `You need the following compliances to onboard on ${platformName}: ${missingCompliances.join(', ')}`
    };
  }

  /**
   * Calculate total estimated cost for all compliances
   */
  calculateTotalCost(compliances: ComplianceRule[]): {
    min: number;
    max: number;
    currency: string;
  } {
    let min = 0;
    let max = 0;

    compliances.forEach(rule => {
      min += rule.estimated_cost.min;
      max += rule.estimated_cost.max;
    });

    return { min, max, currency: 'INR' };
  }

  /**
   * Get compliance dependencies and generate timeline
   */
  generateTimeline(compliances: ComplianceRule[]): Array<{
    week: number;
    compliance: string;
    actions: string[];
  }> {
    const timeline: Array<{ week: number; compliance: string; actions: string[] }> = [];
    let currentWeek = 1;

    // Sort by dependencies (those without dependencies first)
    const sorted = [...compliances].sort((a, b) => {
      const aDeps = a.dependencies?.length || 0;
      const bDeps = b.dependencies?.length || 0;
      return aDeps - bDeps;
    });

    sorted.forEach(compliance => {
      timeline.push({
        week: currentWeek,
        compliance: compliance.name,
        actions: compliance.steps || []
      });
      
      // Estimate weeks based on timeline
      const timelineMatch = compliance.estimated_timeline.match(/(\d+)/);
      const days = timelineMatch ? parseInt(timelineMatch[0]) : 7;
      currentWeek += Math.ceil(days / 7);
    });

    return timeline;
  }

  /**
   * Reload rules (useful for updates without restart)
   */
  reloadRules(): void {
    logger.info('Reloading rules...');
    this.centralRules = [];
    this.stateRules.clear();
    this.platformRules = [];
    this.loadRules();
  }

  /**
   * Get all available platforms
   */
  getAllPlatforms(): any[] {
    return this.platformRules;
  }

  /**
   * Search rules by keyword
   */
  searchRules(keyword: string): ComplianceRule[] {
    const results: ComplianceRule[] = [];
    const lowerKeyword = keyword.toLowerCase();

    // Search central rules
    this.centralRules.forEach(rule => {
      if (
        rule.name.toLowerCase().includes(lowerKeyword) ||
        rule.description.toLowerCase().includes(lowerKeyword)
      ) {
        results.push(rule);
      }
    });

    // Search state rules
    for (const [, rules] of this.stateRules) {
      rules.forEach(rule => {
        if (
          rule.name.toLowerCase().includes(lowerKeyword) ||
          rule.description.toLowerCase().includes(lowerKeyword)
        ) {
          results.push(rule);
        }
      });
    }

    return results;
  }
}

// Singleton instance
export default new RuleEngine();

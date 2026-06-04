import RiskEvaluator from '../src/services/detection/RiskEvaluator';
import { Direction, Distance, RiskLevel, ObstacleInfo } from '../src/utils/types';

function makeObstacle(
  direction: Direction,
  distance: Distance,
  confidence = 0.8
): ObstacleInfo {
  return {
    id: `test-${Math.random()}`,
    direction,
    distance,
    riskLevel: RiskLevel.NONE,
    confidence,
    timestamp: Date.now(),
    coverage: 0.3,
    brightness: 128,
  };
}

describe('RiskEvaluator', () => {
  let evaluator: RiskEvaluator;

  beforeEach(() => {
    evaluator = new RiskEvaluator();
  });

  describe('calculateRiskLevel', () => {
    it('CENTER + NEAR → HIGH risk', () => {
      expect(evaluator.calculateRiskLevel(Direction.CENTER, Distance.NEAR)).toBe(RiskLevel.HIGH);
    });

    it('LEFT + NEAR → HIGH risk', () => {
      expect(evaluator.calculateRiskLevel(Direction.LEFT, Distance.NEAR)).toBe(RiskLevel.HIGH);
    });

    it('RIGHT + NEAR → HIGH risk', () => {
      expect(evaluator.calculateRiskLevel(Direction.RIGHT, Distance.NEAR)).toBe(RiskLevel.HIGH);
    });

    it('CENTER + MEDIUM → MEDIUM risk', () => {
      expect(evaluator.calculateRiskLevel(Direction.CENTER, Distance.MEDIUM)).toBe(RiskLevel.MEDIUM);
    });

    it('LEFT + MEDIUM → LOW risk', () => {
      expect(evaluator.calculateRiskLevel(Direction.LEFT, Distance.MEDIUM)).toBe(RiskLevel.LOW);
    });

    it('herhangi yön + FAR → NONE risk', () => {
      expect(evaluator.calculateRiskLevel(Direction.CENTER, Distance.FAR)).toBe(RiskLevel.NONE);
      expect(evaluator.calculateRiskLevel(Direction.LEFT, Distance.FAR)).toBe(RiskLevel.NONE);
      expect(evaluator.calculateRiskLevel(Direction.RIGHT, Distance.FAR)).toBe(RiskLevel.NONE);
    });
  });

  describe('evaluateRisks', () => {
    it('yüksek risk engeli öne sıralar', () => {
      const obstacles = [
        makeObstacle(Direction.LEFT, Distance.FAR),
        makeObstacle(Direction.CENTER, Distance.NEAR),
        makeObstacle(Direction.RIGHT, Distance.MEDIUM),
      ];
      const result = evaluator.evaluateRisks(obstacles);
      expect(result[0].riskLevel).toBe(RiskLevel.HIGH);
    });

    it('boş listede boş array döner', () => {
      expect(evaluator.evaluateRisks([])).toHaveLength(0);
    });

    it('risk seviyeleri doğru atanır', () => {
      const obstacles = [
        makeObstacle(Direction.CENTER, Distance.NEAR),
        makeObstacle(Direction.CENTER, Distance.MEDIUM),
        makeObstacle(Direction.LEFT, Distance.FAR),
      ];
      const result = evaluator.evaluateRisks(obstacles);
      const levels = result.map(o => o.riskLevel);
      expect(levels[0]).toBe(RiskLevel.HIGH);
      expect(levels[1]).toBe(RiskLevel.MEDIUM);
      expect(levels[2]).toBe(RiskLevel.NONE);
    });
  });

  describe('getHighestPriorityObstacle', () => {
    it('en yüksek riskli engeli döndürür', () => {
      const obstacles = [
        { ...makeObstacle(Direction.LEFT, Distance.FAR), riskLevel: RiskLevel.NONE },
        { ...makeObstacle(Direction.CENTER, Distance.NEAR), riskLevel: RiskLevel.HIGH },
      ];
      const result = evaluator.getHighestPriorityObstacle(obstacles);
      expect(result).not.toBeNull();
      expect(result?.riskLevel).toBe(RiskLevel.HIGH);
    });

    it('tüm engeller NONE ise null döner', () => {
      const obstacles = [
        { ...makeObstacle(Direction.LEFT, Distance.FAR), riskLevel: RiskLevel.NONE },
      ];
      const result = evaluator.getHighestPriorityObstacle(obstacles);
      expect(result).toBeNull();
    });

    it('düşük güvenilirlikli engeller filtrelenir', () => {
      const low = { ...makeObstacle(Direction.CENTER, Distance.NEAR, 0.05), riskLevel: RiskLevel.HIGH };
      const result = evaluator.getHighestPriorityObstacle([low]);
      expect(result).toBeNull();
    });

    it('resetCooldowns sonrası aynı engel tekrar bildirilir', () => {
      const obstacle = { ...makeObstacle(Direction.CENTER, Distance.NEAR), riskLevel: RiskLevel.HIGH };
      evaluator.getHighestPriorityObstacle([obstacle]);
      evaluator.resetCooldowns();
      const result = evaluator.getHighestPriorityObstacle([obstacle]);
      expect(result).not.toBeNull();
    });
  });
});

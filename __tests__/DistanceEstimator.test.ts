import DistanceEstimator from '../src/services/detection/DistanceEstimator';
import { Direction, Distance, DetectionMode, RegionAnalysis } from '../src/utils/types';

function makeRegion(
  coverage: number,
  averageBrightness = 128,
  edgeDensity = 0.3
): RegionAnalysis {
  return {
    direction: Direction.CENTER,
    averageBrightness,
    edgeDensity,
    coverage,
    changeRate: 0.1,
  };
}

describe('DistanceEstimator', () => {
  let estimator: DistanceEstimator;

  beforeEach(() => {
    estimator = new DistanceEstimator();
  });

  describe('estimateDistance — STREET modu', () => {
    it('büyük kaplama (>0.45) → NEAR döndürür', () => {
      const region = makeRegion(0.5);
      expect(estimator.estimateDistance(region, DetectionMode.STREET)).toBe(Distance.NEAR);
    });

    it('orta kaplama (0.25-0.45) → MEDIUM döndürür', () => {
      const region = makeRegion(0.30);
      expect(estimator.estimateDistance(region, DetectionMode.STREET)).toBe(Distance.MEDIUM);
    });

    it('küçük kaplama (<0.25) → FAR döndürür', () => {
      const region = makeRegion(0.10);
      expect(estimator.estimateDistance(region, DetectionMode.STREET)).toBe(Distance.FAR);
    });
  });

  describe('estimateDistance — INDOOR modu (daha hassas eşikler)', () => {
    it('INDOOR modda daha küçük kaplama NEAR kabul edilir', () => {
      // İç mekan çarpanı 0.85 → near eşiği 0.45*0.85 = 0.3825
      const region = makeRegion(0.40);
      expect(estimator.estimateDistance(region, DetectionMode.INDOOR)).toBe(Distance.NEAR);
    });
  });

  describe('estimateDistances', () => {
    it('üç bölge için üç farklı mesafe döndürür', () => {
      const regions: RegionAnalysis[] = [
        { direction: Direction.LEFT, coverage: 0.5, averageBrightness: 80, edgeDensity: 0.7, changeRate: 0.2 },
        { direction: Direction.CENTER, coverage: 0.3, averageBrightness: 120, edgeDensity: 0.4, changeRate: 0.1 },
        { direction: Direction.RIGHT, coverage: 0.05, averageBrightness: 200, edgeDensity: 0.1, changeRate: 0.05 },
      ];
      const map = estimator.estimateDistances(regions, DetectionMode.STREET);
      expect(map.get(Direction.LEFT)).toBe(Distance.NEAR);
      expect(map.get(Direction.CENTER)).toBe(Distance.MEDIUM);
      expect(map.get(Direction.RIGHT)).toBe(Distance.FAR);
    });
  });

  describe('estimateDistanceAdvanced', () => {
    it('yüksek kaplama + düşük parlaklık + yüksek kenar → güvenilir NEAR', () => {
      const region = makeRegion(0.6, 40, 0.8);
      const result = estimator.estimateDistanceAdvanced(region, DetectionMode.STREET);
      expect(result.distance).toBe(Distance.NEAR);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('düşük kaplama + yüksek parlaklık → FAR döndürür', () => {
      const region = makeRegion(0.05, 230, 0.05);
      const result = estimator.estimateDistanceAdvanced(region, DetectionMode.STREET);
      expect(result.distance).toBe(Distance.FAR);
    });
  });
});

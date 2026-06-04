import DirectionAnalyzer from '../src/services/detection/DirectionAnalyzer';
import { Direction, RegionAnalysis } from '../src/utils/types';

function makeRegion(
  direction: Direction,
  coverage: number,
  edgeDensity = 0.5,
  averageBrightness = 100,
  changeRate = 0.1
): RegionAnalysis {
  return { direction, averageBrightness, edgeDensity, coverage, changeRate };
}

describe('DirectionAnalyzer', () => {
  let analyzer: DirectionAnalyzer;

  beforeEach(() => {
    analyzer = new DirectionAnalyzer();
  });

  describe('analyzeDirection', () => {
    it('boş bölge dizisinde CENTER ve 0 güven döndürür', () => {
      const result = analyzer.analyzeDirection([]);
      expect(result.direction).toBe(Direction.CENTER);
      expect(result.confidence).toBe(0);
    });

    it('en yüksek kapsamlı bölgeyi engel yönü olarak seçer', () => {
      const regions = [
        makeRegion(Direction.LEFT, 0.1),
        makeRegion(Direction.CENTER, 0.8),
        makeRegion(Direction.RIGHT, 0.2),
      ];
      const result = analyzer.analyzeDirection(regions);
      expect(result.direction).toBe(Direction.CENTER);
    });

    it('sol yoğun bölgede LEFT döndürür', () => {
      const regions = [
        makeRegion(Direction.LEFT, 0.9, 0.9, 30),
        makeRegion(Direction.CENTER, 0.1, 0.1, 200),
        makeRegion(Direction.RIGHT, 0.05, 0.05, 220),
      ];
      const result = analyzer.analyzeDirection(regions);
      expect(result.direction).toBe(Direction.LEFT);
    });

    it('güvenilirlik 0-1 aralığında normalize edilir', () => {
      const regions = [makeRegion(Direction.CENTER, 0.5)];
      const result = analyzer.analyzeDirection(regions);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('analyzeAllDirections', () => {
    it('her bölge için ayrı skor döndürür', () => {
      const regions = [
        makeRegion(Direction.LEFT, 0.2),
        makeRegion(Direction.CENTER, 0.5),
        makeRegion(Direction.RIGHT, 0.1),
      ];
      const scores = analyzer.analyzeAllDirections(regions);
      expect(scores).toHaveLength(3);
      expect(scores[0].direction).toBe(Direction.LEFT);
      expect(scores[1].direction).toBe(Direction.CENTER);
      // Merkez daha yüksek kapsamda olduğu için skoru daha yüksek
      expect(scores[1].score).toBeGreaterThan(scores[0].score);
    });

    it('boş dizide boş array döndürür', () => {
      const scores = analyzer.analyzeAllDirections([]);
      expect(scores).toHaveLength(0);
    });
  });
});

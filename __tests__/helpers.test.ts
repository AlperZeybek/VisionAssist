import { getObstacleMessage, localizeLabel, getRiskColor, clamp } from '../src/utils/helpers';
import { Direction, Distance, RiskLevel, ObstacleInfo } from '../src/utils/types';

function makeObstacle(
  direction: Direction,
  distance: Distance,
  label?: string
): ObstacleInfo {
  return {
    id: 'test',
    direction,
    distance,
    riskLevel: RiskLevel.HIGH,
    confidence: 0.9,
    timestamp: Date.now(),
    coverage: 0.4,
    brightness: 128,
    label,
  };
}

describe('localizeLabel', () => {
  it('bilinen COCO etiketini Türkçeye çevirir', () => {
    expect(localizeLabel('chair', 'tr')).toBe('sandalye');
    expect(localizeLabel('person', 'tr')).toBe('kişi');
    expect(localizeLabel('car', 'tr')).toBe('araba');
  });

  it('İngilizce modda orijinal etiketi döndürür', () => {
    expect(localizeLabel('chair', 'en')).toBe('chair');
  });

  it('undefined etikette Türkçe "nesne" döndürür', () => {
    expect(localizeLabel(undefined, 'tr')).toBe('nesne');
  });

  it('bilinmeyen etiket için orijinal değeri döndürür', () => {
    expect(localizeLabel('unicorn', 'tr')).toBe('unicorn');
  });
});

describe('getObstacleMessage — Türkçe', () => {
  it('etiketli NEAR CENTER engeli için doğal cümle üretir', () => {
    const obs = makeObstacle(Direction.CENTER, Distance.NEAR, 'chair');
    const msg = getObstacleMessage(obs, 'tr');
    expect(msg).toContain('sandalye');
    expect(msg.toLowerCase()).toContain('önünüzde');
    expect(msg.toLowerCase()).toContain('yakın');
  });

  it('etiketli MEDIUM LEFT engeli için doğal cümle üretir', () => {
    const obs = makeObstacle(Direction.LEFT, Distance.MEDIUM, 'car');
    const msg = getObstacleMessage(obs, 'tr');
    expect(msg).toContain('araba');
    expect(msg.toLowerCase()).toContain('solunuzda');
  });

  it('etiketli FAR RIGHT engeli için "uzakta" cümlesi üretir', () => {
    const obs = makeObstacle(Direction.RIGHT, Distance.FAR, 'person');
    const msg = getObstacleMessage(obs, 'tr');
    expect(msg.toLowerCase()).toContain('uzakta');
    expect(msg).toContain('kişi');
  });

  it('etiketsiz engel için genel uyarı mesajı döndürür', () => {
    const obs = makeObstacle(Direction.CENTER, Distance.NEAR);
    const msg = getObstacleMessage(obs, 'tr');
    expect(typeof msg).toBe('string');
    expect(msg.length).toBeGreaterThan(0);
  });
});

describe('getObstacleMessage — İngilizce', () => {
  it('İngilizce modda İngilizce cümle döndürür', () => {
    const obs = makeObstacle(Direction.CENTER, Distance.NEAR, 'chair');
    const msg = getObstacleMessage(obs, 'en');
    expect(msg.toLowerCase()).toContain('ahead');
    expect(msg.toLowerCase()).toContain('chair');
  });
});

describe('getRiskColor', () => {
  it('HIGH için kırmızı döndürür', () => {
    expect(getRiskColor(RiskLevel.HIGH)).toBe('#FF3B30');
  });

  it('MEDIUM için turuncu döndürür', () => {
    expect(getRiskColor(RiskLevel.MEDIUM)).toBe('#FF9500');
  });

  it('LOW için yeşil döndürür', () => {
    expect(getRiskColor(RiskLevel.LOW)).toBe('#34C759');
  });

  it('NONE için gri döndürür', () => {
    expect(getRiskColor(RiskLevel.NONE)).toBe('#8E8E93');
  });
});

describe('clamp', () => {
  it('değeri minimum ile sınırlar', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('değeri maksimum ile sınırlar', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });

  it('aralık içindeki değeri değiştirmez', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

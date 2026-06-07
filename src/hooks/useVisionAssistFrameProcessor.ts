import { useCallback, useRef } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useRunOnJS } from 'react-native-worklets-core';
import { ObstacleInfo, RiskLevel, Direction, Distance, DetectionMode } from '../utils/types';
import {
  ALLOWED_LABELS,
  INDOOR_ALLOWED_LABELS,
  STREET_ALLOWED_LABELS,
  PER_CLASS_MIN_CONFIDENCE,
  DEFAULT_MIN_CONFIDENCE,
  TEMPORAL_SMOOTHING_FRAMES,
  STREET_HIGH_PRIORITY,
  INDOOR_HIGH_PRIORITY,
  NAVIGATION_ALERT_ONLY_NEAR,
} from '../utils/constants';

/**
 * Bir sınıf için uygulanacak minimum güven eşiğini döndürür.
 * Genel eşik 0.65; kritik sınıflar için PER_CLASS_MIN_CONFIDENCE tablosu kullanılır.
 */
function getMinConfidence(label: string): number {
  return PER_CLASS_MIN_CONFIDENCE[label] ?? DEFAULT_MIN_CONFIDENCE;
}

/**
 * Algılama moduna ve nesne sınıfına göre bu nesnenin sesli uyarı üretip
 * üretmeyeceğini belirler.
 *
 * Navigasyon modunda küçük/sabit nesneler yalnızca NEAR mesafede uyarır —
 * navigasyon talimatları kesilmesin diye.
 */
function shouldAlert(
  label: string,
  distance: Distance,
  mode: DetectionMode
): boolean {
  if (mode === DetectionMode.NAVIGATION) {
    if (NAVIGATION_ALERT_ONLY_NEAR.has(label) && distance !== Distance.NEAR) {
      return false;
    }
  }
  return true;
}

/**
 * Nesnenin öncelikli olup olmadığını moda göre belirler.
 * Öncelikli nesneler MEDIUM mesafede de uyarı üretir.
 */
function isHighPriority(label: string, mode: DetectionMode): boolean {
  if (mode === DetectionMode.INDOOR) return INDOOR_HIGH_PRIORITY.has(label);
  return STREET_HIGH_PRIORITY.has(label);
}

export function useVisionAssistFrameProcessor(
  model: any,
  labels: string[],
  onObstaclesDetected: (obstacles: ObstacleInfo[]) => void,
  mode: DetectionMode = DetectionMode.STREET
) {
  const { resize } = useResizePlugin();

  /**
   * Temporal smoothing tablosu:
   * key = `${label}:${direction}`, value = ardışık algılanma sayısı
   * Bir nesne TEMPORAL_SMOOTHING_FRAMES kadar ardışık karede görünürse kabul edilir.
   */
  const smoothingMap = useRef<Map<string, number>>(new Map());

  const processOutputsJS = useCallback(
    (outputs: any[], _frameWidth: number, _frameHeight: number) => {
      if (!outputs || outputs.length < 3) return;

      const boxes = outputs[0];   // [ymin, xmin, ymax, xmax]  (normalize 0-1)
      const classes = outputs[1]; // sınıf indeksleri
      const scores = outputs[2];  // güven skorları
      // EfficientDet-Lite0: 4. output = geçerli tespit sayısı
      const countTensor = outputs.length >= 4 ? outputs[3] : null;

      const numDetections = countTensor
        ? Math.round(countTensor[0] ?? 25)
        : (typeof classes.length !== 'undefined' ? classes.length : 10);

      // ── Bu karede hangi key'ler güncellendi? ──────────────────────────────
      const seenKeys = new Set<string>();
      const candidates: ObstacleInfo[] = [];

      for (let i = 0; i < numDetections; i++) {
        const score: number = scores[i] ?? 0;
        const classIdx = Math.round(classes[i] ?? 0);
        const label = (labels[classIdx] ?? '').toLowerCase().trim();

        // 1. Genel izin listesi kontrolü
        if (!ALLOWED_LABELS.has(label)) continue;

        // 1b. MOD BAZLI FİLTRE: iç mekanda araç/trafik, dışarıda mobilya yok
        const modeAllowed = mode === DetectionMode.INDOOR
          ? INDOOR_ALLOWED_LABELS
          : STREET_ALLOWED_LABELS;
        if (!modeAllowed.has(label)) continue;

        // 2. Sınıfa özgü güven eşiğini kontrol et
        const minConf = getMinConfidence(label);
        if (score < minConf) continue;

        // Bounding box koordinatları
        const rawYMin = boxes[i * 4];
        const rawXMin = boxes[i * 4 + 1];
        const rawYMax = boxes[i * 4 + 2];
        const rawXMax = boxes[i * 4 + 3];

        const centerX = (rawXMin + rawXMax) / 2;
        const area = Math.abs(rawXMax - rawXMin) * Math.abs(rawYMax - rawYMin);

        // Yön
        let dir = Direction.CENTER;
        if (centerX < 0.33) dir = Direction.LEFT;
        else if (centerX > 0.66) dir = Direction.RIGHT;

        // Mesafe (kutu alanına göre)
        let distance: Distance;
        let proximityScore: number;
        if (area > 0.35) {
          distance = Distance.NEAR;
          proximityScore = 1.0;
        } else if (area > 0.12) {
          distance = Distance.MEDIUM;
          proximityScore = 0.6;
        } else {
          distance = Distance.FAR;
          proximityScore = 0.3;
        }

        // Risk seviyesi
        let riskLvl: RiskLevel;
        if (distance === Distance.NEAR) {
          riskLvl = RiskLevel.HIGH;
        } else if (distance === Distance.MEDIUM && isHighPriority(label, mode)) {
          riskLvl = RiskLevel.HIGH;
        } else if (distance === Distance.MEDIUM) {
          riskLvl = RiskLevel.MEDIUM;
        } else {
          riskLvl = RiskLevel.LOW;
        }

        // Mod bazlı uyarı filtresi
        if (!shouldAlert(label, distance, mode)) continue;

        // 3. Temporal smoothing — key = label + yön
        const key = `${label}:${dir}`;
        seenKeys.add(key);
        const prevCount = smoothingMap.current.get(key) ?? 0;
        const newCount = prevCount + 1;
        smoothingMap.current.set(key, newCount);

        // Yeterli ardışık kare yoksa bu nesneyi bu karede görmezden gel
        if (newCount < TEMPORAL_SMOOTHING_FRAMES) continue;

        candidates.push({
          id: `obj-${i}-${Date.now()}`,
          direction: dir,
          distance,
          riskLevel: riskLvl,
          coverage: area,
          brightness: 128,
          proximityScore,
          label,
          confidence: score,
          timestamp: Date.now(),
          bbox: {
            xmin: rawXMin,
            ymin: rawYMin,
            xmax: rawXMax,
            ymax: rawYMax,
          },
        });
      }

      // Karede görünmeyen key'lerin sayacını sıfırla
      for (const [key] of smoothingMap.current) {
        if (!seenKeys.has(key)) {
          smoothingMap.current.delete(key);
        }
      }

      onObstaclesDetected(candidates);
    },
    [labels, onObstaclesDetected, mode]
  );

  const runJS = useRunOnJS(processOutputsJS, [processOutputsJS]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (!model) return;

      try {
        const resizedFrame = resize(frame, {
          scale: { width: 320, height: 320 },
          pixelFormat: 'rgb',
          dataType: 'uint8',
        });

        const outputs = model.runSync([resizedFrame]);
        runJS(outputs, 0, 0);
      } catch (e) {
        console.log('FrameProcessor Hatası:', e);
      }
    },
    [model, processOutputsJS]
  );

  return frameProcessor;
}

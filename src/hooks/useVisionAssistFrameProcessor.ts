import { useCallback } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useRunOnJS } from 'react-native-worklets-core';
import { ObstacleInfo, RiskLevel, Direction, Distance } from '../utils/types';

export function useVisionAssistFrameProcessor(
  model: any,
  labels: string[],
  onObstaclesDetected: (obstacles: ObstacleInfo[]) => void
) {
  const { resize } = useResizePlugin();
  
  const processOutputsJS = useCallback((
    outputs: any[],
    frameWidth: number,
    frameHeight: number
  ) => {
    if (!outputs || outputs.length < 3) return;
    
    // Klasik SSD MobileNet TFLite Çıktıları
    const boxes = outputs[0];    // Kutu koordinatları [ymin, xmin, ymax, xmax]
    const classes = outputs[1];  // İndeksler
    const scores = outputs[2];   // Güven (Confidence)
    
    const detectedObstacles: ObstacleInfo[] = [];
    const minConfidence = 0.55;

    // Her model genelde max 10 nesne döndürür
    const numDetections = typeof classes.length !== 'undefined' ? classes.length : 10;
    
    for (let i = 0; i < numDetections; i++) {
      const score = scores[i] ?? 0;
      if (score < minConfidence) continue;

      const classIdx = Math.round(classes[i] ?? 0);
      const label = labels[classIdx] || `Nesne ${classIdx}`;
      
      // Sırlama: [ymin, xmin, ymax, xmax] (genelde 0-1 arası normalize)
      // Ancak bazı durumlarda [xmin, ymin, width, height] olabilir, 
      // standart SSD mobilenet için format varsayıyoruz.
      const rawYMin = boxes[i * 4];
      const rawXMin = boxes[i * 4 + 1];
      const rawYMax = boxes[i * 4 + 2];
      const rawXMax = boxes[i * 4 + 3];

      // Yaklaşık boyut alanı ve yön bulma
      const centerX = (rawXMin + rawXMax) / 2;
      const centerY = (rawYMin + rawYMax) / 2;
      const area = Math.abs(rawXMax - rawXMin) * Math.abs(rawYMax - rawYMin);

      let dir = Direction.CENTER;
      if (centerX < 0.33) dir = Direction.LEFT;
      else if (centerX > 0.66) dir = Direction.RIGHT;

      // Nesnenin büyüklüğü yakınlığı ifade eder
      const proximityScore = area > 0.4 ? 1.0 : (area > 0.15 ? 0.6 : 0.3);
      
      let riskLvl = RiskLevel.LOW;
      let distance = Distance.FAR;
      
      if (proximityScore > 0.8) {
        riskLvl = RiskLevel.HIGH;
        distance = Distance.NEAR;
      } else if (proximityScore > 0.5) {
        riskLvl = RiskLevel.HIGH;
        distance = Distance.MEDIUM;
      } else if (proximityScore > 0.2) {
        riskLvl = RiskLevel.MEDIUM;
        distance = Distance.FAR;
      }

      detectedObstacles.push({
        id: `obj-${i}-${Date.now()}`,
        direction: dir,
        distance,
        riskLevel: riskLvl,
        coverage: area,
        brightness: 128, // Default value as AI doesn't calculate brightness
        proximityScore,
        label,         // AI'nın bulduğu gerçek ad
        confidence: score,
        timestamp: Date.now()
      });
    }

    onObstaclesDetected(detectedObstacles);
  }, [labels, onObstaclesDetected]);

  const runJS = useRunOnJS(processOutputsJS, [processOutputsJS]);

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (!model) return;
    
    try {
      // Modeli beslemek için 300x300 boyutunda uint8 formatına küçültüyoruz
      const resizedFrame = resize(frame, {
        scale: { width: 300, height: 300 },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });
      
      const outputs = model.runSync([resizedFrame]);
      
      runJS(outputs, frame.width, frame.height);
    } catch (e) {
      console.log('FrameProcessor Hatası (Model çalışmadı):', e);
    }
  }, [model, processOutputsJS]);

  return frameProcessor;
}

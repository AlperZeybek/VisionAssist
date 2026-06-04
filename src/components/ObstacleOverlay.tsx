/**
 * VisionAssist - Engel Görselleştirme Bileşeni
 *
 * İki katmanlı görselleştirme:
 *  1. Sektör katmanı  — sol/orta/sağ renkli risk bandı (arka plan)
 *  2. Bounding box    — her nesnenin gerçek koordinatlarında kutu + etiket
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ObstacleInfo, Direction, RiskLevel } from '../utils/types';
import { FONT_SIZES } from '../utils/constants';
import { getRiskColor, localizeLabel } from '../utils/helpers';

interface ObstacleOverlayProps {
  obstacles: ObstacleInfo[];
  visible: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Kutu rengini risk seviyesine göre belirler */
function boxColor(risk: RiskLevel): string {
  switch (risk) {
    case RiskLevel.HIGH:   return '#4D9EFF';   // mavi  (görsel ile uyumlu)
    case RiskLevel.MEDIUM: return '#34C759';   // yeşil
    case RiskLevel.LOW:    return '#34C759';   // yeşil
    default:               return '#8E8E93';
  }
}

export default function ObstacleOverlay({ obstacles, visible }: ObstacleOverlayProps) {
  if (!visible || obstacles.length === 0) return null;

  // Sektör başına en yüksek riskli engel
  const sectorObstacles = {
    [Direction.LEFT]:   obstacles.find(o => o.direction === Direction.LEFT),
    [Direction.CENTER]: obstacles.find(o => o.direction === Direction.CENTER),
    [Direction.RIGHT]:  obstacles.find(o => o.direction === Direction.RIGHT),
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ── Katman 1: Sektör renk bantları ──────────────────── */}
      <View style={styles.sectorContainer}>
        <SectorBand obstacle={sectorObstacles[Direction.LEFT]} />
        <SectorBand obstacle={sectorObstacles[Direction.CENTER]} />
        <SectorBand obstacle={sectorObstacles[Direction.RIGHT]} />
      </View>

      {/* ── Katman 2: Bounding box'lar ───────────────────────── */}
      {obstacles.map(obstacle => {
        if (!obstacle.bbox) return null;
        const { xmin, ymin, xmax, ymax } = obstacle.bbox;

        // Ekran koordinatlarına dönüştür
        // (cameraContainer yüksekliği SCREEN_HEIGHT * 0.65'tir)
        const VIEW_H = SCREEN_HEIGHT * 0.65;
        const left   = xmin * SCREEN_WIDTH;
        const top    = ymin * VIEW_H;
        const width  = (xmax - xmin) * SCREEN_WIDTH;
        const height = (ymax - ymin) * VIEW_H;

        const color = boxColor(obstacle.riskLevel);
        const nameLabel = localizeLabel(obstacle.label, 'tr');
        const pct = Math.round((obstacle.confidence ?? 0) * 100);

        return (
          <View
            key={obstacle.id}
            style={[
              styles.boundingBox,
              {
                left,
                top,
                width,
                height,
                borderColor: color,
              },
            ]}
            accessible
            accessibilityLabel={`${nameLabel} yüzde ${pct}`}
          >
            {/* Üst etiket */}
            <View style={[styles.labelBadge, { backgroundColor: color }]}>
              <Text style={styles.labelText}>
                {nameLabel.charAt(0).toUpperCase() + nameLabel.slice(1)} %{pct}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Sektör bandı ───────────────────────────────────────────────────
interface SectorBandProps {
  obstacle: ObstacleInfo | undefined;
}

function SectorBand({ obstacle }: SectorBandProps) {
  if (!obstacle || obstacle.riskLevel === RiskLevel.NONE) {
    return <View style={styles.sector} />;
  }

  const riskColor = getRiskColor(obstacle.riskLevel);
  const opacity   = obstacle.riskLevel === RiskLevel.HIGH ? 0.30 : 0.15;

  return (
    <View
      style={[
        styles.sector,
        {
          backgroundColor:
            riskColor + Math.round(opacity * 255).toString(16).padStart(2, '0'),
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  sectorContainer: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  sector: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },

  // Bounding box
  boundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  labelBadge: {
    position: 'absolute',
    top: -1,
    left: -1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZES.small - 6,
    fontWeight: '700',
  },
});

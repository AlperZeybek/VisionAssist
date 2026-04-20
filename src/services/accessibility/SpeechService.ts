/**
 * VisionAssist - Konuşma Servisi
 * 
 * expo-speech kütüphanesini sarmalayan konuşma yönetim servisi.
 * Özellikleri:
 * - Öncelik bazlı konuşma kuyruğu
 * - Cooldown sistemi (aynı mesaj tekrarını önler)
 * - Dil desteği (Türkçe/İngilizce)
 * - Ses hızı ve perde ayarları
 */

import * as Speech from 'expo-speech';
import { RiskLevel } from '../../utils/types';

interface SpeechQueueItem {
  message: string;
  priority: RiskLevel;
  timestamp: number;
}

class SpeechService {
  private isSpeaking: boolean = false;
  private queue: SpeechQueueItem[] = [];
  private lastSpokenMessage: string = '';
  private lastSpokenTime: number = 0;
  private speechRate: number = 1.0;
  private speechPitch: number = 1.0;
  private language: string = 'tr-TR';
  private enabled: boolean = true;

  // Aynı mesajın minimum tekrar aralığı (ms)
  private messageCooldown: number = 2000;

  /**
   * Mesaj konuşturur.
   * Aynı mesaj cooldown süresi içinde tekrar konuşturulmaz.
   * Yüksek öncelikli mesaj, mevcut konuşmayı durdurur.
   * 
   * @param message - Söylenecek metin
   * @param priority - Mesaj önceliği
   */
  async speak(
    message: string,
    priority: RiskLevel = RiskLevel.MEDIUM
  ): Promise<void> {
    if (!this.enabled) return;

    // Aynı mesaj cooldown kontrolü
    if (
      message === this.lastSpokenMessage &&
      Date.now() - this.lastSpokenTime < this.messageCooldown
    ) {
      return;
    }

    // Yüksek öncelikli mesaj mevcut konuşmayı durdurur
    if (priority === RiskLevel.HIGH && this.isSpeaking) {
      await this.stop();
    }

    // Kuyruğa ekle veya doğrudan konuştur
    if (this.isSpeaking && priority !== RiskLevel.HIGH) {
      this.addToQueue(message, priority);
      return;
    }

    await this.speakNow(message);
  }

  /**
   * Mesajı hemen konuşturur.
   */
  private async speakNow(message: string): Promise<void> {
    this.isSpeaking = true;
    this.lastSpokenMessage = message;
    this.lastSpokenTime = Date.now();

    return new Promise<void>((resolve) => {
      Speech.speak(message, {
        language: this.language,
        rate: this.speechRate,
        pitch: this.speechPitch,
        onStart: () => {
          this.isSpeaking = true;
        },
        onDone: () => {
          this.isSpeaking = false;
          this.processQueue();
          resolve();
        },
        onError: (error) => {
          console.warn('[SpeechService] Konuşma hatası:', error);
          this.isSpeaking = false;
          this.processQueue();
          resolve();
        },
        onStopped: () => {
          this.isSpeaking = false;
          resolve();
        },
      });
    });
  }

  /**
   * Kuyruğa mesaj ekler.
   * Yüksek öncelikli mesajlar kuyruğun başına eklenir.
   */
  private addToQueue(message: string, priority: RiskLevel): void {
    const item: SpeechQueueItem = {
      message,
      priority,
      timestamp: Date.now(),
    };

    // Yüksek öncelik → kuyruğun başına
    if (priority === RiskLevel.HIGH) {
      this.queue.unshift(item);
    } else {
      this.queue.push(item);
    }

    // Kuyruk boyutunu sınırla (maks 3 mesaj)
    if (this.queue.length > 3) {
      this.queue = this.queue.slice(0, 3);
    }
  }

  /**
   * Kuyruktaki sonraki mesajı işler.
   */
  private processQueue(): void {
    if (this.queue.length === 0 || this.isSpeaking) return;

    const next = this.queue.shift();
    if (next) {
      // Çok eski mesajları atla (3 saniyeden eski)
      if (Date.now() - next.timestamp > 3000) {
        this.processQueue();
        return;
      }
      this.speakNow(next.message);
    }
  }

  /**
   * Konuşmayı durdurur.
   */
  async stop(): Promise<void> {
    Speech.stop();
    this.isSpeaking = false;
    this.queue = [];
  }

  /**
   * Dil ayarını günceller.
   */
  setLanguage(lang: 'tr' | 'en'): void {
    this.language = lang === 'tr' ? 'tr-TR' : 'en-US';
  }

  /**
   * Konuşma hızını ayarlar.
   * @param rate - Hız (0.5 - 2.0)
   */
  setRate(rate: number): void {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Ses perdesini ayarlar.
   * @param pitch - Perde (0.5 - 2.0)
   */
  setPitch(pitch: number): void {
    this.speechPitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  /**
   * Mesaj cooldown süresini ayarlar.
   */
  setCooldown(ms: number): void {
    this.messageCooldown = ms;
  }

  /**
   * Servisi etkinleştirir/devre dışı bırakır.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Servisin konuşup konuşmadığını kontrol eder.
   */
  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

// Singleton instance
export const speechService = new SpeechService();
export default SpeechService;

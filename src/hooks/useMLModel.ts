import { useState, useEffect } from 'react';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';

export function useMLModel() {
  const [labels, setLabels] = useState<string[]>([]);
  
  // Modeli yükle - Asset ID'si üzerinden
  const model = useTensorflowModel(require('../../assets/models/detect.tflite'));

  // Etiketleri (Labels) yükle
  useEffect(() => {
    async function fetchLabels() {
      try {
        const [{ localUri, uri }] = await Asset.loadAsync(
          require('../../assets/models/labelmap.txt')
        );
        const fileUri = localUri || uri;
        if (fileUri) {
          const response = await fetch(fileUri);
          const text = await response.text();
          const parsed = text
            .split('\n')
            .map((t) => t.trim())
            .filter((t) => t.length > 0 && t !== '???');
          setLabels(parsed);
        }
      } catch (err) {
        console.error('[useMLModel] Label yükleme hatası:', err);
      }
    }
    fetchLabels();
  }, []);

  return { model: model.model, state: model.state, labels };
}

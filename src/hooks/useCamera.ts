/**
 * VisionAssist - Kamera Hook'u (Vision Camera)
 */
import { useState, useEffect, useCallback } from 'react';
import { useCameraPermission } from 'react-native-vision-camera';

export interface UseCameraReturn {
  hasPermission: boolean | null;
  isRequesting: boolean;
  requestPermission: () => Promise<boolean>;
  isReady: boolean;
  setIsReady: (ready: boolean) => void;
}

export function useCamera(): UseCameraReturn {
  const { hasPermission, requestPermission: requestCamPerm } = useCameraPermission();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      const result = await requestCamPerm();
      return result;
    } catch (error) {
      console.error('[useCamera] İzin isteme hatası:', error);
      return false;
    } finally {
      setIsRequesting(false);
    }
  }, [requestCamPerm]);

  // İlk yüklemede izin durumunu kontrol et
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  return {
    hasPermission,
    isRequesting,
    requestPermission,
    isReady,
    setIsReady,
  };
}

export default useCamera;

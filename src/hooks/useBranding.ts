import { useState, useEffect } from 'react';
import { getCustomLogo, saveCustomLogo, removeCustomLogo, resizeImage } from '../lib/branding';

export function useBranding() {
  const [logo, setLogo] = useState<string | null>(() => {
    // Synchronously grab the cached logo on component initialization to avoid flashing
    return localStorage.getItem('guarda_mirim_custom_logo');
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const dbLogo = await getCustomLogo();
      if (active) {
        setLogo(dbLogo);
        setLoading(false);
      }
    }
    load();

    const handleBrandingChanged = async () => {
      const refreshedLogo = await getCustomLogo(true);
      if (active) {
        setLogo(refreshedLogo);
      }
    };

    window.addEventListener('branding-changed', handleBrandingChanged);
    return () => {
      active = false;
      window.removeEventListener('branding-changed', handleBrandingChanged);
    };
  }, []);

  const handleUpload = async (file: File) => {
    try {
      const resizedBase64 = await resizeImage(file);
      await saveCustomLogo(resizedBase64);
    } catch (error) {
      console.error('Failed to upload/resize logo:', error);
      throw error;
    }
  };

  const handleReset = async () => {
    try {
      await removeCustomLogo();
    } catch (error) {
      console.error('Failed to reset logo:', error);
      throw error;
    }
  };

  return {
    logo,
    loading,
    uploadLogo: handleUpload,
    resetLogo: handleReset,
  };
}

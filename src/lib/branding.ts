import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const CACHE_KEY = 'guarda_mirim_custom_logo';

let memoryLogo: string | null = localStorage.getItem(CACHE_KEY);

/**
 * Recovers the custom brand logo as a Base64 string.
 * Uses Memory and LocalStorage caching for instant loading.
 */
export async function getCustomLogo(forceRefresh = false): Promise<string | null> {
  if (memoryLogo && !forceRefresh) {
    return memoryLogo;
  }

  try {
    const docRef = doc(db, 'config', 'branding');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const logo = data.logoBase64 || null;
      if (logo) {
        localStorage.setItem(CACHE_KEY, logo);
        memoryLogo = logo;
      } else {
        localStorage.removeItem(CACHE_KEY);
        memoryLogo = null;
      }
      return memoryLogo;
    }
  } catch (error) {
    console.error('Error fetching custom logo:', error);
  }

  return memoryLogo; // Fallback to cached or null
}

/**
 * Resizes an uploaded image file to max 256px to save storage/bandwidth,
 * and converts it to a standard base64 PNG data-url.
 */
export function resizeImage(file: File, maxWidth = 256, maxHeight = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(readerEvent.target?.result as string);
        }
      };
      image.onerror = (err) => reject(err);
      image.src = readerEvent.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads/Saves a new custom logo.
 */
export async function saveCustomLogo(base64Data: string): Promise<void> {
  const docRef = doc(db, 'config', 'branding');
  await setDoc(docRef, { logoBase64: base64Data }, { merge: true });
  localStorage.setItem(CACHE_KEY, base64Data);
  memoryLogo = base64Data;
  
  // Trigger storage event so other tabs/components hear the update
  window.dispatchEvent(new Event('branding-changed'));
}

/**
 * Removes the custom logo and restores default branding vector.
 */
export async function removeCustomLogo(): Promise<void> {
  const docRef = doc(db, 'config', 'branding');
  await setDoc(docRef, { logoBase64: null }, { merge: true });
  localStorage.removeItem(CACHE_KEY);
  memoryLogo = null;
  window.dispatchEvent(new Event('branding-changed'));
}

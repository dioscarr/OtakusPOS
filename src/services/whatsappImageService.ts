// Dio Rod
import axios from 'axios';

interface WhatsappImage {
  id: string;
  url: string;
  timestamp: string;
  sender: string;
  caption?: string;
}

interface AISensysResponse {
  success: boolean;
  images: WhatsappImage[];
  errorMessage?: string;
}

export class WhatsappImageService {
  private _apiKey: string;
  private _baseUrl: string = 'https://v1.api.aisensys.com'; // Update the base URL as needed
  
  constructor() {
    this._apiKey = import.meta.env.VITE_AISENSYS_API_KEY;
    if (!this._apiKey) {
      console.error("AISENSYS API key not found in environment variables");
    }
  }

  async getWhatsappImages(daysBack: number = 7): Promise<WhatsappImage[]> {
    try {
      const response = await axios.get(`${this._baseUrl}/whatsapp/images`, {
        headers: {
          'Authorization': `Bearer ${this._apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          daysBack
        }
      });
      
      const data = response.data as AISensysResponse;
      
      if (!data.success) {
        throw new Error(data.errorMessage || 'Failed to fetch WhatsApp images');
      }
      
      return data.images;
    } catch (error) {
      console.error('Error fetching WhatsApp images:', error);
      throw error;
    }
  }

  async downloadImage(imageUrl: string): Promise<File> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${this._apiKey}`
        }
      });
      
      const imageBlob = response.data;
      const fileName = this._extractFileNameFromUrl(imageUrl);
      
      return new File([imageBlob], fileName, { type: imageBlob.type });
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }
  
  private _extractFileNameFromUrl(url: string): string {
    try {
      const urlParts = new URL(url);
      const pathParts = urlParts.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      return fileName || `whatsapp-image-${Date.now()}.jpg`;
    } catch {
      return `whatsapp-image-${Date.now()}.jpg`;
    }
  }
}

export default new WhatsappImageService();

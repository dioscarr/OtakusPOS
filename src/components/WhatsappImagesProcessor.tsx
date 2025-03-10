// Dio Rod
import React, { useState, useEffect } from 'react';
import whatsappImageService, { WhatsappImage } from '../services/whatsappImageService';
import ocrResultManager from '../models/OcrResult';
import { OcrProcessor } from './OcrProcessor';

interface WhatsappImagesProcessorProps {
  isOpen: boolean;
  onClose: () => void;
  onImagesProcessed?: (count: number) => void;
}

export function WhatsappImagesProcessor({ isOpen, onClose, onImagesProcessed }: WhatsappImagesProcessorProps) {
  const [_images, set_Images] = useState<WhatsappImage[]>([]);
  const [_loading, set_Loading] = useState<boolean>(false);
  const [_selectedImages, set_SelectedImages] = useState<string[]>([]);
  const [_currentImageIndex, set_CurrentImageIndex] = useState<number>(-1);
  const [_processingImage, set_ProcessingImage] = useState<File | null>(null);
  const [_showOcrProcessor, set_ShowOcrProcessor] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadWhatsappImages();
    }
  }, [isOpen]);

  const loadWhatsappImages = async () => {
    try {
      set_Loading(true);
      const images = await whatsappImageService.getWhatsappImages(7);
      set_Images(images);
    } catch (error) {
      console.error('Error loading WhatsApp images:', error);
      alert('Failed to load WhatsApp images. Please check your connection and try again.');
    } finally {
      set_Loading(false);
    }
  };

  const handleSelectImage = (imageId: string) => {
    set_SelectedImages(prev =>
      prev.includes(imageId) ? prev.filter(id => id !== imageId) : [...prev, imageId]
    );
  };

  const handleProcessSelected = async () => {
    if (_selectedImages.length === 0) {
      alert('Please select at least one image to process');
      return;
    }
    set_CurrentImageIndex(0);
    const firstImage = _images.find(img => img.id === _selectedImages[0]);
    if (firstImage) {
      try {
        const downloadedImage = await whatsappImageService.downloadImage(firstImage.url);
        set_ProcessingImage(downloadedImage);
        set_ShowOcrProcessor(true);
      } catch (error) {
        console.error('Error downloading image:', error);
        moveToNextImage();
      }
    }
  };

  const handleOcrComplete = async (ocrData: any) => {
    try {
      await ocrResultManager.saveOcrResult({
        ...ocrData,
        image_url: _images.find(img => img.id === _selectedImages[_currentImageIndex])?.url || '',
        processed_text: ocrData.rawText || '', 
        source: 'whatsapp',
        is_imported: false,
        processed_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving OCR result:', error);
    }
    moveToNextImage();
  };

  const moveToNextImage = () => {
    const nextIndex = _currentImageIndex + 1;
    if (nextIndex < _selectedImages.length) {
      set_CurrentImageIndex(nextIndex);
      const nextImage = _images.find(img => img.id === _selectedImages[nextIndex]);
      if (nextImage) {
        whatsappImageService.downloadImage(nextImage.url)
          .then(downloadedImage => {
            set_ProcessingImage(downloadedImage);
          })
          .catch(error => {
            console.error('Error downloading next image:', error);
            moveToNextImage();
          });
      }
    } else {
      set_ShowOcrProcessor(false);
      set_ProcessingImage(null);
      set_CurrentImageIndex(-1);
      if (onImagesProcessed) {
        onImagesProcessed(_selectedImages.length);
      }
      set_SelectedImages([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto p-4">
        <h2 className="text-xl font-bold text-white mb-4">Process WhatsApp Images</h2>
        {_showOcrProcessor && _processingImage ? (
          <OcrProcessor 
            isOpen={true}
            onClose={() => moveToNextImage()}
            file={_processingImage}
            onOcrComplete={handleOcrComplete}
            sourceType="whatsapp"
          />
        ) : (
          <>
            {_loading ? (
              <div className="flex justify-center items-center p-8">
                <div className="w-12 h-12 border-t-4 border-blue-500 rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                <p className="text-white mb-4">
                  {_images.length} images found in the last 7 days. Select the images you want to process.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-auto">
                  {_images.map(image => (
                    <div key={image.id} className="relative">
                      <img 
                        src={image.url} 
                        alt={`WhatsApp image ${image.id}`}
                        className="w-full rounded-md"
                        style={{ border: _selectedImages.includes(image.id) ? '2px solid #1976d2' : '2px solid transparent' }}
                      />
                      <input
                        type="checkbox"
                        checked={_selectedImages.includes(image.id)}
                        onChange={() => handleSelectImage(image.id)}
                        className="absolute top-1 left-1 w-4 h-4 text-blue-600"
                      />
                      <span className="block text-xs text-gray-300 mt-1">
                        {new Date(image.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-6">
                  <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md">
                    Cancel
                  </button>
                  <button 
                    onClick={handleProcessSelected}
                    disabled={_selectedImages.length === 0}
                    className="px-4 py-2 bg-[#D80000] text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    Process {_selectedImages.length} Selected Images
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

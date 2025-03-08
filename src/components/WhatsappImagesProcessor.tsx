// Dio Rod
import React, { useState, useEffect } from 'react';
import { Button, Dialog, DialogContent, DialogTitle, Grid, Typography, CircularProgress, Checkbox, FormControlLabel } from '@mui/material';
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
      const images = await whatsappImageService.getWhatsappImages(7); // Get last 7 days
      set_Images(images);
    } catch (error) {
      console.error('Error loading WhatsApp images:', error);
      alert('Failed to load WhatsApp images. Please check your connection and try again.');
    } finally {
      set_Loading(false);
    }
  };

  const handleSelectImage = (imageId: string) => {
    set_SelectedImages(prev => {
      if (prev.includes(imageId)) {
        return prev.filter(id => id !== imageId);
      } else {
        return [...prev, imageId];
      }
    });
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

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Process WhatsApp Images</DialogTitle>
      
      {_showOcrProcessor && _processingImage ? (
        <OcrProcessor 
          isOpen={true}
          onClose={() => moveToNextImage()}
          file={_processingImage}
          onOcrComplete={handleOcrComplete}
          sourceType="whatsapp"
        />
      ) : (
        <DialogContent>
          {_loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <CircularProgress />
            </div>
          ) : (
            <>
              <Typography variant="body2" gutterBottom>
                {_images.length} images found in the last 7 days. Select the images you want to process.
              </Typography>
              
              <Grid container spacing={2} style={{ maxHeight: '60vh', overflow: 'auto' }}>
                {_images.map(image => (
                  <Grid item xs={6} sm={4} md={3} key={image.id}>
                    <div style={{ position: 'relative' }}>
                      <img 
                        src={image.url} 
                        alt={`WhatsApp image ${image.id}`}
                        style={{ 
                          width: '100%', 
                          borderRadius: '8px',
                          border: _selectedImages.includes(image.id) ? '2px solid #1976d2' : '2px solid transparent'
                        }}
                      />
                      <FormControlLabel
                        control={
                          <Checkbox 
                            checked={_selectedImages.includes(image.id)}
                            onChange={() => handleSelectImage(image.id)}
                          />
                        }
                        label=""
                        style={{ position: 'absolute', top: 0, left: 0 }}
                      />
                      <Typography variant="caption" display="block">
                        {new Date(image.timestamp).toLocaleString()}
                      </Typography>
                    </div>
                  </Grid>
                ))}
              </Grid>
              
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="primary">
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcessSelected}
                  variant="contained" 
                  color="primary"
                  disabled={_selectedImages.length === 0}
                >
                  Process {_selectedImages.length} Selected Images
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      )}
    </Dialog>
  );
}

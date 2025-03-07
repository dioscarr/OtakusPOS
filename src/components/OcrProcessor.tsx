import React, { useState, useEffect } from 'react';
import { X, Upload, Clipboard, FileScan, Save, DollarSign, Calendar, User, FileText } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { supabase } from '../lib/supabase'; // Import Supabase client

interface OcrProcessorProps {
  onClose: () => void;
  isOpen: boolean;
}

interface ExtractedInvoice {
  supplier: string;
  date: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
}

export function OcrProcessor({ onClose, isOpen }: OcrProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [extractedInvoice, setExtractedInvoice] = useState<ExtractedInvoice>({
    supplier: '',
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    subtotal: 0,
    tax: 0,
    total: 0
  });
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);

  // Reset states when modal is opened
  useEffect(() => {
    if (isOpen) {
      setUploadedFile(null);
      setImagePreview(null);
      setOcrResult('');
      setOcrProgress(0);
      setShowInvoiceForm(false);
      setExtractedInvoice({
        supplier: '',
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        subtotal: 0,
        tax: 0,
        total: 0
      });
      setInvoiceGenerated(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setOcrResult('');
    setOcrProgress(0);
    setShowInvoiceForm(false);
    setInvoiceGenerated(false);

    // Create a preview for the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOcr = async () => {
    if (!uploadedFile) return;

    try {
      setIsProcessing(true);
      setOcrProgress(0);

      const result = await Tesseract.recognize(
        uploadedFile,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setOcrProgress(m.progress * 100);
            }
          }
        }
      );

      const extractedText = result.data.text;
      setOcrResult(extractedText);
      
      // Extract invoice data from OCR text
      const extractedData = extractInvoiceData(extractedText);
      setExtractedInvoice(extractedData);
      setShowInvoiceForm(true);
    } catch (error) {
      console.error('Error performing OCR:', error);
      setOcrResult(`Error: ${error.message || 'Unknown error occurred during OCR'}`);
    } finally {
      setIsProcessing(false);
      setOcrProgress(100);
    }
  };

  // Function to extract relevant invoice data from OCR text
  const extractInvoiceData = (text: string): ExtractedInvoice => {
    const invoice: ExtractedInvoice = {
      supplier: '',
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      subtotal: 0,
      tax: 0,
      total: 0
    };

    // Try to extract supplier name (usually one of the first lines)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      // Usually the first line is the company name
      invoice.supplier = lines[0].trim();
    }

    // Try to extract date using regex patterns
    const datePatterns = [
      /date[:\s]+(.*)/i,
      /fecha[:\s]+(.*)/i,
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
      /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Try to parse the date
        try {
          const dateStr = match[1].trim();
          const dateObj = new Date(dateStr);
          if (!isNaN(dateObj.getTime())) {
            invoice.date = dateObj.toISOString().split('T')[0];
            break;
          }
        } catch (e) {
          console.log('Failed to parse date:', match[1]);
        }
      }
    }

    // Try to extract invoice number
    const invoicePatterns = [
      /invoice[:\s]+(.*)/i,
      /invoice\s+no[:\s]+(.*)/i,
      /factura[:\s]+(.*)/i,
      /factura\s+no[:\s]+(.*)/i,
      /no\.?\s+(\d+[-\w]*)/i,
      /number[:\s]+(\d+[-\w]*)/i,
      /número[:\s]+(\d+[-\w]*)/i
    ];

    for (const pattern of invoicePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        invoice.invoiceNumber = match[1].trim();
        break;
      }
    }

    // Try to extract amounts
    const totalPattern = /total[:\s]+([\d,\.]+)/i;
    const subtotalPattern = /subtotal[:\s]+([\d,\.]+)/i;
    const taxPatterns = [
      /tax[:\s]+([\d,\.]+)/i,
      /iva[:\s]+([\d,\.]+)/i,
      /vat[:\s]+([\d,\.]+)/i,
      /itbis[:\s]+([\d,\.]+)/i
    ];

    // Extract total
    const totalMatch = text.match(totalPattern);
    if (totalMatch && totalMatch[1]) {
      invoice.total = parseFloat(totalMatch[1].replace(/,/g, ''));
    }

    // Extract subtotal
    const subtotalMatch = text.match(subtotalPattern);
    if (subtotalMatch && subtotalMatch[1]) {
      invoice.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
    }

    // Extract tax
    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        invoice.tax = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }

    // If we have total but no subtotal or tax, try to estimate
    if (invoice.total > 0) {
      if (invoice.subtotal === 0 && invoice.tax > 0) {
        invoice.subtotal = invoice.total - invoice.tax;
      } else if (invoice.subtotal > 0 && invoice.tax === 0) {
        invoice.tax = invoice.total - invoice.subtotal;
      } else if (invoice.subtotal === 0 && invoice.tax === 0) {
        // Estimate using standard tax rate (e.g., 18% ITBIS in Dominican Republic)
        invoice.tax = parseFloat((invoice.total * 0.18 / 1.18).toFixed(2));
        invoice.subtotal = invoice.total - invoice.tax;
      }
    }

    return invoice;
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(ocrResult).then(() => {
      alert('OCR result copied to clipboard');
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
    });
  };

  const handleInvoiceSubmit = async () => {
    try {
      // Validate data before submitting
      if (!extractedInvoice.supplier || !extractedInvoice.date || !extractedInvoice.total) {
        alert('Por favor, complete todos los campos requeridos.');
        return;
      }
      
      // Insert invoice data into the database
      const { data, error, status } = await supabase
        .from('invoices')
        .insert([
          {
            supplier: extractedInvoice.supplier,
            date: extractedInvoice.date,
            invoice_number: extractedInvoice.invoiceNumber,
            subtotal: extractedInvoice.subtotal,
            tax: extractedInvoice.tax,
            total: extractedInvoice.total,
            receipt_image_url: imagePreview, // Store the image reference
          },
        ])
        .select();
      
      if (error) {
        console.error('Error inserting invoice:', error);
        if (status === 404) {
          alert('Error: La tabla "invoices" no se encuentra. Por favor, asegúrese de que la tabla exista en su base de datos Supabase.');
        } else {
          alert(`Error al guardar la factura: ${error.message}`);
        }
        return;
      }
      
      console.log('Invoice inserted successfully:', data);
      setInvoiceGenerated(true);
      alert('Factura guardada exitosamente en la base de datos.');
      
    } catch (err) {
      console.error('Error saving invoice:', err);
      alert(`Error al guardar la factura: ${err instanceof Error ? err.message : 'Por favor intente de nuevo'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileScan size={24} className="text-blue-400" />
            {showInvoiceForm ? "Creación de Factura Digital" : "Procesamiento OCR de Recibos"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {!showInvoiceForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-4">Subir Imagen</h3>
                <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-500 rounded-md hover:border-blue-400 transition-colors cursor-pointer">
                  <Upload size={24} className="text-blue-400" />
                  <span className="text-gray-300">Seleccionar imagen de recibo</span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </label>

                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="w-full max-h-52 object-contain rounded-md"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {uploadedFile?.name} ({(uploadedFile?.size || 0) / 1024 < 1000 
                        ? `${Math.round((uploadedFile?.size || 0) / 1024)} KB` 
                        : `${Math.round((uploadedFile?.size || 0) / 1024 / 1024 * 10) / 10} MB`})
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleOcr}
                disabled={isProcessing || !uploadedFile}
                className={`w-full py-2 px-4 rounded-md flex justify-center items-center gap-2 ${
                  !isProcessing && uploadedFile
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Procesando...{Math.round(ocrProgress)}%</span>
                  </>
                ) : (
                  <span>Procesar con OCR</span>
                )}
              </button>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">Resultado OCR</h3>
              {ocrResult ? (
                <>
                  <div className="bg-gray-800 p-3 rounded-md h-60 overflow-y-auto text-sm text-gray-300 whitespace-pre-wrap mb-3">
                    {ocrResult}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      <Clipboard size={16} />
                      Copiar al Portapapeles
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gray-800 p-3 rounded-md h-60 flex items-center justify-center text-gray-500">
                  {isProcessing 
                    ? "Procesando la imagen..." 
                    : uploadedFile
                      ? "Presione el botón 'Procesar con OCR' para comenzar"
                      : "Suba una imagen para extraer texto"
                  }
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className={`bg-gray-700 p-6 rounded-lg ${invoiceGenerated ? 'relative' : ''}`}>
            {invoiceGenerated && (
              <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center rounded-lg">
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto text-center space-y-4">
                  <div className="bg-green-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <Save className="text-green-400 w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-white">¡Factura Generada!</h3>
                  <p className="text-gray-300">La factura digital ha sido generada exitosamente en el sistema.</p>
                  <div className="pt-4">
                    <button
                      onClick={onClose}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-lg font-semibold text-white mb-5">Datos Extraídos de la Factura</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-4">
                {/* Left column - Form inputs */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-blue-400" />
                      Proveedor
                    </div>
                  </label>
                  <input
                    type="text"
                    value={extractedInvoice.supplier}
                    onChange={(e) => setExtractedInvoice({...extractedInvoice, supplier: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-blue-400" />
                      Fecha
                    </div>
                  </label>
                  <input
                    type="date"
                    value={extractedInvoice.date}
                    onChange={(e) => setExtractedInvoice({...extractedInvoice, date: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-400" />
                      Número de Factura
                    </div>
                  </label>
                  <input
                    type="text"
                    value={extractedInvoice.invoiceNumber}
                    onChange={(e) => setExtractedInvoice({...extractedInvoice, invoiceNumber: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Right column - Financial inputs */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-blue-400" />
                      Subtotal
                    </div>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedInvoice.subtotal}
                    onChange={(e) => {
                      const subtotal = parseFloat(e.target.value) || 0;
                      setExtractedInvoice({
                        ...extractedInvoice, 
                        subtotal,
                        total: subtotal + extractedInvoice.tax
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-blue-400" />
                      Impuesto
                    </div>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedInvoice.tax}
                    onChange={(e) => {
                      const tax = parseFloat(e.target.value) || 0;
                      setExtractedInvoice({
                        ...extractedInvoice, 
                        tax,
                        total: extractedInvoice.subtotal + tax
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} className="text-blue-400" />
                      Total
                    </div>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={extractedInvoice.total}
                    onChange={(e) => {
                      const total = parseFloat(e.target.value) || 0;
                      // Adjust subtotal if tax remains the same proportion
                      const tax = extractedInvoice.tax;
                      const subtotal = total - tax;
                      setExtractedInvoice({
                        ...extractedInvoice, 
                        total,
                        subtotal: subtotal > 0 ? subtotal : 0
                      });
                    }}
                    className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Preview and receipt image side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-2">Previsualización de Factura</h3>
                <div className="bg-white text-black p-4 rounded">
                  <div className="text-center border-b border-gray-200 pb-3 mb-3">
                    <h3 className="font-bold text-lg">FACTURA DIGITAL</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Proveedor:</span>
                      <span>{extractedInvoice.supplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Fecha:</span>
                      <span>{new Date(extractedInvoice.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">No. Factura:</span>
                      <span>{extractedInvoice.invoiceNumber || "N/A"}</span>
                    </div>
                    
                    <div className="border-t border-gray-200 my-2 pt-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">Subtotal:</span>
                        <span>RD$ {extractedInvoice.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold">ITBIS (18%):</span>
                        <span>RD$ {extractedInvoice.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-200 mt-2 pt-1">
                        <span>TOTAL:</span>
                        <span>RD$ {extractedInvoice.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {imagePreview && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Imagen Original</h3>
                  <div className="w-full h-48 bg-gray-700 rounded-md overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Receipt"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowInvoiceForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
              >
                Volver a OCR
              </button>
              <button
                onClick={handleInvoiceSubmit}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Save size={18} />
                Generar Factura Digital
              </button>
            </div>
          </div>
        )}

        {!showInvoiceForm && (
          <div className="mt-6 text-sm text-gray-400">
            <p>Nota: El OCR funciona mejor con imágenes nítidas y bien iluminadas. Para mejores resultados:</p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Asegúrese de que el texto sea claramente visible</li>
              <li>Evite imágenes borrosas o con sombras</li>
              <li>Capture la imagen en un ángulo recto</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

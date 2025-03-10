import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Clipboard, FileScan, Save, DollarSign, Calendar, User, FileText, Image, RefreshCw } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { supabase } from '../lib/supabase'; // Import Supabase client
import Anthropic from "@anthropic-ai/sdk"; // Dio Rod

interface OcrProcessorProps {
  onClose: () => void;
  isOpen: boolean;
  onOcrComplete?: (data: any) => void; // Add onOcrComplete prop
}

interface ExtractedInvoice {
  supplier: string;
  rcn: string; // Dio Rod
  nif: string; // Dio Rod: new field for NIF
  ncf: string; // Dio Rod: new field for NCF
  date: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  total: number;
  paymentType: string; // Dio Rod: new field for Payment Type
}

// Replace process.env with import.meta.env for browser compatibility
const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || "my_api_key", // Dio Rod
  dangerouslyAllowBrowser: true // Dio Rod
});

export function OcrProcessor({ onClose, isOpen, onOcrComplete }: OcrProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [extractedInvoice, setExtractedInvoice] = useState<ExtractedInvoice>({
    supplier: '',
    rcn: '', // Dio Rod
    nif: '', // Dio Rod: new field default
    ncf: '', // Dio Rod: new field default
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    subtotal: 0,
    tax: 0,
    total: 0,
    paymentType: '' // Dio Rod: new field default
  });
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false); // Dio Rod
  const [showDebugData, setShowDebugData] = useState(false); // Dio Rod
  const [enableAICleanup, setEnableAICleanup] = useState(false); // Dio Rod
  const [isRegeneratingFecha, setIsRegeneratingFecha] = useState(false); // Dio Rod
  const [isRegeneratingSubtotal, setIsRegeneratingSubtotal] = useState(false); // Dio Rod
  const [isRegeneratingRCN, setIsRegeneratingRCN] = useState(false); // Dio Rod
  const [isRegeneratingNIF, setIsRegeneratingNIF] = useState(false); // Dio Rod
  const [isRegeneratingNCF, setIsRegeneratingNCF] = useState(false); // Dio Rod
  const [isRegeneratingSupplier, setIsRegeneratingSupplier] = useState(false); // Dio Rod: new state for supplier regeneration
  const [isRegeneratingInvoiceNumber, setIsRegeneratingInvoiceNumber] = useState(false); // Dio Rod: new state for invoice number regeneration
  const [isRegeneratingPaymentType, setIsRegeneratingPaymentType] = useState(false); // Dio Rod: new state for payment type regeneration
  const [isRegeneratingTotal, setIsRegeneratingTotal] = useState(false); // Dio Rod: new state for total regeneration
  const [hasProcessedOcr, set_hasProcessedOcr] = useState(false); // New state to check if OCR has been processed
  const [ocrRawText, set_ocrRawText] = useState('');

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
        rcn: '', // Dio Rod
        nif: '', // Dio Rod: new field default
        ncf: '', // Dio Rod: new field default
        date: new Date().toISOString().split('T')[0],
        invoiceNumber: '',
        subtotal: 0,
        tax: 0,
        total: 0,
        paymentType: '' // Dio Rod: new field default
      });
      setInvoiceGenerated(false);
    }
  }, [isOpen]);

  // Add clipboard paste event listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!isOpen || showInvoiceForm) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            handlePastedImage(blob);
            break;
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, showInvoiceForm]);

  const handlePastedImage = (blob: File) => {
    // Set the uploaded file
    setUploadedFile(blob);
    setOcrResult('');
    setOcrProgress(0);
    setShowInvoiceForm(false);
    setInvoiceGenerated(false);

    // Create a preview for the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(blob);
  };

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

  // Add sanitizeText helper function
  function sanitizeText(input: string): string {
    // Replace curly quotes with straight ones, convert dashes, collapse whitespace, and trim
    return input.replace(/[‘’]/g, "'")
                .replace(/[“”]/g, '"')
                .replace(/[\u2013\u2014]/g, '-') // Replace en-dash and em-dash with hyphen
                .replace(/\s+/g, ' ')
                .trim();
  }

  // Function to call Anthropic API for processing OCR data
  const processOcrWithAnthropic = async (text: string): Promise<string> => {
    try {
      const fullPrompt = buildAiPrompt(text);
      // Ask for a JSON formatted result with required keys 
      const promptContent = `Extract the following invoice fields from the text and return a JSON object with keys:
supplier, rcn, nif, ncf, date, invoiceNumber, subtotal, tax, total, paymentType.
Text: ${text}`;
      const msg = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 20000,
        temperature: 1,
        messages: [{ role: "user", content: promptContent }],
      });
      console.log(msg);
      return msg.choices[0].message.content;
    } catch (error) {
      console.error("Error processing OCR with Anthropic:", error);
      return text; // Return original text if there's an error
    }
  };

  // Updated extraction mapping from AI results - Dio Rod
  // Update extractInvoiceDataFromApiResult for enhanced vendor (proveedor) extraction - Dio Rod
const extractInvoiceDataFromApiResult = (apiResult: string): ExtractedInvoice => {
	const invoice: ExtractedInvoice = {
		supplier: '',
		rcn: '', // Dio Rod
		nif: '', // Dio Rod: new field initialization
		ncf: '', // Dio Rod: new field initialization
		date: new Date().toISOString().split('T')[0],
		invoiceNumber: '',
		subtotal: 0,
		tax: 0,
		total: 0,
		paymentType: '' // Dio Rod: new field initialization
	};

	// Helper to clean up vendor names (proveedor) with new limits: max 6 words and 50 chars - Dio Rod
	const cleanVendorName = (raw: string): string => {
		// Remove unwanted chars except letters, numbers, space, &, and dot
		let cleaned = raw.replace(/[^a-zA-Z0-9\s&.]/g, '').trim();
		cleaned = cleaned.replace(/\s+/g, ' ');
		// Only accept names with at least 2 words to avoid false positives
		if (cleaned.split(' ').length < 2) {
			return raw.trim();
		}
		// Limit to maximum 6 words
		const words = cleaned.split(' ');
		if (words.length > 6) {
			cleaned = words.slice(0, 6).join(' ');
		}
		// Also limit to maximum 50 characters
		if (cleaned.length > 50) {
			cleaned = cleaned.substring(0, 50).trim();
		}
		return cleaned;
	};

	// Split text into trimmed, non-empty lines
	const lines = apiResult.split('\n').map(line => line.trim()).filter(line => line.length > 0);

	// Helper function to parse numbers, removing commas
	const parseNumber = (str: string): number => parseFloat(str.replace(/,/g, ''));

	lines.forEach(line => {
		// Enhanced supplier extraction: if line doesn't include known fields and has at least two words
		if (!invoice.supplier && !line.match(/(NIF|RCN|NCF|Fecha|Factura|Subtotal|Tax|Total|Forma de Pago)/i) && line.length > 3) {
			if (line.split(/\s+/).length >= 2) {
				invoice.supplier = cleanVendorName(line);
			}
		}

		let match;
		// Date: Match patterns like "Fecha: 12/05/2023" or "Date - 12-05-2023"
		match = line.match(/(?:Date|Fecha)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
		if (match && match[1]) {
			try {
				invoice.date = new Date(match[1].trim()).toISOString().split('T')[0];
			} catch {}
		}
		// Invoice number: "Invoice Number" or "Factura" followed by a value
		match = line.match(/(?:Invoice Number|Factura(?:\s*No)?)[\s:]*([\w\-]+)/i);
		if (match && match[1]) {
			invoice.invoiceNumber = match[1].trim();
		}
		// Subtotal: e.g., "Subtotal: 123.45"
		match = line.match(/Subtotal\s*[:\-]?\s*([\d,\.]+)/i);
		if (match && match[1]) {
			invoice.subtotal = parseNumber(match[1]);
		}
		// Tax: Look for Tax, IVA, ITBIS, or VAT
		match = line.match(/(?:Tax|IVA|ITBIS|VAT)\s*[:\-]?\s*([\d,\.]+)/i);
		if (match && match[1]) {
			invoice.tax = parseNumber(match[1]);
		}
		// Total: e.g., "Total: 123.45"
		match = line.match(/Total\s*[:\-]?\s*([\d,\.]+)/i);
		if (match && match[1]) {
			invoice.total = parseNumber(match[1]);
		}
		// Payment Type: "Forma de Pago" or "Payment Type"
		match = line.match(/(?:Forma de Pago|Payment Type)\s*[:\-]?\s*(.+)/i);
		if (match && match[1]) {
			invoice.paymentType = match[1].trim();
		}
		// RCN: try patterns like "RCN {value}" or "RNC:{value}"
		match = line.match(/(?:RCN|RNC)\s*[:\-]?\s*(\S+)/i);
		if (match && match[1]) {
			invoice.rcn = match[1].trim();
		}
		// NIF: "NIF {value}" or "NIF:{value}"
		match = line.match(/NIF\s*[:\-]?\s*(\S+)/i);
		if (match && match[1]) {
			invoice.nif = match[1].trim();
		}
		// NCF: "NCF {value}" or "NCF:{value}"
		match = line.match(/NCF\s*[:\-]?\s*(\S+)/i);
		if (match && match[1]) {
			invoice.ncf = match[1].trim();
		}
	});

	// Fallback: if supplier is still empty, use the very first line cleaned
	if (!invoice.supplier && lines.length > 0) {
		invoice.supplier = cleanVendorName(lines[0]);
	}

	return invoice;
};

  // Modify handleOcr to include Anthropic processing and extraction
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
      const sanitizedText = sanitizeText(extractedText);
      
      let processedText: string;
      let extractedData: ExtractedInvoice;

      if (enableAICleanup) {
        // Use AI cleanup requesting JSON output
        processedText = await processOcrWithAnthropic(sanitizedText);
        try {
          // Dio Rod: extract the content within ```json ... ```
          let jsonBlock = processedText.match(/```json\s*([\s\S]*?)```/);
          if (!jsonBlock) {
            // fallback: try matching any {...} block
            jsonBlock = processedText.match(/\{[\s\S]*\}/);
          }
          if (!jsonBlock) throw new Error("Unable to extract JSON block.");

          extractedData = JSON.parse(jsonBlock[1] || jsonBlock[0]);
          // Clean fields
          extractedData.supplier = extractedData.supplier?.trim() || '';
          if (typeof extractedData.subtotal === 'string') {
            extractedData.subtotal = parseFloat(extractedData.subtotal.replace(/,/g, '')) || 0;
          }
          if (typeof extractedData.tax === 'string') {
            extractedData.tax = parseFloat(extractedData.tax.replace(/,/g, '')) || 0;
          }
          if (typeof extractedData.total === 'string') {
            extractedData.total = parseFloat(extractedData.total.replace(/,/g, '')) || 0;
          }
          // Check if date is 8 digits (DDMMYYYY), parse to DD/MM/YYYY
          if (/^\d{8}$/.test(extractedData.date)) {
            const d = extractedData.date;
            extractedData.date = `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4,8)}`;
          }
        } catch (err) {
          console.error('Error parsing AI JSON result, falling back to default extraction:', err);
          extractedData = extractInvoiceDataFromApiResult(sanitizedText);
        }
      } else {
        processedText = sanitizedText; // Default matching
        extractedData = extractInvoiceDataFromApiResult(processedText);
      }
      
      setOcrResult(processedText);
      setExtractedInvoice(extractedData);
      setShowInvoiceForm(true);
      set_hasProcessedOcr(true); // Mark OCR as processed
      set_ocrRawText(extractedText); // Store raw OCR text
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
      rcn: '', // Dio Rod
      nif: '', // Dio Rod: new field initialization
      ncf: '', // Dio Rod: new field initialization
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      subtotal: 0,
      tax: 0,
      total: 0,
      paymentType: '' // Dio Rod: new field initialization
    };

    // New supplier extraction using regex: capture uppercase/digit and punctuation before "RNC:"
    const supplierMatch = text.match(/([A-ZÑÁÉÍÓÚ0-9\.\&\s]+?)\s+RNC:/i); // Dio Rod
    if (supplierMatch && supplierMatch[1]) {
      invoice.supplier = supplierMatch[1].trim();
    }
    // Fallback: if regex fails, use the first non-empty line
    if (!invoice.supplier) {
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      if (lines.length > 0) {
        invoice.supplier = lines[0].trim();
      }
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

    // Updated: Try to extract invoice number with additional patterns for synonyms
    const invoicePatterns = [
      /invoice[:\s]+(.*)/i,
      /invoice\s+no[:\s]+(.*)/i,
      /factura(?:\s+no)?[:\s]+(.*)/i, // Dio Rod: covers "factura" or "factura no"
      /numero\s+de\s+factura[:\s]+(.*)/i,
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

    // New: Try to extract RCN using additional keyword patterns
    const rcnPatterns = [
      /rcn[:\s]+([\w\d-]+)/i,
      /rnc[:\s]+([\w\d-]+)/i  // In case it's written as RNC
    ];
    for (const pattern of rcnPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        invoice.rcn = match[1].trim();
        break;
      }
    }

    // New: Extract NIF field
    const nifPatterns = [
      /nif[:\s]+([\w\d-]+)/i
    ];
    for (const pattern of nifPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        invoice.nif = match[1].trim();
        break;
      }
    }

    // New: Extract NCF field
    const ncfPatterns = [
      /ncf[:\s]+([\w\d-]+)/i
    ];
    for (const pattern of ncfPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        invoice.ncf = match[1].trim();
        break;
      }
    }

    // New: Improved Payment Type extraction using multiple keyword checks
    const paymentTypePattern = /forma de pago[:\s]+([\w\d\s]+)/i;
    const paymentMatch = text.match(paymentTypePattern);
    if (paymentMatch && paymentMatch[1]) {
      const rawPayment = paymentMatch[1].trim().toLowerCase();
      if (rawPayment.includes('visa')) {
        invoice.paymentType = 'Visa'; // Dio Rod
      } else if (rawPayment.includes('mastercard') || rawPayment.includes('credito')) {
        invoice.paymentType = 'Mastercard/Credito'; // Dio Rod
      } else if (rawPayment.includes('efectivo')) {
        invoice.paymentType = 'Efectivo'; // Dio Rod
      } else {
        invoice.paymentType = paymentMatch[1].trim();
      }
    }

    // Try to extract amounts
    // Integrate additional keywords for the total amount extraction from Dominican invoices.
    const totalPattern = /(?:total a pagar|total factura|monto total|total general|importe total|valor total|total)[:\s]+([\d,\.]+)/i;
    // Updated: Use a more flexible pattern for subtotal extraction (sub-total allowed)
    const subtotalPattern = /sub[-\s]?total[:\s]+([\d,\.]+)/i;
    // New: Total Neto pattern matching
    const totalNetoPattern = /total neto[:\s]+([\d,\.]+)/i;  // Dio Rod

    // Extract total
    const totalMatch = text.match(totalPattern);
    if (totalMatch && totalMatch[1]) {
      invoice.total = parseFloat(totalMatch[1].replace(/,/g, ''));
    }

    // Extract subtotal using subtotal pattern
    let subtotalMatch = text.match(subtotalPattern);
    if (subtotalMatch && subtotalMatch[1]) {
      invoice.subtotal = parseFloat(subtotalMatch[1].replace(/,/g, ''));
    } else {
      // If subtotal not found try matching total neto
      const totalNetoMatch = text.match(totalNetoPattern);
      if (totalNetoMatch && totalNetoMatch[1]) {
        invoice.subtotal = parseFloat(totalNetoMatch[1].replace(/,/g, ''));
      }
    }

    // Extract tax
    const taxPatterns = [
      /tax[:\s]+([\d,\.]+)/i,
      /iva[:\s]+([\d,\.]+)/i,
      /vat[:\s]+([\d,\.]+)/i,
      /itbis[:\s]+([\d,\.]+)/i
    ];

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
      
      // Insert invoice data into the database (Updated to include "ncf") // Dio Rod
      const { data, error, status } = await supabase
        .from('ocr_invoices')  // Changed from "invoices" to "ocr_invoices"
        .insert([
          {
            supplier: extractedInvoice.supplier,
            rcn: extractedInvoice.rcn, // Dio Rod: new field insertion
            nif: extractedInvoice.nif, // Dio Rod: new field insertion
            ncf: extractedInvoice.ncf, // Dio Rod: new field insertion
            date: extractedInvoice.date,
            invoice_number: extractedInvoice.invoiceNumber,
            subtotal: extractedInvoice.subtotal,
            tax: extractedInvoice.tax,
            total: extractedInvoice.total,
            payment_type: extractedInvoice.paymentType, // Dio Rod: new field insertion
            receipt_image_url: imagePreview, // Store the image reference
          },
        ])
        .select();
      
      if (error) {
        console.error('Error inserting invoice:', error);
        if (status === 404) {
          alert('Error: La tabla "ocr_invoices" no se encuentra. Por favor, asegúrese de que la tabla exista en su base de datos Supabase.');
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

  // Add function to regenerate vendor name using AI - Dio Rod
const regenerateSupplier = async () => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  setIsRegeneratingSupplier(true);
  try {
    const promptContent = `
Extract the supplier/vendor name from this receipt text. 
Return ONLY a JSON object with format: {"supplier": "Extracted Name"}

Example responses:
{"supplier": "Supermercado Nacional"}

Receipt text:
${ocrResult}`;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    console.log(JSON.stringify(response));
    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      console.error('Invalid response format from API:', response);
      return;
    }
    const responseContent = response.content;
    if (!responseContent[0]) {
      alert("Invalid response format from AI.");
      return;
    }
    let supplierJson = "";
    // Use the response text directly without JSON.stringify to avoid double-encoding
    if (typeof responseContent[0].text === "string") {
      supplierJson = responseContent[0].text;
    } else if (typeof responseContent[0] === "string") {
      supplierJson = responseContent[0];
    } else {
      console.error("Unexpected content format:", responseContent);
      return;
    }
    console.log("DEBUG: supplierJson =", supplierJson);
    try {
      const jsonData = JSON.parse(supplierJson);
      if (jsonData.supplier) {
        setExtractedInvoice(prev => ({ ...prev, supplier: jsonData.supplier }));
      } else {
        console.error('No supplier found in JSON:', jsonData);
      }
    } catch (jsonError) {
      console.error("Error parsing supplier JSON:", jsonError);
    }
  } catch (error) {
    console.error('Error regenerating vendor name:', error);
  } finally {
    setIsRegeneratingSupplier(false);
  }
};

  // Add function to regenerate invoice number using AI - Dio Rod
const regenerateInvoiceNumber = async () => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  setIsRegeneratingInvoiceNumber(true);
  try {
    const promptContent = `
Extract the invoice number from this receipt text. 
Return ONLY a JSON object with format: {"invoiceNumber": "Extracted Invoice Number"}

Example responses:
{"invoiceNumber": "12345"}
{"invoiceNumber": "INV-2024-001"}

Receipt text:
${ocrResult}`;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    console.log(JSON.stringify(response));
    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      console.error('Invalid response format from API:', response);
      return;
    }
    const responseContent = response.content;
    if (!responseContent[0]) {
      alert("Invalid response format from AI.");
      return;
    }
    let invoiceNumberJson = "";
    // Use the response text directly without JSON.stringify to avoid double-encoding
    if (typeof responseContent[0].text === "string") {
      invoiceNumberJson = responseContent[0].text;
    } else if (typeof responseContent[0] === "string") {
      invoiceNumberJson = responseContent[0];
    } else {
      console.error("Unexpected content format:", responseContent);
      return;
    }
    console.log("DEBUG: invoiceNumberJson =", invoiceNumberJson);
    try {
      const jsonData = JSON.parse(invoiceNumberJson);
      if (jsonData.invoiceNumber) {
        setExtractedInvoice(prev => ({ ...prev, invoiceNumber: jsonData.invoiceNumber }));
      } else {
        console.error('No invoiceNumber found in JSON:', jsonData);
      }
    } catch (jsonError) {
      console.error("Error parsing invoiceNumber JSON:", jsonError);
    }
  } catch (error) {
    console.error('Error regenerating invoiceNumber:', error);
  } finally {
    setIsRegeneratingInvoiceNumber(false);
  }
};

  // Add function to regenerate payment type using AI - Dio Rod
const regeneratePaymentType = async () => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  setIsRegeneratingPaymentType(true);
  try {
    const promptContent = `
Extract the payment type from this receipt text. 
Return ONLY a JSON object with format: {"paymentType": "Extracted Payment Type"}

Example responses:
{"paymentType": "Efectivo"}
{"paymentType": "Tarjeta de Crédito"}

Receipt text:
${ocrResult}`;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    console.log(JSON.stringify(response));
    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      console.error('Invalid response format from API:', response);
      return;
    }
    const responseContent = response.content;
    if (!responseContent[0]) {
      alert("Invalid response format from AI.");
      return;
    }
    let paymentTypeJson = "";
    // Use the response text directly without JSON.stringify to avoid double-encoding
    if (typeof responseContent[0].text === "string") {
      paymentTypeJson = responseContent[0].text;
    } else if (typeof responseContent[0] === "string") {
      paymentTypeJson = responseContent[0];
    } else {
      console.error("Unexpected content format:", responseContent);
      return;
    }
    console.log("DEBUG: paymentTypeJson =", paymentTypeJson);
    try {
      const jsonData = JSON.parse(paymentTypeJson);
      if (jsonData.paymentType) {
        setExtractedInvoice(prev => ({ ...prev, paymentType: jsonData.paymentType }));
      } else {
        console.error('No paymentType found in JSON:', jsonData);
      }
    } catch (jsonError) {
      console.error("Error parsing paymentType JSON:", jsonError);
    }
  } catch (error) {
    console.error('Error regenerating paymentType:', error);
  } finally {
    setIsRegeneratingPaymentType(false);
  }
};

  // Add function to regenerate total using AI - Dio Rod
const regenerateTotal = async () => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  setIsRegeneratingTotal(true);
  try {
    const promptContent = `
Extract the total amount from this receipt text. 
Return ONLY a JSON object with format: {"total": "Extracted Total"}

Example responses:
{"total": "123.45"}
{"total": "456.78"}

Receipt text:
${ocrResult}`;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    console.log(JSON.stringify(response));
    if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
      console.error('Invalid response format from API:', response);
      return;
    }
    const responseContent = response.content;
    if (!responseContent[0]) {
      alert("Invalid response format from AI.");
      return;
    }
    let totalJson = "";
    // Use the response text directly without JSON.stringify to avoid double-encoding
    if (typeof responseContent[0].text === "string") {
      totalJson = responseContent[0].text;
    } else if (typeof responseContent[0] === "string") {
      totalJson = responseContent[0];
    } else {
      console.error("Unexpected content format:", responseContent);
      return;
    }
    console.log("DEBUG: totalJson =", totalJson);
    try {
      const jsonData = JSON.parse(totalJson);
      if (jsonData.total) {
        // Parse the total, removing commas
        const parsedTotal = parseFloat(jsonData.total.replace(/,/g, ''));
        setExtractedInvoice(prev => ({ ...prev, total: parsedTotal }));
      } else {
        console.error('No total found in JSON:', jsonData);
      }
    } catch (jsonError) {
      console.error("Error parsing total JSON:", jsonError);
    }
  } catch (error) {
    console.error('Error regenerating total:', error);
  } finally {
    setIsRegeneratingTotal(false);
  }
};

// Dio Rod: Add function to regenerate subtotal, RCN, and NCF from the OCR text
const regenerateSubtotalRCNNCF = async () => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  setIsRegeneratingSubtotal(true);
  try {
    const promptContent = `
Extract the subtotal, RCN, NIF and NCF from this receipt text.
Return ONLY a JSON object with format: {"subtotal": "value", "rcn": "value", "nif": "value", "ncf": "value"}

Receipt text:
${ocrResult}
    `;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    console.log(JSON.stringify(response));
    let regenJson = "";
    if (typeof response.content[0].text === "string") {
      regenJson = response.content[0].text;
    } else if (typeof response.content[0] === "string") {
      regenJson = response.content[0];
    } else {
      console.error("Unexpected content format:", response.content);
      return;
    }
    console.log("DEBUG: regenSubtotalRCNNCF =", regenJson);
    try {
      const jsonData = JSON.parse(regenJson);
      if (jsonData.subtotal) {
        const newSubtotal = parseFloat(jsonData.subtotal.replace(/,/g, ''));
        setExtractedInvoice(prev => ({ ...prev, subtotal: newSubtotal }));
      }
      if (jsonData.rcn) {
        setExtractedInvoice(prev => ({ ...prev, rcn: jsonData.rcn.trim() }));
      }
      if (jsonData.nif) {
        setExtractedInvoice(prev => ({ ...prev, nif: jsonData.nif.trim() }));
      }
      if (jsonData.ncf) {
        setExtractedInvoice(prev => ({ ...prev, ncf: jsonData.ncf.trim() }));
      }
    } catch (jsonError) {
      console.error("Error parsing regeneration JSON:", jsonError);
    }
  } catch (error) {
    console.error("Error regenerating subtotal, RCN, NIF and NCF:", error);
  } finally {
    setIsRegeneratingSubtotal(false);
  }
};

// Dio Rod: Add function to regenerate Fecha (in DD/MM/YYYY format)
const regenerateFecha = async () => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  setIsRegeneratingFecha(true);
  try {
    const promptContent = `
Extract the date from the receipt text.
Return ONLY a JSON object with format: {"fecha": "DD/MM/YYYY"}

Receipt text:
${ocrResult}
    `;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    let fechaJson = "";
    if (typeof response.content[0].text === "string") {
      fechaJson = response.content[0].text;
    } else if (typeof response.content[0] === "string") {
      fechaJson = response.content[0];
    } else {
      console.error("Unexpected content format:", response.content);
      return;
    }
    const jsonData = JSON.parse(fechaJson);
    if (jsonData.fecha) {
      setExtractedInvoice(prev => ({ ...prev, date: jsonData.fecha }));
    }
  } catch (error) {
    console.error("Error regenerating fecha:", error);
  } finally {
    setIsRegeneratingFecha(false);
  }
};

// New helper function to regenerate single field
const regenerateField = async (field: 'rcn' | 'nif' | 'ncf' | 'subtotal') => {
  if (!ocrResult) {
    alert("No OCR data available for regeneration.");
    return;
  }
  // Set corresponding regeneration state true
  if (field === 'rcn') setIsRegeneratingRCN(true);
  if (field === 'nif') setIsRegeneratingNIF(true);
  if (field === 'ncf') setIsRegeneratingNCF(true);
  if (field === 'subtotal') setIsRegeneratingSubtotal(true);
  
  try {
    const promptContent = `Extract the ${field.toUpperCase()} value from the receipt text.
Return ONLY a JSON object with format: {"${field}": "value"}
    
Receipt text:
${ocrResult}`;
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [{ role: "user", content: promptContent }],
    });
    let fieldJson = "";
    if (typeof response.content[0].text === "string") {
      fieldJson = response.content[0].text;
    } else if (typeof response.content[0] === "string") {
      fieldJson = response.content[0];
    } else {
      console.error("Unexpected content format:", response.content);
      return;
    }
    const jsonData = JSON.parse(fieldJson);
    if (jsonData[field]) {
      setExtractedInvoice(prev => ({
        ...prev,
        [field]: field === 'subtotal'
          ? parseFloat(jsonData[field].replace(/,/g, ''))
          : jsonData[field].trim()
      }));
    }
  } catch (error) {
    console.error(`Error regenerating ${field}:`, error);
  } finally {
    if (field === 'rcn') setIsRegeneratingRCN(false);
    if (field === 'nif') setIsRegeneratingNIF(false);
    if (field === 'ncf') setIsRegeneratingNCF(false);
    if (field === 'subtotal') setIsRegeneratingSubtotal(false);
  }
};

/**
 * Build a prompt asking the AI to return an object with the following fields:
 * - supplier
 * - rcn
 * - nif
 * - ncf
 * - date
 * - invoiceNumber
 * - subtotal
 * - tax
 * - total
 * - paymentType
 */
// Update buildAiPrompt to include instructions for ambiguous ITBIS fields
function buildAiPrompt(ocrText: string): string {
  return `
Please analyze the following text and extract a JSON object in this exact format:
{
  "supplier": "",
  "rcn": "",
  "nif": "",
  "ncf": "",
  "date": "",
  "invoiceNumber": "",
  "subtotal": "",
  "tax": "",
  "total": "",
  "paymentType": ""
}

Note: Some receipts may display a section third column such as "description, itbis (tax) and total" where the total amount already includes ITBIS. In that case, please separate the subtotal and ITBIS (tax) so that:
- "subtotal" is the amount without tax,
- "tax" is the ITBIS portion,
- "total" remains as the gross amount.

Return only the JSON object with these fields.

Text to analyze:
${ocrText}
`.trim();
}

function generateFullOcrPrompt(ocrRawData: string): string {
  return `
Please analyze the following OCR raw data and extract a JSON object in this exact format:
{
  "supplier": "",
  "rcn": "",
  "nif": "",
  "ncf": "",
  "date": "",
  "invoiceNumber": "",
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "paymentType": ""
}

Note:
- Handle cases where the total includes tax (ITBIS) by splitting out subtotal and tax.
- Return only the JSON object as the response.

OCR Raw Data:
${ocrRawData}
`.trim();
}

async function handleRegenerateAllFields(ocrRawData: string) {
  try {
    const prompt = generateFullOcrPrompt(ocrRawData);
    // Placeholder for actual Anthropic call
    const response = await someAnthropicApiCall(prompt);
    // ...handle the response...
    console.log("Anthropic full OCR fields response", response);
  } catch (err) {
    console.error("Error regenerating all fields:", err);
  }
}

async function handleRegenerateAll() {
  if (!onOcrComplete || !ocrRawText) {
    console.warn("No onOcrComplete function or no OCR data available.");
    return;
  }
  try {
    const prompt = generateFullOcrPrompt(ocrRawText);
    console.log("Sending prompt to Anthropic:", prompt);
    const anthropicResponse = await someAnthropicApiCall(prompt);
    console.log("Anthropic response:", anthropicResponse);

    const parsedData = JSON.parse(anthropicResponse);
    onOcrComplete(parsedData);
  } catch (error) {
    console.error("Error regenerating all fields:", error);
  }
}

// Wrap original OCR completion
const handleOcrCompleteInternal = (data: any) => {
  set_hasProcessedOcr(true);
  set_ocrRawText(data?.rawText || '');
  onOcrComplete?.(data);
};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div 
        ref={containerRef} 
        className="bg-gray-800 p-6 rounded-lg w-full max-w-6xl mx-4 max-h-[90vh] overflow-auto relative"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileScan size={24} className="text-[#D80000]" /> {/* Dio Rod */}
            {showInvoiceForm ? "Creación de Factura Digital" : "Procesamiento OCR de Recibos"}
          </h2>
          <div className="flex gap-2">
            {hasProcessedOcr && (
              <button
                onClick={handleRegenerateAll}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md"
              >
                Regenerate All Fields
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {!showInvoiceForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-white font-medium mb-4">Subir Imagen</h3>
                <div className="flex flex-col gap-4">
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

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-gray-600"></div>
                    <span className="flex-shrink mx-4 text-gray-400">o</span>
                    <div className="flex-grow border-t border-gray-600"></div>
                  </div>
                  
                  <button 
                    className="flex items-center justify-center gap-2 px-4 py-4 border-2 border-dashed border-gray-500 rounded-md hover:border-blue-400 transition-colors cursor-pointer"
                    onClick={() => containerRef.current?.focus()}
                  >
                    <Image size={24} className="text-blue-400" />
                    <span className="text-gray-300">Pegar imagen del portapapeles (Ctrl+V)</span>
                  </button>
                </div>

                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Receipt preview"
                      className="w-full max-h-52 object-contain rounded-md"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {uploadedFile?.name || "Imagen pegada"} 
                      {uploadedFile?.size && (
                        <span>
                          ({(uploadedFile.size) / 1024 < 1000 
                            ? `${Math.round((uploadedFile.size) / 1024)} KB` 
                            : `${Math.round((uploadedFile.size) / 1024 / 1024 * 10) / 10} MB`})
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEnableAICleanup(prev => !prev)}
                  className={`px-3 py-2 rounded-md ${
                    enableAICleanup
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-600 text-gray-300'
                  }`}
                >
                  {enableAICleanup ? 'AI Cleanup On' : 'AI Cleanup Off'} {/* Dio Rod */}
                </button>
                <button
                  onClick={handleOcr}
                  disabled={isProcessing || !uploadedFile}
                  className={`w-full py-2 px-4 rounded-md flex justify-center items-center gap-2 ${
                    !isProcessing && uploadedFile
                      ? 'bg-red-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Procesar con OCR
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
                      className="bg-red-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md"
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
                  <div className="flex">
                    <input
                      type="text"
                      value={extractedInvoice.supplier}
                      onChange={(e) => setExtractedInvoice({ ...extractedInvoice, supplier: e.target.value })}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={regenerateSupplier}
                      className="ml-2 px-3 py-2 bg-red-600  text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingSupplier}
                    >
                      {isRegeneratingSupplier ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <Calendar size={18} className="text-blue-400" />
                      Fecha
                    </div>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={extractedInvoice.date}
                      onChange={(e) =>
                        setExtractedInvoice({ ...extractedInvoice, date: e.target.value })
                      }
                      placeholder="DD/MM/YYYY"
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />                   
                    <button
                      onClick={regenerateFecha}
                      className="ml-2 px-3 py-2 bg-red-600  text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingFecha}
                    >
                      {isRegeneratingFecha ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
                
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-400" />
                      Número de Factura
                    </div>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={extractedInvoice.invoiceNumber}
                      onChange={(e) => setExtractedInvoice({...extractedInvoice, invoiceNumber: e.target.value})}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={regenerateInvoiceNumber}
                      className="ml-2 px-3 py-2 bg-red-600  text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingInvoiceNumber}
                    >
                      {isRegeneratingInvoiceNumber ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-400" />
                      RCN
                    </div>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={extractedInvoice.rcn}
                      onChange={(e) => setExtractedInvoice({...extractedInvoice, rcn: e.target.value})}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={() => regenerateField('rcn')}
                      className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingRCN}
                    >
                      {isRegeneratingRCN ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {/* New: NIF input field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-400" />
                      NIF
                    </div>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={extractedInvoice.nif}
                      onChange={(e) => setExtractedInvoice({...extractedInvoice, nif: e.target.value})}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={() => regenerateField('nif')}
                      className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingNIF}
                    >
                      {isRegeneratingNIF ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {/* New: NCF input field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-400" />
                      NCF
                    </div>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={extractedInvoice.ncf}
                      onChange={(e) => setExtractedInvoice({...extractedInvoice, ncf: e.target.value})}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={() => regenerateField('ncf')}
                      className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingNCF}
                    >
                      {isRegeneratingNCF ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
                </div>
                {/* New: Payment Type input field */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    <div className="flex items-center gap-2">
                      <FileText size={18} className="text-blue-400" />
                      Forma de Pago
                    </div>
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={extractedInvoice.paymentType}
                      onChange={(e) => setExtractedInvoice({...extractedInvoice, paymentType: e.target.value})}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={regeneratePaymentType}
                      className="ml-2 px-3 py-2 bg-red-600 rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingPaymentType}
                    >
                      {isRegeneratingPaymentType ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
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
                  <div className="flex">
                    <input
                      type="number"
                      step="0.01"
                      value={extractedInvoice.subtotal}
                      onChange={(e) => setExtractedInvoice({...extractedInvoice, subtotal: parseFloat(e.target.value) || 0})}
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                    />
                    <button
                      onClick={() => regenerateField('subtotal')}
                      className="ml-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingSubtotal}
                    >
                      {isRegeneratingSubtotal ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
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
                  <div className="flex">
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
                      className="flex-grow px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white font-semibold"
                    />
                    <button
                      onClick={regenerateTotal}
                      className="ml-2 px-3 py-2 bg-red-600 rounded-md hover:bg-blue-700"
                      disabled={isRegeneratingTotal}
                    >
                      {isRegeneratingTotal ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </button>
                  </div>
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
                    <div className="flex justify-between">
                      <span className="font-semibold">RCN:</span>
                      <span>{extractedInvoice.rcn || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">NIF:</span>
                      <span>{extractedInvoice.nif || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">NCF:</span>
                      <span>{extractedInvoice.ncf || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Forma de Pago:</span>
                      <span>{extractedInvoice.paymentType || "N/A"}</span>
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
                        <span>RD$ {typeof extractedInvoice.total === 'number' ? extractedInvoice.total.toFixed(2) : '0.00'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Updated image container for zooming (Dio Rod) */}
              {imagePreview && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-white font-medium mb-2">Imagen Original</h3>
                  <div 
                    className={`w-full ${zoom ? 'max-h-[80vh]' : 'h-48'} bg-gray-700 rounded-md overflow-hidden cursor-pointer relative z-10`}
                    onClick={() => setZoom(prev => !prev)}
                  >
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
              <li>Puede pegar directamente imágenes desde el portapapeles usando Ctrl+V</li>
            </ul>
          </div>
        )}

        {/* Debug toggle button for AI result inspection - Dio Rod */}
        <button 
          onClick={() => setShowDebugData(prev => !prev)}
          className="absolute bottom-4 right-4 px-2 py-1 bg-yellow-600 text-white rounded-md text-xs hover:bg-yellow-700"
        >
          {showDebugData ? 'Ocultar Debug' : 'Mostrar Debug'}
        </button>
        {showDebugData && (
          <div className="absolute bottom-16 right-4 bg-gray-800 text-green-300 p-4 rounded-md max-h-64 overflow-y-auto text-xs z-50">
            <pre>{JSON.stringify({ ocrResult, extractedInvoice }, null, 2)}</pre>
          </div>
        )}
        <button 
          onClick={handleRegenerateAll}
          className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-md"
        >
          Regenerate All Fields
        </button>
      </div>
    </div>
  );
}

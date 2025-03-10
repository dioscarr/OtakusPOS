// Dio Rod
import { supabase } from '../lib/supabase';

export interface OcrResult {
  id?: string;
  image_url: string;
  processed_text: string;
  supplier: string;
  date: string;
  invoice_number: string;
  subtotal: number;
  tax: number;
  total: number;
  rcn?: string;
  nif?: string;
  ncf?: string;
  payment_type?: string;
  processed_at: string;
  source: 'whatsapp' | 'upload' | 'clipboard';
  is_imported: boolean;
  created_at?: string;
}

export class OcrResultManager {
  private _tableName: string = 'ocr_results';
  
  async saveOcrResult(ocrResult: Omit<OcrResult, 'id' | 'created_at'>): Promise<OcrResult> {
    try {
      const { data, error } = await supabase
        .from(this._tableName)
        .insert([{
          ...ocrResult,
          processed_at: new Date().toISOString(),
          is_imported: false
        }])
        .select();
        
      if (error) {
        throw error;
      }
      
      return data[0] as OcrResult;
    } catch (error) {
      console.error('Error saving OCR result:', error);
      throw error;
    }
  }
  
  async getPendingOcrResults(): Promise<OcrResult[]> {
    try {
      const { data, error } = await supabase
        .from(this._tableName)
        .select('*')
        .eq('is_imported', false)
        .order('processed_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data as OcrResult[];
    } catch (error) {
      console.error('Error fetching pending OCR results:', error);
      throw error;
    }
  }
  
  async markAsImported(ids: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this._tableName)
        .update({ is_imported: true })
        .in('id', ids);
        
      if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error marking OCR results as imported:', error);
      throw error;
    }
  }
}

export default new OcrResultManager();

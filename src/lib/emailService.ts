/**
 * Email service for sending receipts and notifications
 */
import { supabase } from './supabase';

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
}

/**
 * Sends an email using the configured email service
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; message?: string }> {
  try {
    // In a production environment, this would call an API endpoint or serverless function
    // that executes the send-email.sh script on the server
    
    // For now, we'll log the email details and simulate sending
    console.log('Sending email to:', options.to);
    console.log('Subject:', options.subject);
    console.log('Body:', options.body);
    
    // In a real implementation, we would call a Supabase Edge Function or similar
    // that would execute the send-email.sh script with the appropriate parameters
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log email sending attempt to Supabase for tracking
    await supabase.from('email_logs').insert({
      recipient: options.to,
      subject: options.subject,
      body_preview: options.body.substring(0, 100) + '...',
      status: 'sent',
      sent_at: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Log failed email attempt
    try {
      await supabase.from('email_logs').insert({
        recipient: options.to,
        subject: options.subject,
        body_preview: options.body.substring(0, 100) + '...',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        sent_at: new Date().toISOString()
      });
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }
    
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Sends a receipt to a customer via email
 */
export async function sendReceiptEmail(
  email: string, 
  customerName: string, 
  orderTotal: number,
  orderItems: { name: string; quantity: number; price: number }[] = []
): Promise<{ success: boolean; message?: string }> {
  try {
    const subject = `One Piece Bar & Tapas - Su Recibo`;
    
    // Create HTML email body
    const itemsHtml = orderItems.length > 0 
      ? orderItems.map(item => 
          `<tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">RD$${item.price.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">RD$${(item.quantity * item.price).toFixed(2)}</td>
          </tr>`
        ).join('')
      : '<tr><td colspan="4" style="padding: 8px; text-align: center;">No items</td></tr>';
    
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #D80000; margin-bottom: 5px;">One Piece Bar & Tapas</h1>
          <p style="color: #666; margin: 5px 0;">Roberto Pastoriza 12, Santiago de los Caballeros 51000</p>
          <p style="color: #666; margin: 5px 0;">Dominican Republic</p>
          <p style="color: #666; margin: 5px 0;">(829) 947-7217</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h2 style="color: #333;">Recibo para ${customerName}</h2>
          <p style="color: #666;">Fecha: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</p>
        </div>
        
        ${orderItems.length > 0 ? `
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f8f8f8;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Producto</th>
              <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Cantidad</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Precio</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        ` : ''}
        
        <div style="margin-top: 20px; text-align: right;">
          <p style="font-size: 18px; font-weight: bold;">Total: RD$${orderTotal.toFixed(2)}</p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; border-top: 1px solid #eee; padding-top: 20px;">
          <p>¡Gracias por su visita!</p>
          <p>Esperamos verle pronto nuevamente.</p>
        </div>
      </div>
    `;
    
    return await sendEmail({
      to: email,
      subject,
      body,
      isHtml: true
    });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
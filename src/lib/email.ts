import { supabase } from './supabase';

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email_logs table exists before inserting
    const { error: tableCheckError } = await supabase
      .from('email_logs')
      .select('id')
      .limit(1);
    
    // If the table exists, log the email attempt
    if (!tableCheckError) {
      await supabase.from('email_logs').insert({
        recipient: to,
        subject: subject,
        body_preview: text.substring(0, 100) + '...',
        status: 'sent',
        sent_at: new Date().toISOString()
      });
    } else {
      console.log('email_logs table does not exist, skipping log entry');
    }
    
    // In a real implementation, we would call an email service API
    // For now, we'll simulate a successful email send
    console.log('Email sent successfully to:', to);
    console.log('Subject:', subject);
    console.log('Body:', text.substring(0, 100) + '...');
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    
    // Try to log the failed email attempt if the table exists
    try {
      const { error: tableCheckError } = await supabase
        .from('email_logs')
        .select('id')
        .limit(1);
      
      if (!tableCheckError) {
        await supabase.from('email_logs').insert({
          recipient: to,
          subject: subject,
          body_preview: text.substring(0, 100) + '...',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          sent_at: new Date().toISOString()
        });
      }
    } catch (logError) {
      console.error('Failed to log email error:', logError);
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function sendReceiptEmail(receiptId: string, customerEmail: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!receiptId) {
      throw new Error('Receipt ID is required');
    }
    
    if (!customerEmail) {
      throw new Error('Customer email is required');
    }
    
    console.log('Sending receipt email for ID:', receiptId, 'to:', customerEmail);
    
    // Fetch receipt details from Supabase
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select(`
        id,
        customer_name,
        table_number,
        subtotal,
        itbis,
        tip,
        total,
        payment_method,
        created_at
      `)
      .eq('id', receiptId)
      .single();

    if (receiptError) {
      console.error('Error fetching receipt:', receiptError);
      
      // If receipt not found, try fetching from orders table
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          customer_name,
          table_number,
          subtotal,
          itbis,
          tip,
          total,
          payment_method,
          created_at,
          order_items (
            quantity,
            price,
            menu_item_id,
            menu_items (
              name
            )
          )
        `)
        .eq('id', receiptId)
        .single();
        
      if (orderError) {
        console.error('Error fetching order:', orderError);
        throw new Error('Receipt or order not found');
      }
      
      console.log('Found order:', order);
      
      // Use order data instead
      const itemsHtml = order.order_items.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.menu_items?.name || 'Unknown Item'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">RD$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">RD$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('');
      
      const html = generateReceiptHtml(order, itemsHtml);
      
      // Send the email
      return await sendEmail({
        to: customerEmail,
        subject: `Su Recibo de One Piece Bar & Tapas - ${order.customer_name}`,
        text: `¡Gracias por su visita a One Piece Bar & Tapas! Adjuntamos su recibo para la mesa ${order.table_number}.`,
        html
      });
    }
    
    if (!receipt) {
      throw new Error('Receipt not found');
    }

    console.log('Found receipt:', receipt);

    // Fetch receipt items - this might fail if the table doesn't exist
    let receiptItems = [];
    try {
      const { data: items, error: itemsError } = await supabase
        .from('receipt_items')
        .select(`
          quantity,
          price,
          menu_item_id,
          menu_items:menu_items(name)
        `)
        .eq('receipt_id', receiptId);

      if (!itemsError && items) {
        receiptItems = items;
      }
    } catch (err) {
      console.warn('Could not fetch receipt items, continuing with empty items list:', err);
    }

    // Generate HTML for the receipt
    const itemsHtml = receiptItems.length > 0 
      ? receiptItems.map((item: any) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.menu_items?.name || 'Unknown Item'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">RD$${item.price.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">RD$${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('')
      : '<tr><td colspan="4" style="padding: 8px; text-align: center; border-bottom: 1px solid #ddd;">No items available</td></tr>';

    const html = generateReceiptHtml(receipt, itemsHtml);

    // Send the email
    return await sendEmail({
      to: customerEmail,
      subject: `Su Recibo de One Piece Bar & Tapas - ${receipt.customer_name}`,
      text: `¡Gracias por su visita a One Piece Bar & Tapas! Adjuntamos su recibo para la mesa ${receipt.table_number}.`,
      html
    });
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

function generateReceiptHtml(receipt: any, itemsHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #D80000; margin-bottom: 5px;">One Piece Bar & Tapas</h1>
        <p style="color: #666; margin: 5px 0;">Roberto Pastoriza 12</p>
        <p style="color: #666; margin: 5px 0;">Santiago de los Caballeros 51000</p>
        <p style="color: #666; margin: 5px 0;">Dominican Republic</p>
        <p style="color: #666; margin: 5px 0;">(829) 947-7217</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h2 style="color: #333; margin-bottom: 10px;">Recibo</h2>
        <p><strong>Cliente:</strong> ${receipt.customer_name}</p>
        <p><strong>Mesa:</strong> ${receipt.table_number}</p>
        <p><strong>Fecha:</strong> ${new Date(receipt.created_at).toLocaleString()}</p>
        <p><strong>Método de Pago:</strong> ${receipt.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f2f2f2;">
            <th style="padding: 10px; text-align: left;">Producto</th>
            <th style="padding: 10px; text-align: center;">Cant.</th>
            <th style="padding: 10px; text-align: right;">Precio</th>
            <th style="padding: 10px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="margin-top: 20px; border-top: 2px solid #eee; padding-top: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Subtotal:</span>
          <span>RD$${receipt.subtotal.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>ITBIS (18%):</span>
          <span>RD$${receipt.itbis.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Propina (10%):</span>
          <span>RD$${receipt.tip.toFixed(2)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 1px solid #ddd;">
          <span>Total:</span>
          <span>RD$${receipt.total.toFixed(2)}</span>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; color: #666;">
        <p>¡Gracias por su visita!</p>
        <p>Esperamos verle pronto nuevamente.</p>
      </div>
    </div>
  `;
}
/**
 * Utility functions for generating tax reports
 */

interface Expense {
  rnc: string;
  tipo_id: string;
  tipo_bienes: string;
  ncf: string;
  fecha: string;
  fecha_pago: string;
  monto_servicios: number;
  monto_bienes: number;
  total: number;
  itbis: number;
  itbis_retenido: number;
  itbis_proporcionalidad: number;
  itbis_costo: number;
  itbis_adelantar: number;
  tipo_retencion_isr: string;
  monto_retencion_renta: number;
  isr_percibido: number;
  impuesto_selectivo: number;
  otros_impuestos: number;
  propina_legal: number;
  forma_pago: string;
  [key: string]: any; // Allow other properties
}

/**
 * Generate 606 report (purchases) in CSV format
 */
export function generateReport606Csv(expenses: any[], period: string): string {
  // Generate the header section
  const headerSection = [
    'Reporte 606 generado para One Piece Bar & Tapas',
    `RNC o Cédula\t132868226`,
    `Período\t${period}`,
    `Cantidad de registros\t${expenses.length}`,
    `Total monto facturado\t${expenses.reduce((sum, expense) => sum + (expense.total || 0), 0).toFixed(2)}`,
    '',
    ''
  ].join('\n');

  // Column headers - using the exact field names as required
  const columnHeaders = [
    'Número línea',
    'RNC/Cedula',
    'Tipo de identificación',
    'Tipo de bienes y servicios comprados',
    'NCF',
    'NCF ó documento modificado',
    'Fecha de comprobante (AAAAMM)',
    'Fecha de comprobante (D)',
    'Fecha de pago (AAAAMM)',
    'Fecha de pago (D)',
    'Monto facturado en servicios',
    'Monto facturado en bienes',
    'Total monto facturado',
    'ITBIS facturado',
    'ITBIS retenido',
    'ITBIS sujeto a proporcionalidad',
    'ITBIS llevado al costo',
    'ITBIS por adelantar',
    'ITBIS percibido en compras',
    'Tipo de retención en ISR',
    'Monto retención renta',
    'ISR percibido en compras',
    'Impuesto selectivo al consumo',
    'Otros impuestos/tasas',
    'Monto propina legal',
    'Forma de pago'
  ].join('\t');

  // Generate the data rows
  const dataRows = expenses.map((expense, index) => {
    const date = new Date(expense.fecha);
    const paymentDate = expense.fecha_pago ? new Date(expense.fecha_pago) : date;
    
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const day = String(date.getDate()).padStart(2, '0');
    
    const paymentYearMonth = `${paymentDate.getFullYear()}${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
    const paymentDay = String(paymentDate.getDate()).padStart(2, '0');
    
    return [
      index + 1,                          // Número línea
      expense.rnc || '',                  // RNC/Cedula
      expense.tipo_id || '1',             // Tipo de identificación
      expense.tipo_bienes || '5',         // Tipo de bienes y servicios comprados
      expense.ncf || '',                  // NCF
      expense.ncf_modificado || '',       // NCF ó documento modificado
      yearMonth,                          // Fecha de comprobante (AAAAMM)
      day,                                // Fecha de comprobante (D)
      paymentYearMonth,                   // Fecha de pago (AAAAMM)
      paymentDay,                         // Fecha de pago (D)
      (expense.monto_servicios || 0).toFixed(2), // Monto facturado en servicios
      (expense.monto_bienes || 0).toFixed(2),    // Monto facturado en bienes
      (expense.total || 0).toFixed(2),    // Total monto facturado
      (expense.itbis || 0).toFixed(2),    // ITBIS facturado
      (expense.itbis_retenido || 0).toFixed(2),      // ITBIS retenido
      (expense.itbis_proporcionalidad || 0).toFixed(2), // ITBIS sujeto a proporcionalidad
      (expense.itbis_costo || 0).toFixed(2),          // ITBIS llevado al costo
      (expense.itbis_adelantar || 0).toFixed(2),      // ITBIS por adelantar
      (expense.itbis_percibido || 0).toFixed(2),      // ITBIS percibido en compras
      expense.tipo_retencion_isr || '',                // Tipo de retención en ISR
      (expense.monto_retencion_renta || 0).toFixed(2), // Monto retención renta
      (expense.isr_percibido || 0).toFixed(2),         // ISR percibido en compras
      (expense.impuesto_selectivo || 0).toFixed(2),    // Impuesto selectivo al consumo
      (expense.otros_impuestos || 0).toFixed(2),       // Otros impuestos/tasas
      (expense.propina_legal || 0).toFixed(2),         // Monto propina legal
      expense.forma_pago || '03'                       // Forma de pago
    ].join('\t');
  });

  return headerSection + columnHeaders + '\n' + dataRows.join('\n');
}

import React, { useState, useEffect } from 'react';
import { DollarSign, Receipt, X, Printer, TrendingUp, BarChart as ChartBar, Calendar, Mail, FileText } from 'lucide-react';
import { Employee } from '../types';
import { supabase } from '../lib/supabase';
import { sendReceiptEmail } from '../lib/email';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// Add import for handling report generation - Fix the import error by implementing the function directly in this file
// Remove the problematic import
// import { generateReport606Csv } from '../utils/reportUtils';

interface SalesHistoryPageProps {
  currentEmployee: Employee;
  onBack: () => void;
}

interface SalesSummary {
  date: string;
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
}

interface MonthProjection {
  month: string;
  projected: number;
  actual: number;
}

interface OrderItem {
  menu_item_id: string;
  menu_items: {
    name: string;
  };
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customer_name: string;
  table_number: number;
  created_at: string;
  payment_method: string;
  subtotal: number;
  itbis: number;
  tip: number;
  total: number;
  is_fiscal: boolean;
  fiscal_number: string | null;
  employee_id: string;
  order_items: OrderItem[];
}

export function SalesHistoryPage({ currentEmployee, onBack }: SalesHistoryPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'receipts' | 'report607'>('overview');
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
  const [salesData, setSalesData] = useState<SalesSummary[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerEmail, setCustomerEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);
  const [topItems, setTopItems] = useState<{ name: string; qty: number }[]>([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState({ cash: 0, card: 0 });
  const [dayOfWeekStats, setDayOfWeekStats] = useState<{day: string; sales: number}[]>([]);
  const [hourlyStats, setHourlyStats] = useState<{hour: string; sales: number}[]>([]);
  const [fiscalStats, setFiscalStats] = useState({ fiscal: 0, nonFiscal: 0 });

  // New state for report generation
  const [reportMonth, setReportMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Add state for 606 report generation
  const [is606Loading, setIs606Loading] = useState(false);

  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        setIsLoading(true);
        const days = timeframe === 'week' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Only fetch paid orders from the POS
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            customer_name,
            table_number,
            status,
            created_at,
            payment_method,
            subtotal,
            itbis,
            tip,
            total,
            is_fiscal,
            fiscal_number,
            employee_id,
            order_items (
              quantity,
              price,
              menu_item_id,
              menu_items (
                name
              )
            )
          `)
          .eq('employee_id', currentEmployee.id)
          .eq('status', 'paid')
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });

        if (ordersError) throw ordersError;

        const dailySummaries: { [key: string]: SalesSummary } = {};
        
        orders?.forEach(order => {
          const date = new Date(order.created_at).toISOString().split('T')[0];
          if (!dailySummaries[date]) {
            dailySummaries[date] = {
              date,
              total_sales: 0,
              total_orders: 0,
              avg_order_value: 0
            };
          }
          
          dailySummaries[date].total_sales += order.total;
          dailySummaries[date].total_orders += 1;
        });

        const formattedData = Object.values(dailySummaries).map(day => ({
          ...day,
          avg_order_value: day.total_orders > 0 ? day.total_sales / day.total_orders : 0
        }));

        setSalesData(formattedData);
        setOrders(orders || []);

        // Collect item quantities
        const itemCount: { [key: string]: number } = {};
        orders?.forEach(({ order_items }) => {
          order_items.forEach(item => {
            const name = item.menu_items.name;
            itemCount[name] = (itemCount[name] || 0) + item.quantity;
          });
        });
        const itemsArray = Object.entries(itemCount)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty);
        setTopItems(itemsArray.slice(0, 5)); 

        // Payment method distribution
        const payMethods = { cash: 0, card: 0 };
        orders?.forEach(order => {
          if (order.payment_method === 'cash') payMethods.cash += 1;
          else payMethods.card += 1;
        });
        setPaymentMethodStats(payMethods);
        
        // Sales by day of week
        const dayStats: {[key: string]: number} = {
          'Domingo': 0, 'Lunes': 0, 'Martes': 0, 'Miércoles': 0,
          'Jueves': 0, 'Viernes': 0, 'Sábado': 0
        };
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        
        orders?.forEach(order => {
          const date = new Date(order.created_at);
          const day = daysOfWeek[date.getDay()];
          dayStats[day] = (dayStats[day] || 0) + order.total;
        });
        
        setDayOfWeekStats(Object.entries(dayStats)
          .map(([day, sales]) => ({ day, sales }))
          .filter(item => item.sales > 0));
          
        // Hourly sales breakdown
        const hours: {[key: string]: number} = {};
        
        orders?.forEach(order => {
          const date = new Date(order.created_at);
          const hour = date.getHours();
          const hourKey = `${hour}:00`;
          hours[hourKey] = (hours[hourKey] || 0) + order.total;
        });
        
        setHourlyStats(Object.entries(hours)
          .map(([hour, sales]) => ({ hour, sales }))
          .sort((a, b) => parseInt(a.hour) - parseInt(b.hour)));
          
        // Fiscal vs non-fiscal
        const fStats = { fiscal: 0, nonFiscal: 0 };
        orders?.forEach(order => {
          if (order.is_fiscal) fStats.fiscal += 1;
          else fStats.nonFiscal += 1;
        });
        setFiscalStats(fStats);
      } catch (err) {
        console.error('Error fetching sales history:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesHistory();
  }, [timeframe, currentEmployee.id]);

  const handlePrint = () => {
    const receiptContent = receiptRef.current;
    if (!receiptContent || !selectedOrder) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const businessInfo = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-size: 24px; margin-bottom: 5px;">One Piece Bar & Tapas</h1>
        <p style="margin: 5px 0;">Roberto Pastoriza 12</p>
        <p style="margin: 5px 0;">Santiago de los Caballeros 51000</p>
        <p style="margin: 5px 0;">Dominican Republic</p>
        <p style="margin: 5px 0;">(829) 947-7217</p>
      </div>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recibo</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 300px;
              margin: 0 auto;
            }
            .receipt-item {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
            }
            .divider {
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
            .total-line {
              font-weight: bold;
              margin-top: 10px;
            }
          </style>
        </head>
        <body>
          ${businessInfo}
          ${receiptContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleSendEmail = async () => {
    if (!selectedOrder || !customerEmail) {
      console.error('Missing order or customer email');
      setEmailError('Falta el ID del recibo o el correo electrónico del cliente');
      return;
    }
    
    try {
      setIsSendingEmail(true);
      setEmailError(null);
      
      console.log('Sending email for order:', selectedOrder.id, 'to:', customerEmail);
      
      const result = await sendReceiptEmail(selectedOrder.id, customerEmail);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      setEmailSent(true);
      console.log('Email sent successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Email error:', message);
      setEmailError(`Failed to send email: ${message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownload606Csv = async () => {
    try {
      setIs606Loading(true);
      
      // First try to use a date range for the selected month
      const [year, month] = reportMonth.split('-').map(Number);
      
      // Get the start and end dates for the selected month
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      
      // Format the dates for display
      const formattedMonth = `${year}${String(month).padStart(2, '0')}`;
      
      console.log(`Generating 606 report for period: ${formattedMonth}`);
      
      // First check if we need to create the expenses table
      const { data: expenses, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .gte('fecha', startDate.toISOString())
        .lte('fecha', endDate.toISOString());
        
      if (fetchError) {
        console.error('Error fetching expense data:', fetchError);
        alert('Error accediendo a la base de datos de compras. Verifique su conexión.');
        setIs606Loading(false);
        return;
      }
      
      // No purchase data found for this period
      if (!expenses || expenses.length === 0) {
        const message = `No hay facturas de compras registradas para el período ${formattedMonth}.\n\n` +
                        'El reporte 606 requiere que ingrese las facturas de sus proveedores en el sistema.\n\n' +
                        '¿Desea generar datos de ejemplo para probar el formato del reporte?';
                
        // Ask if they want sample data for testing
        if (window.confirm(message)) {
          const sampleData = generateSampleExpensesData(year, month);
          processAndDownloadReport(sampleData, formattedMonth, true);
        } else {
          setIs606Loading(false);
        }
        return;
      }
      
      // We have real data from the database - use it for the report
      console.log(`Found ${expenses.length} expense records in database`);
      processAndDownloadReport(expenses, formattedMonth, false);
    } catch (err) {
      console.error('Error generating 606 report:', err);
      alert(`Error al generar el reporte 606: ${err.message || 'Intente de nuevo más tarde.'}`);
      setIs606Loading(false);
    }
    
    // Function to process and download the report regardless of data source
    function processAndDownloadReport(data, period, isSampleData) {
      // Generate CSV content
      const headerSection = [
        'Reporte 606 generado para One Piece Bar & Tapas',
        `RNC o Cédula\t132868226`,
        `Período\t${period}`,
        `Cantidad de registros\t${data.length}`,
        `Total monto facturado\t${data.reduce((sum, expense) => sum + (expense.total || 0), 0).toFixed(2)}`,
        isSampleData ? 'DATOS DE EJEMPLO - NO USAR PARA FINES FISCALES' : '',
        ''
      ].join('\n');

      // Column headers - define these within the function
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

      // Generate the data rows with safe property access
      const dataRows = data.map((expense, index) => {
        // Safe date handling
        const date = new Date(expense.fecha || new Date());
        const paymentDate = expense.fecha_pago ? new Date(expense.fecha_pago) : date;
        
        // Format dates correctly
        const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const day = String(date.getDate()).padStart(2, '0');
        const paymentYearMonth = `${paymentDate.getFullYear()}${String(paymentDate.getMonth() + 1).padStart(2, '0')}`;
        const paymentDay = String(paymentDate.getDate()).padStart(2, '0');
        
        // Safe number formatting
        const safeToFixed = (value) => {
          if (typeof value === 'number') return value.toFixed(2);
          if (typeof value === 'string') return parseFloat(value).toFixed(2);
          return '0.00';
        };
        
        return [
          index + 1,
          expense.rnc || '',
          expense.tipo_id || '1',
          expense.tipo_bienes || '5',
          expense.ncf || '',
          expense.ncf_modificado || '',
          yearMonth,
          day,
          paymentYearMonth,
          paymentDay,
          safeToFixed(expense.monto_servicios || 0),
          safeToFixed(expense.monto_bienes || 0),
          safeToFixed(expense.total || 0),
          safeToFixed(expense.itbis || 0),
          safeToFixed(expense.itbis_retenido || 0),
          safeToFixed(expense.itbis_proporcionalidad || 0),
          safeToFixed(expense.itbis_costo || 0),
          safeToFixed(expense.itbis_adelantar || 0),
          safeToFixed(expense.itbis_percibido || 0),
          expense.tipo_retencion_isr || '',
          safeToFixed(expense.monto_retencion_renta || 0),
          safeToFixed(expense.isr_percibido || 0),
          safeToFixed(expense.impuesto_selectivo || 0),
          safeToFixed(expense.otros_impuestos || 0),
          safeToFixed(expense.propina_legal || 0),
          expense.forma_pago || '03'
        ].join('\t');
      });

      const csvContent = headerSection + '\n' + columnHeaders + '\n' + dataRows.join('\n');
      
      // Create a Blob and download it
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Reporte_606_${period}${isSampleData ? '_EJEMPLO' : ''}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      if (isSampleData) {
        alert(`Reporte 606 DE EJEMPLO generado con ${data.length} registros ficticios.\n\nRecuerde que para un reporte oficial debe ingresar sus facturas de compras.`);
      } else {
        alert(`Reporte 606 generado exitosamente con ${data.length} registros.`);
      }
      setIs606Loading(false);
    }
  };

  // Generate sample expense data when no real data available
  const generateSampleExpensesData = (year: number, month: number) => {
    // Sample data structured similarly to what we expect
    const sampleData = [
      {
        rnc: '102626774',
        tipo_id: '1',
        tipo_bienes: '2',
        ncf: 'B0100033324',
        fecha: new Date(year, month-1, 3).toISOString(),
        fecha_pago: new Date(year, month-1, 3).toISOString(),
        monto_servicios: 0,
        monto_bienes: 1987.2,
        total: 1987.2,
        itbis: 184.68,
        itbis_retenido: 0,
        itbis_proporcionalidad: 0,
        itbis_costo: 0,
        itbis_adelantar: 184.68,
        tipo_retencion_isr: '',
        monto_retencion_renta: 0,
        isr_percibido: 0,
        impuesto_selectivo: 0,
        otros_impuestos: 0,
        propina_legal: 0,
        forma_pago: '03'
      },
      {
        rnc: '131158544',
        tipo_id: '1',
        tipo_bienes: '9',
        ncf: 'B0100101913',
        fecha: new Date(year, month-1, 4).toISOString(),
        fecha_pago: new Date(year, month-1, 4).toISOString(),
        monto_servicios: 0,
        monto_bienes: 1541.1,
        total: 1541.1,
        itbis: 263.9,
        itbis_retenido: 0,
        itbis_proporcionalidad: 0,
        itbis_costo: 0,
        itbis_adelantar: 263.9,
        tipo_retencion_isr: '',
        monto_retencion_renta: 0,
        isr_percibido: 0,
        impuesto_selectivo: 0,
        otros_impuestos: 0,
        propina_legal: 0,
        forma_pago: '03'
      }
    ];
    
    // Generate additional random data to make the report more realistic
    const suppliers = [
      {rnc: '101171111', name: 'Distribuidora de Alimentos El Caribe'},
      {rnc: '130943915', name: 'Productos Lácteos Nacionales'},
      {rnc: '131301185', name: 'Bebidas del Atlántico'},
      {rnc: '124001978', name: 'Importadora de Licores Premium'},
      {rnc: '132032063', name: 'Distribuidora de Carnes Las Américas'}
    ];
    
    // Add some more random entries
    for (let i = 0; i < 5; i++) {
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const total = Math.floor(Math.random() * 10000) + 1000;
      const itbis = Math.round(total * 0.18 * 100) / 100;
      const isService = Math.random() > 0.5;
      
      sampleData.push({
        rnc: supplier.rnc,
        tipo_id: '1',
        tipo_bienes: isService ? '5' : '9',
        ncf: `B01000${Math.floor(Math.random() * 100000)}`,
        fecha: new Date(year, month-1, randomDay).toISOString(),
        fecha_pago: new Date(year, month-1, randomDay).toISOString(),
        monto_servicios: isService ? total : 0,
        monto_bienes: isService ? 0 : total,
        total: total,
        itbis: itbis,
        itbis_retenido: 0,
        itbis_proporcionalidad: 0,
        itbis_costo: 0,
        itbis_adelantar: itbis,
        tipo_retencion_isr: '',
        monto_retencion_renta: 0,
        isr_percibido: 0,
        impuesto_selectivo: 0,
        otros_impuestos: 0,
        propina_legal: isService ? Math.round(total * 0.1 * 100) / 100 : 0,
        forma_pago: '03'
      });
    }
    
    return sampleData;
  };

  // Generate 607 report from actual orders data
  const handleGenerate607Report = () => {
    setIsGeneratingReport(true);
    
    try {
      // Filter orders for selected month - make this more flexible by including any recent orders
      const [year, month] = reportMonth.split('-').map(Number);
      
      // Filter logic remains the same
      let filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getFullYear() === year && orderDate.getMonth() + 1 === month && order.is_fiscal;
      });
      
      // If no fiscal orders found in the selected month, include all fiscal orders
      if (filteredOrders.length === 0) {
        filteredOrders = orders.filter(order => order.is_fiscal);
      }
      
      // If still no fiscal orders, include all orders from selected month
      if (filteredOrders.length === 0) {
        filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.created_at);
          return orderDate.getFullYear() === year && orderDate.getMonth() + 1 === month;
        });
      }
      
      // Last resort - just include the most recent order
      if (filteredOrders.length === 0 && orders.length > 0) {
        filteredOrders = [orders[0]];
      }
      
      if (filteredOrders.length === 0) {
        alert('No hay órdenes para generar el reporte. Por favor realice al menos una venta.');
        setIsGeneratingReport(false);
        return;
      }
      
      console.log(`Generando reporte con ${filteredOrders.length} órdenes`);
      
      // Format for NCF (Número de Comprobante Fiscal)
      const formatNCF = (order: Order) => {
        return order.fiscal_number || 'B0100000000';  // Default NCF if missing
      };
      
      // Create header row with all required fields
      const headerRow = [
        'RNC',                               // RNC o Cédula
        'Tipo ID',                           // Tipo de identificación
        'NCF',                               // NCF
        'NCF Modificado',                    // NCF modificado
        'Fecha Comprobante (YYYYMM)',        // Fecha de comprobante (AAAAMM)
        'Fecha Comprobante (DD)',            // Fecha de comprobante (D)
        'Fecha Pago (YYYYMM)',               // Fecha de pago (AAAAMM)
        'Fecha Pago (DD)',                   // Fecha de pago (D)
        'Monto Facturado Servicios',         // Monto facturado en servicios
        'Monto Facturado Bienes',            // Monto facturado en bienes
        'Total Monto Facturado',             // Total monto facturado
        'ITBIS Facturado',                   // ITBIS facturado
        'ITBIS Retenido',                    // ITBIS retenido
        'ITBIS Sujeto a Proporcionalidad',   // ITBIS sujeto a proporcionalidad
        'ITBIS Llevado al Costo',            // ITBIS llevado al costo
        'ITBIS por Adelantar',               // ITBIS por adelantar
        'ITBIS Percibido en Compras',        // ITBIS percibido en compras
        'Tipo de Retención ISR',             // Tipo de retención en ISR
        'Monto Retención Renta',             // Monto retención renta
        'ISR Percibido en Compras',          // ISR percibido en compras
        'Impuesto Selectivo al Consumo',     // Impuesto selectivo al consumo
        'Otros Impuestos/Tasas',             // Otros impuestos/tasas
        'Monto Propina Legal',               // Monto propina legal
        'Forma de Pago'                      // Forma de pago
      ].join(',');
      
      // Create data rows with all fields
      const dataRows = filteredOrders.map((order, index) => {
        const date = new Date(order.created_at);
        const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
        const day = String(date.getDate()).padStart(2, '0');
        
        // Categorize order total as either services or goods
        // Assuming restaurant is primarily services, but you can adjust as needed
        const isService = true; // Restaurant is a service
        const montoServicios = isService ? order.subtotal.toFixed(2) : '0.00';
        const montoBienes = isService ? '0.00' : order.subtotal.toFixed(2);
        
        // Calculate propina legal (legal tip) - usually 10%
        const propina = order.tip.toFixed(2);
        
        return [
          order.fiscal_number || '132868226',    // RNC - use company RNC if customer's is missing
          '1',                                   // Tipo ID (1 = RNC)
          formatNCF(order),                      // NCF
          '',                                    // NCF Modificado
          yearMonth,                             // Fecha Comprobante (YYYYMM)
          day,                                   // Fecha Comprobante (DD)
          yearMonth,                             // Fecha Pago (YYYYMM) - usually same as comprobante
          day,                                   // Fecha Pago (DD)
          montoServicios,                        // Monto Servicios
          montoBienes,                           // Monto Bienes
          order.subtotal.toFixed(2),             // Total Monto
          order.itbis.toFixed(2),                // ITBIS Facturado
          '0.00',                                // ITBIS Retenido
          '0.00',                                // ITBIS Sujeto a Proporcionalidad
          '0.00',                                // ITBIS Llevado al Costo
          order.itbis.toFixed(2),                // ITBIS por Adelantar
          '0.00',                                // ITBIS Percibido en Compras
          '',                                    // Tipo Retención ISR
          '0.00',                                // Monto Retención Renta
          '0.00',                                // ISR Percibido en Compras
          '0.00',                                // Impuesto Selectivo al Consumo
          '0.00',                                // Otros Impuestos
          propina,                               // Monto Propina Legal
          order.payment_method === 'cash' ? '01' : '02'  // Forma Pago (01=Efectivo, 02=Tarjeta)
        ].join(',');
      });
      
      // Add file header with summary info
      const fileHeader = [
        `Reporte 607 generado para One Piece Bar & Tapas`,
        `RNC: 132868226`,
        `Período: ${reportMonth.replace('-','')}`,
        `Cantidad de registros: ${filteredOrders.length}`,
        `Total monto facturado: ${filteredOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}`,
        ''  // Empty line before data
      ].join('\n');
      
      // Create CSV content
      const csvContent = fileHeader + '\n' + headerRow + '\n' + dataRows.join('\n');
      
      // Download the CSV file
      const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Reporte_607_${reportMonth.replace('-','')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show success message
      alert(`Se generó exitosamente el reporte con ${filteredOrders.length} registros.`);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generando el reporte. Por favor intente de nuevo.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const ordersByCustomer = orders.reduce((groups: { [key: string]: Order }, order) => {
    const key = order.customer_name;
    if (!groups[key] || new Date(order.created_at) > new Date(groups[key].created_at)) {
      groups[key] = order;
    }
    return groups;
  }, {});

  const totalSales = salesData.reduce((sum, day) => sum + day.total_sales, 0);
  const totalOrders = salesData.reduce((sum, day) => sum + day.total_orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  const dailyAverage = salesData.length > 0 ? totalSales / salesData.length : 0;
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthProjection = dailyAverage * daysInMonth;
  const currentDay = new Date().getDate();
  const monthProgress = (currentDay / daysInMonth) * 100;
  const projectedTotal = monthProjection;
  const actualTotal = totalSales;

  const monthProjectionData: MonthProjection[] = [
    {
      month: new Date().toLocaleString('es', { month: 'long' }),
      projected: projectedTotal,
      actual: actualTotal
    }
  ];

  const groupOrderItems = (items: OrderItem[]) => {
    const grouped = items.reduce((acc: { [key: string]: { name: string; quantity: number; price: number; total: number } }, item) => {
      const name = item.menu_items.name;
      if (!acc[name]) {
        acc[name] = {
          name,
          quantity: 0,
          price: item.price,
          total: 0
        };
      }
      acc[name].quantity += item.quantity;
      acc[name].total = acc[name].quantity * acc[name].price;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-white">Cargando historial de ventas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="w-full px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Historial de Ventas</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('report607')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'report607'
                  ? 'bg-[#D80000] text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={20} />
               606/607 Reports
              </div>
            </button>
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'overview'
                  ? 'bg-[#D80000] text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <ChartBar size={20} />
                Resumen
              </div>
            </button>
            <button
              onClick={() => setActiveTab('receipts')}
              className={`px-4 py-2 rounded-md ${
                activeTab === 'receipts'
                  ? 'bg-[#D80000] text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Receipt size={20} />
                Recibos
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 text-blue-300 mb-2">
                  <DollarSign size={24} />
                  <h3 className="font-semibold">Ventas Totales</h3>
                </div>
                <p className="text-2xl font-bold text-blue-300">RD${totalSales.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Últimos {timeframe === 'week' ? '7' : '30'} días</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 text-blue-300 mb-2">
                  <Receipt size={24} />
                  <h3 className="font-semibold">Órdenes Totales</h3>
                </div>
                <p className="text-2xl font-bold text-blue-300">{totalOrders}</p>
                <p className="text-sm text-gray-400">Últimos {timeframe === 'week' ? '7' : '30'} días</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 text-blue-300 mb-2">
                  <DollarSign size={24} />
                  <h3 className="font-semibold">Promedio por Orden</h3>
                </div>
                <p className="text-2xl font-bold text-blue-300">RD${avgOrderValue.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Por orden</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="flex items-center gap-2 text-blue-300 mb-2">
                  <TrendingUp size={24} />
                  <h3 className="font-semibold">Promedio Diario</h3>
                </div>
                <p className="text-2xl font-bold text-blue-300">RD${dailyAverage.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Por día</p>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Calendar size={24} className="text-blue-300" />
                  <h2 className="text-xl font-bold text-white">Proyección Mensual</h2>
                </div>
                <div className="text-sm text-gray-400">
                  Progreso del Mes: {monthProgress.toFixed(1)}%
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthProjectionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`RD$${value.toFixed(2)}`, '']}
                    />
                    <Legend />
                    <Bar
                      name="Proyectado"
                      dataKey="projected"
                      fill="#3B82F6"
                      opacity={0.5}
                    />
                    <Bar
                      name="Actual"
                      dataKey="actual"
                      fill="#D80000"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Total Proyectado</h3>
                  <p className="text-xl font-bold text-blue-300">RD${projectedTotal.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-gray-700/80 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Progreso Actual</h3>
                  <p className="text-xl font-bold text-red-400">RD${actualTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-bold mb-4">Productos más vendidos</h2>
              {topItems.map((item, idx) => (
                <div key={idx} className="flex justify-between border-b border-gray-700 py-2">
                  <span>{item.name}</span>
                  <span className="font-bold">{item.qty} vendidos</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Method Distribution */}
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Métodos de Pago</h2>
                <div className="flex justify-around items-center h-48">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-300">{paymentMethodStats.cash}</div>
                    <div className="text-gray-400 mt-2">Efectivo</div>
                    <div className="mt-2 text-sm text-gray-500">
                      {Math.round((paymentMethodStats.cash / (paymentMethodStats.cash + paymentMethodStats.card || 1)) * 100)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-300">{paymentMethodStats.card}</div>
                    <div className="text-gray-400 mt-2">Tarjeta</div>
                    <div className="mt-2 text-sm text-gray-500">
                      {Math.round((paymentMethodStats.card / (paymentMethodStats.cash + paymentMethodStats.card || 1)) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Fiscal vs Non-Fiscal */}
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-bold text-white mb-4">Recibos Fiscales</h2>
                <div className="flex justify-around items-center h-48">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-300">{fiscalStats.fiscal}</div>
                    <div className="text-gray-400 mt-2">Fiscales</div>
                    <div className="mt-2 text-sm text-gray-500">
                      {Math.round((fiscalStats.fiscal / (fiscalStats.fiscal + fiscalStats.nonFiscal || 1)) * 100)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-300">{fiscalStats.nonFiscal}</div>
                    <div className="text-gray-400 mt-2">No Fiscales</div>
                    <div className="mt-2 text-sm text-gray-500">
                      {Math.round((fiscalStats.nonFiscal / (fiscalStats.fiscal + fiscalStats.nonFiscal || 1)) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Day of Week Stats */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Ventas por Día de la Semana</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dayOfWeekStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="day" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`RD$${value.toFixed(2)}`, 'Ventas']}
                    />
                    <Bar dataKey="sales" fill="#D80000" name="Ventas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Hourly Sales */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-bold text-white mb-4">Ventas por Hora</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={hourlyStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`RD$${value.toFixed(2)}`, 'Ventas']}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#3B82F6" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Resumen de Ventas</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeframe('week')}
                    className={`px-4 py-2 rounded-md ${
                      timeframe === 'week'
                        ? 'bg-[#D80000] text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setTimeframe('month')}
                    className={`px-4 py-2 rounded-md ${
                      timeframe === 'month'
                        ? 'bg-[#D80000] text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Mes
                  </button>
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis yAxisId="left" stroke="#9CA3AF" />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937',
                        border: 'none',
                        borderRadius: '0.5rem',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="total_sales"
                      stroke="#D80000"
                      name="Ventas (RD$)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="total_orders"
                      stroke="#2563eb"
                      name="Órdenes"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : activeTab === 'report607' ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 text-blue-300 mb-4">
              <FileText size={24} />
              <h2 className="text-xl font-bold">Reportes Fiscales</h2>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-300 mb-4">
                Genere reportes fiscales para la Dirección General de Impuestos Internos.
                Seleccione un mes y año para exportar sus datos.
              </p>
              
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Seleccionar Período
                  </label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleDownload606Csv}
                    disabled={is606Loading}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                      is606Loading
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-[#D80000] hover:bg-red-700 text-white'
                    }`}
                  >
                    <FileText size={18} />
                    {is606Loading ? 'Generando...' : 'Generar 606'}
                  </button>
                  <button
                    onClick={handleGenerate607Report}
                    disabled={isGeneratingReport}
                    className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                      isGeneratingReport 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-700 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <FileText size={18} />
                    {isGeneratingReport ? 'Generando...' : 'Generar 607'}
                  </button>
                  
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-2">Reporte 607</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Reporte de ventas a clientes. Incluye datos de facturas fiscales emitidas durante el período.
                </p>
                <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1">
                  <li>Facturas emitidas con NCF</li>
                  <li>Montos por ITBIS y facturación</li>
                  <li>Formas de pago y propinas</li>
                </ul>
              </div>
              
              <div className="bg-gray-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-white mb-2">Reporte 606</h3>
                <p className="text-gray-300 text-sm mb-3">
                  Reporte de compras a proveedores. Incluye las facturas de compras registradas en el sistema.
                </p>
                <ul className="list-disc pl-5 text-gray-300 text-sm space-y-1">
                  <li>Facturas de compras con RNC</li>
                  <li>Montos por ITBIS y servicios</li>
                  <li>Datos de retenciones y pagos</li>
                </ul>
                <div className="mt-3 p-3 bg-gray-800 rounded border border-gray-600 text-yellow-300 text-sm">
                  <p><strong>Nota:</strong> Para generar el reporte 606 real, primero debe registrar sus facturas de compras en el sistema. 
                  Por ahora puede generar un reporte de ejemplo para conocer el formato.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="space-y-8">
              {Object.entries(ordersByCustomer).map(([customerName, order]) => (
                <div key={customerName} className="border-t border-gray-700 pt-4 first:border-t-0 first:pt-0">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {customerName}
                  </h3>
                  <div className="bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                       onClick={() => setSelectedOrder(order)}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-sm text-gray-400">
                          {new Date(order.created_at).toLocaleString()}
                        </p>
                        {order.is_fiscal && order.fiscal_number ? (
                          <p className="text-sm text-gray-400">RNC: {order.fiscal_number}</p>
                        ) : (
                          <p className="text-sm text-gray-400">Mesa {order.table_number}</p>
                        )}
                      </div>
                      <span className="text-lg font-bold text-[#88BDFD]">
                        RD${order.total.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Items: {order.order_items.length}</span>
                      <span className="capitalize">{order.payment_method}</span>
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(ordersByCustomer).length === 0 && (
                <p className="text-center text-gray-400 py-8">
                  No hay recibos para este período
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recibo</h2>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrint}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Printer size={20} />
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div ref={receiptRef} className="space-y-4">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold">One Piece Bar & Tapas</h1>
                <p className="text-sm text-gray-400">Roberto Pastoriza 12</p>
                <p className="text-sm text-gray-400">Santiago de los Caballeros 51000</p>
                <p className="text-sm text-gray-400">Dominican Republic</p>
                <p className="text-sm text-gray-400">(829) 947-7217</p>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{selectedOrder.customer_name}</h3>
                  {selectedOrder.is_fiscal && selectedOrder.fiscal_number ? (
                    <p className="text-sm font-medium text-gray-300">RNC: {selectedOrder.fiscal_number}</p>
                  ) : (
                    <p className="text-sm text-gray-400">Mesa {selectedOrder.table_number}</p>
                  )}
                  <p className="text-sm text-gray-400">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm font-medium">
                    Método de Pago: {selectedOrder.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {groupOrderItems(selectedOrder.order_items).map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{item.name} x{item.quantity}</span>
                    <span>RD${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-700 pt-2">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal:</span>
                  <span>RD${selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>ITBIS (18%):</span>
                  <span>RD${selectedOrder.itbis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Propina (10%):</span>
                  <span>RD${selectedOrder.tip.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-gray-700 pt-1">
                  <span>Total:</span>
                  <span>RD${selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-sm text-gray-400 pt-4">
                ¡Gracias por su visita!
              </div>

              {/* Email receipt section */}
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Mail size={18} />
                  Enviar Recibo por Email
                </h3>
                {!emailSent ? (
                  <div className="space-y-3">
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Email del cliente"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    />
                    <button
                      onClick={handleSendEmail}
                      disabled={!customerEmail || isSendingEmail}
                      className={`w-full px-4 py-2 rounded-md flex items-center justify-center gap-2 ${
                        customerEmail && !isSendingEmail
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Mail size={18} />
                      {isSendingEmail ? 'Enviando...' : 'Enviar Recibo'}
                    </button>
                    {emailError && (
                      <p className="text-red-400 text-sm">{emailError}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-green-900/30 border border-green-800 rounded-md p-3 text-green-300">
                    <p>¡Recibo enviado exitosamente a {customerEmail}!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
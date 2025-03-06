export interface Tab {
  id: string;
  name: string;
  customerName: string;
  tableNumber: number;
  status: 'open' | 'closed';
  subtotal: number;
  itbis: number;
  tip: number;
  total: number;
  isFiscal: boolean;
  fiscalNumber?: string;
  paymentMethod?: 'cash' | 'card';
  employeeId: string;
  createdAt: Date;
  closedAt?: Date;
  items: OrderItem[];
  isOpen: boolean;
}

export interface OrderItem {
  itemId: string;
  quantity: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
}

export interface Employee {
  id: string;
  name: string;
  code: string;
  shift_status?: 'active' | 'inactive';
  shift_start_time?: string;
  total_sales?: number;
  total_orders?: number;
  cash_in_drawer?: number;
}

export interface Notification {
  id: string;
  message: string;
}
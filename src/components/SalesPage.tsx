import React, { useState, useMemo } from 'react';
import { Swords, DollarSign } from 'lucide-react';
import { Order, Employee } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface SalesPageProps {
  orders: Order[];
  currentEmployee: Employee;
}

interface DailySales {
  date: string;
  sales: number;
  orders: number;
  avgOrderValue: number;
}

export function SalesPage({ orders, currentEmployee }: SalesPageProps) {
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');

  const salesData = useMemo(() => {
    const now = new Date();
    const timeframeDays = timeframe === 'week' ? 7 : 30;
    const startDate = new Date(now.setDate(now.getDate() - timeframeDays));
    
    const dailySales: { [key: string]: DailySales } = {};
    
    // Initialize all dates in the range
    for (let d = new Date(startDate); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailySales[dateStr] = {
        date: dateStr,
        sales: 0,
        orders: 0,
        avgOrderValue: 0
      };
    }

    // Aggregate sales data
    orders.forEach(order => {
      const dateStr = new Date(order.timestamp).toISOString().split('T')[0];
      if (dailySales[dateStr]) {
        dailySales[dateStr].sales += order.total;
        dailySales[dateStr].orders += 1;
      }
    });

    // Calculate averages and format data
    return Object.values(dailySales).map(day => ({
      ...day,
      avgOrderValue: day.orders > 0 ? day.sales / day.orders : 0
    }));
  }, [orders, timeframe]);

  const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
  const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0);
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Calculate projections
  const avgDailySales = totalSales / salesData.length;
  const projectedMonthly = avgDailySales * 30;

  // Get current shift sales
  const currentShiftSales = currentEmployee.shift_status === 'active' ? {
    totalSales: currentEmployee.total_sales || 0,
    totalOrders: currentEmployee.total_orders || 0,
    avgOrderValue: currentEmployee.total_orders > 0 
      ? currentEmployee.total_sales / currentEmployee.total_orders 
      : 0
  } : null;

  return (
    <div className="min-h-screen bg-gray-900">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Current Shift Summary */}
          {currentShiftSales && (
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">
              <h2 className="text-xl font-bold mb-4">Current Shift</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-gray-400">Total Sales</h3>
                  <p className="text-2xl font-bold">RD${currentShiftSales.totalSales.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-gray-400">Orders</h3>
                  <p className="text-2xl font-bold">{currentShiftSales.totalOrders}</p>
                </div>
                <div>
                  <h3 className="text-gray-400">Average Order</h3>
                  <p className="text-2xl font-bold">
                    RD${currentShiftSales.avgOrderValue.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <DollarSign size={24} />
                <h3 className="font-semibold">Total Sales</h3>
              </div>
              <p className="text-2xl font-bold text-blue-300">RD${totalSales.toFixed(2)}</p>
              <p className="text-sm text-gray-400">Last {timeframe === 'week' ? '7' : '30'} days</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <DollarSign size={24} />
                <h3 className="font-semibold">Total Orders</h3>
              </div>
              <p className="text-2xl font-bold text-blue-300">{totalOrders}</p>
              <p className="text-sm text-gray-400">Last {timeframe === 'week' ? '7' : '30'} days</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <DollarSign size={24} />
                <h3 className="font-semibold">Avg Order Value</h3>
              </div>
              <p className="text-2xl font-bold text-blue-300">RD${avgOrderValue.toFixed(2)}</p>
              <p className="text-sm text-gray-400">Per order</p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="flex items-center gap-2 text-blue-300 mb-2">
                <DollarSign size={24} />
                <h3 className="font-semibold">Projected Monthly</h3>
              </div>
              <p className="text-2xl font-bold text-blue-300">RD${projectedMonthly.toFixed(2)}</p>
              <p className="text-sm text-gray-400">Based on current average</p>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Sales Overview</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimeframe('week')}
                  className={`px-4 py-2 rounded-md ${
                    timeframe === 'week'
                      ? 'bg-[#D80000] text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeframe('month')}
                  className={`px-4 py-2 rounded-md ${
                    timeframe === 'month'
                      ? 'bg-[#D80000] text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Month
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
                    dataKey="sales"
                    stroke="#D80000"
                    name="Sales (RD$)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="#2563eb"
                    name="Orders"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
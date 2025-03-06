export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      menu_items: {
        Row: {
          id: string
          name: string
          category: string
          price: number
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category: string
          price: number
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          price?: number
          description?: string | null
          created_at?: string | null
        }
      }
      shifts: {
        Row: {
          id: string
          employee_id: string
          start_time: string
          end_time: string | null
          total_sales: number
          total_orders: number
          status: 'active' | 'closed'
          cash_in_drawer: number
          created_at: string | null
        }
        Insert: {
          id?: string
          employee_id: string
          start_time?: string
          end_time?: string | null
          total_sales?: number
          total_orders?: number
          status: 'active' | 'closed'
          cash_in_drawer: number
          created_at?: string | null
        }
        Update: {
          id?: string
          employee_id?: string
          start_time?: string
          end_time?: string | null
          total_sales?: number
          total_orders?: number
          status?: 'active' | 'closed'
          cash_in_drawer?: number
          created_at?: string | null
        }
      }
      shift_registers: {
        Row: {
          id: string
          shift_id: string
          employee_id: string
          start_amount: number
          current_amount: number
          end_amount: number | null
          created_at: string | null
          closed_at: string | null
        }
        Insert: {
          id?: string
          shift_id: string
          employee_id: string
          start_amount: number
          current_amount: number
          end_amount?: number | null
          created_at?: string | null
          closed_at?: string | null
        }
        Update: {
          id?: string
          shift_id?: string
          employee_id?: string
          start_amount?: number
          current_amount?: number
          end_amount?: number | null
          created_at?: string | null
          closed_at?: string | null
        }
      }
    }
  }
}
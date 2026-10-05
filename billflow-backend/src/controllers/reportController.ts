import { Request, Response } from 'express';
import { db } from '../config/database';

export const getAdvancedReporting = async (req: Request, res: Response): Promise<void> => {
  try {
    const currentYear = new Date().getFullYear();

    // Monthly revenue data - SQLite uses strftime for date functions
    const monthlyRevenueRows = db.prepare(`
      SELECT 
        CAST(strftime('%m', date) AS INTEGER) as month,
        SUM(amount) as revenue,
        COUNT(*) as invoice_count
      FROM invoices 
      WHERE strftime('%Y', date) = ? AND status = 'paid'
      GROUP BY strftime('%m', date)
      ORDER BY strftime('%m', date)
    `).all(currentYear.toString()) as any[];

    // Client performance data
    const clientPerformanceRows = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.classification,
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(i.amount), 0) as total_revenue,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(AVG(i.amount), 0) as average_invoice_amount,
        MAX(i.date) as last_invoice_date,
        SUM(CASE WHEN i.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count
      FROM clients c
      LEFT JOIN invoices i  ON c.id =  i.client_id
      LEFT JOIN payments p ON i.id = p.invoice_id
      GROUP BY c.id, c.name, c.classification
      ORDER BY total_revenue DESC
    `).all() as any[];

    // Payment analysis
    const paymentMethodRows = db.prepare(`
      SELECT 
        method,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM payments
      GROUP BY method
    `).all() as any[];

    const totalCollectedRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total_collected FROM payments'
    ).get() as { total_collected: number };

    // Outstanding invoices
    const outstandingRows = db.prepare(`
     SELECT 
        i.*,
        c.name as client_name,
        COALESCE(SUM(p.amount), 0) as paid_amount
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      LEFT JOIN payments p ON i.id = p.invoice_id
      WHERE i.status != 'paid'
      GROUP BY i.id
      ORDER BY i.date ASC
    `).all() as any[];

    // Summary statistics
    const summaryRow = db.prepare(`
      SELECT 
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue,
        COUNT(DISTINCT client_id) as total_clients,
        COUNT(*) as total_invoices,
        AVG(amount) as average_invoice_value
      FROM invoices
    `).get() as any;

    // Process monthly revenue data (fill missing months with 0)
    const monthlyRevenue = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthData = monthlyRevenueRows.find(row => row.month === month);
      return {
        month,
        revenue: monthData ? monthData.revenue : 0,
        invoice_count: monthData ? monthData.invoice_count : 0
      };
    });

    // Process payment analysis
    const paymentAnalysis = {
      by_method: paymentMethodRows.reduce((acc, row) => {
        acc[row.method] = row.total_amount;
        return acc;
      }, {}),
      total_collected: totalCollectedRow.total_collected
    };

    // Calculate total outstanding
    const totalOutstanding = outstandingRows.reduce((sum, invoice) => {
      const remaining = invoice.amount - invoice.paid_amount;
      return sum + remaining;
    }, 0);

    const reportData = {
      monthly_revenue: monthlyRevenue,
      client_performance: clientPerformanceRows.map(row => ({
        ...row,
        total_revenue: row.total_revenue,
        total_paid: row.total_paid,
        average_invoice_amount: row.average_invoice_amount
      })),
      payment_analysis: paymentAnalysis,
      outstanding_invoices: outstandingRows.map(row => ({
        ...row,
        amount: row.amount,
        paid_amount: row.paid_amount,
        remaining_amount: row.amount - row.paid_amount
      })),
      total_outstanding: totalOutstanding,
      summary: {
        total_revenue: summaryRow.total_revenue || 0,
        total_clients: summaryRow.total_clients || 0,
        total_invoices: summaryRow.total_invoices || 0,
        average_invoice_value: summaryRow.average_invoice_value || 0
      }
    };

    res.json(reportData);
  } catch (error) {
    console.error('Get advanced reporting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRevenueStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Total revenue (paid invoices only)
    const totalRevenueRow = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as total_revenue FROM invoices WHERE status = "paid"'
    ).get() as { total_revenue: number };

    // Monthly revenue for current year
    const currentYear = new Date().getFullYear();
    const monthlyRevenueRows = db.prepare(`
      SELECT 
        CAST(strftime('%m', date) AS INTEGER) as month,
        SUM(amount) as revenue
      FROM invoices 
      WHERE strftime('%Y', date) = ? AND status = 'paid'
      GROUP BY strftime('%m', date)
    `).all(currentYear.toString()) as any[];

    // Revenue by client type
    const clientTypeRevenueRows = db.prepare(`
      SELECT 
        c.type,
        SUM(i.amount) as revenue
      FROM invoices i
      JOIN clients c ON i.client_id = c.id
      WHERE i.status = 'paid'
      GROUP BY c.type
    `).all() as any[];

    const totalRevenue = totalRevenueRow.total_revenue;

    const monthlyRevenue = monthlyRevenueRows.map(row => ({
      month: row.month,
      revenue: row.revenue
    }));

    const revenueByClientType = clientTypeRevenueRows.reduce((acc, row) => {
      acc[row.type] = row.revenue;
      return acc;
    }, {});

    res.json({
      total_revenue: totalRevenue,
      monthly_revenue: monthlyRevenue,
      revenue_by_client_type: revenueByClientType
    });
  } catch (error) {
    console.error('Get revenue statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getClientPerformanceData = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = db.prepare(`
      SELECT 
        c.id,
        c.name,
        c.classification,
        c.type,
        COUNT(i.id) as total_invoices,
        COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COALESCE(AVG(i.amount), 0) as average_invoice_amount,
        MAX(i.date) as last_invoice_date,
        SUM(CASE WHEN i.status = 'overdue' THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN i.status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM clients c
      LEFT JOIN invoices i ON c.id = i.client_id
      LEFT JOIN payments p ON i.id = p.invoice_id
      GROUP BY c.id, c.name, c.classification, c.type
      ORDER BY total_revenue DESC
    `).all() as any[];

    const clientPerformance = rows.map(row => ({
      id: row.id,
      name: row.name,
      classification: row.classification,
      type: row.type,
      total_invoices: row.total_invoices,
      total_revenue: row.total_revenue,
      total_paid: row.total_paid,
      average_invoice_amount: row.average_invoice_amount,
      last_invoice_date: row.last_invoice_date,
      overdue_count: row.overdue_count,
      pending_count: row.pending_count
    }));

    res.json(clientPerformance);
  } catch (error) {
    console.error('Get client performance data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

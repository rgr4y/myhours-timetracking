import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test database setup
const testDbPath = path.join(__dirname, '../../prisma/test-invoice-data.db');
process.env.DATABASE_URL = `file:${testDbPath}`;

describe('Invoice Data Field', () => {
  let prisma;

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    
    prisma = new PrismaClient();
    
    // Apply migrations
    try {
      execSync('npx prisma migrate deploy', {
        cwd: path.join(__dirname, '../..'),
        env: { ...process.env, DATABASE_URL: `file:${testDbPath}` },
        stdio: 'pipe'
      });
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }

    // Create test client
    await prisma.client.create({
      data: {
        name: 'Test Client',
        email: 'test@example.com',
        hourlyRate: 100
      }
    });
  });

  afterEach(async () => {
    await prisma.$disconnect();
    
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create invoice with empty JSON data by default', async () => {
    const client = await prisma.client.findFirst();
    
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'TEST-001',
        clientId: client.id,
        totalAmount: 100.0,
        status: 'generated'
      }
    });

    expect(invoice.data).toBe('{}');
  });

  it('should store and retrieve template data as JSON', async () => {
    const client = await prisma.client.findFirst();
    
    const templateData = {
      invoiceNumber: 'TEST-002',
      companyName: 'Test Company',
      periodStart: '2025-01-01',
      periodEnd: '2025-01-31',
      clientName: 'Test Client',
      clientEmail: 'test@example.com',
      lineItems: [
        {
          date: '2025-01-01',
          description: 'Development work',
          hours: 8,
          rate: 100,
          amount: 800
        }
      ],
      totalHours: '8.00',
      hourlyRate: '100.00',
      totalAmount: '800.00'
    };

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'TEST-002',
        clientId: client.id,
        totalAmount: 800.0,
        status: 'generated',
        data: JSON.stringify(templateData)
      }
    });

    // Retrieve and parse the data
    const retrievedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });

    const parsedData = JSON.parse(retrievedInvoice.data);
    expect(parsedData).toEqual(templateData);
    expect(parsedData.invoiceNumber).toBe('TEST-002');
    expect(parsedData.totalAmount).toBe('800.00');
    expect(parsedData.lineItems).toHaveLength(1);
    expect(parsedData.lineItems[0].description).toBe('Development work');
  });

  it('should handle complex nested JSON data', async () => {
    const client = await prisma.client.findFirst();
    
    const complexData = {
      invoice: {
        number: 'COMPLEX-001',
        metadata: {
          generated_at: '2025-09-02T23:30:00Z',
          version: '1.0',
          template: 'default'
        }
      },
      client: {
        info: {
          name: 'Complex Client',
          address: {
            street: '123 Main St',
            city: 'Anytown',
            state: 'ST',
            zip: '12345'
          }
        }
      },
      items: [
        {
          type: 'service',
          details: {
            description: 'Complex service',
            categories: ['development', 'consulting'],
            metrics: {
              hours: 10.5,
              efficiency: 0.95
            }
          }
        }
      ]
    };

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'COMPLEX-001',
        clientId: client.id,
        totalAmount: 1050.0,
        status: 'generated',
        data: JSON.stringify(complexData)
      }
    });

    const retrievedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });

    const parsedData = JSON.parse(retrievedInvoice.data);
    expect(parsedData.invoice.number).toBe('COMPLEX-001');
    expect(parsedData.client.info.address.city).toBe('Anytown');
    expect(parsedData.items[0].details.categories).toContain('development');
    expect(parsedData.items[0].details.metrics.hours).toBe(10.5);
  });

  it('should handle malformed JSON gracefully', async () => {
    const client = await prisma.client.findFirst();
    
    // Test with invalid JSON
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INVALID-001',
        clientId: client.id,
        totalAmount: 100.0,
        status: 'generated',
        data: '{ invalid json'
      }
    });

    const retrievedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });

    // Should still store the string, even if invalid JSON
    expect(retrievedInvoice.data).toBe('{ invalid json');
    
    // Attempting to parse should throw an error
    expect(() => JSON.parse(retrievedInvoice.data)).toThrow();
  });

  it('should support large JSON data', async () => {
    const client = await prisma.client.findFirst();
    
    // Create a large dataset
    const largeData = {
      invoiceNumber: 'LARGE-001',
      lineItems: []
    };

    // Add 100 line items
    for (let i = 0; i < 100; i++) {
      largeData.lineItems.push({
        id: i,
        date: `2025-01-${String(i % 30 + 1).padStart(2, '0')}`,
        description: `Line item ${i} with description that is quite long and detailed`,
        hours: Math.round((Math.random() * 8 + 1) * 100) / 100,
        rate: 100 + (i % 50),
        category: `Category ${i % 5}`,
        tags: [`tag-${i}`, `type-${i % 3}`, `priority-${i % 2}`]
      });
    }

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: 'LARGE-001',
        clientId: client.id,
        totalAmount: 50000.0,
        status: 'generated',
        data: JSON.stringify(largeData)
      }
    });

    const retrievedInvoice = await prisma.invoice.findUnique({
      where: { id: invoice.id }
    });

    const parsedData = JSON.parse(retrievedInvoice.data);
    expect(parsedData.lineItems).toHaveLength(100);
    expect(parsedData.lineItems[0].description).toContain('Line item 0');
    expect(parsedData.lineItems[99].tags).toContain('tag-99');
  });
});

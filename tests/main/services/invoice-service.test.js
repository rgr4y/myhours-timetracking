import { describe, it, expect, beforeEach } from 'vitest'

// Mock database for testing
class MockDatabase {
  async getSettings() { return {} }
}

describe('Invoice Service - Business Logic', () => {
  let invoiceGenerator
  let InvoiceGenerator

  beforeEach(async () => {
    // Dynamically import the CommonJS module
    const invoiceModule = await import('../../../src/main/services/invoice-service.js')
    InvoiceGenerator = invoiceModule.default
    invoiceGenerator = new InvoiceGenerator(new MockDatabase())
  })
  describe('Invoice data validation', () => {
    it('should validate invoice data structure', () => {
      const isValidInvoiceData = (data) => {
        if (!data || typeof data !== 'object') return false
        if (!data.invoiceNumber) return false
        if (!data.client) return false
        if (!Array.isArray(data.timeEntries)) return false
        if (data.timeEntries.length === 0) return false
        return true
      }
      
      const validInvoice = {
        invoiceNumber: 'INV-001',
        client: { name: 'Test Client' },
        timeEntries: [{ description: 'Work done', hours: 2 }]
      }
      
      const invalidInvoice = {
        invoiceNumber: 'INV-001',
        timeEntries: [] // missing client, empty timeEntries
      }
      
      expect(isValidInvoiceData(validInvoice)).toBe(true)
      expect(isValidInvoiceData(invalidInvoice)).toBe(false)
      expect(isValidInvoiceData(null)).toBe(false)
    })

    it('should validate time entries', () => {
      const isValidTimeEntry = (entry) => {
        return entry &&
          typeof entry.description === 'string' &&
          typeof entry.hours === 'number' &&
          entry.hours > 0
      }
      
      const validEntry = {
        description: 'Development work',
        hours: 3.5,
        project: 'Website'
      }
      
      const invalidEntry = {
        description: 'Work',
        hours: -1 // invalid negative hours
      }
      
      expect(isValidTimeEntry(validEntry)).toBe(true)
      expect(isValidTimeEntry(invalidEntry)).toBe(false)
    })
  })

  describe('Invoice calculations', () => {
    it('should calculate total hours correctly', () => {
      const calculateTotalHours = (timeEntries) => {
        return timeEntries.reduce((total, entry) => total + entry.hours, 0)
      }
      
      const entries = [
        { hours: 2.5 },
        { hours: 3.0 },
        { hours: 1.5 }
      ]
      
      expect(calculateTotalHours(entries)).toBe(7.0)
      expect(calculateTotalHours([])).toBe(0)
    })

    it('should calculate invoice totals with rates', () => {
      const calculateInvoiceTotal = (timeEntries, hourlyRate) => {
        const totalHours = timeEntries.reduce((total, entry) => total + entry.hours, 0)
        return totalHours * hourlyRate
      }
      
      const entries = [{ hours: 2 }, { hours: 3 }]
      const rate = 50
      
      expect(calculateInvoiceTotal(entries, rate)).toBe(250) // 5 hours * $50
    })

    it('should handle different rates per project', () => {
      const calculateTotalWithProjectRates = (timeEntries) => {
        return timeEntries.reduce((total, entry) => {
          const rate = entry.rate || 0
          return total + (entry.hours * rate)
        }, 0)
      }
      
      const entries = [
        { hours: 2, rate: 50 },
        { hours: 3, rate: 75 },
        { hours: 1, rate: 100 }
      ]
      
      expect(calculateTotalWithProjectRates(entries)).toBe(425) // 100 + 225 + 100
    })
  })

  describe('Invoice formatting', () => {
    it('should format currency correctly', () => {
      const formatCurrency = (amount, currency = 'USD') => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currency
        }).format(amount)
      }
      
      expect(formatCurrency(123.45)).toBe('$123.45')
      expect(formatCurrency(1000)).toBe('$1,000.00')
    })

    it('should format hours correctly', () => {
      const formatHours = (hours) => {
        return `${hours.toFixed(2)} hours`
      }
      
      expect(formatHours(2)).toBe('2.00 hours')
      expect(formatHours(3.5)).toBe('3.50 hours')
      expect(formatHours(0.25)).toBe('0.25 hours')
    })

    it('should generate invoice numbers', () => {
      const generateInvoiceNumber = (prefix, counter) => {
        return `${prefix}-${counter.toString().padStart(3, '0')}`
      }
      
      expect(generateInvoiceNumber('INV', 1)).toBe('INV-001')
      expect(generateInvoiceNumber('INV', 42)).toBe('INV-042')
      expect(generateInvoiceNumber('BILL', 999)).toBe('BILL-999')
    })
  })

  describe('Date utilities for invoices', () => {
    it('should format invoice dates', () => {
      const formatInvoiceDate = (date) => {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC'
        }).format(date)
      }
      
      const testDate = new Date('2024-01-15T00:00:00Z')
      expect(formatInvoiceDate(testDate)).toBe('January 15, 2024')
    })

    it('should calculate date ranges for periods', () => {
      const getDateRange = (startDate, endDate) => {
        const start = new Date(startDate)
        const end = new Date(endDate)
        const diffTime = Math.abs(end - start)
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return { start, end, days: diffDays }
      }
      
      const range = getDateRange('2024-01-01', '2024-01-08')
      expect(range.days).toBe(7)
    })
  })

  describe('Invoice template data preparation', () => {
    it('should prepare template data structure', () => {
      const prepareTemplateData = (invoice) => {
        return {
          invoiceNumber: invoice.invoiceNumber,
          client: invoice.client,
          date: new Date().toISOString().split('T')[0],
          items: invoice.timeEntries.map(entry => ({
            description: entry.description,
            hours: entry.hours,
            rate: entry.rate || 0,
            total: (entry.hours * (entry.rate || 0))
          })),
          subtotal: invoice.timeEntries.reduce((sum, entry) => 
            sum + (entry.hours * (entry.rate || 0)), 0)
        }
      }
      
      const invoice = {
        invoiceNumber: 'INV-001',
        client: { name: 'Test Client' },
        timeEntries: [
          { description: 'Work A', hours: 2, rate: 50 },
          { description: 'Work B', hours: 3, rate: 75 }
        ]
      }
      
      const templateData = prepareTemplateData(invoice)
      expect(templateData.invoiceNumber).toBe('INV-001')
      expect(templateData.items).toHaveLength(2)
      expect(templateData.subtotal).toBe(325) // 100 + 225
    })
  })

  describe('Invoice filename creation', () => {
    it('should create safe invoice filenames', () => {
      expect(invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001')).toBe('Invoice-Test.Client-INV-001.pdf')
      expect(invoiceGenerator.createInvoiceFilename('Client/Company', 'INV-002')).toBe('Invoice-ClientCompany-INV-002.pdf')
      expect(invoiceGenerator.createInvoiceFilename('Client-With-Hyphens', 'INV-003')).toBe('Invoice-Client.With.Hyphens-INV-003.pdf')
      expect(invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001', 123)).toBe('Invoice-Test.Client-INV-001-123.pdf')
    })

    it('should handle special characters in client names', () => {
      expect(invoiceGenerator.createInvoiceFilename('Client<>:"\\|?*Name', 'INV-001')).toBe('Invoice-ClientName-INV-001.pdf')
      expect(invoiceGenerator.createInvoiceFilename('', 'INV-002')).toBe('Invoice-Unknown.Client-INV-002.pdf')
      expect(invoiceGenerator.createInvoiceFilename('   ', 'INV-003')).toBe('Invoice-Unknown.Client-INV-003.pdf')
    })

    it('should truncate long client names to 30 characters', () => {
      const longClientName = 'This is a very long client company name that exceeds 30 characters'
      const result = invoiceGenerator.createInvoiceFilename(longClientName, 'INV-001')
      const clientPart = result.split('-')[1] // Extract client part
      expect(clientPart.length).toBeLessThanOrEqual(30)
      expect(result).toBe('Invoice-This.is.a.very.long.client.com-INV-001.pdf')
    })

    it('should include timestamp when requested', () => {
      const withoutTimestamp = invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001', null, false)
      const withTimestamp = invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001', null, true)
      
      expect(withoutTimestamp).toBe('Invoice-Test.Client-INV-001.pdf')
      expect(withTimestamp).toMatch(/^Invoice-Test\.Client-INV-001-\d+\.pdf$/)
    })

    it('should include invoice ID when provided', () => {
      const withoutId = invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001')
      const withId = invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001', 123)
      
      expect(withoutId).toBe('Invoice-Test.Client-INV-001.pdf')
      expect(withId).toBe('Invoice-Test.Client-INV-001-123.pdf')
    })

    it('should include both invoice ID and timestamp when requested', () => {
      const result = invoiceGenerator.createInvoiceFilename('Test Client', 'INV-001', 123, true)
      expect(result).toMatch(/^Invoice-Test\.Client-INV-001-123-\d+\.pdf$/)
    })
  })
})
import { describe, it, expect } from 'vitest'

describe('Invoice Service - Business Logic', () => {
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
      const createInvoiceFilename = (clientName, invoiceNumber, includeTimestamp = false) => {
        // Sanitize client name: remove non-filename friendly characters, replace hyphens, truncate to 25 chars
        const sanitizedClientName = clientName
          .trim() // Trim first to handle whitespace-only strings
          .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
          .replace(/[-]/g, '') // Remove hyphens as requested
          .replace(/\s+/g, '_') // Replace spaces with underscores
          .substring(0, 25) // Truncate to 25 characters
        
        const finalClientName = sanitizedClientName || 'Unknown_Client'
        
        const timestamp = includeTimestamp ? `-${Date.now()}` : '';
        return `Invoice-${finalClientName}-${invoiceNumber}${timestamp}.pdf`;
      }
      
      expect(createInvoiceFilename('Test Client', 'INV-001')).toBe('Invoice-Test_Client-INV-001.pdf')
      expect(createInvoiceFilename('Client/Company', 'INV-002')).toBe('Invoice-ClientCompany-INV-002.pdf')
      expect(createInvoiceFilename('Client-With-Hyphens', 'INV-003')).toBe('Invoice-ClientWithHyphens-INV-003.pdf')
    })

    it('should handle special characters in client names', () => {
      const createInvoiceFilename = (clientName, invoiceNumber, includeTimestamp = false) => {
        const sanitizedClientName = clientName
          .trim() // Trim first to handle whitespace-only strings
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/[-]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 25)
        
        const finalClientName = sanitizedClientName || 'Unknown_Client'
        
        const timestamp = includeTimestamp ? `-${Date.now()}` : '';
        return `Invoice-${finalClientName}-${invoiceNumber}${timestamp}.pdf`;
      }
      
      expect(createInvoiceFilename('Client<>:"\\|?*Name', 'INV-001')).toBe('Invoice-ClientName-INV-001.pdf')
      expect(createInvoiceFilename('', 'INV-002')).toBe('Invoice-Unknown_Client-INV-002.pdf')
      expect(createInvoiceFilename('   ', 'INV-003')).toBe('Invoice-Unknown_Client-INV-003.pdf')
    })

    it('should truncate long client names to 25 characters', () => {
      const createInvoiceFilename = (clientName, invoiceNumber, includeTimestamp = false) => {
        const sanitizedClientName = clientName
          .trim() // Trim first to handle whitespace-only strings
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/[-]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 25)
        
        const finalClientName = sanitizedClientName || 'Unknown_Client'
        
        const timestamp = includeTimestamp ? `-${Date.now()}` : '';
        return `Invoice-${finalClientName}-${invoiceNumber}${timestamp}.pdf`;
      }
      
      const longClientName = 'This is a very long client company name that exceeds 25 characters'
      const result = createInvoiceFilename(longClientName, 'INV-001')
      const clientPart = result.split('-')[1] // Extract client part
      expect(clientPart.length).toBeLessThanOrEqual(25)
      expect(result).toBe('Invoice-This_is_a_very_long_clien-INV-001.pdf')
    })

    it('should include timestamp when requested', () => {
      const createInvoiceFilename = (clientName, invoiceNumber, includeTimestamp = false) => {
        const sanitizedClientName = clientName
          .trim() // Trim first to handle whitespace-only strings
          .replace(/[<>:"/\\|?*]/g, '')
          .replace(/[-]/g, '')
          .replace(/\s+/g, '_')
          .substring(0, 25)
        
        const finalClientName = sanitizedClientName || 'Unknown_Client'
        
        const timestamp = includeTimestamp ? `-${Date.now()}` : '';
        return `Invoice-${finalClientName}-${invoiceNumber}${timestamp}.pdf`;
      }
      
      const withoutTimestamp = createInvoiceFilename('Test Client', 'INV-001', false)
      const withTimestamp = createInvoiceFilename('Test Client', 'INV-001', true)
      
      expect(withoutTimestamp).toBe('Invoice-Test_Client-INV-001.pdf')
      expect(withTimestamp).toMatch(/^Invoice-Test_Client-INV-001-\d+\.pdf$/)
    })
  })
})
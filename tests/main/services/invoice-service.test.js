import { describe, it, expect, vi, beforeEach } from 'vitest';
import InvoiceGenerator from '../../../src/main/services/invoice-service.js';

// Force 'electron' to use our test double module
vi.mock('electron', async () => ({
  ...(await import('../../mocks/electron.js')),
}));

// Mock the other Node.js modules used
vi.mock('handlebars', () => ({
  default: { compile: vi.fn() },
  compile: vi.fn()
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn().mockReturnValue('/mock/path'),
    dirname: vi.fn().mockReturnValue('/mock')
  },
  join: vi.fn().mockReturnValue('/mock/path'),
  dirname: vi.fn().mockReturnValue('/mock')
}));

vi.mock('fs', () => ({
  default: { 
    readFileSync: vi.fn(), 
    writeFileSync: vi.fn(), 
    existsSync: vi.fn().mockReturnValue(true) 
  },
  readFileSync: vi.fn(), 
  writeFileSync: vi.fn(), 
  existsSync: vi.fn().mockReturnValue(true)
}));

vi.mock('os', () => ({
  default: { tmpdir: vi.fn().mockReturnValue('/tmp') },
  tmpdir: vi.fn().mockReturnValue('/tmp')
}));

describe('InvoiceGenerator', () => {
  let mockDatabase;
  let mockFileSystem;
  let mockPathUtil;
  let mockDialogService;
  let mockPdfRenderer;
  let mockTemplateCompiler;
  let mockDateProvider;
  let invoiceGenerator;

  beforeEach(() => {
    // Mock dependencies
    mockDatabase = {
      getSettings: vi.fn(),
      getTimeEntries: vi.fn(),
      getTimeEntriesByIds: vi.fn(),
      markAsInvoiced: vi.fn(),
      getInvoiceById: vi.fn(),
      voidInvoice: vi.fn(),
      unmarkAsInvoiced: vi.fn()
    };

    mockFileSystem = {
      readFileSync: vi.fn(),
      writeFileSync: vi.fn(),
      existsSync: vi.fn().mockReturnValue(true)
    };

    mockPathUtil = {
      join: vi.fn().mockReturnValue('/mock/path/invoice.hbs'),
      tmpdir: vi.fn().mockReturnValue('/tmp')
    };

    mockDialogService = {
      showSaveDialog: vi.fn()
    };

    mockPdfRenderer = {
      renderHtmlToPdf: vi.fn()
    };

    mockTemplateCompiler = {
      compile: vi.fn()
    };

    mockDateProvider = vi.fn().mockReturnValue(new Date('2024-01-15T10:00:00Z'));

    // Create instance with mocked dependencies
    invoiceGenerator = new InvoiceGenerator({
      database: mockDatabase,
      fileSystem: mockFileSystem,
      pathUtil: mockPathUtil,
      dialogService: mockDialogService,
      pdfRenderer: mockPdfRenderer,
      templateCompiler: mockTemplateCompiler,
      dateProvider: mockDateProvider,
      templatePath: '/mock/template.hbs'
    });
  });

  describe('constructor', () => {
    it('should throw error if database is not provided', () => {
      expect(() => {
        new InvoiceGenerator({});
      }).toThrow('Database dependency is required');
    });

    it('should use provided dependencies and inject defaults for others', () => {
      // This test verifies that when we provide some dependencies, 
      // the service uses them and creates defaults for others
      const customPathUtil = { join: vi.fn().mockReturnValue('/custom/path'), tmpdir: vi.fn() };
      const mockFileSystem = { existsSync: vi.fn().mockReturnValue(true) };
      const mockDialogService = { showSaveDialog: vi.fn() };
      
      const generator = new InvoiceGenerator({ 
        database: mockDatabase,
        pathUtil: customPathUtil,
        fileSystem: mockFileSystem,
        dialogService: mockDialogService,
        templatePath: '/custom/template.hbs'
      });
      
      expect(generator.database).toBe(mockDatabase);
      expect(generator.pathUtil).toBe(customPathUtil);
      expect(generator.fileSystem).toBeDefined();
      expect(generator.dialogService).toBe(mockDialogService);
      expect(generator.pdfRenderer).toBeDefined();
    });
  });

  describe('parseNetDays', () => {
    it('should return 30 for undefined terms', () => {
      expect(invoiceGenerator.parseNetDays()).toBe(30);
    });

    it('should return 0 for receipt terms', () => {
      expect(invoiceGenerator.parseNetDays('Due on receipt')).toBe(0);
    });

    it('should parse Net 15 correctly', () => {
      expect(invoiceGenerator.parseNetDays('Net 15')).toBe(15);
    });

    it('should parse Net30 correctly', () => {
      expect(invoiceGenerator.parseNetDays('Net30')).toBe(30);
    });

    it('should default to 30 for invalid terms', () => {
      expect(invoiceGenerator.parseNetDays('Invalid terms')).toBe(30);
    });
  });

  describe('getHourlyRateForEntry', () => {
    it('should return project hourly rate when available', () => {
      const entry = {
        project: { hourlyRate: 100 },
        client: { hourlyRate: 75 }
      };
      expect(invoiceGenerator.getHourlyRateForEntry(entry)).toBe(100);
    });

    it('should return client hourly rate when project rate not available', () => {
      const entry = {
        project: {},
        client: { hourlyRate: 75 }
      };
      expect(invoiceGenerator.getHourlyRateForEntry(entry)).toBe(75);
    });

    it('should return 0 when no rates available', () => {
      const entry = { project: {}, client: {} };
      expect(invoiceGenerator.getHourlyRateForEntry(entry)).toBe(0);
    });
  });

  describe('calculateTotalHours', () => {
    it('should calculate total hours correctly', () => {
      const timeEntries = [
        { duration: 120 }, // 2 hours
        { duration: 90 },  // 1.5 hours
        { duration: 60 }   // 1 hour
      ];
      expect(invoiceGenerator.calculateTotalHours(timeEntries)).toBe(4.5);
    });

    it('should handle entries with no duration', () => {
      const timeEntries = [
        { duration: 120 },
        {},
        { duration: 60 }
      ];
      expect(invoiceGenerator.calculateTotalHours(timeEntries)).toBe(3);
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate total amount correctly', () => {
      const timeEntries = [
        { 
          duration: 120, // 2 hours
          project: { hourlyRate: 100 }
        },
        { 
          duration: 60, // 1 hour
          client: { hourlyRate: 75 }
        }
      ];
      expect(invoiceGenerator.calculateTotalAmount(timeEntries)).toBe(275); // 200 + 75
    });
  });

  describe('validateTimeEntriesForInvoicing', () => {
    it('should not throw for entries with valid rates', () => {
      const timeEntries = [
        {
          id: 1,
          project: { hourlyRate: 100 },
          client: { name: 'Test Client' },
          startTime: '2024-01-15T10:00:00Z'
        }
      ];
      
      expect(() => {
        invoiceGenerator.validateTimeEntriesForInvoicing(timeEntries);
      }).not.toThrow();
    });

    it('should throw error for entries without rates', () => {
      const timeEntries = [
        {
          id: 1,
          project: {},
          client: { name: 'Test Client' },
          startTime: '2024-01-15T10:00:00Z'
        }
      ];
      
      expect(() => {
        invoiceGenerator.validateTimeEntriesForInvoicing(timeEntries);
      }).toThrow('Cannot generate invoice: The following time entries have no hourly rate set');
    });
  });

  describe('calculateDueDate', () => {
    it('should calculate due date correctly', () => {
      const settings = { invoice_terms: 'Net 15' };
      const invoiceDate = new Date(2024, 0, 15); // Local time January 15, 2024
      
      const dueDate = invoiceGenerator.calculateDueDate(settings, invoiceDate);
      expect(dueDate).toBe('1/30/2024'); // 15 days after Jan 15
    });

    it('should use dateProvider when no invoice date provided', () => {
      const settings = { invoice_terms: 'Net 30' };
      
      const dueDate = invoiceGenerator.calculateDueDate(settings);
      expect(mockDateProvider).toHaveBeenCalled();
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate invoice number with correct format', () => {
      // Mock Math.random to return predictable value
      const originalRandom = Math.random;
      Math.random = vi.fn().mockReturnValue(0.123);
      
      const invoiceNumber = invoiceGenerator.generateInvoiceNumber();
      expect(invoiceNumber).toBe('INV-20240115-123');
      
      Math.random = originalRandom;
    });
  });

  describe('createInvoiceFilename', () => {
    it('should create filename with sanitized client name', () => {
      const filename = invoiceGenerator.createInvoiceFilename(
        'Test Client & Co.',
        'INV-001',
        123
      );
      expect(filename).toBe('Invoice-Test.Client.Co.-INV-001-123.pdf');
    });

    it('should handle undefined client name', () => {
      const filename = invoiceGenerator.createInvoiceFilename(
        undefined,
        'INV-001',
        123
      );
      expect(filename).toBe('Invoice-Unknown.Client-INV-001-123.pdf');
    });

    it('should include timestamp when requested', () => {
      const originalNow = Date.now;
      Date.now = vi.fn().mockReturnValue(1705315200000);
      
      const filename = invoiceGenerator.createInvoiceFilename(
        'Test Client',
        'INV-001',
        123,
        true
      );
      expect(filename).toBe('Invoice-Test.Client-INV-001-123-1705315200000.pdf');
      
      Date.now = originalNow;
    });
  });

  describe('integration test - generateInvoice', () => {
    beforeEach(() => {
      // Setup comprehensive mocks for integration test
      mockDatabase.getSettings.mockResolvedValue({
        company_name: 'Test Company',
        company_email: 'test@example.com',
        invoice_terms: 'Net 30'
      });

      mockDatabase.getTimeEntries.mockResolvedValue([
        {
          id: 1,
          duration: 120,
          startTime: '2024-01-15T10:00:00Z',
          description: 'Development work',
          project: { hourlyRate: 100 },
          client: { 
            name: 'Test Client',
            email: 'client@example.com'
          }
        }
      ]);

      mockDatabase.markAsInvoiced.mockResolvedValue({ id: 456 });

      mockFileSystem.readFileSync.mockReturnValue('<html>{{clientName}}</html>');
      
      const mockTemplate = vi.fn().mockReturnValue('<html>Test Client</html>');
      mockTemplateCompiler.compile.mockReturnValue(mockTemplate);

      mockPdfRenderer.renderHtmlToPdf.mockResolvedValue(Buffer.from('pdf data'));

      mockDialogService.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/path/to/invoice.pdf'
      });
    });

    it('should generate invoice successfully with all mocked dependencies', async () => {
      const data = {
        client_id: '1',
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const result = await invoiceGenerator.generateInvoice(data);

      expect(result).toBe('/path/to/invoice.pdf');
      expect(mockDatabase.getSettings).toHaveBeenCalled();
      expect(mockDatabase.getTimeEntries).toHaveBeenCalledWith({
        clientId: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        isInvoiced: false
      });
      expect(mockDatabase.markAsInvoiced).toHaveBeenCalled();
      expect(mockFileSystem.writeFileSync).toHaveBeenCalledWith(
        '/path/to/invoice.pdf',
        expect.any(Buffer)
      );
    });
  });
});

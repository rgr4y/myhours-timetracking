const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { dialog, BrowserWindow } = require('electron');

class InvoiceGenerator {
  constructor(dependencies = {}) {
    // Validate dependencies first
    if (!dependencies.database) {
      throw new Error('Database dependency is required');
    }
    
    // Inject dependencies with defaults for production use
    this.database = dependencies.database;
    this.fileSystem = dependencies.fileSystem || {
      readFileSync: fs.readFileSync,
      writeFileSync: fs.writeFileSync,
      existsSync: fs.existsSync
    };
    this.pathUtil = dependencies.pathUtil || {
      join: path.join,
      tmpdir: os.tmpdir
    };
    this.dialogService = dependencies.dialogService || {
      showSaveDialog: dialog.showSaveDialog
    };
    this.pdfRenderer = dependencies.pdfRenderer || this.createDefaultPdfRenderer();
    this.templateCompiler = dependencies.templateCompiler || handlebars;
    this.dateProvider = dependencies.dateProvider || (() => new Date());
    
    // Template path configuration
    this.templatePath = dependencies.templatePath || 
      this.pathUtil.join(__dirname, '..', 'templates', 'invoice.hbs');
    
    this.ensureTemplateDirectory();
  }

  createDefaultPdfRenderer() {
    return {
      renderHtmlToPdf: async (html) => {
        const win = new BrowserWindow({ 
          show: false, 
          webPreferences: { sandbox: true } 
        });
        await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
        await new Promise(r => setTimeout(r, 50));
        const pdf = await win.webContents.printToPDF({ 
          printBackground: true, 
          pageSize: 'A4', 
          landscape: false 
        });
        win.destroy();
        return pdf;
      }
    };
  }

  // Parse common NET terms into a number of days (default 30)
  parseNetDays(terms) {
    if (!terms) return 30;
    const t = String(terms).toLowerCase();
    if (t.includes('receipt')) return 0;
    const m = t.match(/net\s*(\d+)/);
    if (m) return parseInt(m[1], 10) || 30;
    return 30;
  }

  ensureTemplateDirectory() {
    const templateDir = this.pathUtil.join(__dirname, '..', 'templates');
    if (!this.fileSystem.existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}. Please ensure the templates directory is included in the build.`);
    }
    
    if (!this.fileSystem.existsSync(this.templatePath)) {
      throw new Error(`Invoice template not found: ${this.templatePath}. Please ensure invoice.hbs is included in the build.`);
    }
  }

  async generateInvoice(data) {
    try {
      const settings = await this.database.getSettings();
      const timeEntries = await this.getUninvoicedTimeEntries(data);
      
      this.validateTimeEntriesForInvoicing(timeEntries);
      
      const invoiceData = await this.createInvoiceData(timeEntries, settings, data);
      const pdfPath = await this.generatePDF(invoiceData);
      
      return pdfPath;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  async getUninvoicedTimeEntries(data) {
    const filters = {
      clientId: parseInt(data.client_id),
      startDate: data.start_date,
      endDate: data.end_date
    };
    
    const timeEntries = await this.database.getTimeEntries({
      ...filters,
      isInvoiced: false
    });

    if (timeEntries.length === 0) {
      throw new Error('No uninvoiced time entries found for the specified criteria');
    }

    return timeEntries;
  }

  validateTimeEntriesForInvoicing(timeEntries) {
    const missingRates = [];
    
    for (const entry of timeEntries) {
      const hourlyRate = this.getHourlyRateForEntry(entry);
      
      if (!hourlyRate || hourlyRate <= 0) {
        missingRates.push({
          entryId: entry.id,
          clientName: entry.client?.name || 'Unknown Client',
          projectName: entry.project?.name || 'No Project',
          date: new Date(entry.startTime).toLocaleDateString()
        });
      }
    }
    
    if (missingRates.length > 0) {
      const errorDetails = missingRates.map(mr => 
        `• ${mr.date} - ${mr.clientName}/${mr.projectName}`
      ).join('\n');
      
      throw new Error(`Cannot generate invoice: The following time entries have no hourly rate set:\n\n${errorDetails}\n\nPlease set hourly rates for the client or project before generating an invoice.`);
    }
  }

  getHourlyRateForEntry(entry) {
    return entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
  }

  async createInvoiceData(timeEntries, settings, inputData) {
    const lineItems = this.groupEntriesByDay(timeEntries);
    const totalHours = this.calculateTotalHours(timeEntries);
    const totalAmount = this.calculateTotalAmount(timeEntries);
    const clientInfo = timeEntries[0]?.client;
    const displayRate = this.getDisplayRate(timeEntries);
    
    const periodStartDisplay = this.getOldestEntryDate(timeEntries);
    const periodEndDisplay = this.getNewestEntryDate(timeEntries);
    
    const invoiceNumber = inputData.invoice_number || this.generateInvoiceNumber();
    const currentDate = this.dateProvider();
    
    const templateData = {
      companyName: settings.company_name || settings.companyName || 'Your Company',
      companyEmail: settings.company_email || settings.companyEmail || '',
      companyPhone: settings.company_phone || settings.companyPhone || '',
      companyWebsite: settings.company_website || settings.companyWebsite || '',
      invoiceNumber: invoiceNumber,
      invoiceDate: currentDate.toLocaleDateString(),
      terms: settings.invoice_terms || settings.invoiceTerms || 'Net 30',
      dueDate: this.calculateDueDate(settings, currentDate),
      periodStart: periodStartDisplay,
      periodEnd: periodEndDisplay,
      clientName: clientInfo?.name || 'Unknown Client',
      clientEmail: clientInfo?.email || '',
      lineItems: lineItems,
      totalHours: totalHours.toFixed(2),
      hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
      totalAmount: totalAmount.toFixed(2)
    };

    // Mark entries as invoiced and get invoice ID
    const entryIds = timeEntries.map(entry => entry.id);
    const createdInvoice = await this.database.markAsInvoiced(entryIds, invoiceNumber, templateData);
    templateData.invoiceId = createdInvoice.id;

    return templateData;
  }

  calculateTotalHours(timeEntries) {
    return timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
  }

  calculateTotalAmount(timeEntries) {
    return timeEntries.reduce((sum, entry) => {
      const hours = (entry.duration || 0) / 60;
      const hourlyRate = this.getHourlyRateForEntry(entry);
      return sum + (hours * hourlyRate);
    }, 0);
  }

  getDisplayRate(timeEntries) {
    const rates = timeEntries
      .map(entry => this.getHourlyRateForEntry(entry))
      .filter(Boolean);
    const uniqueRates = [...new Set(rates)];
    return uniqueRates.length === 1 ? uniqueRates[0] : null;
  }

  calculateDueDate(settings, invoiceDate = null) {
    const baseDate = invoiceDate || this.dateProvider();
    const days = this.parseNetDays(settings.invoice_terms || settings.invoiceTerms || 'Net 30');
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toLocaleDateString();
  }

  async generateInvoiceFromSelectedEntries(data) {
    try {
      const settings = await this.database.getSettings();
      const timeEntries = await this.getSelectedTimeEntries(data);
      
      this.validateSelectedEntries(timeEntries);
      this.validateTimeEntriesForInvoicing(timeEntries);
      
      const invoiceData = await this.createInvoiceData(timeEntries, settings, data);
      const pdfPath = await this.generatePDF(invoiceData);
      
      return pdfPath;
    } catch (error) {
      console.error('Error generating invoice from selected entries:', error);
      throw error;
    }
  }

  async getSelectedTimeEntries(data) {
    if (!data.selectedEntryIds || data.selectedEntryIds.length === 0) {
      throw new Error('No time entries selected for invoice generation');
    }

    const timeEntries = await this.database.getTimeEntriesByIds(data.selectedEntryIds);

    if (timeEntries.length === 0) {
      throw new Error('No time entries found for the selected IDs');
    }

    return timeEntries;
  }

  validateSelectedEntries(timeEntries) {
    // Ensure all entries are uninvoiced
    const invoicedEntries = timeEntries.filter(entry => entry.isInvoiced);
    if (invoicedEntries.length > 0) {
      throw new Error('Some selected time entries have already been invoiced');
    }

    // Ensure all entries belong to the same client
    const clientIds = [...new Set(timeEntries.map(entry => entry.clientId))];
    if (clientIds.length > 1) {
      throw new Error('Cannot generate invoice for time entries from multiple clients');
    }
  }

  async generateInvoicePDF(invoice) {
    try {
      // Get settings for company info
      const settings = await this.database.getSettings();
      
      // Prepare line items from the invoice's time entries
      const lineItems = this.groupEntriesByDay(invoice.timeEntries);
      
      // Calculate totals
      let totalHours = 0;
      let totalAmount = invoice.totalAmount || 0;
      const ratesUsed = new Set();
      
      invoice.timeEntries.forEach(entry => {
        totalHours += (entry.duration || 0) / 60;
        const hourlyRate = this.getHourlyRateForEntry(entry);
        if (hourlyRate > 0) {
          ratesUsed.add(hourlyRate);
        }
      });
      
      const displayRate = ratesUsed.size === 1 ? Array.from(ratesUsed)[0] : null;
      
      // Prepare template data (support snake_case and camelCase settings)
      const templateData = {
        // Company info from settings
        companyName: settings.company_name || settings.companyName || 'Your Company',
        companyEmail: settings.company_email || settings.companyEmail || '',
        companyPhone: settings.company_phone || settings.companyPhone || '',
        companyWebsite: settings.company_website || settings.companyWebsite || '',
        terms: settings.invoice_terms || settings.invoiceTerms || 'Net 30',
        
        // Invoice info
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt).toLocaleDateString(),
        dueDate: (() => {
          if (invoice.dueDate) return new Date(invoice.dueDate).toLocaleDateString();
          const days = this.parseNetDays(settings.invoice_terms || settings.invoiceTerms || 'Net 30');
          const d = new Date(invoice.createdAt || Date.now());
          d.setDate(d.getDate() + days);
          return d.toLocaleDateString();
        })(),
        
        // Client info
        clientName: invoice.client?.name || 'Unknown Client',
        clientAddress: invoice.client?.address || '',
        clientEmail: invoice.client?.email || '',
        
        // Period info (stored as YYYY-MM-DD; format as local date without timezone shift)
        periodStart: invoice.periodStart ? this.formatYMDToLocale(invoice.periodStart) : '',
        periodEnd: invoice.periodEnd ? this.formatYMDToLocale(invoice.periodEnd) : '',
        
        // Line items and totals
        lineItems: lineItems,
        totalHours: totalHours.toFixed(2),
        hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
        totalAmount: totalAmount.toFixed(2)
      };

      // Generate PDF directly to temp file without showing save dialog
      const filePath = await this.generatePDFToFile(templateData);
      
      return filePath;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  // Regenerate invoice: void old one and create new from current time entries
  async regenerateInvoice(invoiceId) {
    try {
      // Get the existing invoice
      const existingInvoice = await this.database.getInvoiceById(invoiceId);
      if (!existingInvoice) {
        throw new Error('Invoice not found');
      }
      
      // Void the old invoice
      await this.database.voidInvoice(invoiceId);
      
      // Un-invoice the time entries so they can be re-invoiced
      const entryIds = existingInvoice.timeEntries.map(entry => entry.id);
      await this.database.unmarkAsInvoiced(entryIds);
      
      // Get current settings for company info
      const settings = await this.database.getSettings();
      
      // Get fresh time entries for the same period and client
      const timeEntries = await this.database.getTimeEntries({
        clientId: existingInvoice.clientId,
        startDate: existingInvoice.periodStart,
        endDate: existingInvoice.periodEnd,
        isInvoiced: false
      });

      if (timeEntries.length === 0) {
        throw new Error('No uninvoiced time entries found for regeneration');
      }

      this.validateTimeEntriesForInvoicing(timeEntries);

      // Create regenerated invoice data
      const templateData = await this.createRegeneratedInvoiceData(
        timeEntries, 
        settings, 
        existingInvoice
      );

      // Generate PDF with correct filename including new invoice ID
      const pdfPath = await this.generatePDF(templateData);

      return pdfPath;
    } catch (error) {
      console.error('Error regenerating invoice:', error);
      throw error;
    }
  }

  async createRegeneratedInvoiceData(timeEntries, settings, existingInvoice) {
    const lineItems = this.groupEntriesByDay(timeEntries);
    const totalHours = this.calculateTotalHours(timeEntries);
    const totalAmount = this.calculateTotalAmount(timeEntries);
    const clientInfo = timeEntries[0]?.client;
    const displayRate = this.getDisplayRate(timeEntries);
    
    const periodStartDisplay = this.getOldestEntryDate(timeEntries);
    const periodEndDisplay = this.getNewestEntryDate(timeEntries);
    
    const currentDate = this.dateProvider();
    
    const templateData = {
      companyName: settings.company_name || settings.companyName || 'Your Company',
      companyEmail: settings.company_email || settings.companyEmail || '',
      companyPhone: settings.company_phone || settings.companyPhone || '',
      companyWebsite: settings.company_website || settings.companyWebsite || '',
      invoiceNumber: existingInvoice.invoiceNumber, // Keep same invoice number
      invoiceDate: currentDate.toLocaleDateString(),
      terms: settings.invoice_terms || settings.invoiceTerms || 'Net 30',
      dueDate: this.calculateDueDate(settings, currentDate),
      periodStart: periodStartDisplay,
      periodEnd: periodEndDisplay,
      clientName: clientInfo?.name || 'Unknown Client',
      clientEmail: clientInfo?.email || '',
      lineItems: lineItems,
      totalHours: totalHours.toFixed(2),
      hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
      totalAmount: totalAmount.toFixed(2)
    };

    // Mark entries as invoiced and get new invoice ID
    const newEntryIds = timeEntries.map(entry => entry.id);
    const newInvoice = await this.database.markAsInvoiced(newEntryIds, templateData.invoiceNumber, templateData);
    templateData.invoiceId = newInvoice.id;

    return templateData;
  }

  // Generate PDF directly from stored template data - used for View button  
  async generatePDFFromStoredData(invoice) {
    try {
      if (!invoice.data) {
        throw new Error('No template data found for this invoice');
      }
      
      // Parse stored template data with safety checks
      let templateData;
      try {
        templateData = JSON.parse(invoice.data || '{}');
      } catch (parseError) {
        console.error('Error parsing invoice data:', parseError);
        throw new Error('Invalid invoice data format');
      }
      
      // Ensure required fields exist with fallbacks
      if (!templateData.clientName && invoice.client) {
        templateData.clientName = invoice.client.name;
      }
      if (!templateData.clientName) {
        templateData.clientName = 'Unknown Client';
      }
      
      // Ensure the invoice ID is included for filename generation
      templateData.invoiceId = invoice.id;
      
      // Generate PDF directly to temp file without user dialog
      const filePath = await this.generatePDFToFile(templateData);
      
      return filePath;
    } catch (error) {
      console.error('Error generating PDF from stored data:', error);
      throw error;
    }
  }

  // Generate PDF directly to temp file without user dialog - used for automated invoice operations
  async generatePDFToFile(templateData) {
    const template = this.templateCompiler.compile(this.fileSystem.readFileSync(this.templatePath, 'utf8'));
    const html = template(templateData);
    const buffer = await this.pdfRenderer.renderHtmlToPdf(html);
    const filename = this.createInvoiceFilename(templateData.clientName, templateData.invoiceNumber, templateData.invoiceId, true);
    const tempPath = this.pathUtil.join(this.pathUtil.tmpdir(), filename);
    this.fileSystem.writeFileSync(tempPath, buffer);
    return tempPath;
  }

  groupEntriesByDay(entries) {
    const days = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.startTime);
      const dayKey = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const hourlyRate = this.getHourlyRateForEntry(entry);
      
      if (!days[dayKey]) {
        days[dayKey] = {
          date: entryDate.toLocaleDateString(),
          descriptions: [],
          totalHours: 0,
          totalAmount: 0,
          rates: new Set() // Track different rates used
        };
      }
      
      const hours = (entry.duration || 0) / 60;
      const amount = hours * hourlyRate;
      
      // Add description if it exists and isn't already included
      if (entry.description && entry.description.trim()) {
        const desc = entry.description.trim();
        if (!days[dayKey].descriptions.includes(desc)) {
          days[dayKey].descriptions.push(desc);
        }
      }
      
      days[dayKey].totalHours += hours;
      days[dayKey].totalAmount += amount;
      days[dayKey].rates.add(hourlyRate);
    });
    
    // Convert to array and format descriptions as combined line items
    return Object.keys(days)
      .sort()
      .map(dayKey => {
        const day = days[dayKey];
        const ratesArray = Array.from(day.rates);
        const displayRate = ratesArray.length === 1 ? ratesArray[0] : 'Varies';
        
        return {
          date: day.date,
          description: day.descriptions.length > 0 
            ? day.descriptions.join('; ') 
            : 'General work',
          hours: day.totalHours.toFixed(2),
          rate: typeof displayRate === 'number' ? displayRate.toFixed(2) : displayRate,
          amount: day.totalAmount.toFixed(2)
        };
      });
  }

  // Generate PDF with user save dialog - used for interactive invoice creation
  async generatePDF(templateData) {
    const template = this.templateCompiler.compile(this.fileSystem.readFileSync(this.templatePath, 'utf8'));
    const html = template(templateData);
    const defaultFilename = this.createInvoiceFilename(templateData.clientName, templateData.invoiceNumber, templateData.invoiceId);
    const result = await this.dialogService.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) {
      throw new Error('PDF generation canceled by user');
    }
    const buffer = await this.pdfRenderer.renderHtmlToPdf(html);
    this.fileSystem.writeFileSync(result.filePath, buffer);
    return result.filePath;
  }

  generateInvoiceNumber() {
    const date = this.dateProvider();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  // Centralized invoice filename creation with sanitized client name
  createInvoiceFilename(clientName, invoiceNumber, invoiceId = null, includeTimestamp = false) {
    // Handle undefined/null/empty clientName safely
    const safeClientName = (clientName || 'Unknown Client').toString();
    
    // Sanitize client name: strip non-filename friendly chars, replace spaces with ., dashes with .
    const sanitizedClientName = safeClientName
      .trim() // Trim first to handle whitespace-only strings
      .replace(/[<>:"/\\|?*&]/g, '') // Remove invalid filename characters including &
      .replace(/\s+/g, '.') // Replace spaces with dots
      .replace(/[-]/g, '.') // Replace dashes with dots
      .substring(0, 30) // Truncate to 30 characters for better readability
    
    const finalClientName = sanitizedClientName || 'Unknown.Client'; // Fallback if empty after sanitization
    
    // Include invoice number and database ID if available
    const invoiceIdentifier = invoiceId ? `${invoiceNumber}-${invoiceId}` : invoiceNumber;
    const timestamp = includeTimestamp ? `-${Date.now()}` : '';
    return `Invoice-${finalClientName}-${invoiceIdentifier}${timestamp}.pdf`;
  }

  getOldestEntryDate(entries) {
    const dates = entries.map(entry => new Date(entry.startTime));
    return new Date(Math.min(...dates)).toLocaleDateString();
  }

  getNewestEntryDate(entries) {
    const dates = entries.map(entry => new Date(entry.startTime));
    return new Date(Math.max(...dates)).toLocaleDateString();
  }

  // Format a stored YYYY-MM-DD date string as a locale date without timezone drift
  formatYMDToLocale(ymd) {
    try {
      if (!ymd || typeof ymd !== 'string') return '';
      const [y, m, d] = ymd.split('-').map(n => parseInt(n, 10));
      if (!y || !m || !d) return '';
      const dt = new Date(y, m - 1, d); // local time
      return dt.toLocaleDateString();
    } catch (_) {
      return ymd;
    }
  }
}

module.exports = InvoiceGenerator;
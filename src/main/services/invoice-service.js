const handlebars = require('handlebars');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { dialog, BrowserWindow } = require('electron');

class InvoiceGenerator {
  constructor(database) {
    this.database = database;
    // Template is in src/main/templates, not src/main/services/templates
    this.templatePath = path.join(__dirname, '..', 'templates', 'invoice.hbs');
    this.ensureTemplateDirectory();
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
    const templateDir = path.join(__dirname, '..', 'templates');
    if (!fs.existsSync(templateDir)) {
      throw new Error(`Template directory not found: ${templateDir}. Please ensure the templates directory is included in the build.`);
    }
    
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Invoice template not found: ${this.templatePath}. Please ensure invoice.hbs is included in the build.`);
    }
  }

  async generateInvoice(data) {
    try {
      // Get settings for company info
      const settings = await this.database.getSettings();
      
      // Convert the form data to the correct filter format
      const filters = {
        clientId: parseInt(data.client_id),
        startDate: data.start_date,
        endDate: data.end_date
      };
      
      // Get uninvoiced time entries for the specified filters
      const timeEntries = await this.database.getTimeEntries({
        ...filters,
        isInvoiced: false
      });

      if (timeEntries.length === 0) {
        throw new Error('No uninvoiced time entries found for the specified criteria');
      }

      // Validate that all entries have hourly rates
      const missingRates = [];
      let totalAmount = 0;
      
      for (const entry of timeEntries) {
        // Try to get hourly rate from project, then client
        const hourlyRate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
        
        if (!hourlyRate || hourlyRate <= 0) {
          missingRates.push({
            entryId: entry.id,
            clientName: entry.client?.name || 'Unknown Client',
            projectName: entry.project?.name || 'No Project',
            date: new Date(entry.startTime).toLocaleDateString()
          });
        } else {
          const hours = (entry.duration || 0) / 60;
          totalAmount += hours * hourlyRate;
        }
      }
      
      if (missingRates.length > 0) {
        const errorDetails = missingRates.map(mr => 
          `• ${mr.date} - ${mr.clientName}/${mr.projectName}`
        ).join('\n');
        
        throw new Error(`Cannot generate invoice: The following time entries have no hourly rate set:\n\n${errorDetails}\n\nPlease set hourly rates for the client or project before generating an invoice.`);
      }

      // Group entries by day and combine descriptions
      const lineItems = this.groupEntriesByDay(timeEntries);
      
      // Calculate totals with proper hourly rates
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
      
      // Get the first entry's client info for the invoice header
      const clientInfo = timeEntries[0]?.client;
      
      // For display, use the most common hourly rate or indicate "varies"
      const rates = timeEntries.map(entry => entry.project?.hourlyRate || entry.client?.hourlyRate).filter(Boolean);
      const uniqueRates = [...new Set(rates)];
      const displayRate = uniqueRates.length === 1 ? uniqueRates[0] : null;

      // Determine actual period from the entries (not the raw filter)
      const periodStartDisplay = this.getOldestEntryDate(timeEntries);
      const periodEndDisplay = this.getNewestEntryDate(timeEntries);

      // Prepare template data (support snake_case and camelCase settings)
      const templateData = {
        companyName: settings.company_name || settings.companyName || 'Your Company',
        companyEmail: settings.company_email || settings.companyEmail || '',
        companyPhone: settings.company_phone || settings.companyPhone || '',
        companyWebsite: settings.company_website || settings.companyWebsite || '',
        invoiceNumber: data.invoice_number || this.generateInvoiceNumber(),
        invoiceDate: new Date().toLocaleDateString(),
        terms: settings.invoice_terms || settings.invoiceTerms || 'Net 30',
        dueDate: (() => {
          const days = this.parseNetDays(settings.invoice_terms || settings.invoiceTerms || 'Net 30');
          const d = new Date();
          d.setDate(d.getDate() + days);
          return d.toLocaleDateString();
        })(),
        // Always show the true invoice period based on included entries
        periodStart: periodStartDisplay,
        periodEnd: periodEndDisplay,
        clientName: clientInfo?.name || 'Unknown Client',
        clientEmail: clientInfo?.email || '',
        lineItems: lineItems,
        totalHours: totalHours.toFixed(2),
        hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
        totalAmount: totalAmount.toFixed(2)
      };

      // Generate PDF
      const pdfPath = await this.generatePDF(templateData);
      
      // Mark entries as invoiced and save template data
      const entryIds = timeEntries.map(entry => entry.id);
      await this.database.markAsInvoiced(entryIds, templateData.invoiceNumber, templateData);

      return pdfPath;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  async generateInvoiceFromSelectedEntries(data) {
    try {
      // Get settings for company info
      const settings = await this.database.getSettings();
      
      if (!data.selectedEntryIds || data.selectedEntryIds.length === 0) {
        throw new Error('No time entries selected for invoice generation');
      }

      // Get the selected time entries by ID
      const timeEntries = await this.database.getTimeEntriesByIds(data.selectedEntryIds);

      if (timeEntries.length === 0) {
        throw new Error('No time entries found for the selected IDs');
      }

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

      // Validate that all entries have hourly rates
      const missingRates = [];
      let totalAmount = 0;
      
      for (const entry of timeEntries) {
        // Try to get hourly rate from project, then client
        const hourlyRate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
        
        if (!hourlyRate || hourlyRate <= 0) {
          missingRates.push({
            entryId: entry.id,
            clientName: entry.client?.name || 'Unknown Client',
            projectName: entry.project?.name || 'No Project',
            date: new Date(entry.startTime).toLocaleDateString()
          });
        } else {
          const hours = (entry.duration || 0) / 60;
          totalAmount += hours * hourlyRate;
        }
      }
      
      if (missingRates.length > 0) {
        const errorDetails = missingRates.map(mr => 
          `• ${mr.date} - ${mr.clientName}/${mr.projectName}`
        ).join('\n');
        
        throw new Error(`Cannot generate invoice: The following time entries have no hourly rate set:\n\n${errorDetails}\n\nPlease set hourly rates for the client or project before generating an invoice.`);
      }

      // Group entries by day and combine descriptions
      const lineItems = this.groupEntriesByDay(timeEntries);
      
      // Calculate totals with proper hourly rates
      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60;
      
      // Get the first entry's client info for the invoice header
      const clientInfo = timeEntries[0]?.client;
      
      // For display, use the most common hourly rate or indicate "varies"
      const rates = timeEntries.map(entry => entry.project?.hourlyRate || entry.client?.hourlyRate).filter(Boolean);
      const uniqueRates = [...new Set(rates)];
      const displayRate = uniqueRates.length === 1 ? uniqueRates[0] : null;

      // Determine actual period from the entries
      const periodStartDisplay = this.getOldestEntryDate(timeEntries);
      const periodEndDisplay = this.getNewestEntryDate(timeEntries);

      // Prepare template data (support snake_case and camelCase settings)
      const templateData = {
        companyName: settings.company_name || settings.companyName || 'Your Company',
        companyEmail: settings.company_email || settings.companyEmail || '',
        companyPhone: settings.company_phone || settings.companyPhone || '',
        companyWebsite: settings.company_website || settings.companyWebsite || '',
        invoiceNumber: data.invoice_number || this.generateInvoiceNumber(),
        invoiceDate: new Date().toLocaleDateString(),
        terms: settings.invoice_terms || settings.invoiceTerms || 'Net 30',
        dueDate: (() => {
          const days = this.parseNetDays(settings.invoice_terms || settings.invoiceTerms || 'Net 30');
          const d = new Date();
          d.setDate(d.getDate() + days);
          return d.toLocaleDateString();
        })(),
        // Show the true invoice period based on included entries
        periodStart: periodStartDisplay,
        periodEnd: periodEndDisplay,
        clientName: clientInfo?.name || 'Unknown Client',
        clientEmail: clientInfo?.email || '',
        lineItems: lineItems,
        totalHours: totalHours.toFixed(2),
        hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
        totalAmount: totalAmount.toFixed(2)
      };

      // Generate PDF
      const pdfPath = await this.generatePDF(templateData);
      
      // Mark entries as invoiced and save template data
      const entryIds = timeEntries.map(entry => entry.id);
      await this.database.markAsInvoiced(entryIds, templateData.invoiceNumber, templateData);

      return pdfPath;
    } catch (error) {
      console.error('Error generating invoice from selected entries:', error);
      throw error;
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
        const hourlyRate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
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

  // Generate PDF directly to temp file without user dialog - used for automated invoice operations
  async generatePDFToFile(templateData) {
    const template = handlebars.compile(fs.readFileSync(this.templatePath, 'utf8'));
    const html = template(templateData);
    const buffer = await this.renderHtmlToPdf(html);
    const filename = this.createInvoiceFilename(templateData.clientName, templateData.invoiceNumber, true);
    const tempPath = path.join(os.tmpdir(), filename);
    fs.writeFileSync(tempPath, buffer);
    return tempPath;
  }

  groupEntriesByDay(entries) {
    const days = {};
    
    entries.forEach(entry => {
      const entryDate = new Date(entry.startTime);
      const dayKey = entryDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      const hourlyRate = entry.project?.hourlyRate || entry.client?.hourlyRate || 0;
      
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
    const template = handlebars.compile(fs.readFileSync(this.templatePath, 'utf8'));
    const html = template(templateData);
    const defaultFilename = this.createInvoiceFilename(templateData.clientName, templateData.invoiceNumber);
    const result = await dialog.showSaveDialog({
      defaultPath: defaultFilename,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    if (result.canceled || !result.filePath) {
      throw new Error('PDF generation canceled by user');
    }
    const buffer = await this.renderHtmlToPdf(html);
    fs.writeFileSync(result.filePath, buffer);
    return result.filePath;
  }

  async renderHtmlToPdf(html) {
    const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true } });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    await new Promise(r => setTimeout(r, 50));
    const pdf = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4', landscape: false });
    win.destroy();
    return pdf;
  }

  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  // Centralized invoice filename creation with sanitized client name
  createInvoiceFilename(clientName, invoiceNumber, includeTimestamp = false) {
    // Sanitize client name: remove non-filename friendly characters, replace hyphens, truncate to 25 chars
    const sanitizedClientName = clientName
      .trim() // Trim first to handle whitespace-only strings
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
      .replace(/[-]/g, '') // Remove hyphens as requested
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 25) // Truncate to 25 characters
    
    const finalClientName = sanitizedClientName || 'Unknown_Client'; // Fallback if empty after sanitization
    
    const timestamp = includeTimestamp ? `-${Date.now()}` : '';
    return `Invoice-${finalClientName}-${invoiceNumber}${timestamp}.pdf`;
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

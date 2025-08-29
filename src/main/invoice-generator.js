const handlebars = require('handlebars');
const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { dialog } = require('electron');

class InvoiceGenerator {
  constructor(database) {
    this.database = database;
    this.templatePath = path.join(__dirname, 'templates', 'invoice.hbs');
    this.ensureTemplateDirectory();
  }

  ensureTemplateDirectory() {
    const templateDir = path.join(__dirname, 'templates');
    if (!fs.existsSync(templateDir)) {
      fs.mkdirSync(templateDir, { recursive: true });
    }
    
    if (!fs.existsSync(this.templatePath)) {
      this.createDefaultTemplate();
    }
  }

  createDefaultTemplate() {
    const defaultTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 40px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        
        .company-info h1 {
            margin: 0;
            color: #2c3e50;
            font-size: 28px;
        }
        
        .company-info p {
            margin: 5px 0;
            color: #7f8c8d;
        }
        
        .invoice-info {
            text-align: right;
        }
        
        .invoice-info h2 {
            margin: 0;
            color: #e74c3c;
            font-size: 24px;
        }
        
        .client-info {
            margin-bottom: 30px;
        }
        
        .client-info h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        
        .summary {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        
        .summary-item {
            text-align: center;
        }
        
        .summary-item .value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .summary-item .label {
            color: #7f8c8d;
            font-size: 14px;
            margin-top: 5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #34495e;
            color: white;
            font-weight: 500;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        .week-header {
            background-color: #ecf0f1 !important;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .text-right {
            text-align: right;
        }
        
        .total-row {
            background-color: #2c3e50 !important;
            color: white;
            font-weight: bold;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #7f8c8d;
            font-size: 14px;
        }
        
        .amount {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>{{companyName}}</h1>
            <p>{{companyEmail}}</p>
            <p>{{companyPhone}}</p>
            <p>{{companyWebsite}}</p>
        </div>
        <div class="invoice-info">
            <h2>INVOICE</h2>
            <p><strong>Invoice #:</strong> {{invoiceNumber}}</p>
            <p><strong>Date:</strong> {{invoiceDate}}</p>
            <p><strong>Period:</strong> {{periodStart}} - {{periodEnd}}</p>
        </div>
    </div>

    <div class="client-info">
        <h3>Bill To:</h3>
        <p><strong>{{clientName}}</strong></p>
        {{#if clientEmail}}<p>{{clientEmail}}</p>{{/if}}
    </div>

    <div class="summary">
        <div class="summary-item">
            <div class="value">{{totalHours}}</div>
            <div class="label">Total Hours</div>
        </div>
        <div class="summary-item">
            <div class="value">\${{hourlyRate}}</div>
            <div class="label">Hourly Rate</div>
        </div>
        <div class="summary-item">
            <div class="value">\${{totalAmount}}</div>
            <div class="label">Total Amount</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Description</th>
                <th class="text-right">Hours</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
            </tr>
        </thead>
        <tbody>
            {{#each lineItems}}
            <tr>
                <td>{{this.date}}</td>
                <td>{{this.description}}</td>
                <td class="text-right">{{this.hours}}</td>
                <td class="text-right">\${{this.rate}}</td>
                <td class="text-right amount">\${{this.amount}}</td>
            </tr>
            {{/each}}
            <tr class="total-row">
                <td colspan="2"><strong>TOTAL</strong></td>
                <td class="text-right"><strong>{{totalHours}}</strong></td>
                <td></td>
                <td class="text-right"><strong>\${{totalAmount}}</strong></td>
            </tr>
        </tbody>
    </table>

    <div class="footer">
        <p>Thank you for your business!</p>
        <p>Payment is due within 30 days of invoice date.</p>
    </div>
</body>
</html>`;

    fs.writeFileSync(this.templatePath, defaultTemplate);
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

      // Prepare template data
      const templateData = {
        companyName: settings.company_name || settings.companyName || 'Your Company',
        companyEmail: settings.company_email || settings.companyEmail || '',
        companyPhone: settings.company_phone || settings.companyPhone || '',
        companyWebsite: settings.company_website || settings.companyWebsite || '',
        invoiceNumber: data.invoice_number || this.generateInvoiceNumber(),
        invoiceDate: new Date().toLocaleDateString(),
        periodStart: data.start_date || this.getOldestEntryDate(timeEntries),
        periodEnd: data.end_date || this.getNewestEntryDate(timeEntries),
        clientName: clientInfo?.name || 'Unknown Client',
        clientEmail: clientInfo?.email || '',
        lineItems: lineItems,
        totalHours: totalHours.toFixed(2),
        hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
        totalAmount: totalAmount.toFixed(2)
      };

      // Generate PDF
      const pdfPath = await this.generatePDF(templateData);
      
      // Mark entries as invoiced
      const entryIds = timeEntries.map(entry => entry.id);
      await this.database.markAsInvoiced(entryIds, templateData.invoiceNumber);

      return pdfPath;
    } catch (error) {
      console.error('Error generating invoice:', error);
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
      
      // Prepare template data
      const templateData = {
        // Company info from settings
        companyName: settings?.companyName || 'Your Company',
        companyAddress: settings?.companyAddress || 'Your Address',
        companyPhone: settings?.companyPhone || 'Your Phone',
        companyEmail: settings?.companyEmail || 'your@email.com',
        
        // Invoice info
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt).toLocaleDateString(),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        
        // Client info
        clientName: invoice.client?.name || 'Unknown Client',
        clientAddress: invoice.client?.address || '',
        clientEmail: invoice.client?.email || '',
        
        // Period info
        periodStart: invoice.periodStart ? new Date(invoice.periodStart).toLocaleDateString() : '',
        periodEnd: invoice.periodEnd ? new Date(invoice.periodEnd).toLocaleDateString() : '',
        
        // Line items and totals
        lineItems: lineItems,
        totalHours: totalHours.toFixed(2),
        hourlyRate: displayRate ? displayRate.toFixed(2) : 'Varies',
        totalAmount: totalAmount.toFixed(2)
      };

      // Generate PDF
      const pdfPath = await this.generatePDF(templateData);
      
      return pdfPath;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
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

  async generatePDF(templateData) {
    const template = handlebars.compile(fs.readFileSync(this.templatePath, 'utf8'));
    const html = template(templateData);
    
    // Find Chrome executable path
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.CHROME_PATH,
      process.env.CHROMIUM_PATH
    ].filter(Boolean);
    
    let executablePath = null;
    for (const chromePath of chromePaths) {
      if (fs.existsSync(chromePath)) {
        executablePath = chromePath;
        break;
      }
    }
    
    if (!executablePath) {
      throw new Error('Chrome/Chromium not found. Please install Google Chrome or set CHROME_PATH environment variable.');
    }
    
    const browser = await puppeteer.launch({ 
      headless: 'new',
      executablePath: executablePath
    });
    const page = await browser.newPage();
    await page.setContent(html);
    
    // Show save dialog
    const result = await dialog.showSaveDialog({
      defaultPath: `Invoice-${templateData.invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });
    
    if (result.canceled) {
      await browser.close();
      throw new Error('PDF generation canceled by user');
    }
    
    await page.pdf({
      path: result.filePath,
      format: 'A4',
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    return result.filePath;
  }

  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}${day}-${random}`;
  }

  getOldestEntryDate(entries) {
    const dates = entries.map(entry => new Date(entry.startTime));
    return new Date(Math.min(...dates)).toLocaleDateString();
  }

  getNewestEntryDate(entries) {
    const dates = entries.map(entry => new Date(entry.startTime));
    return new Date(Math.max(...dates)).toLocaleDateString();
  }
}

module.exports = InvoiceGenerator;

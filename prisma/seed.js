const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function ensureMigrations() {
  // Only run migrations in development
  // This ensures that the database schema is up-to-date before seeding
  // In production, migrations should be applied during deployment, not during seeding
  const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    console.log('🔄 Checking database migrations...');
    try {
      // When running under Electron (ELECTRON_RUN_AS_NODE is set), we need to use a different approach
      // because npx prisma may not work properly in the Electron context
      if (process.env.ELECTRON_RUN_AS_NODE) {
        console.log('⚡ Running under Electron - using prisma migrate deploy instead of migrate dev');
        // In Electron context, use migrate deploy which applies all pending migrations
        // without trying to generate a new one or run the seed script
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined } // Remove Electron flag for subprocess
        });
      } else {
        // Run migrate dev to ensure database is up to date
        // This is safe - it only applies missing migrations and won't recreate if already applied
        // The --skip-seed flag prevents infinite recursion since this seed script calls migrate dev
        execSync('npx prisma migrate dev --skip-seed', {
          stdio: 'inherit',
          cwd: process.cwd()
        });
      }
      console.log('✅ Database migrations are up to date');
    } catch (error) {
      console.error('❌ Failed to apply migrations:', error.message);
      throw error;
    }
  } else {
    console.log('📦 Production mode: Skipping migration check (migrations should be applied during deployment)');
  }
}

async function main() {
  // Ensure migrations are applied before seeding
  await ensureMigrations();
  
  console.log('🌱 Starting database seed...');

  // ---- Date helpers (relative to today) ----
  const today = new Date();
  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  const ymd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const atHour = (d, hour = 9) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0);
  const clampDay = (d, monthInfo) => Math.min(d, monthInfo.end.getDate());
  const monthInfo = (offset = 0) => {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const start = startOfMonth(base);
    const end = endOfMonth(base);
    return { start, end };
  };
  const lastMonth = monthInfo(-1);
  const thisMonth = monthInfo(0);
  const dayOf = (mi, day) => new Date(mi.start.getFullYear(), mi.start.getMonth(), clampDay(day, mi));
  
  // Helper to ensure entries are always in the past
  const daysInThisMonthSoFar = today.getDate();
  const hasEnoughDaysThisMonth = daysInThisMonthSoFar >= 7;
  
  // Counter for distributing entries when we have limited days
  let thisMonthDayCounter = 1;
  
  const dayOfThisMonth = (day) => {
    if (!hasEnoughDaysThisMonth) {
      // Limited days in this month - fill the actual past days first, then overflow to lastMonth
      if (thisMonthDayCounter < daysInThisMonthSoFar) { // Before today
        const actualDay = thisMonthDayCounter;
        thisMonthDayCounter++;
        return dayOf(thisMonth, actualDay);
      } else {
        // Overflow entries go to lastMonth with random days
        const randomDay = Math.floor(Math.random() * 28) + 1; // Random day 1-28 (safe for all months)
        return dayOf(lastMonth, randomDay);
      }
    } else {
      // Enough days in this month, use before today
      const targetDay = Math.min(day, today.getDate() - 1); // Always before today
      return targetDay > 0 ? dayOf(thisMonth, targetDay) : dayOf(lastMonth, day); // Fallback to lastMonth
    }
  };
  const invNum = (d, seq) => `INV-${ymd(d).replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;

  // Check if database already has data
  const existingClients = await prisma.client.count();
  if (existingClients > 0) {
    console.log('📊 Database already contains data. Skipping seed to avoid duplicates.');
    console.log(`   Found ${existingClients} existing clients.`);
    return;
  }

  // Create settings (use upsert to handle potential duplicates)
  const settingsData = [
    { key: 'company_name', value: 'Your Company Name' },
    { key: 'company_email', value: 'hello@yourcompany.com' },
    { key: 'company_phone', value: '+1 (555) 123-4567' },
    { key: 'company_website', value: 'www.yourcompany.com' },
    { key: 'invoice_terms', value: 'Net 30' },
  ];
  
  for (const setting of settingsData) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('⚙️  Created settings');

  // Create clients with different hourly rates
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        hourlyRate: 150.00
      }
    }),
    prisma.client.create({
      data: {
        name: 'TechStart Inc',
        email: 'finance@techstart.io',
        hourlyRate: 125.00
      }
    }),
    prisma.client.create({
      data: {
        name: 'Design Studio Plus',
        email: 'payments@designstudio.com',
        hourlyRate: 100.00
      }
    }),
    prisma.client.create({
      data: {
        name: 'Local Business',
        email: 'owner@localbiz.com',
        hourlyRate: 75.00
      }
    })
  ]);
  console.log('👥 Created clients');

  // Create projects for each client
  const projects = await Promise.all([
    // Acme Corporation projects
    prisma.project.create({
      data: {
        name: 'E-commerce Platform',
        clientId: clients[0].id,
        hourlyRate: 175.00 // Override client rate
      }
    }),
    prisma.project.create({
      data: {
        name: 'Mobile App Development',
        clientId: clients[0].id,
        // Uses client rate (150.00)
      }
    }),
    
    // TechStart Inc projects  
    prisma.project.create({
      data: {
        name: 'SaaS Dashboard',
        clientId: clients[1].id,
        hourlyRate: 140.00 // Override client rate
      }
    }),
    prisma.project.create({
      data: {
        name: 'API Integration',
        clientId: clients[1].id,
        // Uses client rate (125.00)
      }
    }),

    // Design Studio Plus projects
    prisma.project.create({
      data: {
        name: 'Brand Identity',
        clientId: clients[2].id,
        // Uses client rate (100.00)
      }
    }),
    prisma.project.create({
      data: {
        name: 'Website Redesign',
        clientId: clients[2].id,
        hourlyRate: 90.00 // Override client rate
      }
    }),

    // Local Business projects
    prisma.project.create({
      data: {
        name: 'Website Development',
        clientId: clients[3].id,
        // Uses client rate (75.00)
      }
    })
  ]);
  console.log('📁 Created projects');

  // Create tasks for projects
  const tasks = await Promise.all([
    // E-commerce Platform tasks
    prisma.task.create({
      data: {
        name: 'Frontend Development',
        projectId: projects[0].id,
        description: 'React frontend for e-commerce platform'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Backend API',
        projectId: projects[0].id,
        description: 'REST API development'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Database Design',
        projectId: projects[0].id,
        description: 'Database schema and optimization'
      }
    }),

    // Mobile App Development tasks
    prisma.task.create({
      data: {
        name: 'iOS Development',
        projectId: projects[1].id,
        description: 'Native iOS app development'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Android Development',
        projectId: projects[1].id,
        description: 'Native Android app development'
      }
    }),

    // SaaS Dashboard tasks
    prisma.task.create({
      data: {
        name: 'Dashboard UI',
        projectId: projects[2].id,
        description: 'User interface for dashboard'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Analytics Integration',
        projectId: projects[2].id,
        description: 'Integrate analytics tracking'
      }
    }),

    // API Integration tasks
    prisma.task.create({
      data: {
        name: 'Third-party APIs',
        projectId: projects[3].id,
        description: 'Integrate payment and shipping APIs'
      }
    }),

    // Brand Identity tasks
    prisma.task.create({
      data: {
        name: 'Logo Design',
        projectId: projects[4].id,
        description: 'Create brand logo and variations'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Brand Guidelines',
        projectId: projects[4].id,
        description: 'Develop brand style guide'
      }
    }),

    // Website Redesign tasks
    prisma.task.create({
      data: {
        name: 'UI/UX Design',
        projectId: projects[5].id,
        description: 'Design new website interface'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Development',
        projectId: projects[5].id,
        description: 'Frontend development for new design'
      }
    }),

    // Website Development tasks
    prisma.task.create({
      data: {
        name: 'WordPress Setup',
        projectId: projects[6].id,
        description: 'WordPress installation and configuration'
      }
    }),
    prisma.task.create({
      data: {
        name: 'Custom Theme',
        projectId: projects[6].id,
        description: 'Custom WordPress theme development'
      }
    })
  ]);
  console.log('📋 Created tasks');

  // Create sample invoices with proper template data
  // Invoices for last month (entries from last month will be marked invoiced)
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        invoiceNumber: invNum(lastMonth.start, 1),
        clientId: clients[0].id,
        totalAmount: 8750.0,
        periodStart: ymd(lastMonth.start),
        periodEnd: ymd(lastMonth.end),
        status: 'generated',
        dueDate: addDays(lastMonth.end, 14),
        createdAt: lastMonth.start,
        data: JSON.stringify({
          invoiceId: 1,
          invoiceNumber: invNum(lastMonth.start, 1),
          clientName: clients[0].name,
          clientEmail: clients[0].email,
          periodStart: ymd(lastMonth.start),
          periodEnd: ymd(lastMonth.end),
          dueDate: ymd(addDays(lastMonth.end, 14)),
          totalAmount: 8750.0,
          companyName: 'Your Company Name',
          companyEmail: 'hello@yourcompany.com',
          companyPhone: '+1 (555) 123-4567',
          companyWebsite: 'www.yourcompany.com',
          terms: 'Net 30',
          items: [
            {
              description: 'E-commerce Platform Development',
              hours: 25.5,
              rate: 175.0,
              amount: 4462.5
            },
            {
              description: 'Mobile App Development',
              hours: 15.5,
              rate: 150.0,
              amount: 2325.0
            }
          ]
        })
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: invNum(addDays(lastMonth.start, 14), 2),
        clientId: clients[1].id,
        totalAmount: 5250.0,
        periodStart: ymd(lastMonth.start),
        periodEnd: ymd(lastMonth.end),
        status: 'generated',
        dueDate: addDays(lastMonth.end, 14),
        createdAt: addDays(lastMonth.start, 14),
        data: JSON.stringify({
          invoiceId: 2,
          invoiceNumber: invNum(addDays(lastMonth.start, 14), 2),
          clientName: clients[1].name,
          clientEmail: clients[1].email,
          periodStart: ymd(lastMonth.start),
          periodEnd: ymd(lastMonth.end),
          dueDate: ymd(addDays(lastMonth.end, 14)),
          totalAmount: 5250.0,
          companyName: 'Your Company Name',
          companyEmail: 'hello@yourcompany.com',
          companyPhone: '+1 (555) 123-4567',
          companyWebsite: 'www.yourcompany.com',
          terms: 'Net 30',
          items: [
            {
              description: 'SaaS Dashboard Development',
              hours: 24.0,
              rate: 140.0,
              amount: 3360.0
            },
            {
              description: 'API Integration',
              hours: 15.0,
              rate: 125.0,
              amount: 1875.0
            }
          ]
        })
      },
    }),
    prisma.invoice.create({
      data: {
        invoiceNumber: invNum(addDays(lastMonth.start, 1), 3),
        clientId: clients[2].id,
        totalAmount: 3600.0,
        periodStart: ymd(lastMonth.start),
        periodEnd: ymd(lastMonth.end),
        status: 'generated',
        dueDate: addDays(lastMonth.end, 14),
        createdAt: addDays(lastMonth.start, 1),
        data: JSON.stringify({
          invoiceId: 3,
          invoiceNumber: invNum(addDays(lastMonth.start, 1), 3),
          clientName: clients[2].name,
          clientEmail: clients[2].email,
          periodStart: ymd(lastMonth.start),
          periodEnd: ymd(lastMonth.end),
          dueDate: ymd(addDays(lastMonth.end, 14)),
          totalAmount: 3600.0,
          companyName: 'Your Company Name',
          companyEmail: 'hello@yourcompany.com',
          companyPhone: '+1 (555) 123-4567',
          companyWebsite: 'www.yourcompany.com',
          terms: 'Net 30',
          items: [
            {
              description: 'Brand Identity Design',
              hours: 7.0,
              rate: 100.0,
              amount: 700.0
            },
            {
              description: 'Website Redesign',
              hours: 32.0,
              rate: 90.0,
              amount: 2880.0
            }
          ]
        })
      },
    }),
  ]);
  console.log('🧾 Created invoices');

  // Helper function to create time entries
  const createTimeEntry = (clientId, projectId, taskId, when, hours, description, isInvoiced = false, invoiceId = null) => {
    const startTime = atHour(when, 9);
    const endTime = new Date(startTime.getTime() + (hours * 60 * 60 * 1000));
    
    return {
      clientId,
      projectId,
      taskId,
      description,
      startTime,
      endTime,
      duration: hours * 60, // Convert hours to minutes
      isActive: false,
      isInvoiced,
      invoiceId
    };
  };

  // Create time entries - mix of invoiced and uninvoiced
  const timeEntries = [
    // Last month entries (already invoiced)
    createTimeEntry(clients[0].id, projects[0].id, tasks[0].id, dayOf(lastMonth, 1), 8, 'Frontend component development', true, invoices[0].id),
    createTimeEntry(clients[0].id, projects[0].id, tasks[1].id, dayOf(lastMonth, 2), 6, 'API endpoint creation', true, invoices[0].id),
    createTimeEntry(clients[0].id, projects[0].id, tasks[2].id, dayOf(lastMonth, 3), 4, 'Database schema design', true, invoices[0].id),
    createTimeEntry(clients[0].id, projects[1].id, tasks[3].id, dayOf(lastMonth, 5), 8, 'iOS app development', true, invoices[0].id),
    createTimeEntry(clients[0].id, projects[1].id, tasks[4].id, dayOf(lastMonth, 8), 7.5, 'Android app development', true, invoices[0].id),

    createTimeEntry(clients[1].id, projects[2].id, tasks[5].id, dayOf(lastMonth, 10), 6, 'Dashboard layout design', true, invoices[1].id),
    createTimeEntry(clients[1].id, projects[2].id, tasks[6].id, dayOf(lastMonth, 12), 4, 'Analytics setup', true, invoices[1].id),
    createTimeEntry(clients[1].id, projects[3].id, tasks[7].id, dayOf(lastMonth, 15), 8, 'Payment API integration', true, invoices[1].id),
    createTimeEntry(clients[1].id, projects[3].id, tasks[7].id, dayOf(lastMonth, 18), 6, 'Shipping API integration', true, invoices[1].id),
    createTimeEntry(clients[1].id, projects[2].id, tasks[5].id, dayOf(lastMonth, 20), 6, 'Dashboard refinements', true, invoices[1].id),

    createTimeEntry(clients[2].id, projects[4].id, tasks[8].id, dayOf(lastMonth, 22), 4, 'Logo concepts', true, invoices[2].id),
    createTimeEntry(clients[2].id, projects[4].id, tasks[9].id, dayOf(lastMonth, 25), 3, 'Brand guidelines draft', true, invoices[2].id),
    createTimeEntry(clients[2].id, projects[5].id, tasks[10].id, dayOf(lastMonth, 28), 6, 'Website mockups', true, invoices[2].id),
    createTimeEntry(clients[2].id, projects[5].id, tasks[11].id, dayOf(lastMonth, 30), 8, 'Frontend implementation', true, invoices[2].id),

    // This month entries (NOT invoiced yet - available for new invoices)
    createTimeEntry(clients[0].id, projects[0].id, tasks[0].id, dayOfThisMonth(1), 7, 'React component optimization'),
    createTimeEntry(clients[0].id, projects[0].id, tasks[1].id, dayOfThisMonth(2), 6.5, 'API performance tuning'),
    createTimeEntry(clients[0].id, projects[1].id, tasks[3].id, dayOfThisMonth(5), 8, 'iOS bug fixes'),
    createTimeEntry(clients[0].id, projects[1].id, tasks[4].id, dayOfThisMonth(6), 7, 'Android testing'),
    createTimeEntry(clients[0].id, projects[0].id, tasks[2].id, dayOfThisMonth(8), 5, 'Database optimization'),
    createTimeEntry(clients[0].id, projects[0].id, tasks[0].id, dayOfThisMonth(12), 8, 'Frontend testing'),
    createTimeEntry(clients[0].id, projects[1].id, tasks[3].id, dayOfThisMonth(15), 6, 'iOS app store preparation'),

    createTimeEntry(clients[1].id, projects[2].id, tasks[5].id, dayOfThisMonth(3), 7, 'Dashboard feature additions'),
    createTimeEntry(clients[1].id, projects[2].id, tasks[6].id, dayOfThisMonth(7), 5, 'Advanced analytics'),
    createTimeEntry(clients[1].id, projects[3].id, tasks[7].id, dayOfThisMonth(10), 6, 'API documentation'),
    createTimeEntry(clients[1].id, projects[2].id, tasks[5].id, dayOfThisMonth(14), 8, 'User management system'),
    createTimeEntry(clients[1].id, projects[3].id, tasks[7].id, dayOfThisMonth(18), 4, 'API testing'),

    createTimeEntry(clients[2].id, projects[4].id, tasks[8].id, dayOfThisMonth(4), 3, 'Logo refinements'),
    createTimeEntry(clients[2].id, projects[4].id, tasks[9].id, dayOfThisMonth(9), 4, 'Brand guidelines finalization'),
    createTimeEntry(clients[2].id, projects[5].id, tasks[10].id, dayOfThisMonth(11), 5, 'Responsive design'),
    createTimeEntry(clients[2].id, projects[5].id, tasks[11].id, dayOfThisMonth(16), 7, 'Performance optimization'),
    createTimeEntry(clients[2].id, projects[5].id, tasks[10].id, dayOfThisMonth(20), 4, 'Mobile optimization'),

    createTimeEntry(clients[3].id, projects[6].id, tasks[12].id, dayOfThisMonth(5), 4, 'WordPress setup and configuration'),
    createTimeEntry(clients[3].id, projects[6].id, tasks[13].id, dayOfThisMonth(12), 6, 'Custom theme development'),
    createTimeEntry(clients[3].id, projects[6].id, tasks[12].id, dayOfThisMonth(19), 3, 'Plugin installation'),
    createTimeEntry(clients[3].id, projects[6].id, tasks[13].id, dayOfThisMonth(22), 5, 'Theme customization'),
    createTimeEntry(clients[3].id, projects[6].id, tasks[12].id, dayOfThisMonth(26), 2, 'Final testing'),

    // Create some partially invoiced days to test the "Partially Invoiced" feature
    // Day with mixed invoice status
    createTimeEntry(clients[0].id, projects[0].id, tasks[0].id, dayOfThisMonth(21), 4, 'Morning work - invoiced', true),
    createTimeEntry(clients[0].id, projects[0].id, tasks[1].id, dayOfThisMonth(21), 3, 'Afternoon work - not invoiced', false),
    createTimeEntry(clients[1].id, projects[2].id, tasks[5].id, dayOfThisMonth(21), 2, 'Evening work - not invoiced', false),
    
    // Another day with mixed invoice status
    createTimeEntry(clients[2].id, projects[4].id, tasks[8].id, dayOfThisMonth(23), 5, 'Design work - invoiced', true),
    createTimeEntry(clients[2].id, projects[5].id, tasks[10].id, dayOfThisMonth(23), 3, 'Development work - not invoiced', false),

    // Recent entries (last few days of this month)
    createTimeEntry(clients[0].id, projects[0].id, tasks[0].id, dayOfThisMonth(Math.max(1, today.getDate() - 2)), 4, 'Code review and cleanup'),
    createTimeEntry(clients[1].id, projects[2].id, tasks[5].id, dayOfThisMonth(Math.max(1, today.getDate() - 1)), 6, 'Dashboard final touches'),
  ];

  await prisma.timeEntry.createMany({
    data: timeEntries
  });

  console.log('⏰ Created time entries');

  console.log('✅ Database seed completed successfully!');
  console.log(`📊 Created:
  - ${clients.length} clients
  - ${projects.length} projects  
  - ${tasks.length} tasks
  - ${invoices.length} invoices
  - ${timeEntries.length} time entries`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

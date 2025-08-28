const sampleData = {
  clients: [
    {
      id: 1,
      name: "Acme Corporation",
      email: "billing@acme.com",
      hourly_rate: 75,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      name: "Tech Startup Inc",
      email: "finance@techstartup.io",
      hourly_rate: 85,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  
  projects: [
    {
      id: 1,
      client_id: 1,
      name: "Website Redesign",
      description: "Complete overhaul of company website with modern design",
      hourly_rate: 80,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      client_id: 1,
      name: "Mobile App Development",
      description: "iOS and Android app for customer portal",
      hourly_rate: 90,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      client_id: 2,
      name: "MVP Development",
      description: "Building the minimum viable product",
      hourly_rate: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  
  tasks: [
    {
      id: 1,
      project_id: 1,
      name: "UI/UX Design",
      description: "Design mockups and user experience flows",
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      project_id: 1,
      name: "Frontend Development",
      description: "HTML, CSS, JavaScript implementation",
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      project_id: 1,
      name: "Backend Integration",
      description: "API development and database setup",
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 4,
      project_id: 2,
      name: "React Native Setup",
      description: "Initial project configuration and navigation",
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 5,
      project_id: 2,
      name: "Authentication System",
      description: "User login and registration functionality",
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 6,
      project_id: 3,
      name: "Core Features",
      description: "Main application functionality",
      is_recurring: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 7,
      project_id: 3,
      name: "Testing & QA",
      description: "Quality assurance and bug fixes",
      is_recurring: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  
  timeEntries: [
    // Sample time entries for the last few days
    {
      id: 1,
      task_id: 1,
      description: "Created wireframes for homepage",
      start_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      end_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000).toISOString(),
      duration: 150, // 2.5 hours
      is_active: false,
      is_invoiced: false,
      invoice_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 2,
      task_id: 2,
      description: "Implemented responsive navigation",
      start_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      end_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(),
      duration: 240, // 4 hours
      is_active: false,
      is_invoiced: false,
      invoice_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 3,
      task_id: 6,
      description: "Initial database schema design",
      start_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      end_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
      duration: 120, // 2 hours
      is_active: false,
      is_invoiced: false,
      invoice_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  
  settings: {
    timer_rounding: '15',
    company_name: 'Your Company',
    company_email: 'your-email@company.com',
    company_phone: '+1 (555) 123-4567',
    company_website: 'www.yourcompany.com',
    invoice_template: 'default'
  },
  
  counters: {
    clients: 3,
    projects: 4,
    tasks: 8,
    timeEntries: 4
  }
};

module.exports = sampleData;

const { JsonDB, Config } = require('node-json-db');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const sampleData = require('./sample-data');

class MyHoursDatabase {
  constructor() {
    this.db = null;
    this.dbPath = path.join(app.getPath('userData'), 'myhours_db.json');
    this.initialized = false;
  }

  async initialize() {
    console.log('[DB] Initializing database...');
    console.log('[DB] Database path:', this.dbPath);
    
    // Ensure the userData directory exists
    const userDataDir = app.getPath('userData');
    console.log('[DB] User data directory:', userDataDir);
    
    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
      console.log('[DB] Created user data directory');
    }

    this.db = new JsonDB(new Config(this.dbPath, true, false, '/'));
    console.log('[DB] JsonDB instance created');
    
    // Initialize empty collections if they don't exist
    let shouldInitializeSampleData = false;
    
    try {
      await this.db.getData('/clients');
      console.log('[DB] Clients collection exists');
    } catch (error) {
      console.log('[DB] Creating clients collection');
      await this.db.push('/clients', []);
      shouldInitializeSampleData = true;
    }

    try {
      await this.db.getData('/projects');
    } catch (error) {
      await this.db.push('/projects', []);
    }

    try {
      await this.db.getData('/tasks');
    } catch (error) {
      await this.db.push('/tasks', []);
    }

    try {
      await this.db.getData('/timeEntries');
    } catch (error) {
      await this.db.push('/timeEntries', []);
    }

    try {
      await this.db.getData('/settings');
    } catch (error) {
      await this.insertDefaultSettings();
    }

    try {
      const counters = await this.db.getData('/counters');
      console.log('[DB] Counters exist:', JSON.stringify(counters, null, 2));
    } catch (error) {
      console.log('[DB] Creating counters collection');
      await this.db.push('/counters', {
        clients: 1,
        projects: 1,
        tasks: 1,
        timeEntries: 1
      });
    }

    // If this is the first time running, populate with sample data
    if (shouldInitializeSampleData) {
      console.log('Initializing database with sample data...');
      await this.initializeSampleData();
    }
    
    this.initialized = true;
    console.log('[DB] Database initialization complete');
    console.log('[DB] Final initialization status:', this.initialized);
    console.log('[DB] Database file location:', this.dbPath);
  }

  async insertDefaultSettings() {
    const defaultSettings = {
      'timer_rounding': '15',
      'company_name': 'Your Company',
      'company_email': 'your-email@company.com',
      'company_phone': '+1 (555) 123-4567',
      'company_website': 'www.yourcompany.com',
      'invoice_template': 'default'
    };

    await this.db.push('/settings', defaultSettings);
  }

  async initializeSampleData() {
    console.log('Populating database with sample data...');
    
    // Insert sample clients
    await this.db.push('/clients', sampleData.clients);
    
    // Insert sample projects
    await this.db.push('/projects', sampleData.projects);
    
    // Insert sample tasks
    await this.db.push('/tasks', sampleData.tasks);
    
    // Insert sample time entries
    await this.db.push('/timeEntries', sampleData.timeEntries);
    
    // Update counters
    this.db.push('/counters', sampleData.counters);
    
    // Update settings with sample company info
    this.db.push('/settings', sampleData.settings);
    
    console.log('Sample data initialization complete!');
  }

  async getNextId(collection) {
    try {
      const counters = await this.db.getData('/counters');
      console.log('[DB] Current counters:', JSON.stringify(counters, null, 2));
      const nextId = counters[collection];
      counters[collection] = nextId + 1;
      await this.db.push('/counters', counters);
      console.log('[DB] Updated counters:', JSON.stringify(counters, null, 2));
      console.log(`[DB] Generated next ID for ${collection}: ${nextId}`);
      return nextId;
    } catch (error) {
      console.error(`[DB] Error getting next ID for ${collection}:`, error);
      throw error;
    }
  }

  // Client operations
  async getClients() {
    if (!this.initialized) {
      console.log('[DB] Database not initialized, returning empty array');
      return [];
    }
    try {
      const clients = await this.db.getData('/clients');
      return clients.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.log('[DB] No clients found or error:', error.message);
      return [];
    }
  }

  async createClient(client) {
    console.log('[DB] Creating client with data:', JSON.stringify(client, null, 2));
    
    const id = await this.getNextId('clients');
    const newClient = {
      id,
      name: client.name,
      email: client.email || '',
      hourly_rate: client.hourly_rate || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[DB] New client object:', JSON.stringify(newClient, null, 2));

    const clients = await this.getClients();
    console.log('[DB] Current clients before push:', clients.length);
    
    clients.push(newClient);
    
    try {
      await this.db.push('/clients', clients);
      console.log('[DB] Client successfully saved to database');
      
      // Verify the save worked
      const updatedClients = await this.getClients();
      console.log('[DB] Clients after save:', updatedClients.length);
      console.log('[DB] All clients after save:', JSON.stringify(updatedClients, null, 2));
      
      return newClient;
    } catch (error) {
      console.error('[DB] Error saving client:', error);
      throw error;
    }
  }

  async updateClient(client) {
    const clients = await this.getClients();
    const index = clients.findIndex(c => c.id === client.id);
    if (index !== -1) {
      clients[index] = {
        ...clients[index],
        name: client.name,
        email: client.email,
        hourly_rate: client.hourly_rate,
        updated_at: new Date().toISOString()
      };
      this.db.push('/clients', clients);
      return clients[index];
    }
    return client;
  }

  async deleteClient(id) {
    const clients = await this.getClients();
    const filtered = clients.filter(c => c.id !== id);
    this.db.push('/clients', filtered);
    
    // Also delete related projects and tasks
    const projects = await this.getProjects();
    const filteredProjects = projects.filter(p => p.client_id !== id);
    this.db.push('/projects', filteredProjects);
    
    const tasks = await this.getTasks();
    const projectIds = projects.filter(p => p.client_id === id).map(p => p.id);
    const filteredTasks = tasks.filter(t => !projectIds.includes(t.project_id));
    this.db.push('/tasks', filteredTasks);
    
    return { changes: clients.length - filtered.length };
  }

  // Project operations
  async getProjects(clientId = null) {
    try {
      const projects = this.db.getData('/projects');
      const clients = await this.getClients();
      
      const enrichedProjects = projects.map(project => {
        const client = clients.find(c => c.id === project.client_id);
        return {
          ...project,
          client_name: client ? client.name : 'Unknown Client'
        };
      });

      if (clientId) {
        return enrichedProjects.filter(p => p.client_id === clientId)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      
      return enrichedProjects.sort((a, b) => {
        const clientCompare = a.client_name.localeCompare(b.client_name);
        return clientCompare !== 0 ? clientCompare : a.name.localeCompare(b.name);
      });
    } catch (error) {
      return [];
    }
  }

  async createProject(project) {
    const id = await this.getNextId('projects');
    const newProject = {
      id,
      client_id: project.clientId,
      name: project.name,
      description: project.description || '',
      hourly_rate: project.hourlyRate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const projects = await this.getProjects();
    projects.push(newProject);
    this.db.push('/projects', projects.map(p => ({
      id: p.id,
      client_id: p.client_id,
      name: p.name,
      description: p.description,
      hourly_rate: p.hourly_rate,
      created_at: p.created_at,
      updated_at: p.updated_at
    })));
    
    return newProject;
  }

  async updateProject(project) {
    const projects = this.db.getData('/projects');
    const index = projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        client_id: project.clientId,
        name: project.name,
        description: project.description,
        hourly_rate: project.hourlyRate,
        updated_at: new Date().toISOString()
      };
      this.db.push('/projects', projects);
      return projects[index];
    }
    return project;
  }

  async deleteProject(id) {
    const projects = this.db.getData('/projects');
    const filtered = projects.filter(p => p.id !== id);
    this.db.push('/projects', filtered);
    
    // Also delete related tasks
    const tasks = await this.getTasks();
    const filteredTasks = tasks.filter(t => t.project_id !== id);
    this.db.push('/tasks', filteredTasks);
    
    return { changes: projects.length - filtered.length };
  }

  // Task operations
  async getTasks(projectId = null) {
    try {
      const tasks = this.db.getData('/tasks');
      const projects = await this.getProjects();
      const clients = await this.getClients();
      
      const enrichedTasks = tasks.map(task => {
        const project = projects.find(p => p.id === task.project_id);
        const client = project ? clients.find(c => c.id === project.client_id) : null;
        return {
          ...task,
          project_name: project ? project.name : 'Unknown Project',
          client_name: client ? client.name : 'Unknown Client'
        };
      });

      if (projectId) {
        return enrichedTasks.filter(t => t.project_id === projectId)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      
      return enrichedTasks.sort((a, b) => {
        const clientCompare = a.client_name.localeCompare(b.client_name);
        if (clientCompare !== 0) return clientCompare;
        const projectCompare = a.project_name.localeCompare(b.project_name);
        return projectCompare !== 0 ? projectCompare : a.name.localeCompare(b.name);
      });
    } catch (error) {
      return [];
    }
  }

  async createTask(task) {
    const id = await this.getNextId('tasks');
    const newTask = {
      id,
      project_id: task.projectId,
      name: task.name,
      description: task.description || '',
      is_recurring: task.isRecurring || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const tasks = await this.getTasks();
    tasks.push(newTask);
    this.db.push('/tasks', tasks.map(t => ({
      id: t.id,
      project_id: t.project_id,
      name: t.name,
      description: t.description,
      is_recurring: t.is_recurring,
      created_at: t.created_at,
      updated_at: t.updated_at
    })));
    
    return newTask;
  }

  async updateTask(task) {
    const tasks = this.db.getData('/tasks');
    const index = tasks.findIndex(t => t.id === task.id);
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        project_id: task.projectId,
        name: task.name,
        description: task.description,
        is_recurring: task.isRecurring,
        updated_at: new Date().toISOString()
      };
      this.db.push('/tasks', tasks);
      return tasks[index];
    }
    return task;
  }

  async deleteTask(id) {
    const tasks = this.db.getData('/tasks');
    const filtered = tasks.filter(t => t.id !== id);
    this.db.push('/tasks', filtered);
    return { changes: tasks.length - filtered.length };
  }

  // Time entry operations
  async getTimeEntries(filters = {}) {
    try {
      let timeEntries;
      try {
        timeEntries = this.db.getData('/timeEntries') || [];
      } catch (error) {
        console.log('[DB] GET_ENTRIES: timeEntries not found, returning empty array');
        return [];
      }
      console.log('[DB] GET_ENTRIES: Raw time entries count:', timeEntries.length);
      
      const tasks = await this.getTasks();
      const projects = await this.getProjects();
      const clients = await this.getClients();
      
      let enrichedEntries = timeEntries.map(entry => {
        const task = tasks.find(t => t.id === entry.task_id);
        const project = task ? projects.find(p => p.id === task.project_id) : null;
        
        // For timer entries with direct client_id but no task
        let client;
        if (entry.client_id && !task) {
          client = clients.find(c => c.id === entry.client_id);
        } else {
          client = project ? clients.find(c => c.id === project.client_id) : null;
        }
        
        return {
          ...entry,
          task_name: task ? task.name : (entry.description || 'Timer Entry'),
          project_name: project ? project.name : (client ? 'Direct Time' : 'Unknown Project'),
          client_name: client ? client.name : 'Unknown Client',
          hourly_rate: project?.hourly_rate || client?.hourly_rate || 0
        };
      });

      // Apply filters
      if (filters.taskId) {
        enrichedEntries = enrichedEntries.filter(entry => entry.task_id === filters.taskId);
      }
      
      if (filters.startDate) {
        enrichedEntries = enrichedEntries.filter(entry => 
          entry.start_time >= filters.startDate
        );
      }
      
      if (filters.endDate) {
        enrichedEntries = enrichedEntries.filter(entry => 
          entry.start_time <= filters.endDate + 'T23:59:59'
        );
      }
      
      if (filters.isInvoiced !== undefined) {
        enrichedEntries = enrichedEntries.filter(entry => 
          entry.is_invoiced === filters.isInvoiced
        );
      }
      
      const sorted = enrichedEntries.sort((a, b) => new Date(b.start_time) - new Date(a.start_time));
      console.log('[DB] GET_ENTRIES: Returning', sorted.length, 'entries');
      return sorted;
    } catch (error) {
      console.log('[DB] GET_ENTRIES: Error:', error);
      return [];
    }
  }

  async createTimeEntry(entry) {
    const id = await this.getNextId('timeEntries');
    const newEntry = {
      id,
      task_id: entry.taskId,
      description: entry.description || '',
      start_time: entry.startTime,
      end_time: entry.endTime || null,
      duration: entry.duration || 0,
      is_active: entry.isActive || false,
      is_invoiced: false,
      invoice_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const timeEntries = this.db.getData('/timeEntries');
    timeEntries.push(newEntry);
    this.db.push('/timeEntries', timeEntries);
    return newEntry;
  }

  async updateTimeEntry(entry) {
    let timeEntries;
    try {
      const rawData = this.db.getData('/timeEntries');
      timeEntries = rawData || [];
    } catch (error) {
      timeEntries = [];
    }
    
    if (!Array.isArray(timeEntries)) {
      timeEntries = [];
    }
    
    const index = timeEntries.findIndex(t => t.id === entry.id);
    if (index !== -1) {
      timeEntries[index] = {
        ...timeEntries[index],
        task_id: entry.taskId,
        description: entry.description,
        start_time: entry.startTime,
        end_time: entry.endTime,
        duration: entry.duration,
        updated_at: new Date().toISOString()
      };
      this.db.push('/timeEntries', timeEntries);
      return timeEntries[index];
    }
    return entry;
  }

  async deleteTimeEntry(id) {
    const timeEntries = this.db.getData('/timeEntries');
    const filtered = timeEntries.filter(t => t.id !== id);
    this.db.push('/timeEntries', filtered);
    return { changes: timeEntries.length - filtered.length };
  }

  async startTimer(clientId = null, description = '') {
    console.log('[DB] Starting timer with clientId:', clientId, 'description:', description);
    
    // Stop any currently active timers first
    let timeEntries;
    try {
      const rawData = this.db.getData('/timeEntries');
      console.log('[DB] Raw timeEntries data:', typeof rawData, rawData);
      timeEntries = rawData || [];
    } catch (error) {
      console.log('[DB] timeEntries not found, creating empty array');
      timeEntries = [];
    }
    
    console.log('[DB] After processing - timeEntries:', typeof timeEntries, Array.isArray(timeEntries));
    
    if (!Array.isArray(timeEntries)) {
      console.log('[DB] timeEntries is not an array, forcing to empty array');
      timeEntries = [];
    }
    
    timeEntries.forEach(entry => {
      if (entry.is_active) {
        entry.is_active = false;
        entry.updated_at = new Date().toISOString();
      }
    });
    
    // Check for recent entry to potentially resume
    const now = new Date();
    const recentEntries = timeEntries
      .filter(entry => 
        entry.client_id === clientId && 
        entry.description === (description || '') &&
        entry.end_time && 
        !entry.is_active
      )
      .sort((a, b) => new Date(b.end_time) - new Date(a.end_time));
    
    if (recentEntries.length > 0) {
      const lastEntry = recentEntries[0];
      const endTime = new Date(lastEntry.end_time);
      const timeDiff = (now - endTime) / (1000 * 60); // minutes
      
      console.log('[DB] Last entry ended', timeDiff.toFixed(1), 'minutes ago');
      
      // If last entry ended within 15 minutes, resume it
      if (timeDiff <= 15) {
        console.log('[DB] Resuming last entry:', lastEntry.id);
        lastEntry.is_active = true;
        lastEntry.end_time = null;
        lastEntry.updated_at = now.toISOString();
        
        this.db.push('/timeEntries', timeEntries);
        console.log('[DB] Timer resumed:', JSON.stringify(lastEntry, null, 2));
        return lastEntry;
      }
    }
    
    // Create new timer entry
    const id = await this.getNextId('timeEntries');
    const newEntry = {
      id,
      client_id: clientId,
      task_id: null,
      description: description || '',
      start_time: now.toISOString(),
      end_time: null,
      duration: 0,
      is_active: true,
      is_invoiced: false,
      invoice_id: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    };

    timeEntries.push(newEntry);
    this.db.push('/timeEntries', timeEntries);
    
    console.log('[DB] New timer started:', JSON.stringify(newEntry, null, 2));
    
    // Verify it was saved
    try {
      const verifyEntries = this.db.getData('/timeEntries');
      console.log('[DB] Verification: Saved entries count:', verifyEntries.length);
      const savedEntry = verifyEntries.find(e => e.id === newEntry.id);
      console.log('[DB] Verification: Entry was saved:', !!savedEntry);
    } catch (e) {
      console.log('[DB] Verification failed:', e.message);
    }
    
    return newEntry;
  }

  async stopTimer(entryId, roundTo = 15) {
    console.log('[DB] STOP: Stopping timer ID:', entryId);
    let timeEntries;
    try {
      const rawData = this.db.getData('/timeEntries');
      console.log('[DB] STOP: Raw database data:', rawData, 'type:', typeof rawData);
      timeEntries = rawData || [];
    } catch (error) {
      console.log('[DB] STOP: timeEntries not found, error:', error.message);
      timeEntries = [];
    }
    
    if (!Array.isArray(timeEntries)) {
      console.log('[DB] STOP: timeEntries is not an array, forcing to empty array');
      timeEntries = [];
    }
    
    console.log('[DB] STOP: Total entries before:', timeEntries.length);
    console.log('[DB] STOP: Looking for timer ID:', entryId, 'type:', typeof entryId);
    console.log('[DB] STOP: Available timer IDs:', timeEntries.map(t => ({ id: t.id, type: typeof t.id, active: t.is_active })));
    
    const entry = timeEntries.find(t => t.id === entryId);
    if (!entry) {
      console.log('[DB] STOP: Timer not found!');
      throw new Error('Timer not found');
    }
    
    const endTime = new Date();
    const startTime = new Date(entry.start_time);
    let duration = Math.round((endTime - startTime) / (1000 * 60)); // minutes
    
    if (roundTo > 0) {
      duration = Math.ceil(duration / roundTo) * roundTo;
    }
    
    entry.end_time = endTime.toISOString();
    entry.duration = duration;
    entry.is_active = false;
    entry.updated_at = endTime.toISOString();
    
    console.log('[DB] STOP: Updated entry duration:', duration, 'minutes');
    
    this.db.push('/timeEntries', timeEntries);
    console.log('[DB] STOP: Entry saved to database');
    
    // Verify it was saved
    const verifyEntries = this.db.getData('/timeEntries');
    const savedEntry = verifyEntries.find(t => t.id === entryId);
    console.log('[DB] STOP: Verification - entry found:', !!savedEntry, 'duration:', savedEntry?.duration);
    
    return entry;
  }

  async getLastUsedClient() {
    console.log('[DB] Getting last used client...');
    try {
      const settings = await this.db.getData('/settings');
      const lastClientId = settings.last_timer_client_id;
      
      if (lastClientId) {
        const clients = await this.getClients();
        const client = clients.find(c => c.id === lastClientId);
        console.log('[DB] Last used client:', JSON.stringify(client, null, 2));
        return client || null;
      }
      
      console.log('[DB] No last used client found');
      return null;
    } catch (error) {
      console.error('[DB] Error getting last used client:', error);
      return null;
    }
  }

  async setLastUsedClient(clientId) {
    console.log('[DB] Setting last used client:', clientId);
    try {
      const settings = await this.db.getData('/settings');
      settings.last_timer_client_id = clientId;
      await this.db.push('/settings', settings);
      console.log('[DB] Last used client saved');
    } catch (error) {
      console.error('[DB] Error setting last used client:', error);
    }
  }

  async getActiveTimer() {
    console.log('[DB] Getting active timer...');
    try {
      const entries = await this.getTimeEntries();
      const activeEntry = entries.find(entry => entry.is_active);
      
      if (activeEntry) {
        console.log('[DB] Found active timer:', JSON.stringify(activeEntry, null, 2));
        return activeEntry;
      } else {
        console.log('[DB] No active timer found');
        return null;
      }
    } catch (error) {
      console.error('[DB] Error getting active timer:', error);
      return null;
    }
  }

  async markAsInvoiced(entryIds, invoiceId) {
    const timeEntries = this.db.getData('/timeEntries');
    timeEntries.forEach(entry => {
      if (entryIds.includes(entry.id)) {
        entry.is_invoiced = true;
        entry.invoice_id = invoiceId;
      }
    });
    this.db.push('/timeEntries', timeEntries);
  }

  // Reports
  async getReports(type, params = {}) {
    const today = new Date().toISOString().split('T')[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    const timeEntries = this.db.getData('/timeEntries');
    
    switch (type) {
      case 'today':
        const todayEntries = timeEntries.filter(entry => 
          entry.start_time.split('T')[0] === today
        );
        return {
          total_minutes: todayEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
        };
        
      case 'week':
        const weekEntries = timeEntries.filter(entry => 
          entry.start_time.split('T')[0] >= weekStart
        );
        return {
          total_minutes: weekEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0)
        };
        
      case 'uninvoiced':
        const uninvoicedEntries = timeEntries.filter(entry => 
          !entry.is_invoiced && entry.end_time
        );
        return {
          total_minutes: uninvoicedEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0),
          entry_count: uninvoicedEntries.length
        };
        
      default:
        return null;
    }
  }

  // Settings
  async getSettings() {
    try {
      return this.db.getData('/settings');
    } catch (error) {
      this.insertDefaultSettings();
      return this.db.getData('/settings');
    }
  }

  async updateSettings(settings) {
    const currentSettings = await this.getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    this.db.push('/settings', updatedSettings);
  }

  // Export functions
  async exportToCSV(filters, filePath) {
    const entries = await this.getTimeEntries(filters);
    const csv = [
      'Date,Client,Project,Task,Description,Start Time,End Time,Duration (hours),Hourly Rate,Amount,Invoiced'
    ];
    
    entries.forEach(entry => {
      const duration = entry.duration ? (entry.duration / 60).toFixed(2) : '0.00';
      const amount = entry.duration ? ((entry.duration / 60) * entry.hourly_rate).toFixed(2) : '0.00';
      csv.push([
        entry.start_time.split('T')[0],
        entry.client_name,
        entry.project_name,
        entry.task_name,
        entry.description || '',
        entry.start_time,
        entry.end_time || '',
        duration,
        entry.hourly_rate.toFixed(2),
        amount,
        entry.is_invoiced ? 'Yes' : 'No'
      ].map(field => `"${field}"`).join(','));
    });
    
    fs.writeFileSync(filePath, csv.join('\n'));
  }

  async exportToJSON(filters, filePath) {
    const entries = await this.getTimeEntries(filters);
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2));
  }
}

module.exports = MyHoursDatabase;

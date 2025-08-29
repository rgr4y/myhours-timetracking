const { PrismaClient } = require('@prisma/client');
const sampleData = require('./sample-data');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async initialize() {
    // Connect to the database
    await this.prisma.$connect();
    console.log('Database connected successfully');
    
    // Check if database needs seeding
    await this.seedIfEmpty();
  }

  async seedIfEmpty() {
    try {
      // Check if there are any clients (if empty, assume database needs seeding)
      const clientCount = await this.prisma.client.count();
      
      if (clientCount === 0) {
        console.log('[DATABASE] Database is empty, seeding with sample data...');
        await this.seedSampleData();
      } else {
        console.log('[DATABASE] Database already contains data, skipping seed');
      }
    } catch (error) {
      console.error('[DATABASE] Error checking/seeding database:', error);
    }
  }

  async seedSampleData() {
    try {
      // Insert clients
      for (const clientData of sampleData.clients) {
        await this.prisma.client.create({
          data: {
            name: clientData.name,
            email: clientData.email,
            hourlyRate: clientData.hourly_rate
          }
        });
      }
      console.log('[DATABASE] Seeded', sampleData.clients.length, 'clients');

      // Insert projects
      for (const projectData of sampleData.projects) {
        await this.prisma.project.create({
          data: {
            name: projectData.name,
            clientId: projectData.client_id,
            hourlyRate: projectData.hourly_rate
          }
        });
      }
      console.log('[DATABASE] Seeded', sampleData.projects.length, 'projects');

      // Insert tasks
      for (const taskData of sampleData.tasks) {
        await this.prisma.task.create({
          data: {
            name: taskData.name,
            projectId: taskData.project_id,
            description: taskData.description
          }
        });
      }
      console.log('[DATABASE] Seeded', sampleData.tasks.length, 'tasks');

      console.log('[DATABASE] Sample data seeding completed successfully');
    } catch (error) {
      console.error('[DATABASE] Error seeding sample data:', error);
      throw error;
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  // Helper method to parse time string (HH:MM) with date
  parseTimeWithDate(timeString, dateString) {
    if (!timeString || !dateString) return null;
    
    try {
      const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
      const date = new Date(dateString);
      
      if (isNaN(date.getTime()) || isNaN(hours) || isNaN(minutes)) {
        return null;
      }
      
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    } catch (error) {
      console.error('Error parsing time with date:', error);
      return null;
    }
  }

  // Time Entry methods
  async startTimer(data = {}) {
    try {
      // Stop any currently active timers first
      await this.prisma.timeEntry.updateMany({
        where: { isActive: true },
        data: { 
          isActive: false,
          endTime: new Date(),
          duration: {
            increment: Math.floor((new Date() - new Date()) / 1000 / 60) // This will be calculated properly in the actual implementation
          }
        }
      });

      // Create new time entry
      const timeEntry = await this.prisma.timeEntry.create({
        data: {
          clientId: data.clientId || null,
          projectId: data.projectId || null,
          taskId: data.taskId || null,
          description: data.description || '',
          startTime: new Date(),
          isActive: true,
          duration: 0
        },
        include: {
          client: true,
          task: {
            include: {
              project: true
            }
          }
        }
      });

      return timeEntry;
    } catch (error) {
      console.error('Error starting timer:', error);
      throw error;
    }
  }

  async stopTimer(timeEntryId) {
    try {
      const timeEntry = await this.prisma.timeEntry.findUnique({
        where: { id: parseInt(timeEntryId) }
      });

      if (!timeEntry || !timeEntry.isActive) {
        throw new Error('No active timer found');
      }

      const endTime = new Date();
      const duration = Math.floor((endTime - timeEntry.startTime) / 1000 / 60); // duration in minutes

      const updatedTimeEntry = await this.prisma.timeEntry.update({
        where: { id: parseInt(timeEntryId) },
        data: {
          endTime,
          duration,
          isActive: false
        },
        include: {
          client: true,
          task: {
            include: {
              project: true
            }
          }
        }
      });

      return updatedTimeEntry;
    } catch (error) {
      console.error('Error stopping timer:', error);
      throw error;
    }
  }

  async getActiveTimer() {
    try {
      const activeTimer = await this.prisma.timeEntry.findFirst({
        where: { isActive: true },
        include: {
          client: true,
          task: {
            include: {
              project: true
            }
          }
        }
      });

      return activeTimer;
    } catch (error) {
      console.error('Error getting active timer:', error);
      throw error;
    }
  }

  async getTimeEntries(filters = {}) {
    try {
      const where = {};
      
      if (filters.clientId) {
        where.clientId = parseInt(filters.clientId);
      }
      
      if (filters.startDate && filters.endDate) {
        where.startTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate)
        };
      }

      const timeEntries = await this.prisma.timeEntry.findMany({
        where,
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true
            }
          }
        },
        orderBy: {
          id: 'desc'
        }
      });

      return timeEntries;
    } catch (error) {
      console.error('Error getting time entries:', error);
      throw error;
    }
  }

  async updateTimeEntry(id, data) {
    try {
      console.log('[DATABASE] updateTimeEntry called with id:', id, 'data:', data);
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error('Update data is required');
      }
      
      // Clean the data - convert empty strings to null for optional fields
      const cleanData = { ...data };
      
      // Convert empty strings to null for optional foreign key fields
      if (cleanData.clientId === '') cleanData.clientId = null;
      if (cleanData.taskId === '') cleanData.taskId = null;
      
      // Convert string IDs to integers where needed
      if (cleanData.clientId) cleanData.clientId = parseInt(cleanData.clientId);
      if (cleanData.projectId) cleanData.projectId = parseInt(cleanData.projectId);
      if (cleanData.taskId) cleanData.taskId = parseInt(cleanData.taskId);
      
      // Handle empty string to null conversion for projectId
      if (cleanData.projectId === '') cleanData.projectId = null;
      
      console.log('[DATABASE] Processing projectId:', cleanData.projectId, 'and taskId:', cleanData.taskId);
      
      // Handle date and time fields - combine date with startTime and endTime
      if (cleanData.date && cleanData.startTime) {
        const startDateTime = this.parseTimeWithDate(cleanData.startTime, cleanData.date);
        if (startDateTime) cleanData.startTime = startDateTime;
      }
      
      if (cleanData.date && cleanData.endTime) {
        const endDateTime = this.parseTimeWithDate(cleanData.endTime, cleanData.date);
        if (endDateTime) cleanData.endTime = endDateTime;
      }
      
      // Remove the separate date field as it's not in the schema
      delete cleanData.date;
      
      // Calculate duration if both start and end times are provided
      if (cleanData.startTime && cleanData.endTime) {
        const start = new Date(cleanData.startTime);
        const end = new Date(cleanData.endTime);
        const diffMs = end.getTime() - start.getTime();
        cleanData.duration = Math.max(0, Math.floor(diffMs / (1000 * 60))); // Convert to minutes
      }
      
      console.log('[DATABASE] Cleaned data:', cleanData);
      
      // Prepare the update data object with relationship operations
      const updateData = { ...cleanData };
      
      // Handle client relationship
      if ('clientId' in updateData) {
        const clientId = updateData.clientId;
        delete updateData.clientId;
        
        if (clientId === null) {
          updateData.client = { disconnect: true };
        } else {
          updateData.client = { connect: { id: clientId } };
        }
      }
      
      // Handle project relationship
      if ('projectId' in updateData) {
        const projectId = updateData.projectId;
        delete updateData.projectId;
        
        if (projectId === null) {
          updateData.project = { disconnect: true };
        } else {
          updateData.project = { connect: { id: projectId } };
        }
      }
      
      // Handle task relationship
      if ('taskId' in updateData) {
        const taskId = updateData.taskId;
        delete updateData.taskId;
        
        if (taskId === null) {
          updateData.task = { disconnect: true };
        } else {
          updateData.task = { connect: { id: taskId } };
        }
      }
      
      console.log('[DATABASE] Update data with relationships:', updateData);
      
      const updatedTimeEntry = await this.prisma.timeEntry.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true
            }
          }
        }
      });

      return updatedTimeEntry;
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }
  }

  async createTimeEntry(data) {
    try {
      console.log('[DATABASE] createTimeEntry called with data:', data);
      
      if (!data || Object.keys(data).length === 0) {
        throw new Error('Create data is required');
      }
      
      // Clean the data - convert empty strings to null for optional fields
      const cleanData = { ...data };
      
      // Convert empty strings to null for optional foreign key fields
      if (cleanData.clientId === '') cleanData.clientId = null;
      if (cleanData.projectId === '') cleanData.projectId = null;
      if (cleanData.taskId === '') cleanData.taskId = null;
      
      // Convert string IDs to integers where needed
      if (cleanData.clientId) cleanData.clientId = parseInt(cleanData.clientId);
      if (cleanData.projectId) cleanData.projectId = parseInt(cleanData.projectId);
      if (cleanData.taskId) cleanData.taskId = parseInt(cleanData.taskId);
      
      console.log('[DATABASE] Processing create with projectId:', cleanData.projectId, 'and taskId:', cleanData.taskId);
      
      // Handle date and time fields - combine date with startTime and endTime
      if (cleanData.date && cleanData.startTime) {
        const startDateTime = this.parseTimeWithDate(cleanData.startTime, cleanData.date);
        if (startDateTime) cleanData.startTime = startDateTime;
      }
      
      if (cleanData.date && cleanData.endTime) {
        const endDateTime = this.parseTimeWithDate(cleanData.endTime, cleanData.date);
        if (endDateTime) cleanData.endTime = endDateTime;
      }
      
      // Remove the separate date field as it's not in the schema
      delete cleanData.date;
      
      // Calculate duration if both start and end times are provided
      if (cleanData.startTime && cleanData.endTime) {
        const start = new Date(cleanData.startTime);
        const end = new Date(cleanData.endTime);
        const diffMs = end.getTime() - start.getTime();
        cleanData.duration = Math.max(0, Math.floor(diffMs / (1000 * 60))); // Convert to minutes
      }
      
      console.log('[DATABASE] Cleaned data for create:', cleanData);
      
      const newTimeEntry = await this.prisma.timeEntry.create({
        data: cleanData,
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true
            }
          }
        }
      });

      return newTimeEntry;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  }

  async deleteTimeEntry(id) {
    try {
      await this.prisma.timeEntry.delete({
        where: { id: parseInt(id) }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting time entry:', error);
      throw error;
    }
  }

  // Client methods
  async getClients() {
    try {
      const clients = await this.prisma.client.findMany({
        include: {
          projects: {
            include: {
              tasks: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return clients;
    } catch (error) {
      console.error('Error getting clients:', error);
      throw error;
    }
  }

  async createClient(data) {
    try {
      const client = await this.prisma.client.create({
        data: {
          name: data.name,
          email: data.email || null,
          hourlyRate: data.hourlyRate || 0
        },
        include: {
          projects: true
        }
      });

      return client;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  }

  async updateClient(id, data) {
    try {
      const client = await this.prisma.client.update({
        where: { id: parseInt(id) },
        data,
        include: {
          projects: true
        }
      });

      return client;
    } catch (error) {
      console.error('Error updating client:', error);
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      await this.prisma.client.delete({
        where: { id: parseInt(id) }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Project methods
  async getProjects(clientId = null) {
    try {
      const where = clientId ? { clientId: parseInt(clientId) } : {};
      
      const projects = await this.prisma.project.findMany({
        where,
        include: {
          client: true,
          tasks: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      return projects;
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  }

  async createProject(data) {
    try {
      const project = await this.prisma.project.create({
        data: {
          name: data.name,
          clientId: parseInt(data.clientId),
          hourlyRate: data.hourlyRate || null
        },
        include: {
          client: true,
          tasks: true
        }
      });

      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  // Task methods
  async getTasks(projectId = null) {
    try {
      console.log('[DATABASE] getTasks called with projectId:', projectId);
      const where = projectId ? { projectId: parseInt(projectId) } : {};
      console.log('[DATABASE] Query where clause:', where);
      
      const tasks = await this.prisma.task.findMany({
        where,
        include: {
          project: {
            include: {
              client: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log('[DATABASE] Found', tasks.length, 'tasks');
      return tasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      throw error;
    }
  }

  async createTask(data) {
    try {
      const task = await this.prisma.task.create({
        data: {
          name: data.name,
          projectId: parseInt(data.projectId),
          description: data.description || null
        },
        include: {
          project: {
            include: {
              client: true
            }
          }
        }
      });

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  // Settings methods
  async getSetting(key) {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key }
      });

      return setting ? setting.value : null;
    } catch (error) {
      console.error('Error getting setting:', error);
      throw error;
    }
  }

  async setSetting(key, value) {
    try {
      const setting = await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });

      return setting;
    } catch (error) {
      console.error('Error setting value:', error);
      throw error;
    }
  }

  // Invoice methods
  async getInvoices() {
    try {
      const invoices = await this.prisma.invoice.findMany({
        include: {
          timeEntries: {
            include: {
              client: true,
              task: {
                include: {
                  project: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return invoices;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  }

  async createInvoice(data) {
    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          clientId: parseInt(data.clientId),
          totalAmount: parseFloat(data.totalAmount),
          status: data.status || 'draft',
          dueDate: data.dueDate ? new Date(data.dueDate) : null
        },
        include: {
          timeEntries: true
        }
      });

      return invoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const settings = await this.prisma.setting.findMany();
      
      // Convert array of settings to object
      const settingsObj = {};
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      return settingsObj;
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  async markAsInvoiced(entryIds, invoiceNumber) {
    try {
      // First create the invoice record
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: invoiceNumber,
          clientId: 1, // This should be properly determined
          totalAmount: 0, // This should be calculated
          status: 'generated'
        }
      });

      // Then update the time entries to mark them as invoiced
      const updatedEntries = await this.prisma.timeEntry.updateMany({
        where: {
          id: {
            in: entryIds
          }
        },
        data: {
          isInvoiced: true,
          invoiceId: invoice.id
        }
      });

      return updatedEntries;
    } catch (error) {
      console.error('Error marking entries as invoiced:', error);
      throw error;
    }
  }
}

module.exports = DatabaseService;

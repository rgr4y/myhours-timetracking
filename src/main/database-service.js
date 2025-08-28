const { PrismaClient } = require('@prisma/client');

class DatabaseService {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async initialize() {
    // Connect to the database
    await this.prisma.$connect();
    console.log('Database connected successfully');
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
          task: {
            include: {
              project: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
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
      if (cleanData.projectId === '') cleanData.projectId = null;
      if (cleanData.taskId === '') cleanData.taskId = null;
      
      // Convert string IDs to integers where needed
      if (cleanData.clientId) cleanData.clientId = parseInt(cleanData.clientId);
      if (cleanData.projectId) cleanData.projectId = parseInt(cleanData.projectId);
      if (cleanData.taskId) cleanData.taskId = parseInt(cleanData.taskId);
      
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
      
      const updatedTimeEntry = await this.prisma.timeEntry.update({
        where: { id: parseInt(id) },
        data: cleanData,
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
      const where = projectId ? { projectId: parseInt(projectId) } : {};
      
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
}

module.exports = DatabaseService;

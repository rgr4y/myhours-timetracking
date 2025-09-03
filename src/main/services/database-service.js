const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const { promisify } = require('util');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const PathService = require('./path-service');
const logger = require('./logger-service');
const truthy = (v) => /^(1|true|yes|on)$/i.test(String(v || ''));
const execAsync = promisify(exec);

class DatabaseService {
  constructor() {
    this.pathService = new PathService();

    // Use the centralized path service for all path resolution
    const dbPath = this.pathService.getDatabasePath();
    process.env.DATABASE_URL = this.pathService.getDatabaseUrl();

    logger.database("info", "Using SQLite database", {
      path: dbPath,
      exists: fs.existsSync(dbPath),
    });
    logger.database(
      "debug",
      "Path service configuration",
      this.pathService.getDebugInfo()
    );

    // Bootstrap from template if needed
    this.pathService.bootstrapDatabaseFromTemplate();

    this.prisma = new PrismaClient();
  }

  async initialize() {
    // Connect to database
    await this.prisma.$connect();
    logger.database("info", "Database connected successfully");

    // Quick validation
    const [versionResult, tableCount] = await Promise.all([
      this.prisma.$queryRaw`SELECT sqlite_version() as version`,
      this.prisma
        .$queryRaw`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'`,
    ]);

    logger.database("info", "Database connection validated", {
      sqliteVersion: versionResult[0].version,
      tableCount: Number(tableCount[0].count),
    });

    // Simple migration check - only in production
    if (app.isPackaged) {
      await this.ensureLatestMigration();
    }

    // Check if database needs seeding
    await this.seedIfEmpty();
  }

  async ensureLatestMigration() {
    // Check for isDefault column (previous migration)
    try {
      await this.prisma.$queryRaw`SELECT is_default FROM projects LIMIT 1`;
      logger.database("info", "Previous migration (isDefault) already applied");
    } catch (error) {
      logger.database("info", "Adding isDefault column to projects table");
      await this.prisma
        .$executeRaw`ALTER TABLE "projects" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false`;
      logger.database("info", "isDefault migration applied successfully");
    }

    // Check for data column in invoices table (new migration)
    try {
      await this.prisma.$queryRaw`SELECT data FROM invoices LIMIT 1`;
      logger.database("info", "Latest migration (invoice data field) already applied");
    } catch (error) {
      logger.database("info", "Adding data column to invoices table");
      await this.prisma
        .$executeRaw`ALTER TABLE "invoices" ADD COLUMN "data" TEXT DEFAULT '{}'`;
      logger.database("info", "Invoice data field migration applied successfully");
    }
  }

  async seedIfEmpty() {
    try {
      // Check if we already have data
      const clientCount = await this.prisma.client.count();

      logger.database("info", "Checking if database needs seeding", {
        clientCount,
      });

      if (clientCount === 0) {
        logger.database("info", "Starting database seeding - no clients found");

        // Use the path service to get the correct seed script path
        const seedPath = this.pathService.getSeedScriptPath();

        logger.database("debug", "Seed script path", {
          seedPath,
          exists: fs.existsSync(seedPath),
        });

        if (fs.existsSync(seedPath)) {
          if (app.isPackaged) {
            // In packaged builds, run the seed script directly
            const env = { ...process.env, ELECTRON_RUN_AS_NODE: "1" };
            await execAsync(`"${process.execPath}" "${seedPath}"`, { env });
          } else {
            // Dev: use prisma CLI which is available locally
            await execAsync("npx prisma db seed", {
              cwd: this.pathService.getProjectRoot(),
            });
          }
          logger.database("info", "Database seeding completed");

          // Verify seeding worked
          const newClientCount = await this.prisma.client.count();
          logger.database("info", "Post-seed verification", {
            clientCount: newClientCount,
          });
        } else {
          logger.database("warn", "Seed script not found", { seedPath });
        }
      } else {
        logger.database(
          "info",
          "Database already contains data, skipping seed",
          { clientCount }
        );
      }
    } catch (error) {
      logger.database("error", "Error seeding database", {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  cleanupOldBackups(dbDir) {
    try {
      const files = fs.readdirSync(dbDir);
      const backupFiles = files
        .filter((file) => file.includes(".backup."))
        .map((file) => ({
          name: file,
          path: path.join(dbDir, file),
          timestamp: parseInt(file.split(".backup.")[1]) || 0,
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Keep only the 5 most recent backups
      const filesToDelete = backupFiles.slice(5);

      for (const file of filesToDelete) {
        try {
          fs.unlinkSync(file.path);
          logger.debug("[DATABASE] Cleaned up old backup:", file.name);
        } catch (deleteError) {
          logger.warn(
            "[DATABASE] Failed to delete old backup:",
            file.name,
            deleteError.message
          );
        }
      }
    } catch (error) {
      logger.warn("[DATABASE] Failed to cleanup old backups:", error.message);
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  // Danger: remove demo data created by seed script
  async removeDemoData() {
    try {
      // Delete in FK-safe order
      await this.prisma.timeEntry.deleteMany();
      await this.prisma.invoice.deleteMany();
      await this.prisma.task.deleteMany();
      await this.prisma.project.deleteMany();
      await this.prisma.client.deleteMany();
      // Clear transient settings that reference IDs
      try {
        await this.prisma.setting.delete({
          where: { key: "lastUsedClientId" },
        });
      } catch (_) {}
      return { success: true };
    } catch (error) {
      logger.error("[DATABASE] Error removing demo data:", error);
      throw error;
    }
  }

  // Helper method to parse time string (HH:MM) with date
  parseTimeWithDate(timeString, dateString) {
    if (!timeString || !dateString) return null;

    try {
      const [hours, minutes] = timeString
        .split(":")
        .map((num) => parseInt(num, 10));

      // Parse YYYY-MM-DD dates explicitly using local time constructor to avoid timezone issues
      let date;
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString
          .split("-")
          .map((num) => parseInt(num, 10));
        date = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime()) || isNaN(hours) || isNaN(minutes)) {
        return null;
      }

      date.setHours(hours, minutes, 0, 0);

      // Return the Date object directly - let Prisma handle the conversion
      return date;
    } catch (error) {
      logger.error("Error parsing time with date:", error);
      return null;
    }
  }

  // Ensure only one active timer exists - use this for critical operations
  async ensureOnlyOneActiveTimer() {
    try {
      const activeTimers = await this.prisma.timeEntry.findMany({
        where: { isActive: true },
        orderBy: { startTime: "desc" }, // Keep the most recent one
      });

      if (activeTimers.length > 1) {
        logger.warn(
          `[DATABASE] Found ${activeTimers.length} active timers, stopping older ones`
        );

        // Keep the first (most recent) timer, stop the rest
        const keepTimer = activeTimers[0];
        const stopTimers = activeTimers.slice(1);

        for (const timer of stopTimers) {
          const endTime = new Date();
          const duration = Math.floor((endTime - timer.startTime) / 1000 / 60);

          await this.prisma.timeEntry.update({
            where: { id: timer.id },
            data: {
              isActive: false,
              endTime: endTime,
              duration: duration,
            },
          });

          logger.debug(
            `[DATABASE] Auto-stopped duplicate active timer ${timer.id} with duration ${duration} minutes`
          );
        }

        return keepTimer;
      }

      return activeTimers[0] || null;
    } catch (error) {
      logger.error("[DATABASE] Error ensuring single active timer:", error);
      throw error;
    }
  }

  // Time Entry methods
  async startTimer(data = {}) {
    try {
      // Stop any currently active timers first by properly calculating their durations
      const activeTimers = await this.prisma.timeEntry.findMany({
        where: { isActive: true },
      });

      // Stop each active timer with proper duration calculation
      for (const timer of activeTimers) {
        const endTime = new Date();
        const duration = Math.floor((endTime - timer.startTime) / 1000 / 60); // duration in minutes

        await this.prisma.timeEntry.update({
          where: { id: timer.id },
          data: {
            isActive: false,
            endTime: endTime,
            duration: duration,
          },
        });

        logger.debug(
          `[DATABASE] Stopped active timer ${timer.id} with duration ${duration} minutes`
        );
      }

      // Create new time entry
      const timeEntry = await this.prisma.timeEntry.create({
        data: {
          clientId: data.clientId || null,
          projectId: data.projectId || null,
          taskId: data.taskId || null,
          description: data.description || "",
          startTime: new Date(),
          isActive: true,
          duration: 0,
        },
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true,
            },
          },
        },
      });

      return timeEntry;
    } catch (error) {
      logger.error("Error starting timer:", error);
      throw error;
    }
  }

  async stopTimer(timeEntryId, roundTo = 15) {
    try {
      const timeEntry = await this.prisma.timeEntry.findUnique({
        where: { id: parseInt(timeEntryId) },
      });

      if (!timeEntry) {
        logger.warn(`[DATABASE] Timer with ID ${timeEntryId} not found`);
        // Check if there's any active timer we can stop instead
        const anyActiveTimer = await this.prisma.timeEntry.findFirst({
          where: { isActive: true },
        });

        if (!anyActiveTimer) {
          logger.warn("[DATABASE] No active timer found to stop");
          return null; // Return null instead of throwing error
        }

        // Use the found active timer instead
        logger.debug(
          `[DATABASE] Using active timer ${anyActiveTimer.id} instead of ${timeEntryId}`
        );
        return this.stopTimer(anyActiveTimer.id, roundTo);
      }

      if (!timeEntry.isActive) {
        logger.warn(`[DATABASE] Timer ${timeEntryId} is not active`);
        return timeEntry; // Return the existing entry
      }

      const endTime = new Date();
      const duration = Math.floor((endTime - timeEntry.startTime) / 1000 / 60); // duration in minutes

      // Apply rounding logic
      let roundedDuration = duration;
      if (roundTo > 0) {
        // Round up to the nearest roundTo minutes
        roundedDuration = Math.ceil(duration / roundTo) * roundTo;
        logger.debug(
          `[DATABASE] Duration: ${duration}m, rounded to ${roundTo}m intervals: ${roundedDuration}m`
        );
      }

      const updatedTimeEntry = await this.prisma.timeEntry.update({
        where: { id: parseInt(timeEntryId) },
        data: {
          endTime,
          duration: roundedDuration,
          isActive: false,
        },
        include: {
          client: true,
          task: {
            include: {
              project: true,
            },
          },
        },
      });

      return updatedTimeEntry;
    } catch (error) {
      logger.error("Error stopping timer:", error);
      throw error;
    }
  }

  async resumeTimer(timeEntryId) {
    try {
      // Stop any currently active timers first
      await this.prisma.timeEntry.updateMany({
        where: { isActive: true },
        data: {
          isActive: false,
          endTime: new Date(),
        },
      });

      // Calculate duration for currently active timers before stopping
      const activeTimers = await this.prisma.timeEntry.findMany({
        where: { isActive: true },
      });

      for (const timer of activeTimers) {
        const duration = Math.floor((new Date() - timer.startTime) / 1000 / 60);
        await this.prisma.timeEntry.update({
          where: { id: timer.id },
          data: { duration },
        });
      }

      // Resume the specified time entry
      const resumedTimeEntry = await this.prisma.timeEntry.update({
        where: { id: parseInt(timeEntryId) },
        data: {
          isActive: true,
          startTime: new Date(), // Reset start time to now
          endTime: null, // Clear end time
        },
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true,
            },
          },
        },
      });

      return resumedTimeEntry;
    } catch (error) {
      logger.error("Error resuming timer:", error);
      throw error;
    }
  }

  async getActiveTimer() {
    try {
      // Ensure only one active timer exists before returning
      const activeTimer = await this.ensureOnlyOneActiveTimer();

      if (activeTimer) {
        // Get the full timer data with relations
        return await this.prisma.timeEntry.findUnique({
          where: { id: activeTimer.id },
          include: {
            client: true,
            project: true,
            task: {
              include: {
                project: true,
              },
            },
          },
        });
      }

      return null;
    } catch (error) {
      logger.error("Error getting active timer:", error);
      throw error;
    }
  }

  async getTimeEntries(filters = {}) {
    try {
      logger.database("debug", "Getting time entries", { filters });

      const where = {};

      if (filters.clientId) {
        where.clientId = parseInt(filters.clientId);
      }

      if (filters.startDate && filters.endDate) {
        where.startTime = {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        };
      }

      if (filters.isInvoiced !== undefined) {
        where.isInvoiced = filters.isInvoiced;
      }

      logger.database("debug", "Time entries query where clause", { where });

      const timeEntries = await this.prisma.timeEntry.findMany({
        where,
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true,
            },
          },
        },
        orderBy: {
          id: "desc",
        },
      });

      logger.database("info", "Retrieved time entries", {
        count: timeEntries.length,
        firstEntryId: timeEntries[0]?.id || null,
        hasData: timeEntries.length > 0,
      });

      return timeEntries;
    } catch (error) {
      logger.database("error", "Error getting time entries", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async getTimeEntriesByIds(entryIds) {
    try {
      logger.database("debug", "Getting time entries by IDs", { entryIds });

      const timeEntries = await this.prisma.timeEntry.findMany({
        where: {
          id: { in: entryIds.map(id => parseInt(id)) }
        },
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true,
            },
          },
        },
        orderBy: {
          startTime: "asc",
        },
      });

      logger.database("info", "Retrieved time entries by IDs", {
        count: timeEntries.length,
        requestedIds: entryIds.length,
      });

      return timeEntries;
    } catch (error) {
      logger.database("error", "Error getting time entries by IDs", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async updateTimeEntry(id, data) {
    try {
      logger.debug(
        "[DATABASE] updateTimeEntry called with id:",
        id,
        "data:",
        data
      );

      if (!data || Object.keys(data).length === 0) {
        throw new Error("Update data is required");
      }

      // Clean the data - convert empty strings to null for optional fields
      const cleanData = { ...data };

      // Convert empty strings to null for optional foreign key fields
      if (cleanData.clientId === "") cleanData.clientId = null;
      if (cleanData.taskId === "") cleanData.taskId = null;

      // Convert string IDs to integers where needed
      if (cleanData.clientId) cleanData.clientId = parseInt(cleanData.clientId);
      if (cleanData.projectId)
        cleanData.projectId = parseInt(cleanData.projectId);
      if (cleanData.taskId) cleanData.taskId = parseInt(cleanData.taskId);

      // Handle empty string to null conversion for projectId
      if (cleanData.projectId === "") cleanData.projectId = null;

      logger.debug(
        "[DATABASE] Processing projectId:",
        cleanData.projectId,
        "and taskId:",
        cleanData.taskId
      );

      // Handle date and time fields - combine date with startTime and endTime
      if (cleanData.date && cleanData.startTime) {
        const startDateTime = this.parseTimeWithDate(
          cleanData.startTime,
          cleanData.date
        );
        if (startDateTime) cleanData.startTime = startDateTime;
      }

      if (cleanData.date && cleanData.endTime) {
        const endDateTime = this.parseTimeWithDate(
          cleanData.endTime,
          cleanData.date
        );
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

      logger.debug("[DATABASE] Cleaned data:", cleanData);

      // Prepare the update data object with relationship operations
      const updateData = { ...cleanData };

      // Handle client relationship
      if ("clientId" in updateData) {
        const clientId = updateData.clientId;
        delete updateData.clientId;

        if (clientId === null) {
          updateData.client = { disconnect: true };
        } else {
          updateData.client = { connect: { id: clientId } };
        }
      }

      // Handle project relationship
      if ("projectId" in updateData) {
        const projectId = updateData.projectId;
        delete updateData.projectId;

        if (projectId === null) {
          updateData.project = { disconnect: true };
        } else {
          updateData.project = { connect: { id: projectId } };
        }
      }

      // Handle task relationship
      if ("taskId" in updateData) {
        const taskId = updateData.taskId;
        delete updateData.taskId;

        if (taskId === null) {
          updateData.task = { disconnect: true };
        } else {
          updateData.task = { connect: { id: taskId } };
        }
      }

      logger.debug("[DATABASE] Update data with relationships:", updateData);

      const updatedTimeEntry = await this.prisma.timeEntry.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true,
            },
          },
        },
      });

      return updatedTimeEntry;
    } catch (error) {
      logger.error("Error updating time entry:", error);
      throw error;
    }
  }

  async createTimeEntry(data) {
    try {
      logger.debug("[DATABASE] createTimeEntry called with data:", data);

      if (!data || Object.keys(data).length === 0) {
        throw new Error("Create data is required");
      }

      // Clean the data - convert empty strings to null for optional fields
      const cleanData = { ...data };

      // Convert empty strings to null for optional foreign key fields
      if (cleanData.clientId === "") cleanData.clientId = null;
      if (cleanData.projectId === "") cleanData.projectId = null;
      if (cleanData.taskId === "") cleanData.taskId = null;

      // Convert string IDs to integers where needed
      if (cleanData.clientId) cleanData.clientId = parseInt(cleanData.clientId);
      if (cleanData.projectId)
        cleanData.projectId = parseInt(cleanData.projectId);
      if (cleanData.taskId) cleanData.taskId = parseInt(cleanData.taskId);

      logger.debug(
        "[DATABASE] Processing create with projectId:",
        cleanData.projectId,
        "and taskId:",
        cleanData.taskId
      );

      // Handle date and time fields - combine date with startTime and endTime
      if (cleanData.date && cleanData.startTime) {
        const startDateTime = this.parseTimeWithDate(
          cleanData.startTime,
          cleanData.date
        );
        if (startDateTime) cleanData.startTime = startDateTime;
      }

      if (cleanData.date && cleanData.endTime) {
        const endDateTime = this.parseTimeWithDate(
          cleanData.endTime,
          cleanData.date
        );
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

      logger.debug("[DATABASE] Cleaned data for create:", cleanData);

      const newTimeEntry = await this.prisma.timeEntry.create({
        data: cleanData,
        include: {
          client: true,
          project: true,
          task: {
            include: {
              project: true,
            },
          },
        },
      });

      return newTimeEntry;
    } catch (error) {
      logger.error("Error creating time entry:", error);
      throw error;
    }
  }

  async deleteTimeEntry(id) {
    try {
      await this.prisma.timeEntry.delete({
        where: { id: parseInt(id) },
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting time entry:", error);
      throw error;
    }
  }

  // Client methods
  async getClients() {
    try {
      // logger.database("debug", "Getting clients with relationships");

      const clients = await this.prisma.client.findMany({
        include: {
          projects: {
            include: {
              tasks: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      logger.database("info", "Retrieved clients", {
        count: clients.length,
        clientNames: clients.map((c) => c.name),
        projectCounts: clients.map((c) => ({
          name: c.name,
          projects: c.projects.length,
        })),
      });

      return clients;
    } catch (error) {
      logger.database("error", "Error getting clients", {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async createClient(data) {
    try {
      const client = await this.prisma.client.create({
        data: {
          name: data.name,
          email: data.email || null,
          hourlyRate: data.hourlyRate || 0,
        },
        include: {
          projects: true,
        },
      });

      return client;
    } catch (error) {
      logger.error("Error creating client:", error);
      throw error;
    }
  }

  async updateClient(id, data) {
    try {
      const client = await this.prisma.client.update({
        where: { id: parseInt(id) },
        data,
        include: {
          projects: true,
        },
      });

      return client;
    } catch (error) {
      logger.error("Error updating client:", error);
      throw error;
    }
  }

  async deleteClient(id) {
    try {
      await this.prisma.client.delete({
        where: { id: parseInt(id) },
      });

      return { success: true };
    } catch (error) {
      logger.error("Error deleting client:", error);
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
          tasks: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return projects;
    } catch (error) {
      logger.error("Error getting projects:", error);
      throw error;
    }
  }

  async createProject(data) {
    try {
      const clientId = parseInt(data.clientId);

      // If this project should be default, clear any existing default for this client
      if (data.isDefault) {
        await this.prisma.project.updateMany({
          where: { clientId },
          data: { isDefault: false },
        });
      }

      const project = await this.prisma.project.create({
        data: {
          name: data.name,
          clientId: clientId,
          hourlyRate: data.hourlyRate || null,
          isDefault: data.isDefault || false,
        },
        include: {
          client: true,
          tasks: true,
        },
      });

      return project;
    } catch (error) {
      logger.error("Error creating project:", error);
      throw error;
    }
  }

  async updateProject(id, data) {
    try {
      const projectId = parseInt(id);

      // Get the current project to know its clientId
      const currentProject = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { clientId: true },
      });

      if (!currentProject) {
        throw new Error("Project not found");
      }

      // If this project should be default, clear any existing default for this client
      if (data.isDefault) {
        await this.prisma.project.updateMany({
          where: {
            clientId: currentProject.clientId,
            id: { not: projectId }, // Don't update the current project
          },
          data: { isDefault: false },
        });
      }

      const project = await this.prisma.project.update({
        where: { id: projectId },
        data: {
          name: data.name,
          hourlyRate: data.hourlyRate || null,
          isDefault: data.isDefault !== undefined ? data.isDefault : undefined,
        },
        include: {
          client: true,
          tasks: true,
        },
      });

      return project;
    } catch (error) {
      logger.error("Error updating project:", error);
      throw error;
    }
  }

  async deleteProject(id) {
    try {
      const project = await this.prisma.project.delete({
        where: { id: parseInt(id) },
      });

      return project;
    } catch (error) {
      logger.error("Error deleting project:", error);
      throw error;
    }
  }

  async getDefaultProject(clientId) {
    try {
      const project = await this.prisma.project.findFirst({
        where: {
          clientId: parseInt(clientId),
          isDefault: true,
        },
        include: {
          client: true,
          tasks: true,
        },
      });

      return project;
    } catch (error) {
      logger.error("Error getting default project:", error);
      throw error;
    }
  }

  // Task methods
  async getTasks(projectId = null) {
    try {
      // logger.debug('[DATABASE] getTasks called with projectId:', projectId);
      const where = projectId ? { projectId: parseInt(projectId) } : {};
      // logger.debug('[DATABASE] Query where clause:', where);

      const tasks = await this.prisma.task.findMany({
        where,
        include: {
          project: {
            include: {
              client: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      });

      // logger.debug('[DATABASE] Found', tasks.length, 'tasks');
      return tasks;
    } catch (error) {
      logger.error("Error getting tasks:", error);
      throw error;
    }
  }

  async createTask(data) {
    try {
      const task = await this.prisma.task.create({
        data: {
          name: data.name,
          projectId: parseInt(data.projectId),
          description: data.description || null,
        },
        include: {
          project: {
            include: {
              client: true,
            },
          },
        },
      });

      return task;
    } catch (error) {
      logger.error("Error creating task:", error);
      throw error;
    }
  }

  async updateTask(id, data) {
    try {
      const task = await this.prisma.task.update({
        where: { id: parseInt(id) },
        data: {
          name: data.name,
          description: data.description || null,
        },
        include: {
          project: {
            include: {
              client: true,
            },
          },
        },
      });

      return task;
    } catch (error) {
      logger.error("Error updating task:", error);
      throw error;
    }
  }

  async deleteTask(id) {
    try {
      const task = await this.prisma.task.delete({
        where: { id: parseInt(id) },
      });

      return task;
    } catch (error) {
      logger.error("Error deleting task:", error);
      throw error;
    }
  }

  // Settings methods
  async getSetting(key) {
    try {
      const setting = await this.prisma.setting.findUnique({
        where: { key },
      });

      return setting ? setting.value : null;
    } catch (error) {
      logger.error("Error getting setting:", error);
      throw error;
    }
  }

  async setSetting(key, value) {
    try {
      const setting = await this.prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });

      return setting;
    } catch (error) {
      logger.error("Error setting value:", error);
      throw error;
    }
  }

  // Invoice methods
  async getInvoices() {
    try {
      const invoices = await this.prisma.invoice.findMany({
        include: {
          client: true,
          timeEntries: {
            include: {
              client: true,
              project: true,
              task: {
                include: {
                  project: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return invoices;
    } catch (error) {
      logger.error("Error getting invoices:", error);
      throw error;
    }
  }

  async getInvoiceById(id) {
    try {
      const invoice = await this.prisma.invoice.findUnique({
        where: { id: parseInt(id) },
        include: {
          client: true,
          timeEntries: {
            include: {
              client: true,
              project: true,
              task: {
                include: {
                  project: true,
                },
              },
            },
          },
        },
      });

      return invoice;
    } catch (error) {
      logger.error("Error getting invoice by ID:", error);
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
          status: data.status || "draft",
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        },
        include: {
          timeEntries: true,
        },
      });

      return invoice;
    } catch (error) {
      logger.error("Error creating invoice:", error);
      throw error;
    }
  }

  async deleteInvoice(id) {
    try {
      // First, mark all time entries as not invoiced
      await this.prisma.timeEntry.updateMany({
        where: { invoiceId: parseInt(id) },
        data: {
          isInvoiced: false,
          invoiceId: null,
        },
      });

      // Then delete the invoice
      const invoice = await this.prisma.invoice.delete({
        where: { id: parseInt(id) },
      });

      logger.debug("[DATABASE] Invoice deleted and time entries unmarked:", id);
      return invoice;
    } catch (error) {
      logger.error("Error deleting invoice:", error);
      throw error;
    }
  }

  async getSettings() {
    try {
      const settings = await this.prisma.setting.findMany();

      // Convert array of settings to object
      const settingsObj = {};
      settings.forEach((setting) => {
        settingsObj[setting.key] = setting.value;
      });

      return settingsObj;
    } catch (error) {
      logger.error("Error getting settings:", error);
      throw error;
    }
  }

  async markAsInvoiced(entryIds, invoiceNumber, templateData = null) {
    try {
      // Load the entries to determine client and amount
      const entries = await this.prisma.timeEntry.findMany({
        where: {
          id: { in: entryIds },
        },
        include: {
          client: true,
          project: true,
        },
      });

      if (!entries || entries.length === 0) {
        throw new Error("No time entries provided to mark as invoiced");
      }

      // Ensure all entries are for the same client
      const clientId = entries[0].clientId;
      const multipleClients = entries.some((e) => e.clientId !== clientId);
      if (multipleClients) {
        throw new Error("Cannot create invoice for multiple clients at once");
      }

      // Calculate total amount using project rate fallback to client rate
      const totalAmount = entries.reduce((sum, e) => {
        const hours = (e.duration || 0) / 60;
        const rate = e.project?.hourlyRate || e.client?.hourlyRate || 0;
        return sum + hours * rate;
      }, 0);

      // Determine billing period from entries
      const dates = entries.map((e) => new Date(e.startTime));
      const minDate = new Date(Math.min.apply(null, dates));
      const maxDate = new Date(Math.max.apply(null, dates));
      const toYMD = (d) => d.toISOString().split("T")[0];

      // Create invoice with template data
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          clientId,
          totalAmount: parseFloat(totalAmount.toFixed(2)),
          periodStart: toYMD(minDate),
          periodEnd: toYMD(maxDate),
          status: "generated",
          data: templateData ? JSON.stringify(templateData) : "{}"
        },
      });

      // Mark entries as invoiced and associate invoiceId
      await this.prisma.timeEntry.updateMany({
        where: { id: { in: entryIds } },
        data: { isInvoiced: true, invoiceId: invoice.id },
      });

      return invoice;
    } catch (error) {
      logger.error("Error marking entries as invoiced:", error);
      throw error;
    }
  }
}

module.exports = DatabaseService;

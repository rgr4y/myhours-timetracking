const { PrismaClient } = require('@prisma/client');

async function addSampleTasks() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    // Add sample tasks to project 1
    const sampleTasks = [
      { name: 'UI/UX Design', description: 'Design mockups and user experience flows', projectId: 1 },
      { name: 'Frontend Development', description: 'HTML, CSS, JavaScript implementation', projectId: 1 },
      { name: 'Backend Integration', description: 'API development and database setup', projectId: 1 },
      { name: 'Testing & QA', description: 'Quality assurance and bug testing', projectId: 1 },
    ];
    
    for (const taskData of sampleTasks) {
      await prisma.task.create({
        data: taskData
      });
      console.log(`Created task: ${taskData.name}`);
    }
    
    console.log(`\nAdded ${sampleTasks.length} tasks to project 1`);
    
    // Verify
    const tasksForProject1 = await prisma.task.findMany({
      where: { projectId: 1 }
    });
    console.log(`Project 1 now has ${tasksForProject1.length} tasks`);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleTasks();

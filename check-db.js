const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    await prisma.$connect();
    console.log('Connected to database');
    
    // Check all projects with their tasks
    const projects = await prisma.project.findMany({
      include: {
        client: true,
        tasks: true
      }
    });
    
    console.log('Projects and their tasks:');
    projects.forEach(project => {
      console.log(`\nProject ID ${project.id}: "${project.name}" (Client: ${project.client.name})`);
      console.log(`  Tasks (${project.tasks.length}):`);
      project.tasks.forEach(task => {
        console.log(`    - ID ${task.id}: ${task.name}`);
      });
    });
    
    // Check what happens when we query tasks for project 1
    console.log('\n--- Checking tasks for project ID 1 ---');
    const tasksForProject1 = await prisma.task.findMany({
      where: { projectId: 1 },
      include: {
        project: true
      }
    });
    console.log(`Found ${tasksForProject1.length} tasks for project ID 1`);
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();

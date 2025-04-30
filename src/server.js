const app = require('./app');
const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Successfully connected to PostgreSQL database');
    
    // Setup queue workers (if using BullMQ)
    setupWorkers();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
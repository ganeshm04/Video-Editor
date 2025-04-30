const { Queue, Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const ffmpegService = require('./ffmmpegServices');
const fs = require('fs');

const prisma = new PrismaClient();

// Skip queue setup if not enabled
if (process.env.USE_QUEUE !== 'true') {
  exports.addRenderJob = async () => {
    console.log('Queue disabled, jobs will be processed synchronously');
    return null;
  };
  
  exports.setupWorkers = () => {
    console.log('Queue disabled, no workers started');
  };
} else {
  // Redis connection config
  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  // Create a queue for video rendering
  const renderQueue = new Queue('video-render', { connection });

  // Add job to queue
  exports.addRenderJob = async (data) => {
    const job = await renderQueue.add('render', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    console.log(`Added render job ${job.id} to queue`);
    return job;
  };

  // Setup worker
  exports.setupWorkers = () => {
    const worker = new Worker('video-render', async (job) => {
      console.log(`Processing render job ${job.id}`);
      const { videoId, outputPath } = job.data;
      
      try {
        // Get video with edits and subtitles
        const video = await prisma.video.findUnique({
          where: { id: videoId },
          include: {
            edits: true,
            subtitles: true
          }
        });
        
        if (!video) {
          throw new Error(`Video ${videoId} not found`);
        }
        
        // Render final video
        await ffmpegService.renderFinalVideo(video, outputPath);
        
        // Update video status and path
        await prisma.video.update({
          where: { id: videoId },
          data: { 
            status: 'RENDERED',
            renderedPath: outputPath
          }
        });
        
        console.log(`Job ${job.id} completed successfully`);
        return { success: true };
      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        
        // Update video status to failed
        await prisma.video.update({
          where: { id: videoId },
          data: { status: 'FAILED' }
        });
        
        throw error;
      }
    }, { connection });
    
    worker.on('completed', (job) => {
      console.log(`Job ${job.id} has completed`);
    });
    
    worker.on('failed', (job, err) => {
      console.error(`Job ${job.id} has failed with ${err.message}`);
    });
    
    console.log('Video render worker started');
    
    // Graceful shutdown
    process.on('SIGTERM', async () => {
      await worker.close();
      await renderQueue.close();
    });
  };
}
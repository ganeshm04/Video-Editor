const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const getVideoDuration = require('get-video-duration');
const ffmpegService = require('../services/ffmmpegServices');
const { addRenderJob } = require('../services/queue');
const AppError = require('../utils/appError');

const prisma = new PrismaClient();

// Upload a new video
exports.uploadVideo = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new AppError('No video file uploaded', 400));
    }

    // Get video details
    const { filename, path: filePath, size } = req.file;
    
    // Get video duration
    const duration = await getVideoDuration.getVideoDurationInSeconds(filePath);
    
    // Save to database
    const video = await prisma.video.create({
      data: {
        name: filename,
        originalPath: filePath,
        size: size,
        duration: duration,
        status: 'UPLOADED'
      }
    });

    res.status(201).json({
      success: true,
      data: video,
      message: 'Video uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
};

// Trim a video
exports.trimVideo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return next(new AppError('Start and end times are required', 400));
    }

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id }
    });

    if (!video) {
      return next(new AppError('Video not found', 404));
    }

    // Generate output path
    const outputPath = path.join('processed', `${video.id}_trimmed.mp4`);
    
    // Perform trim operation
    await ffmpegService.trimVideo(video.originalPath, outputPath, startTime, endTime);
    
    // Update database
    const edit = await prisma.edit.create({
      data: {
        videoId: id,
        type: 'TRIM',
        startTime: parseFloat(startTime),
        endTime: parseFloat(endTime),
        path: outputPath
      }
    });

    res.status(200).json({
      success: true,
      data: edit
    });
  } catch (error) {
    next(error);
  }
};

// Add subtitles to a video
exports.addSubtitles = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text, startTime, endTime } = req.body;

    if (!text || !startTime || !endTime) {
      return next(new AppError('Text, start time, and end time are required', 400));
    }

    // Check if video exists
    const video = await prisma.video.findUnique({
      where: { id }
    });

    if (!video) {
      return next(new AppError('Video not found', 404));
    }

    const outputPath = path.join('subtitles', `${video.id}_subtitle.mp4`);

    // Save subtitle to database
    const subtitle = await prisma.subtitle.create({
      data: {
        videoId: id,
        text,
        startTime: parseFloat(startTime),
        endTime: parseFloat(endTime),
        path:outputPath
      }
    });

    res.status(200).json({
      success: true,
      data: subtitle
    });
  } catch (error) {
    next(error);
  }
};



// Render final video
exports.renderVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if video exists with all its edits and subtitles
    const video = await prisma.video.findUnique({
      where: { id },
      include: {
        edits: true,
        subtitles: true
      }
    });

    if (!video) {
      return next(new AppError('Video not found', 404));
    }

    // Update video status to processing
    await prisma.video.update({
      where: { id },
      data: { status: 'PROCESSING' }
    });

    // Generate output path for final video
    const outputPath = path.join('processed', `${video.id}_final.mp4`);

    // Add job to queue if using BullMQ, otherwise process directly
    if (process.env.USE_QUEUE === 'true') {
      await addRenderJob({
        videoId: id,
        outputPath
      });
      
      res.status(202).json({
        success: true,
        message: 'Video rendering job added to queue',
        data: { id, status: 'PROCESSING' }
      });
    } else {
      // Process directly (synchronous)
      try {
        await ffmpegService.renderFinalVideo(video, outputPath);
        
        // Update video status and path
        await prisma.video.update({
          where: { id },
          data: { 
            status: 'RENDERED',
            renderedPath: outputPath
          }
        });
        
        res.status(200).json({
          success: true,
          message: 'Video rendered successfully',
          data: { id, outputPath }
        });
      } catch (error) {
        // Update status to failed
        await prisma.video.update({
          where: { id },
          data: { status: 'FAILED' }
        });
        throw error;
      }
    }
  } catch (error) {
    next(error);
  }
};

// Download rendered video
exports.downloadVideo = async (req, res, next) => {
  try {
    const { id } = req.params;

    const video = await prisma.video.findUnique({
      where: { id }
    });

    if (!video) {
      return next(new AppError('Video not found', 404));
    }

    if (video.status !== 'RENDERED') {
      return next(new AppError('Video is not yet rendered', 400));
    }

    if (!video.renderedPath || !fs.existsSync(video.renderedPath)) {
      return next(new AppError('Rendered video file not found', 404));
    }

    const fileName = path.basename(video.renderedPath);
    
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'video/mp4');
    
    const fileStream = fs.createReadStream(video.renderedPath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

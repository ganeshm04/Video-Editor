const ffmpeg =require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');



// Set the ffmpeg path if not in PATH
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

// Trim a video between start and end time
exports.trimVideo = (inputPath, outputPath, startTime, endTime) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputPath)
      .on('end', () => {
        console.log(`Video trimmed successfully: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error trimming video:', err);
        reject(new AppError(`Error trimming video: ${err.message}`, 500));
      })
      .run();
  });
};

// Create subtitle file from subtitle object
const createSubtitleFile = async (subtitle) => {
  const subtitleDir = 'subtitles';
  
  // Check if the subtitles directory exists, create if not
  try {
    await fs.mkdir(subtitleDir, { recursive: true });
  } catch (err) {
    console.error('Error creating subtitles directory:', err);
  }

  const subtitlePath = path.join(subtitleDir, `${uuidv4()}.srt`);
  
  const content = `1\n${formatTimestamp(subtitle.startTime)} --> ${formatTimestamp(subtitle.endTime)}\n${subtitle.text}\n`;
  
  await fs.writeFile(subtitlePath, content);
  return subtitlePath;
};

// Format timestamp for SRT file (HH:MM:SS,MS)
const formatTimestamp = (seconds) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8).replace('.', ',');
};

// Add subtitles to a video
exports.addSubtitlesToVideo = (inputPath, outputPath, subtitlePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf subtitles=${subtitlePath.replace(/\\/g, '\\\\')}`
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`Subtitles added successfully: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error adding subtitles:', err);
        reject(new AppError(`Error adding subtitles: ${err.message}`, 500));
      })
      .run();
  });
};

// Add overlay text directly to video
exports.addTextOverlay = (inputPath, outputPath, text, startTime, endTime) => {
  const duration = endTime - startTime;
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilters([
        {
          filter: 'drawtext',
          options: {
            text: text,
            fontsize: 36,
            fontcolor: 'white',
            box: 1,
            boxcolor: 'black@0.5',
            boxborderw: 5,
            x: '(w-text_w)/2',
            y: 'h-th-50',
            enable: `between(t,${startTime},${endTime})`
          }
        }
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`Text overlay added successfully: ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error adding text overlay:', err);
        reject(new AppError(`Error adding text overlay: ${err.message}`, 500));
      })
      .run();
  });
};

// Render final video with all edits and subtitles
exports.renderFinalVideo = async (video, outputPath) => {
  try {
    // Start with the original video or trimmed video if available
    let currentInput = video.originalPath;
    let tempOutputPath;
    
    // Apply trim if it exists
    const trimEdit = video.edits.find(edit => edit.type === 'TRIM');
    if (trimEdit) {
      tempOutputPath = path.join('processed', `${video.id}_trim_temp.mp4`);
      await exports.trimVideo(currentInput, tempOutputPath, trimEdit.startTime, trimEdit.endTime);
      currentInput = tempOutputPath;
    }
    
    // Apply subtitles if they exist
    if (video.subtitles && video.subtitles.length > 0) {
      // Create a complex filter for adding all subtitles at once
      const filterComplex = video.subtitles.map((subtitle, index) => {
        return `drawtext=text='${subtitle.text}':fontsize=36:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=h-th-50:enable='between(t,${subtitle.startTime},${subtitle.endTime})'`;
      }).join(',');

      return new Promise((resolve, reject) => {
        ffmpeg(currentInput)
          .videoFilters(filterComplex)
          .output(outputPath)
          .on('end', () => {
            console.log(`Final video rendered successfully: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('Error rendering final video:', err);
            reject(new AppError(`Error rendering final video: ${err.message}`, 500));
          })
          .run();
      });
    } else {
      // If no subtitles, just copy the current input to the output
      return new Promise((resolve, reject) => {
        ffmpeg(currentInput)
          .output(outputPath)
          .on('end', () => {
            console.log(`Final video rendered successfully: ${outputPath}`);
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error('Error rendering final video:', err);
            reject(new AppError(`Error rendering final video: ${err.message}`, 500));
          })
          .run();
      });
    }
  } catch (error) {
    console.error('Error in renderFinalVideo:', error);
    throw new AppError(`Failed to render final video: ${error.message}`, 500);
  }
};
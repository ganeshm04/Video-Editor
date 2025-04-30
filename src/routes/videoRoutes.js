const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const upload = require('../utils/multerConfig');

/**
 *
 * /api/videos/upload:
 *   post:
 *     summary: Upload a new video
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: video
 *         type: file
 *         required: true
 *         description: The video file to upload
 *     responses:
 *       200:
 *         description: Video uploaded successfully
 */
router.post('/upload', upload.single('video'), videoController.uploadVideo);

/**
 * 
 * /api/videos/{id}/trim:
 *   post:
 *     summary: Trim a video
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the video to trim
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           required:
 *             - startTime
 *             - endTime
 *           properties:
 *             startTime:
 *               type: number
 *               description: Start time in seconds
 *             endTime:
 *               type: number
 *               description: End time in seconds
 *     responses:
 *       200:
 *         description: Video trimmed successfully
 */
router.post('/:id/trim', videoController.trimVideo);

/**
 * 
 * /api/videos/{id}/subtitles:
 *   post:
 *     summary: Add subtitles to a video
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the video
 *       - in: body
 *         name: body
 *         schema:
 *           type: object
 *           required:
 *             - text
 *             - startTime
 *             - endTime
 *           properties:
 *             text:
 *               type: string
 *               description: Subtitle text
 *             startTime:
 *               type: number
 *               description: Start time in seconds
 *             endTime:
 *               type: number
 *               description: End time in seconds
 *     responses:
 *       200:
 *         description: Subtitles added successfully
 */
router.post('/:id/subtitles', videoController.addSubtitles);

/**
 * 
 * /api/videos/{id}/render:
 *   post:
 *     summary: Render the final video with all edits
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the video to render
 *     responses:
 *       202:
 *         description: Video rendering started
 */
router.post('/:id/render', videoController.renderVideo);

/**
 * 
 * /api/videos/{id}/download:
 *   get:
 *     summary: Download the rendered video
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the video to download
 *     responses:
 *       200:
 *         description: Video file
 */
router.get('/:id/download', videoController.downloadVideo);



module.exports = router;
# Video Editor Application

## Overview

The **Video Editor Application** is a backend service designed to handle video processing tasks such as uploading, trimming, adding subtitles, rendering, and downloading videos. It is built using **Node.js**, **Express.js**, **Prisma ORM**, and **FFmpeg**, with **PostgreSQL(Supabase)** as the database. The application supports asynchronous job processing using **BullMQ** for scalable video rendering.

---

## Features

1. **Video Upload**:
   - Upload video files via a REST API.
   - Store video metadata (e.g., name, size, duration) in the database.

2. **Video Trimming**:
   - Trim videos by specifying start and end times.
   - Save trimmed videos as new files.

3. **Adding Subtitles**:
   - Add subtitles to videos with text and timing information.
   - Store subtitles in the database.

4. **Rendering Final Video**:
   - Combine all edits (e.g., trims, subtitles) into a single final video.
   - Supports asynchronous processing using **BullMQ**.
   - Not implemented properly

5. **Downloading Rendered Videos**:
   - Download the final rendered video.


---

## Technologies Used

- **Backend Framework**: Express.js
- **Database**: PostgreSQL (managed via Prisma ORM)
- **Video Processing**: FFmpeg (via `fluent-ffmpeg`)
- **Job Queueing**: BullMQ (not implemented properly, for asynchronous rendering)
- **File Uploads**: Multer
- **Environment Management**: dotenv

---

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Video_editor

2. Install dependencies:
    npm install

3. Set up the environment variables:
    Create a .env file in the root directory.
    Add the following variables:

    PORT=3000
    DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
    DIRECT_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
    FFMPEG_PATH="C:\path\to\ffmpeg.exe"
    USE_QUEUE=true
    REDIS_HOST=localhost
    REDIS_PORT=6379

4. Run database migrations:
    npx prisma migrate dev

5. Start the server:
    npm run dev



## API Endpoints

Video Operations

1. Upload Video
        POST /api/videos/upload
        Upload a video file.


2. Trim Video
        POST /api/videos/:id/trim
        Trim a video by specifying start and end times.

3. Add Subtitles
        POST /api/videos/:id/subtitles
        Add subtitles to a video.

4. Render Video
        POST /api/videos/:id/render
        Render the final video with all edits.

5. Download Video
        GET /api/videos/:id/download
        Download the rendered video.




## File Structure
Video_editor/
├── src/
│   ├── app.js                # Express app initialization
│   ├── server.js             # Server entry point
│   ├── controllers/          # Business logic for video operations
│   ├── routes/               # API route definitions
│   ├── services/             # FFmpeg and queue services
│   ├── utils/                # Utility functions (e.g., error handling, multer config)
│   └── public/               # Static files
├── prisma/
│   ├── schema.prisma         # Database schema
├── uploads/                  # Uploaded video files
├── processed/                # Processed video files
├── subtitles/                # Subtitle files
├── .env                      # Environment variables
├── [package.json]            # Project metadata and dependencies
└── README.md                 # Project documentation



## Database Schema

Models

1. Video:
    Stores metadata about uploaded videos.
    Fields: id, name, originalPath, size, duration, status, renderedPath.

2. Edit:
    Tracks edits (e.g., trims) applied to videos.
    Fields: id, videoId, type, startTime, endTime, path.

3. Subtitle:
    Stores subtitle text and timing information.
    Fields: id, videoId, text, startTime, endTime, path.

4. Enums
    VideoStatus: UPLOADED, PROCESSING, RENDERED, FAILED
    EditType: TRIM, SUBTITLE
   
   
## Key Services

1. FFmpeg Services:
    Handles video trimming, adding subtitles, and rendering final videos.

2. Multer Configuration:
    Handles file uploads with validation for video files.


## Environment Variables

PORT	        Port on which the server runs
DATABASE_URL	Connection string for PostgreSQL database
DIRECT_URL	    Direct connection string for migrations
FFMPEG_PATH	    Path to the FFmpeg executable
USE_QUEUE	    Enable/disable job queueing (true/false)
REDIS_HOST	    Redis host for BullMQ
REDIS_PORT	    Redis port for BullMQ





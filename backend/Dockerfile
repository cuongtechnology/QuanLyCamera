FROM node:18-alpine

# Install FFmpeg and wget for healthcheck
RUN apk add --no-cache ffmpeg wget

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /var/hls /var/recordings /var/log

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["node", "src/index.js"]

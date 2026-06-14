FROM node:18-alpine

WORKDIR /app

# Copy package files from backend directory
COPY backend/package*.json ./

# Install backend dependencies
RUN npm install

# Copy all files from the backend directory
COPY backend/ .

# Hugging Face Spaces default port is 7860
EXPOSE 7860
ENV PORT=7860

# Run the node backend server
CMD ["node", "server.js"]

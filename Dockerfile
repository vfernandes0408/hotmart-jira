FROM node:20-alpine

WORKDIR /app

# Install basic dependencies for building native modules
RUN apk add --no-cache git

# Copy only package.json first
COPY package.json ./

# Install dependencies without package-lock
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app will run on
EXPOSE 8888

# Command to run the application
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
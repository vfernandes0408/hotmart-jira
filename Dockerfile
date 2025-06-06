FROM node:20

WORKDIR /app

# Atualiza o npm
RUN npm install -g npm@latest

# Copy package.json and package-lock.json
COPY package*.json ./

# Clean npm cache and install dependencies
RUN npm cache clean --force && \
    npm install --verbose

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app will run on
EXPOSE 8888

# Command to run the application
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
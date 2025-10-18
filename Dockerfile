# Stage 1: Build the Angular application
FROM node:24-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the application for production
RUN npm run build -- --configuration production

# Stage 2: Serve the application with NGINX
FROM nginx:1.29-alpine-slim

# Copy the built application from the build stage
COPY --from=build /app/dist/browser /usr/share/nginx/html

# Copy the NGINX configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
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

#debug
RUN ls -la /app/dist

# Stage 2: Serve with NGINX
FROM nginx:alpine

# Copy the built application from the build stage
COPY --from=build /app/dist/crescendo/browser /usr/share/nginx/html

# COPY redirect.js /etc/nginx/njs/redirect.js

# Copy the NGINX configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf



# Expose port 80
EXPOSE 80

# Start NGINX
CMD ["nginx", "-g", "daemon off;"]
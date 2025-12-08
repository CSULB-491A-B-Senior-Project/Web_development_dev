#!/bin/bash
# Start the development environment using docker-compose
docker compose -f docker-compose.dev.yml up --build
wait
docker compose -f docker-compose.dev.yml down


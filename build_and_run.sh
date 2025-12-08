#!/bin/bash
# 1. Build using the specific Dev Dockerfile
docker build -f Dockerfile.dev -t crescendo-dev .
docker run -p 4200:4200 --add-host=host.docker.internal:host-gateway --rm crescendo-dev 
wait


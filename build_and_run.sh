#!/bin/bash

docker build -t crescendo-frontend .
docker run -p 80:80 --add-host=host.docker.internal:host-gateway crescendo-frontend
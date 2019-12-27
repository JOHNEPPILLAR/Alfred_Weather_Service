#!/bin/bash
clear

echo "Reove node_modules"
rm -rf node_modules

echo "Remove old docker containers & images"
docker-compose down --rmi all

echo "Build & run new ver"
cd certs
./genCert.sh
cd ..
docker-compose -f docker-compose.dev.yml up -d --build

echo "Tidy up"
docker image prune -f



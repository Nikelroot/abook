#!/bin/bash

sh /mnt/W/projects/create_network.sh
sh /mnt/W/projects/auth/start.sh

docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d


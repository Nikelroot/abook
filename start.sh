#!/bin/bash

sh /mnt/W/projects/create_network.sh
sh /mnt/W/projects/auth/start.sh
sh /mnt/W/projects/traefik/start.sh
sh /mnt/W/projects/grafana/start.sh
sh /mnt/W/projects/cdn/start.sh

docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_vless
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d mongo_abook
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_api
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_web
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_parser
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_parser_link
# docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_parser_metadata
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d qbook_qbt
docker compose -f /mnt/W/projects/abook/docker-compose.yml up -d abook_qbittorrent


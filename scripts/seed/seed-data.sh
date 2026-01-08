#!/bin/sh
# ============================================
# MongoDB Production Data Initialization Script
# ============================================

set -e

echo "Waiting for MongoDB to be ready..."
sleep 10

echo "Starting data initialization..."

# Thực thi script khởi tạo dữ liệu
mongosh --host mongodb --quiet /docker-entrypoint-initdb.d/init-data.js

echo "Data initialization completed"
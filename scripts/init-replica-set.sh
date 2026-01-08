#!/bin/sh
# ============================================
# MongoDB Replica Set Initialization Script
# ============================================

set -e

echo "Waiting for MongoDB to be ready..."
sleep 5

echo "Initializing replica set 'rs0'..."

# Use the service name `mongodb` as hostname to match docker-compose service
mongosh --host mongodb --quiet <<EOF
try {
  var status = rs.status();
  print("Replica set already initialized");
} catch (e) {
  if (e.codeName === 'NotYetInitialized') {
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongodb:27017", priority: 1 }
      ]
    });
    print("Replica set initialized successfully!");
  } else {
    print("Error checking replica set status:", e);
    throw e;
  }
}
EOF

echo "Replica set initialization completed"

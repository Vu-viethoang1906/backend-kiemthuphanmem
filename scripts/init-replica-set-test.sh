#!/bin/sh
set -e

echo "Waiting for MongoDB to be ready..."
until mongosh --host mongo-test --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
  sleep 1
done

echo "Initializing replica set 'rs0'..."
mongosh --host mongo-test --quiet <<EOF
try {
  var status = rs.status();
  print("Replica set already initialized");
} catch (e) {
  if (e.codeName === 'NotYetInitialized') {
    rs.initiate({
      _id: "rs0",
      members: [
        { _id: 0, host: "mongo-test:27017", priority: 1 }
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

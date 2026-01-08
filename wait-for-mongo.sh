#!/bin/sh
echo "Waiting for MongoDB to be ready..."
while ! nc -z mongodb-test 27017; do
  sleep 1
done
echo "MongoDB is ready, running tests..."
exec npm test
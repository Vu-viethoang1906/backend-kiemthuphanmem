#!/bin/sh

# Entrypoint script cho test container
# Chạy npm test:coverage và lưu exit code

echo "⏳ Waiting for MongoDB to be ready..."
sleep 10

echo "🧪 Starting test coverage..."
npm run test:coverage

# Lưu exit code từ test
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Tests completed successfully!"
  # Keep container running để CI/CD có thể kiểm tra logs
  sleep 300
  exit 0
else
  echo "❌ Tests failed with exit code: $EXIT_CODE"
  # Keep container running để CI/CD có thể kiểm tra logs
  sleep 300
  exit $EXIT_CODE
fi
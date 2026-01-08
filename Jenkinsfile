pipeline {
  agent any

  environment {
    COMPOSE_FILE = 'docker-compose.test.yml'
    PROJECT_PREFIX = 'ken-test'
    TEST_RETRIES = '3'
    TEST_RETRY_DELAY = '10'
    MONGO_HEALTH_RETRIES = '60'
    MONGO_HEALTH_SLEEP = '2'
    APP_START_SLEEP = '10'
  }

  stages {
    stage('Checkout') {
      steps {
        echo '📦 Checkout'
        checkout scm
      }
    }

    stage('Cleanup Previous Containers, Network & Volumes') {
      steps {
        echo '🛑 Cleaning previous resources (tolerant)'
        bat '''
@echo off
REM remove containers if present (no error if missing)
for %%c in (ken-be-mongodb-test ken-be-app-test ken-be-mongo-test-init ken-be-mongo-express-test) do (
  docker ps -a -q -f name=%%c >nul 2>&1 && docker rm -f %%c || echo %%c not found
)

REM remove network if present
docker network ls --filter name=%PROJECT_PREFIX%-network -q >nul 2>&1 && docker network rm %PROJECT_PREFIX%-network || echo network not found

REM remove volumes if present
for %%v in (ken-mongo-test-data ken-mongo-test-config) do (
  docker volume ls --filter name=%%v -q >nul 2>&1 && docker volume rm %%v || echo volume %%v not found
)
exit /b 0
        '''
      }
    }

    stage('Docker Compose Up') {
      steps {
        echo '🚀 Building and starting test services...'
        bat '''
@echo off
docker compose -f %COMPOSE_FILE% up -d --build
        '''
      }
    }

    stage('Wait for Mongo (healthy)') {
      steps {
        echo '⏳ Waiting for mongo-test to be healthy...'
        powershell '''
$max = [int]$env:MONGO_HEALTH_RETRIES
$sleep = [int]$env:MONGO_HEALTH_SLEEP
$i = 0
while ($i -lt $max) {
  $status = docker inspect --format='{{.State.Health.Status}}' ken-be-mongodb-test 2>&1
  if ($status -eq 'healthy') { Write-Host 'mongo is healthy'; exit 0 }
  Write-Host "Waiting for mongo... ($i/$max)"
  Start-Sleep -Seconds $sleep
  $i++
}
throw 'mongo did not become healthy in time'
        '''
      }
    }

    stage('Run Tests (with retries)') {
      steps {
        echo '🧪 Run npm test inside compose service (with retries)'
        bat '''
@echo off
setlocal ENABLEDELAYEDEXPANSION
set RETRY=0
set MAX=%TEST_RETRIES%
:RETRY_LOOP
set /a RETRY+=1
echo Attempt !RETRY! of %MAX%...
docker compose -f %COMPOSE_FILE% exec -T app-test npm test
if errorlevel 1 (
  if !RETRY! lss %MAX% (
    echo Test failed, waiting %TEST_RETRY_DELAY% seconds before retry...
    timeout /t %TEST_RETRY_DELAY% /nobreak >nul
    goto RETRY_LOOP
  ) else (
    echo Test failed after %MAX% attempts.
    exit /b 1
  )
) else (
  echo Tests passed.
)
endlocal
        '''
      }
    }
  }

  post {
    always {
      echo '🧹 Final cleanup (best-effort)'
      bat '''
@echo off
docker compose -f %COMPOSE_FILE% down --volumes --remove-orphans || echo compose down failed
      '''
    }
    success { echo '✅ Pipeline succeeded' }
    failure { echo '❌ Pipeline failed' }
  }
}

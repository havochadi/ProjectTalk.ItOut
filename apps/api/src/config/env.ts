import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const apiRootDir = path.resolve(__dirname, '../..');
const workspaceRootDir = path.resolve(apiRootDir, '../..');
const apiEnvPath = path.resolve(apiRootDir, '.env');
const workspaceEnvPath = path.resolve(workspaceRootDir, '.env');

function loadEnvFile(envPath: string, override: boolean) {
  if (!fs.existsSync(envPath)) {
    return false;
  }

  const result = dotenv.config({ path: envPath, override });
  if (result.error) {
    console.error(`Error loading .env file at ${envPath}:`, result.error);
    return false;
  }

  console.log(`✓ .env loaded from: ${envPath}`);
  return true;
}

// Prefer apps/api/.env, then fill missing values from workspace root .env
const loadedApiEnv = loadEnvFile(apiEnvPath, false);
const loadedWorkspaceEnv = loadEnvFile(workspaceEnvPath, false);

if (!loadedApiEnv && !loadedWorkspaceEnv) {
  console.warn('⚠️ No .env file found for API configuration');
}

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

console.log('🔍 Checking for required TypeScript type definitions...');

const requiredTypes = [
  '@types/express',
  '@types/cors',
  '@types/morgan',
  '@types/cookie-parser',
  '@types/jsonwebtoken',
  '@types/node',
];

// Path to node_modules
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

// Check for missing type packages
const missingTypes = requiredTypes.filter(
  (type) => !existsSync(path.join(nodeModulesPath, type))
);

if (missingTypes.length === 0) {
  console.log('✅ All required type definitions are already installed.');
  process.exit(0);
}

console.log(
  `🔧 Installing missing type definitions: ${missingTypes.join(', ')}`
);

try {
  execSync(`npm install --save-dev ${missingTypes.join(' ')}`, {
    stdio: 'inherit',
  });
  console.log('✅ Successfully installed all required type definitions.');
} catch (error) {
  console.error('❌ Failed to install type definitions:', error);
  process.exit(1);
}

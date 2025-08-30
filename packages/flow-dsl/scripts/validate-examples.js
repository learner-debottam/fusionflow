#!/usr/bin/env node

/**
 * Script to validate all Flow DSL examples
 * This script is used in CI/CD to ensure all examples are valid
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Import the Flow DSL validation functions
const { validateFlow, getValidationErrors } = require('../dist/index.js');

const EXAMPLES_DIR = path.join(__dirname, '../../examples/flows');
const SCHEMA_FILE = path.join(__dirname, '../schema/flow.schema.json');

/**
 * Validate a single YAML file
 * @param {string} filePath - Path to the YAML file
 * @returns {Object} Validation result
 */
function validateYamlFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(content);
    
    // Validate against Flow DSL schema
    const validationResult = validateFlow(data);
    
    return {
      file: path.basename(filePath),
      valid: validationResult.valid,
      errors: validationResult.errors,
      warnings: validationResult.warnings
    };
  } catch (error) {
    return {
      file: path.basename(filePath),
      valid: false,
      errors: [{ message: error.message, code: 'PARSE_ERROR' }],
      warnings: []
    };
  }
}

/**
 * Check for hardcoded secrets in YAML files
 * @param {string} filePath - Path to the YAML file
 * @returns {Array} List of potential secrets found
 */
function checkForSecrets(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const secrets = [];
  
  // Patterns to look for
  const patterns = [
    /password:\s*['"][^'"]+['"]/gi,
    /secret:\s*['"][^'"]+['"]/gi,
    /token:\s*['"][^'"]+['"]/gi,
    /key:\s*['"][^'"]+['"]/gi,
    /api_key:\s*['"][^'"]+['"]/gi
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        secrets.push({
          type: ['password', 'secret', 'token', 'key', 'api_key'][index],
          match: match.replace(/['"][^'"]+['"]/, '***REDACTED***')
        });
      });
    }
  });
  
  return secrets;
}

/**
 * Validate JSON Schema file
 * @returns {Object} Schema validation result
 */
function validateSchema() {
  try {
    const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    // Basic schema validation
    const requiredFields = ['$schema', 'type', 'properties', 'definitions'];
    const missingFields = requiredFields.filter(field => !schema[field]);
    
    if (missingFields.length > 0) {
      return {
        valid: false,
        errors: [`Missing required schema fields: ${missingFields.join(', ')}`]
      };
    }
    
    // Check for required definitions
    const requiredDefs = ['Metadata', 'Trigger', 'Step', 'Transport', 'Policy', 'Observability'];
    const missingDefs = requiredDefs.filter(def => !schema.definitions[def]);
    
    if (missingDefs.length > 0) {
      return {
        valid: false,
        errors: [`Missing required schema definitions: ${missingDefs.join(', ')}`]
      };
    }
    
    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [`Schema validation failed: ${error.message}`]
    };
  }
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating Flow DSL examples...\n');
  
  let allValid = true;
  let totalFiles = 0;
  let validFiles = 0;
  
  // Validate schema first
  console.log('📋 Validating JSON Schema...');
  const schemaResult = validateSchema();
  if (!schemaResult.valid) {
    console.error('❌ Schema validation failed:');
    schemaResult.errors.forEach(error => console.error(`   ${error}`));
    allValid = false;
  } else {
    console.log('✅ Schema validation passed');
  }
  
  console.log('\n📄 Validating YAML examples...');
  
  // Get all YAML files in examples directory
  const files = fs.readdirSync(EXAMPLES_DIR)
    .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  
  files.forEach(file => {
    totalFiles++;
    const filePath = path.join(EXAMPLES_DIR, file);
    
    console.log(`\n🔍 Validating ${file}...`);
    
    // Validate YAML syntax and Flow DSL schema
    const result = validateYamlFile(filePath);
    
    if (result.valid) {
      console.log(`✅ ${file} - Valid`);
      validFiles++;
    } else {
      console.error(`❌ ${file} - Invalid`);
      result.errors.forEach(error => {
        console.error(`   ${error.path || 'unknown'}: ${error.message} (${error.code})`);
      });
      allValid = false;
    }
    
    // Check for warnings
    if (result.warnings.length > 0) {
      console.log(`⚠️  ${file} - Warnings:`);
      result.warnings.forEach(warning => {
        console.log(`   ${warning.path || 'unknown'}: ${warning.message} (${warning.code})`);
      });
    }
    
    // Check for secrets
    const secrets = checkForSecrets(filePath);
    if (secrets.length > 0) {
      console.error(`🔒 ${file} - Potential secrets found:`);
      secrets.forEach(secret => {
        console.error(`   ${secret.type}: ${secret.match}`);
      });
      allValid = false;
    }
  });
  
  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Valid files: ${validFiles}`);
  console.log(`   Invalid files: ${totalFiles - validFiles}`);
  console.log(`   Schema valid: ${schemaResult.valid ? 'Yes' : 'No'}`);
  
  if (allValid && schemaResult.valid) {
    console.log('\n✅ All validations passed!');
    process.exit(0);
  } else {
    console.log('\n❌ Some validations failed!');
    process.exit(1);
  }
}

// Run the validation if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateYamlFile,
  checkForSecrets,
  validateSchema,
  main
};

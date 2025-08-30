#!/usr/bin/env node

/**
 * Script to validate the Flow DSL JSON Schema
 * This script is used in CI/CD to ensure the schema is valid
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_FILE = path.join(__dirname, '../schema/flow.schema.json');

/**
 * Validate JSON Schema file
 */
function validateSchema() {
  try {
    console.log('🔍 Validating Flow DSL JSON Schema...');
    
    // Check if schema file exists
    if (!fs.existsSync(SCHEMA_FILE)) {
      console.error('❌ Schema file not found:', SCHEMA_FILE);
      process.exit(1);
    }
    
    // Read and parse schema
    const schemaContent = fs.readFileSync(SCHEMA_FILE, 'utf8');
    const schema = JSON.parse(schemaContent);
    
    // Basic schema validation
    const requiredFields = ['$schema', 'type', 'properties', 'definitions'];
    const missingFields = requiredFields.filter(field => !schema[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required schema fields:', missingFields.join(', '));
      process.exit(1);
    }
    
    // Check schema version
    if (schema['$schema'] !== 'https://json-schema.org/draft/2020-12/schema') {
      console.error('❌ Invalid schema version. Expected: https://json-schema.org/draft/2020-12/schema');
      process.exit(1);
    }
    
    // Check for required definitions
    const requiredDefs = ['Metadata', 'Trigger', 'Step', 'Transport', 'Policy', 'Observability'];
    const missingDefs = requiredDefs.filter(def => !schema.definitions[def]);
    
    if (missingDefs.length > 0) {
      console.error('❌ Missing required schema definitions:', missingDefs.join(', '));
      process.exit(1);
    }
    
    // Count definitions for coverage check
    const defCount = Object.keys(schema.definitions).length;
    console.log(`📊 Schema definitions count: ${defCount}`);
    
    if (defCount < 20) {
      console.warn('⚠️  Low number of schema definitions. Expected at least 20.');
    }
    
    // Check for descriptions in schema
    let hasDescriptions = 0;
    let totalProps = 0;
    
    function checkDescriptions(obj, path = '') {
      if (obj.properties) {
        for (const [key, value] of Object.entries(obj.properties)) {
          totalProps++;
          if (value.description) hasDescriptions++;
        }
      }
      if (obj.definitions) {
        for (const [key, value] of Object.entries(obj.definitions)) {
          checkDescriptions(value, path + '.' + key);
        }
      }
    }
    
    checkDescriptions(schema);
    const coverage = totalProps > 0 ? (hasDescriptions / totalProps * 100).toFixed(1) : 0;
    
    console.log(`📋 Schema documentation coverage: ${coverage}%`);
    
    if (coverage < 50) {
      console.warn('⚠️  Low schema documentation coverage. Consider adding more descriptions.');
    }
    
    console.log('✅ Schema validation passed');
    console.log('✅ Schema version: PASS');
    console.log('✅ Required definitions: PASS');
    console.log('✅ Schema structure: PASS');
    
    return true;
  } catch (error) {
    console.error('❌ Schema validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateSchema();
}

module.exports = {
  validateSchema
};

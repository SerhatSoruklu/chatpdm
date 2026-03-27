'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');

const schemaPath = path.resolve(__dirname, '../../../docs/product/response-schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

const validateProductResponse = ajv.compile(schema);

function formatErrors(errors) {
  return (errors || [])
    .map((error) => `${error.instancePath || '/'} ${error.message}`)
    .join('; ');
}

function assertValidProductResponse(response) {
  const isValid = validateProductResponse(response);

  if (!isValid) {
    const detail = formatErrors(validateProductResponse.errors);
    throw new Error(`Product response failed schema validation: ${detail}`);
  }

  return response;
}

module.exports = {
  assertValidProductResponse,
};

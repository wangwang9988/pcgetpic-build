import fs from 'node:fs';
import crypto from 'node:crypto';
import { Ajv2020 } from 'ajv/dist/2020.js';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { ENGINE_EVENT_TYPES } from '../dist/src/events.js';

// Compile at build time: extension service workers prohibit runtime code generation.
const text = fs.readFileSync(new URL('../schema/protocol.schema.json', import.meta.url), 'utf8');
const schema = JSON.parse(text);
const ajv = new Ajv2020({ strict: true, allErrors: false, code: { source: true } });
ajv.addSchema(schema);
const validators = Object.fromEntries([...ENGINE_EVENT_TYPES, 'EngineTaskStatus'].map(name => [
  name, `${schema.$id}#/$defs/${name}`,
]));
const fingerprint = crypto.createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
const output = standaloneCode(ajv, validators)
  + `\nexports.schemaFingerprint = ${JSON.stringify(fingerprint)};\n`;
fs.writeFileSync(new URL('../dist/src/compiledValidators.cjs', import.meta.url), output);
fs.copyFileSync(new URL('../src/compiledValidators.d.cts', import.meta.url),
  new URL('../dist/src/compiledValidators.d.cts', import.meta.url));

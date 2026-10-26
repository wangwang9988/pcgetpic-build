import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import protocolSchema from '../schema/protocol.schema.json' with { type: 'json' };
import type { ProtocolMessage } from './index.js';

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

const validate = ajv.compile(protocolSchema) as ValidateFunction<ProtocolMessage>;

export function validateProtocolMessage(value: unknown): value is ProtocolMessage {
  return validate(value);
}

export function getProtocolValidationErrors(): ErrorObject[] {
  return validate.errors ? [...validate.errors] : [];
}

export function assertProtocolMessage(value: unknown): asserts value is ProtocolMessage {
  if (validateProtocolMessage(value)) return;
  const reason = getProtocolValidationErrors()
    .map((error) => `${error.instancePath || '/'} ${error.message || 'invalid'}`)
    .join('; ');
  throw new TypeError(`Invalid TuGet protocol message: ${reason}`);
}

import validators from './compiledValidators.cjs';
import type { ErrorObject, ValidateFunction } from 'ajv';
import type { EngineEvent } from './events.js';

export const protocolSchemaFingerprint = validators.schemaFingerprint;

function safePath(path: string): string {
  return path.replace(/[^A-Za-z0-9_./~-]/g, '_').slice(0, 160) || '/';
}

/** Diagnostics contain schema metadata and lengths, never payload values. */
function describe(value: unknown, error?: ErrorObject): string {
  const path = error?.instancePath || '';
  let field = value;
  for (const segment of path.split('/').slice(1)) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    field = field && typeof field === 'object' ? (field as Record<string, unknown>)[key] : undefined;
  }
  const length = typeof field === 'string' ? [...field].length : Array.isArray(field) ? field.length : undefined;
  const limit = typeof error?.params.limit === 'number' ? error.params.limit : undefined;
  return `path=${safePath(path)} keyword=${error?.keyword || 'type'}${limit === undefined ? '' : ` limit=${limit}`}${length === undefined ? '' : ` actual_length=${length}`}`;
}

function check(validate: ValidateFunction, value: unknown): string | undefined {
  return validate(value) ? undefined : describe(value, validate.errors?.[0]);
}

export function engineEventValidationError(value: unknown): string | undefined {
  const type = value && typeof value === 'object' ? (value as { type?: unknown }).type : undefined;
  if (typeof type !== 'string' || type === 'EngineTaskStatus'
    || !Object.prototype.hasOwnProperty.call(validators, type)
    || typeof validators[type as EngineEvent['type']] !== 'function') return 'path=/type keyword=enum';
  return check(validators[type as EngineEvent['type']], value);
}

export function engineTaskValidationError(value: unknown): string | undefined {
  return check(validators.EngineTaskStatus, value);
}

import type { ValidateFunction } from 'ajv';
import type { EngineEvent } from './events.js';
declare const validators: Record<EngineEvent['type'] | 'EngineTaskStatus', ValidateFunction> & {
  schemaFingerprint: string;
};
export = validators;

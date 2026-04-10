'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  ZEE_INTERNAL_ENGINE_DEFAULT_EDGE_THRESHOLD,
  ZEE_INTERNAL_ENGINE_DEFAULT_MAX_DOMINANT_COLORS,
  ZEE_INTERNAL_ENGINE_DEFAULT_MAX_REGION_CANDIDATES,
  ZEE_INTERNAL_ENGINE_DEFAULT_TILE_SIZE,
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
  ZEE_INTERNAL_ENGINE_MAX_FRAME_BYTES,
  ZEE_INTERNAL_ENGINE_MAX_FRAMES,
} = require('./constants');

class ZeeObservedInputError extends Error {
  constructor(message, code = ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT) {
    super(message);
    this.name = 'ZeeObservedInputError';
    this.code = code;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !Buffer.isBuffer(value);
}

function normalizeIntegerOption(rawValue, fieldName, fallback, minimum, maximum) {
  if (rawValue === undefined || rawValue === null) {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue)) {
    throw new ZeeObservedInputError(
      `ZEE internal engine option "${fieldName}" must be an integer.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (parsedValue < minimum || parsedValue > maximum) {
    throw new ZeeObservedInputError(
      `ZEE internal engine option "${fieldName}" must be between ${minimum} and ${maximum}.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return parsedValue;
}

function normalizeObservedOptions(options) {
  if (options === undefined || options === null) {
    return Object.freeze({
      edgeThreshold: ZEE_INTERNAL_ENGINE_DEFAULT_EDGE_THRESHOLD,
      maxDominantColors: ZEE_INTERNAL_ENGINE_DEFAULT_MAX_DOMINANT_COLORS,
      maxRegionCandidates: ZEE_INTERNAL_ENGINE_DEFAULT_MAX_REGION_CANDIDATES,
      tileSize: ZEE_INTERNAL_ENGINE_DEFAULT_TILE_SIZE,
    });
  }

  if (!isPlainObject(options)) {
    throw new ZeeObservedInputError(
      'ZEE internal engine options must be a non-null object when provided.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return Object.freeze({
    edgeThreshold: normalizeIntegerOption(
      options.edgeThreshold,
      'edgeThreshold',
      ZEE_INTERNAL_ENGINE_DEFAULT_EDGE_THRESHOLD,
      1,
      255,
    ),
    maxDominantColors: normalizeIntegerOption(
      options.maxDominantColors,
      'maxDominantColors',
      ZEE_INTERNAL_ENGINE_DEFAULT_MAX_DOMINANT_COLORS,
      1,
      16,
    ),
    maxRegionCandidates: normalizeIntegerOption(
      options.maxRegionCandidates,
      'maxRegionCandidates',
      ZEE_INTERNAL_ENGINE_DEFAULT_MAX_REGION_CANDIDATES,
      1,
      32,
    ),
    tileSize: normalizeIntegerOption(
      options.tileSize,
      'tileSize',
      ZEE_INTERNAL_ENGINE_DEFAULT_TILE_SIZE,
      8,
      128,
    ),
  });
}

function validateFrameBuffer(buffer, frameNumber, sourceLabel) {
  if (!Buffer.isBuffer(buffer)) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} "${sourceLabel}" must resolve to a Buffer.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (buffer.length <= 0) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} "${sourceLabel}" is empty.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (buffer.length > ZEE_INTERNAL_ENGINE_MAX_FRAME_BYTES) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} "${sourceLabel}" exceeds the maximum supported size of ${ZEE_INTERNAL_ENGINE_MAX_FRAME_BYTES} bytes.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }
}

function loadFrameBufferFromPath(rawPath, frameNumber) {
  const resolvedPath = path.resolve(rawPath);

  let stats;
  try {
    stats = fs.statSync(resolvedPath);
  } catch (error) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} path "${rawPath}" could not be read: ${error.message}`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!stats.isFile()) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} path "${rawPath}" does not point to a file.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (stats.size <= 0) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} path "${rawPath}" is empty.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (stats.size > ZEE_INTERNAL_ENGINE_MAX_FRAME_BYTES) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} path "${rawPath}" exceeds the maximum supported size of ${ZEE_INTERNAL_ENGINE_MAX_FRAME_BYTES} bytes.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  let buffer;
  try {
    buffer = fs.readFileSync(resolvedPath);
  } catch (error) {
    throw new ZeeObservedInputError(
      `Frame ${frameNumber} path "${rawPath}" could not be loaded: ${error.message}`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return {
    buffer,
    byteLength: buffer.length,
    sourceLabel: path.basename(resolvedPath) || `frame-${frameNumber}`,
    sourcePath: resolvedPath,
    sourceType: 'path',
  };
}

function normalizeFrameSource(candidate, index) {
  const frameNumber = index + 1;

  if (Buffer.isBuffer(candidate)) {
    validateFrameBuffer(candidate, frameNumber, `frame-${frameNumber}`);

    return {
      buffer: candidate,
      byteLength: candidate.length,
      sourceLabel: `frame-${frameNumber}`,
      sourcePath: null,
      sourceType: 'buffer',
    };
  }

  if (typeof candidate === 'string') {
    const normalized = loadFrameBufferFromPath(candidate, frameNumber);
    validateFrameBuffer(normalized.buffer, frameNumber, normalized.sourceLabel);
    return normalized;
  }

  if (isPlainObject(candidate)) {
    const rawLabel = typeof candidate.label === 'string' && candidate.label.trim() !== ''
      ? candidate.label.trim()
      : null;
    const rawSourceId = typeof candidate.sourceId === 'string' && candidate.sourceId.trim() !== ''
      ? candidate.sourceId.trim()
      : null;

    if (Buffer.isBuffer(candidate.buffer)) {
      validateFrameBuffer(candidate.buffer, frameNumber, rawLabel || `frame-${frameNumber}`);

      return {
        buffer: candidate.buffer,
        byteLength: candidate.buffer.length,
        sourceId: rawSourceId,
        sourceLabel: rawLabel || `frame-${frameNumber}`,
        sourcePath: typeof candidate.path === 'string' && candidate.path.trim() !== ''
          ? path.resolve(candidate.path.trim())
          : null,
        sourceType: 'buffer',
      };
    }

    if (typeof candidate.path === 'string' && candidate.path.trim() !== '') {
      const normalized = loadFrameBufferFromPath(candidate.path.trim(), frameNumber);
      validateFrameBuffer(normalized.buffer, frameNumber, rawLabel || normalized.sourceLabel);

      return {
        ...normalized,
        sourceId: rawSourceId,
        sourceLabel: rawLabel || normalized.sourceLabel,
      };
    }
  }

  throw new ZeeObservedInputError(
    `Frame ${frameNumber} must be a string path, Buffer, or object with a path or buffer.`,
    ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
  );
}

function normalizeObservedInput(input) {
  if (!isPlainObject(input)) {
    throw new ZeeObservedInputError(
      'ZEE internal engine input must be a non-null object with a frames array.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (!Array.isArray(input.frames) || input.frames.length === 0) {
    throw new ZeeObservedInputError(
      'ZEE internal engine input must include at least one frame.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  if (input.frames.length > ZEE_INTERNAL_ENGINE_MAX_FRAMES) {
    throw new ZeeObservedInputError(
      `ZEE internal engine accepts at most ${ZEE_INTERNAL_ENGINE_MAX_FRAMES} frames per request.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_INPUT,
    );
  }

  return {
    frames: input.frames.map((frame, index) => ({
      ...normalizeFrameSource(frame, index),
      frameIndex: index,
    })),
    options: normalizeObservedOptions(input.options),
  };
}

module.exports = {
  ZeeObservedInputError,
  normalizeObservedInput,
  normalizeObservedOptions,
};

'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');
const {
  ZEE_INTERNAL_ENGINE_DEFAULT_EDGE_THRESHOLD,
  ZEE_INTERNAL_ENGINE_DEFAULT_MAX_DOMINANT_COLORS,
  ZEE_INTERNAL_ENGINE_DEFAULT_MAX_REGION_CANDIDATES,
  ZEE_INTERNAL_ENGINE_DEFAULT_TILE_SIZE,
  ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY,
  ZEE_INTERNAL_ENGINE_ERROR_CODES,
  ZEE_INTERNAL_ENGINE_OBSERVED_FRAME_SCHEMA,
  ZEE_INTERNAL_ENGINE_PNG_POLICY,
  ZEE_INTERNAL_ENGINE_POLICY_MANIFEST,
  ZEE_INTERNAL_ENGINE_TRACE_CONTRACT,
} = require('./constants');
const {
  createZeeArtifactMarker,
} = require('./artifact-markers');
const {
  buildCanonicalFrameArtifactId,
  compareCanonicalNumber,
  computeCrc32,
} = require('./policy');
const { ZeeObservedInputError } = require('./input-contract');

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

const PNG_COLOR_TYPE_LABELS = Object.freeze({
  0: 'grayscale',
  2: 'truecolor',
  3: 'indexed',
  4: 'grayscale_alpha',
  6: 'truecolor_alpha',
});

function roundTo(value, precision = ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.roundingPrecision) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function createNote(code, message, details) {
  const note = {
    code,
    message,
  };

  if (details !== undefined) {
    note.details = details;
  }

  return note;
}

function parsePngStructure(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new ZeeObservedInputError(
      'ZEE internal engine expected a Buffer when decoding a frame.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (buffer.length < PNG_SIGNATURE.length + 25) {
    throw new ZeeObservedInputError(
      'ZEE Internal Engine v1 currently supports PNG frames only.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new ZeeObservedInputError(
      'ZEE Internal Engine v1 currently supports PNG frames only.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  let offset = PNG_SIGNATURE.length;
  let width = null;
  let height = null;
  let bitDepth = null;
  let colorType = null;
  let compressionMethod = null;
  let filterMethod = null;
  let interlaceMethod = null;
  let palette = [];
  let transparency = null;
  const idatParts = [];
  const chunkTypes = [];
  let seenIend = false;

  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      throw new ZeeObservedInputError(
        'The PNG frame ended before a complete chunk header could be read.',
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
      );
    }

    const chunkLength = buffer.readUInt32BE(offset);
    offset += 4;
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    offset += 4;

    if (chunkLength > ZEE_INTERNAL_ENGINE_PNG_POLICY.maxChunkDataBytes) {
      throw new ZeeObservedInputError(
        `The PNG chunk "${chunkType}" exceeds the maximum supported size of ${ZEE_INTERNAL_ENGINE_PNG_POLICY.maxChunkDataBytes} bytes.`,
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
      );
    }

    if (offset + chunkLength + 4 > buffer.length) {
      throw new ZeeObservedInputError(
        `The PNG chunk "${chunkType}" exceeds the available frame bytes.`,
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
      );
    }

    const chunkData = buffer.subarray(offset, offset + chunkLength);
    offset += chunkLength;
    const storedCrc = buffer.readUInt32BE(offset);
    offset += 4;
    const computedCrc = computeCrc32([
      Buffer.from(chunkType, 'ascii'),
      chunkData,
    ]);

    if (ZEE_INTERNAL_ENGINE_PNG_POLICY.requireCrc && storedCrc !== computedCrc) {
      throw new ZeeObservedInputError(
        `The PNG chunk "${chunkType}" failed CRC validation.`,
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
      );
    }

    chunkTypes.push(chunkType);

    if (chunkType === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData.readUInt8(8);
      colorType = chunkData.readUInt8(9);
      compressionMethod = chunkData.readUInt8(10);
      filterMethod = chunkData.readUInt8(11);
      interlaceMethod = chunkData.readUInt8(12);
      continue;
    }

    if (chunkType === 'PLTE') {
      palette = [];
      for (let paletteOffset = 0; paletteOffset < chunkData.length; paletteOffset += 3) {
        palette.push([
          chunkData.readUInt8(paletteOffset),
          chunkData.readUInt8(paletteOffset + 1),
          chunkData.readUInt8(paletteOffset + 2),
          255,
        ]);
      }
      continue;
    }

    if (chunkType === 'tRNS') {
      transparency = Buffer.from(chunkData);
      continue;
    }

    if (chunkType === 'IDAT') {
      idatParts.push(Buffer.from(chunkData));
      continue;
    }

    if (chunkType === 'IEND') {
      seenIend = true;
      if (chunkLength !== 0) {
        throw new ZeeObservedInputError(
          'The PNG frame contains a malformed IEND chunk.',
          ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
        );
      }
      break;
    }
  }

  if (ZEE_INTERNAL_ENGINE_PNG_POLICY.requireIend && !seenIend) {
    throw new ZeeObservedInputError(
      'The PNG frame is missing the required IEND chunk.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (offset !== buffer.length) {
    throw new ZeeObservedInputError(
      'The PNG frame contains trailing bytes after the IEND chunk.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (width === null || height === null || bitDepth === null || colorType === null) {
    throw new ZeeObservedInputError(
      'The PNG frame is missing the required IHDR chunk.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (compressionMethod !== 0 || filterMethod !== 0) {
    throw new ZeeObservedInputError(
      'ZEE Internal Engine v1 only supports standard PNG compression and filter methods.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (interlaceMethod !== 0) {
    throw new ZeeObservedInputError(
      'ZEE Internal Engine v1 only supports non-interlaced PNG frames.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (bitDepth === 16) {
    throw new ZeeObservedInputError(
      'ZEE Internal Engine v1 rejects 16-bit PNG frames; normalize them to 8-bit before ingestion.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (idatParts.length === 0) {
    throw new ZeeObservedInputError(
      'The PNG frame does not contain any image data.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (!Object.prototype.hasOwnProperty.call(PNG_COLOR_TYPE_LABELS, colorType)) {
    throw new ZeeObservedInputError(
      `ZEE Internal Engine v1 does not support PNG color type ${colorType}.`,
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  if (colorType === 3 && palette.length === 0) {
    throw new ZeeObservedInputError(
      'Indexed PNG frames must include a palette.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  return {
    bitDepth,
    chunkTypes,
    colorType,
    compressionMethod,
    filterMethod,
    height,
    idatData: Buffer.concat(idatParts),
    interlaceMethod,
    palette,
    transparency,
    width,
  };
}

function buildPaletteEntries(palette, transparency) {
  return palette.map((paletteEntry, index) => {
    const alpha = transparency && index < transparency.length ? transparency.readUInt8(index) : paletteEntry[3];

    return [
      paletteEntry[0],
      paletteEntry[1],
      paletteEntry[2],
      alpha,
    ];
  });
}

function getSamplesPerPixel(colorType) {
  switch (colorType) {
    case 0:
    case 3:
      return 1;
    case 2:
      return 3;
    case 4:
      return 2;
    case 6:
      return 4;
    default:
      throw new ZeeObservedInputError(
        `ZEE Internal Engine v1 does not support PNG color type ${colorType}.`,
        ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
      );
  }
}

function getChannelBytesPerPixel(bitDepth, samplesPerPixel) {
  const bitsPerPixel = bitDepth * samplesPerPixel;
  return Math.max(1, Math.ceil(bitsPerPixel / 8));
}

function calculateRowBytes(width, bitDepth, samplesPerPixel) {
  return Math.ceil((width * bitDepth * samplesPerPixel) / 8);
}

function applyFilter(filterType, encodedRow, previousRow, bytesPerPixel) {
  const decodedRow = Buffer.alloc(encodedRow.length);

  if (filterType === 0) {
    encodedRow.copy(decodedRow);
    return decodedRow;
  }

  for (let index = 0; index < encodedRow.length; index += 1) {
    const left = index >= bytesPerPixel ? decodedRow[index - bytesPerPixel] : 0;
    const up = previousRow[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? (previousRow[index - bytesPerPixel] ?? 0) : 0;
    let value;

    switch (filterType) {
      case 1:
        value = (encodedRow[index] + left) & 0xff;
        break;
      case 2:
        value = (encodedRow[index] + up) & 0xff;
        break;
      case 3:
        value = (encodedRow[index] + Math.floor((left + up) / 2)) & 0xff;
        break;
      case 4: {
        const paethBase = left + up - upLeft;
        const leftDistance = Math.abs(paethBase - left);
        const upDistance = Math.abs(paethBase - up);
        const upLeftDistance = Math.abs(paethBase - upLeft);
        let predictor = left;

        if (upDistance < leftDistance && upDistance <= upLeftDistance) {
          predictor = up;
        } else if (upLeftDistance < leftDistance && upLeftDistance < upDistance) {
          predictor = upLeft;
        }

        value = (encodedRow[index] + predictor) & 0xff;
        break;
      }
      default:
        throw new ZeeObservedInputError(
          `ZEE Internal Engine v1 does not support PNG filter type ${filterType}.`,
          ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
        );
    }

    decodedRow[index] = value;
  }

  return decodedRow;
}

function unpackPackedSamples(rowBytes, width, bitDepth) {
  const samples = new Uint8Array(width);
  const mask = (1 << bitDepth) - 1;
  let sampleIndex = 0;

  for (let byteIndex = 0; byteIndex < rowBytes.length && sampleIndex < width; byteIndex += 1) {
    const byte = rowBytes[byteIndex];

    for (let shift = 8 - bitDepth; shift >= 0 && sampleIndex < width; shift -= bitDepth) {
      samples[sampleIndex] = (byte >> shift) & mask;
      sampleIndex += 1;
    }
  }

  return samples;
}

function scaledGraySample(sample, bitDepth) {
  if (bitDepth === 8) {
    return sample;
  }

  if (bitDepth === 16) {
    throw new ZeeObservedInputError(
      'ZEE Internal Engine v1 rejects 16-bit PNG frames; normalize them to 8-bit before ingestion.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  const maxValue = (1 << bitDepth) - 1;
  return Math.round((sample / maxValue) * 255);
}

function colorKey(r, g, b, a) {
  return ((((r << 24) >>> 0) | (g << 16) | (b << 8) | a) >>> 0);
}

function keyToRgba(key) {
  return {
    alpha: key & 0xff,
    blue: (key >>> 8) & 0xff,
    green: (key >>> 16) & 0xff,
    red: (key >>> 24) & 0xff,
  };
}

function rgbaToHex(rgba) {
  const red = rgba.red.toString(16).padStart(2, '0');
  const green = rgba.green.toString(16).padStart(2, '0');
  const blue = rgba.blue.toString(16).padStart(2, '0');
  const alpha = rgba.alpha.toString(16).padStart(2, '0');
  const prefix = `#${red}${green}${blue}`;

  return rgba.alpha === 255 ? prefix : `${prefix}${alpha}`;
}

function analyzeTileGrid(tileStats, tilesX, tilesY, imageWidth, imageHeight, tileSize, options) {
  const activityWeights = ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.tileActivityWeights;
  const activeTileThresholds = ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.activeTileThresholds;
  const candidateScoreWeights = ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.candidateScoreWeights;
  const classificationThresholds = ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.classificationThresholds;
  const tileSummaries = tileStats.map((tile, index) => {
    if (tile.pixelCount === 0) {
      return {
        ...tile,
        activity: 0,
        contrast: 0,
        edgeDensity: 0,
        meanLuma: 0,
        variance: 0,
        tileIndex: index,
      };
    }

    const meanLuma = tile.lumaSum / tile.pixelCount;
    const variance = Math.max(0, (tile.lumaSquaredSum / tile.pixelCount) - (meanLuma * meanLuma));
    const edgeDensity = tile.edgeSignalSum / (tile.pixelCount * 3);

    return {
      ...tile,
      activity: 0,
      contrast: 0,
      edgeDensity,
      meanLuma,
      tileIndex: index,
      variance,
    };
  });

  tileSummaries.forEach((tile, index) => {
    if (tile.pixelCount === 0) {
      return;
    }

    const neighborIndices = [];
    const tileX = index % tilesX;
    const tileY = Math.floor(index / tilesX);

    if (tileX > 0) {
      neighborIndices.push(index - 1);
    }

    if (tileX < tilesX - 1) {
      neighborIndices.push(index + 1);
    }

    if (tileY > 0) {
      neighborIndices.push(index - tilesX);
    }

    if (tileY < tilesY - 1) {
      neighborIndices.push(index + tilesX);
    }

    const populatedNeighbors = neighborIndices.filter((neighborIndex) => tileSummaries[neighborIndex] && tileSummaries[neighborIndex].pixelCount > 0);
    const contrast = populatedNeighbors.length === 0
      ? 0
      : populatedNeighbors.reduce((sum, neighborIndex) => sum + Math.abs(tile.meanLuma - tileSummaries[neighborIndex].meanLuma), 0) / populatedNeighbors.length;

    const activity = clamp(
      ((tile.edgeDensity / activityWeights.edgeDensityScale) * activityWeights.edgeDensityContribution)
      + ((tile.variance / activityWeights.varianceScale) * activityWeights.varianceContribution)
      + ((contrast / activityWeights.contrastScale) * activityWeights.contrastContribution),
      0,
      1,
    );

    tileSummaries[index] = {
      ...tile,
      activity,
      contrast,
    };
  });

  const activeTiles = tileSummaries.filter((tile) => tile.pixelCount > 0 && (
    tile.activity >= activeTileThresholds.activity
    || tile.edgeDensity >= activeTileThresholds.edgeDensity
    || tile.variance >= activeTileThresholds.variance
  ));

  const seedTiles = activeTiles.length > 0
    ? activeTiles
    : [...tileSummaries]
      .filter((tile) => tile.pixelCount > 0)
      .sort((left, right) => (
        compareCanonicalNumber(right.activity, left.activity)
        || compareCanonicalNumber(right.edgeDensity, left.edgeDensity)
        || compareCanonicalNumber(right.variance, left.variance)
        || compareCanonicalNumber(left.tileIndex, right.tileIndex)
      ))
      .slice(0, Math.min(6, tileSummaries.length));

  const activeTileLookup = new Set(seedTiles.map((tile) => tile.tileIndex));
  const visited = new Set();
  const regionCandidates = [];

  function getTileBounds(tile) {
    const tileX = tile.tileIndex % tilesX;
    const tileY = Math.floor(tile.tileIndex / tilesX);
    const left = tileX * tileSize;
    const top = tileY * tileSize;
    const right = Math.min(imageWidth, left + tileSize);
    const bottom = Math.min(imageHeight, top + tileSize);

    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  }

  function classifyComponent(component) {
    const aspect = component.bounds.width / component.bounds.height;
    const area = component.bounds.width * component.bounds.height;

    if (component.tileCount <= 2 && aspect >= classificationThresholds.horizontalStripAspect) {
      return 'horizontal_strip';
    }

    if (component.tileCount <= 2 && aspect <= classificationThresholds.verticalStripAspect) {
      return 'vertical_strip';
    }

    if (
      component.meanEdgeDensity >= classificationThresholds.densePatchEdgeDensity
      && component.meanVariance >= classificationThresholds.densePatchVariance
    ) {
      return 'dense_patch';
    }

    if (aspect >= classificationThresholds.widePanelAspect) {
      return 'wide_panel';
    }

    if (aspect <= classificationThresholds.tallStripAspect) {
      return 'tall_strip';
    }

    if (
      aspect >= classificationThresholds.squareBlockAspectMin
      && aspect <= classificationThresholds.squareBlockAspectMax
      && area <= tileSize * tileSize * classificationThresholds.squareBlockAreaMultiplier
    ) {
      return 'square_block';
    }

    return 'compact_block';
  }

  function buildCandidateFromTiles(componentTiles) {
    const bounds = componentTiles.reduce((accumulator, tile) => {
      const currentBounds = getTileBounds(tile);
      const right = currentBounds.left + currentBounds.width;
      const bottom = currentBounds.top + currentBounds.height;

      return {
        bottom: Math.max(accumulator.bottom, bottom),
        left: Math.min(accumulator.left, currentBounds.left),
        right: Math.max(accumulator.right, right),
        top: Math.min(accumulator.top, currentBounds.top),
      };
    }, {
      bottom: Number.POSITIVE_INFINITY,
      left: Number.POSITIVE_INFINITY,
      right: Number.NEGATIVE_INFINITY,
      top: Number.POSITIVE_INFINITY,
    });

    const width = Math.max(1, bounds.right - bounds.left);
    const height = Math.max(1, bounds.bottom - bounds.top);
    const meanActivity = componentTiles.reduce((sum, tile) => sum + tile.activity, 0) / componentTiles.length;
    const meanEdgeDensity = componentTiles.reduce((sum, tile) => sum + tile.edgeDensity, 0) / componentTiles.length;
    const meanVariance = componentTiles.reduce((sum, tile) => sum + tile.variance, 0) / componentTiles.length;
    const meanContrast = componentTiles.reduce((sum, tile) => sum + tile.contrast, 0) / componentTiles.length;
    const score = clamp(
      meanActivity
      + Math.min(candidateScoreWeights.sizeContributionCap, Math.log(componentTiles.length + 1) / candidateScoreWeights.sizeContributionScale)
      + Math.min(candidateScoreWeights.contrastContribution, meanContrast / candidateScoreWeights.contrastScale),
      0,
      1,
    );

    const geometryClass = classifyComponent({
      bounds: { height, width },
      meanEdgeDensity,
      meanVariance,
      tileCount: componentTiles.length,
    });

    return {
      bounds: {
        height,
        left: bounds.left,
        top: bounds.top,
        width,
      },
      contrast: roundTo(meanContrast, 2),
      edgeDensity: roundTo(meanEdgeDensity, ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.roundingPrecision),
      geometryClass,
      kind: 'region_candidate',
      pixelCoverage: roundTo((width * height) / (imageWidth * imageHeight), 6),
      score: roundTo(score, ZEE_INTERNAL_ENGINE_EXTRACTOR_POLICY.roundingPrecision),
      tileCoverage: componentTiles.length,
      variance: roundTo(meanVariance, 2),
    };
  }

  for (const tile of seedTiles) {
    if (visited.has(tile.tileIndex) || !activeTileLookup.has(tile.tileIndex)) {
      continue;
    }

    const queue = [tile.tileIndex];
    const componentTiles = [];

    while (queue.length > 0) {
      const currentIndex = queue.shift();

      if (visited.has(currentIndex) || !activeTileLookup.has(currentIndex)) {
        continue;
      }

      visited.add(currentIndex);
      const currentTile = tileSummaries[currentIndex];

      if (!currentTile || currentTile.pixelCount === 0) {
        continue;
      }

      componentTiles.push(currentTile);
      const currentTileX = currentIndex % tilesX;
      const currentTileY = Math.floor(currentIndex / tilesX);
      const neighbors = [];

      if (currentTileX > 0) {
        neighbors.push(currentIndex - 1);
      }
      if (currentTileX < tilesX - 1) {
        neighbors.push(currentIndex + 1);
      }
      if (currentTileY > 0) {
        neighbors.push(currentIndex - tilesX);
      }
      if (currentTileY < tilesY - 1) {
        neighbors.push(currentIndex + tilesX);
      }

      neighbors.forEach((neighborIndex) => {
        if (!visited.has(neighborIndex) && activeTileLookup.has(neighborIndex)) {
          queue.push(neighborIndex);
        }
      });
    }

    if (componentTiles.length > 0) {
      regionCandidates.push(buildCandidateFromTiles(componentTiles));
    }
  }

  if (regionCandidates.length === 0) {
    const fallbackTile = [...tileSummaries]
      .filter((tile) => tile.pixelCount > 0)
      .sort((left, right) => (
        compareCanonicalNumber(right.activity, left.activity)
        || compareCanonicalNumber(right.edgeDensity, left.edgeDensity)
        || compareCanonicalNumber(right.variance, left.variance)
        || compareCanonicalNumber(left.tileIndex, right.tileIndex)
      ))[0];

    if (fallbackTile) {
      regionCandidates.push(buildCandidateFromTiles([fallbackTile]));
    }
  }

  regionCandidates.sort((left, right) => (
    compareCanonicalNumber(right.score, left.score)
    || compareCanonicalNumber(left.bounds.top, right.bounds.top)
    || compareCanonicalNumber(left.bounds.left, right.bounds.left)
  ));

  return {
    regionCandidates: regionCandidates.slice(0, options.maxRegionCandidates),
    tileSummaries,
  };
}

function analyzeObservedPngFrame(frame, options) {
  const png = parsePngStructure(frame.buffer);
  const frameFingerprint = crypto.createHash('sha256').update(frame.buffer).digest('hex');
  const frameArtifactId = buildCanonicalFrameArtifactId(frameFingerprint);
  const samplesPerPixel = getSamplesPerPixel(png.colorType);
  const bytesPerPixel = getChannelBytesPerPixel(png.bitDepth, samplesPerPixel);
  const rowByteLength = calculateRowBytes(png.width, png.bitDepth, samplesPerPixel);
  const rawData = zlib.inflateSync(png.idatData);
  const expectedRawLength = (rowByteLength + 1) * png.height;

  if (rawData.length !== expectedRawLength) {
    throw new ZeeObservedInputError(
      'The PNG frame could not be decoded into the expected scanline structure.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  const paletteEntries = buildPaletteEntries(png.palette, png.transparency);
  const colorCounts = new Map();
  const usedPaletteIndices = new Set();
  const tileSize = options.tileSize ?? ZEE_INTERNAL_ENGINE_DEFAULT_TILE_SIZE;
  const edgeThreshold = options.edgeThreshold ?? ZEE_INTERNAL_ENGINE_DEFAULT_EDGE_THRESHOLD;
  const tilesX = Math.max(1, Math.ceil(png.width / tileSize));
  const tilesY = Math.max(1, Math.ceil(png.height / tileSize));
  const tileStats = Array.from({ length: tilesX * tilesY }, () => ({
    activity: 0,
    contrast: 0,
    edgeSignalSum: 0,
    lumaSquaredSum: 0,
    lumaSum: 0,
    pixelCount: 0,
    variance: 0,
  }));
  const scanlineFilters = new Set();
  const previousLumaRow = new Float64Array(png.width);
  let previousDecodedRow = Buffer.alloc(rowByteLength);
  let rawOffset = 0;
  let totalPixels = 0;
  let horizontalTransitions = 0;
  let verticalTransitions = 0;
  let diagonalTransitions = 0;

  for (let y = 0; y < png.height; y += 1) {
    const filterType = rawData.readUInt8(rawOffset);
    rawOffset += 1;
    const encodedRow = rawData.subarray(rawOffset, rawOffset + rowByteLength);
    rawOffset += rowByteLength;
    scanlineFilters.add(filterType);

    const decodedRow = applyFilter(filterType, encodedRow, previousDecodedRow, bytesPerPixel);
    const lumaRow = new Float64Array(png.width);
    const packedSamples = (png.colorType === 3 || png.colorType === 0) && png.bitDepth < 8
      ? unpackPackedSamples(decodedRow, png.width, png.bitDepth)
      : null;

    for (let x = 0; x < png.width; x += 1) {
      let red;
      let green;
      let blue;
      let alpha;

      if (png.colorType === 3) {
        if (png.bitDepth < 8) {
          const paletteIndex = packedSamples[x];
          const paletteEntry = paletteEntries[paletteIndex];

          if (!paletteEntry) {
            throw new ZeeObservedInputError(
              `PNG palette index ${paletteIndex} is out of range for the observed frame.`,
              ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
            );
          }

          red = paletteEntry[0];
          green = paletteEntry[1];
          blue = paletteEntry[2];
          alpha = paletteEntry[3];
          usedPaletteIndices.add(paletteIndex);
        } else {
          const paletteIndex = decodedRow.readUInt8(x);
          const paletteEntry = paletteEntries[paletteIndex];

          if (!paletteEntry) {
            throw new ZeeObservedInputError(
              `PNG palette index ${paletteIndex} is out of range for the observed frame.`,
              ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
            );
          }

          red = paletteEntry[0];
          green = paletteEntry[1];
          blue = paletteEntry[2];
          alpha = paletteEntry[3];
          usedPaletteIndices.add(paletteIndex);
        }
      } else if (png.colorType === 0) {
        if (png.bitDepth < 8) {
          const gray = scaledGraySample(packedSamples[x], png.bitDepth);
          red = gray;
          green = gray;
          blue = gray;
          alpha = 255;
        } else {
          const gray = decodedRow.readUInt8(x);
          red = gray;
          green = gray;
          blue = gray;
          alpha = 255;
        }
      } else if (png.colorType === 2) {
        const byteIndex = x * 3;
        red = decodedRow.readUInt8(byteIndex);
        green = decodedRow.readUInt8(byteIndex + 1);
        blue = decodedRow.readUInt8(byteIndex + 2);
        alpha = 255;
      } else if (png.colorType === 4) {
        const byteIndex = x * 2;
        const gray = decodedRow.readUInt8(byteIndex);
        red = gray;
        green = gray;
        blue = gray;
        alpha = decodedRow.readUInt8(byteIndex + 1);
      } else if (png.colorType === 6) {
        const byteIndex = x * 4;
        red = decodedRow.readUInt8(byteIndex);
        green = decodedRow.readUInt8(byteIndex + 1);
        blue = decodedRow.readUInt8(byteIndex + 2);
        alpha = decodedRow.readUInt8(byteIndex + 3);
      } else {
        throw new ZeeObservedInputError(
          `ZEE Internal Engine v1 does not support PNG color type ${png.colorType}.`,
          ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
        );
      }

      const luma = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
      const leftLuma = x > 0 ? lumaRow[x - 1] : 0;
      const upLuma = y > 0 ? previousLumaRow[x] : 0;
      const upLeftLuma = (y > 0 && x > 0) ? previousLumaRow[x - 1] : 0;
      const verticalHit = x > 0 && Math.abs(luma - leftLuma) >= edgeThreshold ? 1 : 0;
      const horizontalHit = y > 0 && Math.abs(luma - upLuma) >= edgeThreshold ? 1 : 0;
      const diagonalHit = y > 0 && x > 0 && Math.abs(luma - upLeftLuma) >= edgeThreshold ? 1 : 0;
      const edgeSignal = verticalHit + horizontalHit + diagonalHit;
      const tileX = Math.min(tilesX - 1, Math.floor(x / tileSize));
      const tileY = Math.min(tilesY - 1, Math.floor(y / tileSize));
      const tileIndex = tileY * tilesX + tileX;
      const tile = tileStats[tileIndex];
      const rgbaColorKey = colorKey(red, green, blue, alpha);

      colorCounts.set(rgbaColorKey, (colorCounts.get(rgbaColorKey) ?? 0) + 1);

      tile.pixelCount += 1;
      tile.lumaSum += luma;
      tile.lumaSquaredSum += luma * luma;
      tile.edgeSignalSum += edgeSignal;

      if (verticalHit > 0) {
        verticalTransitions += 1;
      }
      if (horizontalHit > 0) {
        horizontalTransitions += 1;
      }
      if (diagonalHit > 0) {
        diagonalTransitions += 1;
      }

      lumaRow[x] = luma;
      totalPixels += 1;
    }

    previousDecodedRow = decodedRow;
    previousLumaRow.set(lumaRow);
  }

  if (rawOffset !== rawData.length) {
    throw new ZeeObservedInputError(
      'The PNG frame left unread scanline data after decoding.',
      ZEE_INTERNAL_ENGINE_ERROR_CODES.INVALID_IMAGE,
    );
  }

  const dominantColors = [...colorCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .slice(0, options.maxDominantColors ?? ZEE_INTERNAL_ENGINE_DEFAULT_MAX_DOMINANT_COLORS)
    .map(([key, count], rank) => {
      const rgba = keyToRgba(key);
      return {
        alpha: rgba.alpha,
        count,
        hex: rgbaToHex(rgba),
        rank: rank + 1,
        rgba,
        ratio: roundTo(count / totalPixels, 6),
      };
    });

  const { regionCandidates } = analyzeTileGrid(
    tileStats,
    tilesX,
    tilesY,
    png.width,
    png.height,
    tileSize,
    {
      maxRegionCandidates: options.maxRegionCandidates ?? ZEE_INTERNAL_ENGINE_DEFAULT_MAX_REGION_CANDIDATES,
    },
  );

  const edgeMetrics = {
    combinedDensity: roundTo((verticalTransitions + horizontalTransitions + diagonalTransitions) / (totalPixels * 3), 6),
    diagonalDensity: roundTo(diagonalTransitions / totalPixels, 6),
    horizontalDensity: roundTo(horizontalTransitions / totalPixels, 6),
    horizontalTransitions,
    totalPixels,
    verticalDensity: roundTo(verticalTransitions / totalPixels, 6),
    verticalTransitions,
  };

  const transparentPaletteEntries = paletteEntries.filter((entry) => entry[3] < 255).length;

  return {
    diagnosticNotes: [
      createNote('png_signature_verified', 'png_signature_verified'),
      createNote(
        'png_decoded',
        'png_decoded',
        {
          chunkTypes: [...new Set(png.chunkTypes)],
          colorType: png.colorType,
          colorTypeLabel: PNG_COLOR_TYPE_LABELS[png.colorType],
          bitDepth: png.bitDepth,
          height: png.height,
          interlaceMethod: png.interlaceMethod,
          width: png.width,
        },
      ),
      createNote(
        'palette_usage',
        'palette_usage',
        {
          distinctColors: colorCounts.size,
          paletteEntries: paletteEntries.length,
          transparentPaletteEntries,
          usedPaletteEntries: usedPaletteIndices.size,
        },
      ),
      createNote(
        'scanline_filters',
        'scanline_filters',
        {
          filters: [...scanlineFilters].sort((left, right) => left - right),
        },
      ),
      createNote('observed_only', 'observed_only'),
      createNote('module_isolation', 'module_isolation'),
    ],
    frameMetadata: {
      byteLength: frame.byteLength,
      bitDepth: png.bitDepth,
      colorType: png.colorType,
      colorTypeLabel: PNG_COLOR_TYPE_LABELS[png.colorType],
      compressionMethod: png.compressionMethod,
      artifactId: frameArtifactId,
      artifactSchemaVersion: ZEE_INTERNAL_ENGINE_TRACE_CONTRACT.observedFrameArtifactSchemaVersion,
      fingerprint: frameFingerprint,
      height: png.height,
      imageFormat: 'png',
      interlaceMethod: png.interlaceMethod,
      paletteEntries: paletteEntries.length,
      pixelCount: totalPixels,
      rowByteLength,
      policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
      schemaVersion: ZEE_INTERNAL_ENGINE_OBSERVED_FRAME_SCHEMA.version,
      sourceId: frame.sourceId ?? null,
      sourceLabel: frame.sourceLabel,
      transparentPaletteEntries,
      width: png.width,
    },
    artifactId: frameArtifactId,
    ...createZeeArtifactMarker('observed_frame'),
    frameIndex: frame.frameIndex,
    frameId: frameFingerprint,
    policyVersion: ZEE_INTERNAL_ENGINE_POLICY_MANIFEST.version,
    schemaVersion: ZEE_INTERNAL_ENGINE_OBSERVED_FRAME_SCHEMA.version,
    observedFeatures: {
      dominantColors,
      edgeMetrics,
      visibleGeometricRegions: regionCandidates,
    },
  };
}

module.exports = {
  analyzeObservedPngFrame,
};

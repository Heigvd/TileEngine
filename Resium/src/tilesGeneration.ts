import * as Cesium from "cesium";


interface FeatureTableJSON{
  INSTANCES_LENGTH:number,
  POSITION:{
    byteOffset:number;
  }
}

const defaultFeatureTableJson: FeatureTableJSON = {
  INSTANCES_LENGTH: 1,
  POSITION: {
    byteOffset: 0,
  },
};



const defaultFeatureTableBinary = Buffer.alloc(12, 0); // [0, 0, 0]

/**
 * Convert the JSON object to a padded buffer.
 *
 * Pad the JSON with extra whitespace to fit the next 8-byte boundary. This ensures proper alignment
 * for the section that follows (for example, batch table binary or feature table binary).
 *
 * @param {Object} [json] The JSON object.
 * @param {Number} [byteOffset=0] The byte offset on which the buffer starts.
 * @returns {Buffer} The padded JSON buffer.
 */
function getJsonBufferPadded(json?: object, byteOffset: number = 0) {
  if (!Cesium.defined(json)) {
    return Buffer.alloc(0);
  }

  let string = JSON.stringify(json);

  const boundary = 8;
  const byteLength = Buffer.byteLength(string);
  const remainder = (byteOffset + byteLength) % boundary;
  const padding = remainder === 0 ? 0 : boundary - remainder;
  let whitespace = "";
  for (let i = 0; i < padding; ++i) {
    whitespace += " ";
  }
  string += whitespace;

  return Buffer.from(string);
}

/**
 * Pad the buffer to the next 8-byte boundary to ensure proper alignment for the section that follows.
 *
 * @param {Buffer} buffer The buffer.
 * @param {Number} [byteOffset=0] The byte offset on which the buffer starts.
 * @returns {Buffer} The padded buffer.
 */
function getBufferPadded(buffer?: Buffer, byteOffset: number = 0) {
  if (!buffer || !Cesium.defined(buffer)) {
    return Buffer.alloc(0);
  }

  const boundary = 8;
  const byteLength = buffer.length;
  const remainder = (byteOffset + byteLength) % boundary;
  const padding = remainder === 0 ? 0 : boundary - remainder;
  const emptyBuffer = Buffer.alloc(padding);
  return Buffer.concat([buffer, emptyBuffer]);
}

/**
 * Create an Instanced 3D Model (i3dm) tile from a feature table, batch table, and gltf buffer or uri.
 *
 * @param {Object} options An object with the following properties:
 * @param {Object} options.featureTableJson The feature table JSON.
 * @param {Buffer} options.featureTableBinary The feature table binary.
 * @param {Object} [options.batchTableJson] Batch table describing the per-feature metadata.
 * @param {Buffer} [options.batchTableBinary] The batch table binary.
 * @param {Buffer} [options.glb] The binary glTF buffer.
 * @param {String} [options.uri] Uri to an external glTF model when options.glb is not specified.
 * @returns {Buffer} The generated i3dm tile buffer.
 */
function binaryCreateI3dm(options: {
  featureTableJson: object;
  featureTableBinary: Buffer;
  batchTableJson?: object;
  batchTableBinary?: Buffer;
  glb?: Buffer;
  uri?: string;
}) {
  const version = 1;
  const headerByteLength = 32;

  const featureTableJson = getJsonBufferPadded(
    options.featureTableJson,
    headerByteLength
  );
  const featureTableBinary = getBufferPadded(options.featureTableBinary);
  const batchTableJson = getJsonBufferPadded(options.batchTableJson);
  const batchTableBinary = getBufferPadded(options.batchTableBinary);

  const gltfFormat = Cesium.defined(options.glb) ? 1 : 0;
  const gltfBuffer =
    options.glb && Cesium.defined(options.glb)
      ? options.glb
      : getGltfUriBuffer(options.uri);

  const featureTableJsonByteLength = featureTableJson.length;
  const featureTableBinaryByteLength = featureTableBinary.length;
  const batchTableJsonByteLength = batchTableJson.length;
  const batchTableBinaryByteLength = batchTableBinary.length;
  const gltfByteLength = gltfBuffer.length;
  const byteLength =
    headerByteLength +
    featureTableJsonByteLength +
    featureTableBinaryByteLength +
    batchTableJsonByteLength +
    batchTableBinaryByteLength +
    gltfByteLength;

  const header = Buffer.alloc(headerByteLength);
  header.write("i3dm", 0);
  header.writeUInt32LE(version, 4);
  header.writeUInt32LE(byteLength, 8);
  header.writeUInt32LE(featureTableJsonByteLength, 12);
  header.writeUInt32LE(featureTableBinaryByteLength, 16);
  header.writeUInt32LE(batchTableJsonByteLength, 20);
  header.writeUInt32LE(batchTableBinaryByteLength, 24);
  header.writeUInt32LE(gltfFormat, 28);

  return Buffer.concat([
    header,
    featureTableJson,
    featureTableBinary,
    batchTableJson,
    batchTableBinary,
    gltfBuffer,
  ]);
}

function getGltfUriBuffer(uri?: string) {
  if (uri == null) {
    throw Error("You must set an uri if no glb is set");
  }
  uri = uri.replace(/\\/g, "/");
  return Buffer.from(uri);
}

interface I3dmPayload {
  /**
   * The array of every positions (3d coords) of every models
   */
  positions: [number, number, number][];
  /**
   * Additionnal information about every model
   */
  batch: Record<string, unknown>[];
  /**
   * the 3dmodel file or path (GLB format)
   */
  glbFile : Buffer | string;
}

export function createI3dm({positions, batch, glbFile}: I3dmPayload) {


  const featureTableJson : FeatureTableJSON = {
    INSTANCES_LENGTH:positions.length,
    POSITION:{
      byteOffset:0,
    }
  }

  const featureTableBinary : Buffer = positions.reduce(position=>{
    position.
  },0)

    return binaryCreateI3dm({featureTableJson, featureTableBinary})



}

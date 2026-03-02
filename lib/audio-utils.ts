/**
 * Wraps raw 16-bit PCM mono audio data in a standard RIFF/WAV header.
 * @param pcmBuffer Raw PCM audio data (16-bit, mono)
 * @param sampleRate The sample rate of the audio (e.g. 21000, 44100, 48000)
 */
export function encodeWav(pcmBuffer: Buffer, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  const dataSize = pcmBuffer.length;

  // RIFF identifier
  header.write("RIFF", 0);
  // File length (data size + 36 bytes for headers)
  header.writeUInt32LE(dataSize + 36, 4);
  // WAVE identifier
  header.write("WAVE", 8);
  // FMT chunk identifier
  header.write("fmt ", 12);
  // FMT chunk length
  header.writeUInt32LE(16, 16);
  // Audio format (1 for PCM)
  header.writeUInt16LE(1, 20);
  // Number of channels (1 for mono)
  header.writeUInt16LE(1, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate (sampleRate * numChannels * bitsPerSample/8)
  header.writeUInt32LE(sampleRate * 1 * 2, 28);
  // Block align (numChannels * bitsPerSample/8)
  header.writeUInt16LE(1 * 2, 32);
  // Bits per sample
  header.writeUInt16LE(16, 34);
  // Data chunk identifier
  header.write("data", 36);
  // Data chunk length
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

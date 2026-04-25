const WORDS_PER_MINUTE = 150;

function prepareTextForTTS(text) {
  console.log('[AUDIO-PREPROCESSOR] prepareTextForTTS called');

  if (!text) {
    return { paragraphs: [], estimatedDuration: 0 };
  }

  let cleaned = text
    .replace(/#+\s*/g, '')
    .replace(/@\w+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\btco\.\w+\/\w+/gi, '')
    .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
    .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
    .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
    .replace(/[\u{2600}-\u{26FF}]/gu, '')
    .replace(/[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\.{3,}/g, '...')
    .replace(/\*/g, '')
    .replace(/_/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const paragraphs = cleaned
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const wordCount = paragraphs
    .join(' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
    .length;

  const estimatedMinutes = wordCount / WORDS_PER_MINUTE;
  const estimatedDuration = Math.round(estimatedMinutes * 60);

  console.log('[AUDIO-PREPROCESSOR] Word count:', wordCount);
  console.log('[AUDIO-PREPROCESSOR] Paragraphs:', paragraphs.length);
  console.log('[AUDIO-PREPROCESSOR] Estimated duration:', estimatedDuration, 'seconds');

  return {
    paragraphs,
    estimatedDuration,
    wordCount
  };
}

function splitTextIntoChunks(text, maxWordsPerChunk = 150) {
  const { paragraphs } = prepareTextForTTS(text);
  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    const paragraphWordCount = words.length;

    if (paragraphWordCount > maxWordsPerChunk) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentWordCount = 0;
      }

      let start = 0;
      while (start < words.length) {
        let end = start + maxWordsPerChunk;
        const chunkWords = words.slice(start, end);
        chunks.push(chunkWords.join(' '));
        start = end;
      }
    } else {
      if (currentWordCount + paragraphWordCount > maxWordsPerChunk) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
        currentWordCount = 0;
      }
      currentChunk.push(paragraph);
      currentWordCount += paragraphWordCount;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

function formatTextForNarration(text) {
  const { paragraphs } = prepareTextForTTS(text);
  return paragraphs.join('\n\n');
}

module.exports = {
  prepareTextForTTS,
  splitTextIntoChunks,
  formatTextForNarration,
  WORDS_PER_MINUTE
};

if (require.main === module) {
  const testText = `Hoy en #CREA Contenidos les contamos sobre la nueva iniciativa 🚀

  Check out https://ejemplo.com para más info @usuario

  Este es un texto de prueba para el preprocesador de audio.
  Tiene múltiples párrafos para probar que funciona correctamente.

  #noticia #perote`;
  console.log('\nTest input:', testText);
  console.log('\nResult:', prepareTextForTTS(testText));
}

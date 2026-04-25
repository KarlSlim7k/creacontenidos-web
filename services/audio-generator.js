const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ASSETS_PATH = path.join(__dirname, '../apps/web/assets/audio');
const ASSETS_JSON_PATH = path.join(__dirname, '../data/generated_assets.json');

function loadAssets() {
  if (!fs.existsSync(ASSETS_JSON_PATH)) {
    return { assets: [] };
  }
  return JSON.parse(fs.readFileSync(ASSETS_JSON_PATH, 'utf8'));
}

function saveAssets(data) {
  fs.writeFileSync(ASSETS_JSON_PATH, JSON.stringify(data, null, 2));
}

function generateUuid() {
  return `${Math.random().toString(36).substr(2, 8)}-${Date.now().toString(36)}`;
}

function callElevenLabsAPI(text, voice_id) {
  console.log('[AUDIO-GENERATOR] callElevenLabsAPI called (PLACEHOLDER)');
  console.log('[AUDIO-GENERATOR] Voice ID:', voice_id);
  console.log('[AUDIO-GENERATOR] Text length:', text.length, 'characters');
  console.log('[AUDIO-GENERATOR] API call skipped - no real API key configured');
  return null;
}

function saveAudioFile(audioData, filename) {
  console.log('[AUDIO-GENERATOR] saveAudioFile called (PLACEHOLDER)');
  console.log('[AUDIO-GENERATOR] Filename:', filename);
  console.log('[AUDIO-GENERATOR] Would save audio data to:', path.join(ASSETS_PATH, filename));
  const filePath = path.join(ASSETS_PATH, filename);
  return filePath;
}

function getAudioDuration(filePath) {
  console.log('[AUDIO-GENERATOR] getAudioDuration called (PLACEHOLDER)');
  console.log('[AUDIO-GENERATOR] File path:', filePath);
  const estimatedDuration = 60;
  console.log('[AUDIO-GENERATOR] Estimated duration: ~', estimatedDuration, 'seconds');
  return estimatedDuration;
}

async function generateAudio(text, voice_id, outputPath) {
  console.log('[AUDIO-GENERATOR] generateAudio called');
  console.log('[AUDIO-GENERATOR] Voice ID:', voice_id);

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for audio generation');
  }

  const audioData = await callElevenLabsAPI(text, voice_id);

  const filename = outputPath || `audio_${Date.now()}.mp3`;
  const filePath = saveAudioFile(audioData, filename);

  const duration = getAudioDuration(filePath);

  return {
    file_path: filePath,
    duration: duration,
    format: 'mp3'
  };
}

async function registerAsset(proposalId, type, originalPrompt, filePath, status = 'generated') {
  console.log('[AUDIO-GENERATOR] registerAsset called');
  const data = loadAssets();

  const asset = {
    id: generateUuid(),
    proposal_id: proposalId,
    type: type,
    original_prompt: originalPrompt,
    file_path: filePath,
    status: status,
    created_at: new Date().toISOString(),
    cost_tokens: null
  };

  data.assets.push(asset);
  saveAssets(data);

  console.log('[AUDIO-GENERATOR] Asset registered with ID:', asset.id);
  return asset;
}

async function getAssetsByProposal(proposalId) {
  const data = loadAssets();
  return data.assets.filter(a => a.proposal_id === proposalId);
}

module.exports = {
  generateAudio,
  callElevenLabsAPI,
  saveAudioFile,
  getAudioDuration,
  registerAsset,
  getAssetsByProposal,
  loadAssets
};

if (require.main === module) {
  console.log('[AUDIO-GENERATOR] Audio Generator Service');
  console.log('[AUDIO-GENERATOR] This script is a PLACEHOLDER - no real ElevenLabs API calls');
}

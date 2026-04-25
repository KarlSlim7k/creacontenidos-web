const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const ASSETS_PATH = path.join(__dirname, '../apps/web/assets/img/generated');
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

function callDallEAPI(prompt) {
  console.log('[IMAGE-GENERATOR] callDallEAPI called (PLACEHOLDER)');
  console.log('[IMAGE-GENERATOR] Prompt:', prompt);
  console.log('[IMAGE-GENERATOR] API call skipped - no real API key configured');
  return null;
}

function saveImage(imageUrl, filename) {
  console.log('[IMAGE-GENERATOR] saveImage called (PLACEHOLDER)');
  console.log('[IMAGE-GENERATOR] URL:', imageUrl);
  console.log('[IMAGE-GENERATOR] Filename:', filename);
  console.log('[IMAGE-GENERATOR] Would save image to:', path.join(ASSETS_PATH, filename));
  const filePath = path.join(ASSETS_PATH, filename);
  return filePath;
}

async function generateImage(prompt, outputPath) {
  console.log('[IMAGE-GENERATOR] generateImage called');
  console.log('[IMAGE-GENERATOR] Prompt:', prompt);

  if (!prompt || prompt.trim().length === 0) {
    throw new Error('Prompt is required for image generation');
  }

  const imageUrl = await callDallEAPI(prompt);

  const filename = outputPath || `img_${Date.now()}.png`;
  const filePath = saveImage(imageUrl, filename);

  return {
    file_path: filePath,
    url: imageUrl,
    format: 'png'
  };
}

async function createMeme(imagePrompt, topText, bottomText) {
  console.log('[IMAGE-GENERATOR] createMeme called');
  console.log('[IMAGE-GENERATOR] Image prompt:', imagePrompt);
  console.log('[IMAGE-GENERATOR] Top text:', topText);
  console.log('[IMAGE-GENERATOR] Bottom text:', bottomText);

  const fullPrompt = `${imagePrompt}, top text: "${topText}", bottom text: "${bottomText}"`;
  return generateImage(fullPrompt, `meme_${Date.now()}.png`);
}

async function createInfographic(topic, data) {
  console.log('[IMAGE-GENERATOR] createInfographic called');
  console.log('[IMAGE-GENERATOR] Topic:', topic);
  console.log('[IMAGE-GENERATOR] Data:', JSON.stringify(data));

  const prompt = `Infographic about ${topic}: ${JSON.stringify(data)}`;
  return generateImage(prompt, `infographic_${Date.now()}.png`);
}

async function registerAsset(proposalId, type, originalPrompt, filePath, status = 'generated') {
  console.log('[IMAGE-GENERATOR] registerAsset called');
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

  console.log('[IMAGE-GENERATOR] Asset registered with ID:', asset.id);
  return asset;
}

module.exports = {
  generateImage,
  callDallEAPI,
  saveImage,
  createMeme,
  createInfographic,
  registerAsset,
  loadAssets
};

if (require.main === module) {
  console.log('[IMAGE-GENERATOR] Image Generator Service');
  console.log('[IMAGE-GENERATOR] This script is a PLACEHOLDER - no real DALL-E API calls');
}

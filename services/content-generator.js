const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/ai-config.json');
const SYSTEM_PROMPT_PATH = path.join(__dirname, '../config/system-prompt-crea.md');
const PROPOSALS_PATH = path.join(__dirname, '../data/content_proposals.json');

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function loadSystemPrompt() {
  return fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8');
}

function loadProposals() {
  const data = JSON.parse(fs.readFileSync(PROPOSALS_PATH, 'utf8'));
  return data.proposals || [];
}

function saveProposals(proposals) {
  const data = { proposals };
  fs.writeFileSync(PROPOSALS_PATH, JSON.stringify(data, null, 2));
}

function generateUuid() {
  return `${Math.random().toString(36).substr(2, 8)}-${Date.now().toString(36)}`;
}

async function callClaudeAPI(messages) {
  console.log('[CONTENT-GENERATOR] callClaudeAPI called (PLACEHOLDER)');
  console.log('[CONTENT-GENERATOR] Messages:', JSON.stringify(messages, null, 2));
  console.log('[CONTENT-GENERATOR] API call skipped - no real API key configured');
  return null;
}

async function generateProposal(topic, format) {
  console.log(`[CONTENT-GENERATOR] generateProposal called for topic: ${topic.id}, format: ${format}`);
  
  const systemPrompt = loadSystemPrompt();
  
  const formatInstructions = {
    nota: 'Genera una nota informativa con título, subtítulo/bajada, cuerpo y sección de datos útiles.',
    post: 'Genera un post breve y directo para redes sociales, con emoji moderado.',
    audio: 'Genera un guion conversacional para narrar en 60-90 segundos.',
    video: 'Genera un guion de video con escenas, tiempo estimado, locución y sugerencias visuales.',
    meme: 'Genera un prompt ingenioso pero respetuoso para meme.',
    infografia: 'Genera estructura visual con título, datos clave y fuentes.'
  };

  const userMessage = `Tema del radar:
- Título: ${topic.titulo || topic.title || 'Sin título'}
- Descripción: ${topic.descripcion || topic.description || 'Sin descripción'}
- Fuente: ${topic.fuente || topic.fuente || 'Sin fuente'}
- Fecha: ${topic.fecha || topic.date || 'Sin fecha'}

Formato solicitado: ${format}
${formatInstructions[format] || 'Formato no reconocido.'}

Contexto: Este contenido es para el medio digital CREA Contenidos, ubicado en Perote, Veracruz. La audiencia principal es la población local.

Genera el contenido siguiendo las reglas editoriales del system prompt.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const aiResponse = await callClaudeAPI(messages);

  const proposalData = {
    topic_id: topic.id,
    format,
    title: aiResponse?.title || `[PLACEHOLDER] Propuesta ${format} para: ${topic.titulo || topic.title || 'Sin título'}`,
    body: aiResponse?.body || `Contenido placeholder generado para formato ${format}. Editar manualmente.`,
    image_prompt: aiResponse?.image_prompt || null,
    ai_label: 'generado',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: 'claude'
  };

  return proposalData;
}

async function generateNote(topic) {
  console.log('[CONTENT-GENERATOR] generateNote called');
  return generateProposal(topic, 'nota');
}

async function generateSocialPost(topic) {
  console.log('[CONTENT-GENERATOR] generateSocialPost called');
  return generateProposal(topic, 'post');
}

async function generateAudioScript(topic) {
  console.log('[CONTENT-GENERATOR] generateAudioScript called');
  return generateProposal(topic, 'audio');
}

async function generateVideoScript(topic) {
  console.log('[CONTENT-GENERATOR] generateVideoScript called');
  return generateProposal(topic, 'video');
}

async function generateMemePrompt(topic) {
  console.log('[CONTENT-GENERATOR] generateMemePrompt called');
  return generateProposal(topic, 'meme');
}

async function generateInfographicPrompt(topic) {
  console.log('[CONTENT-GENERATOR] generateInfographicPrompt called');
  return generateProposal(topic, 'infografia');
}

async function saveProposal(proposalData) {
  console.log('[CONTENT-GENERATOR] saveProposal called');
  
  const proposals = loadProposals();
  const newProposal = {
    id: generateUuid(),
    ...proposalData,
    created_at: proposalData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  proposals.push(newProposal);
  saveProposals(proposals);
  
  console.log('[CONTENT-GENERATOR] Proposal saved with ID:', newProposal.id);
  return newProposal;
}

async function generateAllFormats(topic) {
  console.log('[CONTENT-GENERATOR] generateAllFormats called for topic:', topic.id);
  
  const formats = ['nota', 'post', 'audio', 'video', 'meme', 'infografia'];
  const results = [];
  
  for (const format of formats) {
    try {
      const proposal = await generateProposal(topic, format);
      const saved = await saveProposal(proposal);
      results.push(saved);
    } catch (error) {
      console.error(`[CONTENT-GENERATOR] Error generating ${format}:`, error);
    }
  }
  
  return results;
}

module.exports = {
  generateProposal,
  generateNote,
  generateSocialPost,
  generateAudioScript,
  generateVideoScript,
  generateMemePrompt,
  generateInfographicPrompt,
  saveProposal,
  generateAllFormats,
  callClaudeAPI,
  loadConfig,
  loadSystemPrompt
};

if (require.main === module) {
  console.log('[CONTENT-GENERATOR] Content Generator Service');
  console.log('[CONTENT-GENERATOR] This script is a PLACEHOLDER - no real AI APIs are called');
  console.log('[CONTENT-GENERATOR] To use: require this module in your application');
}
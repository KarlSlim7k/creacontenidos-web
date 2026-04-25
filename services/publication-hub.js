const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../config/distribution-config.json');
const PUBLICATIONS_PATH = path.join(__dirname, '../data/publications.json');

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (e) {
    console.log('[PublicationHub] Config no encontrada, usando defaults');
    return { website: { auto_publish: true, publish_endpoint: 'api/articles/crud.php' } };
  }
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function publishToFacebook(content) {
  console.log('[PublicationHub] Intentando publicar en Facebook...');
  console.log('[PublicationHub] Facebook placeholder - título:', content.title);
  
  const config = loadConfig();
  if (!config.facebook?.enabled) {
    console.log('[PublicationHub] Facebook no está habilitado');
    return { success: false, error: 'Facebook no habilitado' };
  }

  console.log('[PublicationHub] PLACEHOLDER: Facebook Graph API no conectada');
  console.log('[PublicationHub] Page ID:', config.facebook.page_id || 'no configurado');
  
  return {
    success: false,
    error: 'PLACEHOLDER - Se requiere token de acceso de Facebook',
    platform: 'facebook',
    url: null
  };
}

async function publishToInstagram(content) {
  console.log('[PublicationHub] Intentando publicar en Instagram...');
  console.log('[PublicationHub] Instagram placeholder - título:', content.title);
  
  const config = loadConfig();
  if (!config.instagram?.enabled) {
    console.log('[PublicationHub] Instagram no está habilitado');
    return { success: false, error: 'Instagram no habilitado' };
  }

  console.log('[PublicationHub] PLACEHOLDER: Instagram Graph API no conectada');
  console.log('[PublicationHub] Account ID:', config.instagram.account_id || 'no configurado');
  
  return {
    success: false,
    error: 'PLACEHOLDER - Se requiere token de acceso de Instagram',
    platform: 'instagram',
    url: null
  };
}

async function generateTikTokAsset(content) {
  console.log('[PublicationHub] Generando asset para TikTok...');
  console.log('[PublicationHub] TikTok placeholder');
  
  const config = loadConfig();
  if (!config.tiktok?.enabled) {
    console.log('[PublicationHub] TikTok no está habilitado');
    return { success: false, error: 'TikTok no habilitado' };
  }

  const assetId = uuidv4();
  const assetData = {
    id: assetId,
    platform: 'tiktok',
    title: content.title,
    body: content.body,
    created_at: new Date().toISOString(),
    status: 'ready_to_upload'
  };

  const assetsDir = path.join(__dirname, '../data/tiktok-assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(assetsDir, `${assetId}.json`),
    JSON.stringify(assetData, null, 2)
  );

  console.log('[PublicationHub] Asset TikTok generado:', assetId);
  
  return {
    success: true,
    asset_id: assetId,
    file_path: `${assetsDir}/${assetId}.json`,
    message: 'Asset listo para subir manualmente a TikTok'
  };
}

function generateWhatsAppLink(content) {
  console.log('[PublicationHub] Generando link de WhatsApp...');
  
  const text = encodeURIComponent(`${content.title}\n\n${content.body.replace(/<[^>]*>/g, '')}`);
  const whatsappUrl = `https://wa.me/?text=${text}`;
  
  console.log('[PublicationHub] WhatsApp link generado');
  
  return {
    success: true,
    url: whatsappUrl,
    message: 'Link para compartir en WhatsApp'
  };
}

async function publishToWebsite(content) {
  console.log('[PublicationHub] Publicando en sitio web...');
  
  const config = loadConfig();
  const endpoint = config.website?.publish_endpoint || 'api/articles/crud.php';
  
  console.log('[PublicationHub] PLACEHOLDER: Llamando a CMS endpoint');
  console.log('[PublicationHub] Endpoint:', endpoint);
  
  return {
    success: false,
    error: 'PLACEHOLDER - Requiere implementación real del CMS',
    platform: 'website',
    url: null
  };
}

async function getPublicationStatus(publicationId) {
  console.log('[PublicationHub] Consultando status:', publicationId);
  
  try {
    const data = JSON.parse(fs.readFileSync(PUBLICATIONS_PATH, 'utf8'));
    const pub = data.publications?.find(p => p.id === publicationId);
    
    if (!pub) {
      return { success: false, error: 'Publicación no encontrada' };
    }
    
    return { success: true, publication: pub };
  } catch (e) {
    return { success: false, error: 'Error leyendo publications.json' };
  }
}

async function createPublication(proposalId, platform, metadata = {}) {
  const pub = {
    id: uuidv4(),
    proposal_id: proposalId,
    platform,
    status: 'pending',
    url: null,
    published_at: null,
    error_message: null,
    metadata,
    created_at: new Date().toISOString()
  };

  try {
    const data = JSON.parse(fs.readFileSync(PUBLICATIONS_PATH, 'utf8'));
    data.publications = data.publications || [];
    data.publications.push(pub);
    fs.writeFileSync(PUBLICATIONS_PATH, JSON.stringify(data, null, 2));
    console.log('[PublicationHub] Publicación creada:', pub.id);
  } catch (e) {
    console.error('[PublicationHub] Error creando publicación:', e);
  }

  return pub;
}

async function updatePublication(id, updates) {
  try {
    const data = JSON.parse(fs.readFileSync(PUBLICATIONS_PATH, 'utf8'));
    const idx = data.publications?.findIndex(p => p.id === id);
    
    if (idx === -1) return { success: false };
    
    data.publications[idx] = { ...data.publications[idx], ...updates };
    fs.writeFileSync(PUBLICATIONS_PATH, JSON.stringify(data, null, 2));
    
    return { success: true, publication: data.publications[idx] };
  } catch (e) {
    return { success: false };
  }
}

module.exports = {
  publishToFacebook,
  publishToInstagram,
  generateTikTokAsset,
  generateWhatsAppLink,
  publishToWebsite,
  getPublicationStatus,
  createPublication,
  updatePublication
};
#!/usr/bin/env node
/**
 * Social Listening Service - CREA Contenidos
 * 
 * Este script se ejecuta via cron cada 30 minutos.
 * NO hace llamadas reales a APIs - solo placeholders con console.log
 * 
 * Uso: node services/social-listener.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TOPICS_FILE = path.join(DATA_DIR, 'topics.json');
const CONFIG_FILE = path.join(__dirname, '..', 'config', 'social-listening.example.json');

const LOG_PREFIX = '[SocialListener]';

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  console.log(`${LOG_PREFIX} [${timestamp}] [${type}] ${message}`);
}

function loadTopics() {
  if (!fs.existsSync(TOPICS_FILE)) {
    return { topics: [] };
  }
  return JSON.parse(fs.readFileSync(TOPICS_FILE, 'utf8'));
}

function saveTopics(data) {
  fs.writeFileSync(TOPICS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function generateUuid() {
  return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
    Math.random() * 0xffff | 0,
    Math.random() * 0xffff | 0,
    Math.random() * 0xffff | 0,
    Math.random() * 0x0fff | 0x4000,
    Math.random() * 0x3fff | 0x8000,
    Math.random() * 0xffff | 0,
    Math.random() * 0xffff | 0,
    Math.random() * 0xffff | 0
  );
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    log('Config file not found, using defaults', 'WARN');
    return null;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

/**
 * PLACEHOLDER: No hace llamada real a Perplexity
 * En producción aquí iría la lógica para llamar a Perplexity Sonar API
 */
async function fetchPerplexityTopics(query) {
  log(`Fetching Perplexity topics for query: "${query}"`);
  
  // PLACEHOLDER - API call would go here
  // const response = await fetch('https://api.perplexity.ai/search', {
  //   headers: { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}` }
  // });
  
  log('Perplexity API call skipped (placeholder only)', 'WARN');
  return [];
}

/**
 * PLACEHOLDER: No hace llamada real a Google Trends
 * En producción aquí iría la lógica para usar Google Trends API
 */
async function fetchGoogleTrendsTopics(region) {
  log(`Fetching Google Trends for region: ${region}`);
  
  // PLACEHOLDER - API call would go here
  // const trends = await googleTrendsApi.getTopTrends({ geocode: region });
  
  log('Google Trends API call skipped (placeholder only)', 'WARN');
  return [];
}

/**
 * Fetch and parse RSS feed
 * Can use npm libraries like 'rss-parser' in production
 */
async function parseRSSFeed(feedUrl, feedName) {
  log(`Parsing RSS feed: ${feedName} (${feedUrl})`);
  
  return new Promise((resolve, reject) => {
    const items = [];
    
    // PLACEHOLDER - In production, use rss-parser library:
    // const Parser = require('rss-parser');
    // const parser = new Parser();
    // const feed = await parser.parseURL(feedUrl);
    // return feed.items.map(item => ({ title: item.title, link: item.link, pubDate: item.pubDate }));
    
    log(`RSS parsing for ${feedName} skipped (placeholder only)`, 'WARN');
    resolve([]);
  });
}

/**
 * Basic keyword-based sentiment analysis
 */
function analyzeSentiment(text, sentimentConfig) {
  const lowerText = text.toLowerCase();
  
  const positiveCount = sentimentConfig.positive
    .filter(kw => lowerText.includes(kw)).length;
  const negativeCount = sentimentConfig.negative
    .filter(kw => lowerText.includes(kw)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Suggest content formats based on sentiment and keywords
 */
function suggestFormats(text, sentiment) {
  const formats = ['nota'];
  const lowerText = text.toLowerCase();
  
  if (sentiment === 'negative') {
    formats.push('alerta');
    if (lowerText.includes('accidente') || lowerText.includes('sismo')) {
      formats.push('infografia');
    }
  }
  
  if (lowerText.includes('inauguración') || lowerText.includes('anuncio')) {
    formats.push('comunicado');
  }
  
  if (lowerText.includes('protesta') || lowerText.includes('manifestación')) {
    formats.push('cobertura');
  }
  
  return formats;
}

/**
 * Save detected topic to topics.json
 */
function saveTopicToFile(topicData) {
  const data = loadTopics();
  
  const existingIndex = data.topics.findIndex(t => 
    t.topic.toLowerCase() === topicData.topic.toLowerCase() && 
    t.source === topicData.source
  );
  
  if (existingIndex !== -1) {
    data.topics[existingIndex].mentions += topicData.mentions;
    data.topics[existingIndex].detected_at = new Date().toISOString();
    log(`Updated existing topic: ${topicData.topic}`, 'UPDATE');
  } else {
    data.topics.push(topicData);
    log(`New topic saved: ${topicData.topic}`, 'NEW');
  }
  
  saveTopics(data);
  return data.topics.length;
}

/**
 * Main execution
 */
async function run() {
  log('Starting social listening service');
  
  const config = loadConfig();
  if (!config) {
    log('Cannot load config, exiting', 'ERROR');
    process.exit(1);
  }
  
  const sentimentConfig = config.sentiment_keywords;
  let topicsAdded = 0;
  
  // Fetch from Perplexity (placeholder)
  if (config.sources.perplexity?.enabled) {
    const perplexityTopics = await fetchPerplexityTopics(config.sources.perplexity.query);
    for (const item of perplexityTopics) {
      const sentiment = analyzeSentiment(item.title, sentimentConfig);
      const topicData = {
        id: generateUuid(),
        topic: item.title,
        source: 'perplexity_sonar',
        mentions: item.mentions || 1,
        sentiment,
        suggested_formats: suggestFormats(item.title, sentiment),
        detected_at: new Date().toISOString(),
        status: 'pending'
      };
      saveTopicToFile(topicData);
      topicsAdded++;
    }
  }
  
  // Fetch from Google Trends (placeholder)
  if (config.sources.google_trends?.enabled) {
    const trendsTopics = await fetchGoogleTrendsTopics(config.sources.google_trends.region);
    for (const item of trendsTopics) {
      const sentiment = analyzeSentiment(item.title, sentimentConfig);
      const topicData = {
        id: generateUuid(),
        topic: item.title,
        source: 'google_trends',
        mentions: item.mentions || 1,
        sentiment,
        suggested_formats: suggestFormats(item.title, sentiment),
        detected_at: new Date().toISOString(),
        status: 'pending'
      };
      saveTopicToFile(topicData);
      topicsAdded++;
    }
  }
  
  // Fetch from RSS feeds
  if (config.sources.rss_feeds) {
    for (const feed of config.sources.rss_feeds) {
      const items = await parseRSSFeed(feed.url, feed.name);
      for (const item of items) {
        const sentiment = analyzeSentiment(item.title, sentimentConfig);
        const topicData = {
          id: generateUuid(),
          topic: item.title,
          source: `rss_${feed.name.toLowerCase().replace(/\s+/g, '_')}`,
          mentions: 1,
          sentiment,
          suggested_formats: suggestFormats(item.title, sentiment),
          detected_at: item.pubDate || new Date().toISOString(),
          status: 'pending'
        };
        saveTopicToFile(topicData);
        topicsAdded++;
      }
    }
  }
  
  // Cleanup old topics
  const retentionDays = config.topics_retention_days || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  
  const data = loadTopics();
  const beforeCount = data.topics.length;
  data.topics = data.topics.filter(t => new Date(t.detected_at) >= cutoff);
  const cleanedCount = beforeCount - data.topics.length;
  
  if (cleanedCount > 0) {
    saveTopics(data);
    log(`Cleaned up ${cleanedCount} old topics (older than ${retentionDays} days)`, 'CLEANUP');
  }
  
  log(`Social listening completed. Topics processed: ${topicsAdded}, Total active: ${data.topics.length}`);
}

if (require.main === module) {
  run().catch(err => {
    log(`Fatal error: ${err.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = { run, fetchPerplexityTopics, parseRSSFeed, analyzeSentiment, saveTopicToFile };

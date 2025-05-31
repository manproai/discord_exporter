// content.js - Discord Chat Exporter API (v5.0 - Optimized)

// === CONFIGURATION ===
const CONFIG = {
  API_BASE_URL: 'https://discord.com/api/v10',
  MESSAGES_LIMIT_PER_REQUEST: 100,
  REQUEST_DELAY_MS: 1200,
  MAX_REQUESTS: 500,
  RATE_LIMIT_BUFFER_MS: 500
};

// === STATE MANAGEMENT ===
class ExportState {
  constructor() {
    this.processedMessageIds = new Set();
    this.isRunning = false;
    this.progressCallback = null;
  }

  reset() {
    this.processedMessageIds.clear();
    this.isRunning = false;
  }

  setProgress(callback) {
    this.progressCallback = callback;
  }

  updateProgress(current, total, phase) {
    if (this.progressCallback) {
      this.progressCallback({ current, total, phase });
    }
  }
}

const exportState = new ExportState();

// === UTILITY FUNCTIONS ===
const Utils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  parseDiscordTimestamp: (isoTimestampStr) => {
    if (!isoTimestampStr) return null;
    const date = new Date(isoTimestampStr);
    return !isNaN(date.getTime()) ? date : null;
  },

  escapeCSV: (field) => {
    if (field === null || typeof field === 'undefined') return '';
    let strField = String(field);
    if (strField.includes(',') || strField.includes('\n') || strField.includes('"')) {
      strField = strField.replace(/"/g, '""');
      return `"${strField}"`;
    }
    return strField;
  },

  extractChannelInfo: () => {
    try {
      const currentUrl = new URL(window.location.href);
      const pathParts = currentUrl.pathname.split('/');
      const channelId = pathParts[pathParts.length - 1];
      
      let channelName = channelId;
      const titleMatch = document.title.match(/#([\w-]+)/);
      if (titleMatch && titleMatch[1]) {
        channelName = titleMatch[1];
      }
      
      return { channelId, channelName };
    } catch (error) {
      console.warn('[Utils] Could not extract channel info:', error);
      return { channelId: 'unknown', channelName: 'unknown' };
    }
  }
};

// === MESSAGE TRANSFORMATION ===
class MessageTransformer {
  static transform(apiMsg) {
    if (!apiMsg || !apiMsg.id || !apiMsg.author || !apiMsg.timestamp) {
      console.warn('[Transformer] Incomplete message object:', apiMsg);
      return null;
    }

    const parsedTimestamp = Utils.parseDiscordTimestamp(apiMsg.timestamp);
    if (!parsedTimestamp) {
      console.warn(`[Transformer] Invalid timestamp for message ${apiMsg.id}`);
      return null;
    }

    return {
      id: apiMsg.id,
      timestamp: parsedTimestamp,
      isoTimestamp: apiMsg.timestamp,
      author: this.extractAuthorInfo(apiMsg),
      content: apiMsg.content || "",
      attachments: this.extractAttachments(apiMsg),
      embeds: this.extractEmbeds(apiMsg),
      reactions: this.extractReactions(apiMsg)
    };
  }

  static extractAuthorInfo(apiMsg) {
    let displayName = apiMsg.author.username;
    
    if (apiMsg.author.global_name) {
      displayName = apiMsg.author.global_name;
    }
    
    if (apiMsg.member && apiMsg.member.nick) {
      displayName = apiMsg.member.nick;
    }

    return {
      id: apiMsg.author.id,
      username: apiMsg.author.username,
      discriminator: apiMsg.author.discriminator || '0',
      global_name: apiMsg.author.global_name || '',
      displayName: displayName
    };
  }

  static extractAttachments(apiMsg) {
    if (!apiMsg.attachments || !Array.isArray(apiMsg.attachments)) {
      return '';
    }
    return apiMsg.attachments.map(att => att.url).join(' ; ');
  }

  static extractEmbeds(apiMsg) {
    if (!apiMsg.embeds || !Array.isArray(apiMsg.embeds)) {
      return '';
    }
    return apiMsg.embeds.map(embed => {
      const parts = [];
      if (embed.title) parts.push(`Title: ${embed.title}`);
      if (embed.description) parts.push(`Desc: ${embed.description}`);
      if (embed.url) parts.push(`URL: ${embed.url}`);
      return parts.join(' | ');
    }).join(' ; ');
  }

  static extractReactions(apiMsg) {
    if (!apiMsg.reactions || !Array.isArray(apiMsg.reactions)) {
      return '';
    }
    return apiMsg.reactions.map(reaction => {
      const emoji = reaction.emoji.name || reaction.emoji.id;
      return `${emoji}:${reaction.count}`;
    }).join(' ; ');
  }
}

// === CSV GENERATOR ===
class CSVGenerator {
  static generate(messages) {
    if (!messages || messages.length === 0) {
      console.log('[CSV] No messages to convert');
      return '';
    }

    const header = [
      'Timestamp (ISO)', 'MessageID', 'AuthorID', 'AuthorUsername', 
      'AuthorDisplayName', 'MessageContent', 'AttachmentsURL', 
      'Embeds', 'Reactions'
    ];

    const rows = messages.map(msg => [
      Utils.escapeCSV(msg.isoTimestamp),
      Utils.escapeCSV(msg.id),
      Utils.escapeCSV(msg.author.id),
      Utils.escapeCSV(msg.author.username),
      Utils.escapeCSV(msg.author.displayName),
      Utils.escapeCSV(msg.content),
      Utils.escapeCSV(msg.attachments),
      Utils.escapeCSV(msg.embeds),
      Utils.escapeCSV(msg.reactions)
    ].join(','));

    const csvString = ["\uFEFF" + header.join(','), ...rows].join('\n');
    console.log(`[CSV] Generated CSV with ${rows.length} rows`);
    return csvString;
  }
}

// === FILE DOWNLOADER ===
class FileDownloader {
  static download(filename, content, contentType = 'text/csv;charset=utf-8;') {
    const blob = new Blob([content], { type: contentType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    console.log(`[Download] File downloaded: ${filename}`);
  }
}

// === API CLIENT ===
class DiscordApiClient {
  constructor(token) {
    this.token = token;
    this.requestCount = 0;
  }

  async fetchMessages(channelId, beforeId = null) {
    this.requestCount++;
    let url = `${CONFIG.API_BASE_URL}/channels/${channelId}/messages?limit=${CONFIG.MESSAGES_LIMIT_PER_REQUEST}`;
    
    if (beforeId) {
      url += `&before=${beforeId}`;
    }

    console.log(`[API] Request #${this.requestCount}: ${url.replace(CONFIG.API_BASE_URL, '')}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': this.token,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        await this.handleApiError(response);
      }

      const messages = await response.json();
      
      if (!Array.isArray(messages)) {
        throw new Error('Invalid API response format');
      }

      return messages;
    } catch (error) {
      if (error.name === 'TypeError') {
        throw new Error(`Network error: ${error.message}. Check your connection.`);
      }
      throw error;
    }
  }

  async handleApiError(response) {
    const errorText = await response.text();
    console.error(`[API] Error ${response.status}:`, errorText);

    switch (response.status) {
      case 401:
        throw new Error('Invalid token or insufficient permissions');
      case 403:
        throw new Error('Access forbidden - check channel permissions');
      case 429:
        const retryAfter = parseInt(response.headers.get('Retry-After') || '2', 10);
        const waitTime = (retryAfter * 1000) + CONFIG.RATE_LIMIT_BUFFER_MS;
        console.warn(`[API] Rate limited, waiting ${waitTime}ms`);
        await Utils.delay(waitTime);
        this.requestCount--; // Don't count rate-limited requests
        return; // Let the caller retry
      default:
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
  }
}

// === MESSAGE FETCHER ===
class MessageFetcher {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async fetchWithPagination(channelId, startDate, endDate) {
    const collectedMessages = [];
    const endSnowflake = this.dateToSnowflake(endDate);
    let beforeId = endSnowflake.toString();
    let shouldContinue = true;

    console.log(`[Fetcher] Starting fetch for ${channelId}, range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    exportState.reset();

    while (shouldContinue && this.apiClient.requestCount < CONFIG.MAX_REQUESTS) {
      try {
        const messagesBatch = await this.apiClient.fetchMessages(channelId, beforeId);
        
        if (messagesBatch.length === 0) {
          console.log('[Fetcher] No more messages available');
          break;
        }

        const { processed, shouldStop, oldestTimestamp } = this.processBatch(
          messagesBatch, 
          startDate, 
          collectedMessages
        );

        exportState.updateProgress(
          collectedMessages.length, 
          null, 
          `Fetched ${collectedMessages.length} messages...`
        );

        beforeId = messagesBatch[messagesBatch.length - 1].id;
        shouldContinue = !shouldStop && messagesBatch.length === CONFIG.MESSAGES_LIMIT_PER_REQUEST;

        console.log(`[Fetcher] Batch processed: ${processed} new, ${collectedMessages.length} total, oldest: ${oldestTimestamp?.toISOString()}`);

        if (shouldContinue) {
          await Utils.delay(CONFIG.REQUEST_DELAY_MS);
        }

      } catch (error) {
        if (error.message.includes('Rate limited')) {
          continue; // Retry after rate limit handling
        }
        throw error;
      }
    }

    if (this.apiClient.requestCount >= CONFIG.MAX_REQUESTS) {
      console.warn('[Fetcher] Reached maximum request limit');
    }

    return collectedMessages;
  }

  processBatch(messagesBatch, startDate, collectedMessages) {
    let processed = 0;
    let shouldStop = false;
    let oldestTimestamp = null;

    for (const rawMessage of messagesBatch) {
      const msgTimestamp = Utils.parseDiscordTimestamp(rawMessage.timestamp);
      
      if (msgTimestamp) {
        if (msgTimestamp < startDate) {
          shouldStop = true;
          break;
        }

        if (!exportState.processedMessageIds.has(rawMessage.id)) {
          const transformedMessage = MessageTransformer.transform(rawMessage);
          if (transformedMessage) {
            collectedMessages.push(transformedMessage);
            exportState.processedMessageIds.add(rawMessage.id);
            processed++;
          }
        }

        oldestTimestamp = msgTimestamp;
      }
    }

    return { processed, shouldStop, oldestTimestamp };
  }

  dateToSnowflake(date) {
    return (BigInt(date.getTime()) - 1420070400000n) << 22n;
  }
}

// === MAIN EXPORTER ===
class DiscordExporter {
  async export(token, channelId, startDateStr, endDateStr) {
    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    console.log(`[Exporter] Starting export for channel ${channelId}`);
    
    exportState.isRunning = true;
    exportState.updateProgress(0, null, 'Initializing export...');

    try {
      const apiClient = new DiscordApiClient(token);
      const fetcher = new MessageFetcher(apiClient);
      
      exportState.updateProgress(0, null, 'Fetching messages from Discord API...');
      const rawMessages = await fetcher.fetchWithPagination(channelId, startDate, endDate);
      
      exportState.updateProgress(rawMessages.length, null, 'Filtering messages by date range...');
      const filteredMessages = rawMessages.filter(msg => 
        msg.timestamp >= startDate && msg.timestamp <= endDate
      );

      if (filteredMessages.length === 0) {
        return { 
          status: 'no_messages', 
          message: 'No messages found in the specified date range' 
        };
      }

      exportState.updateProgress(filteredMessages.length, null, 'Generating CSV file...');
      
      // Sort messages chronologically
      filteredMessages.sort((a, b) => a.timestamp - b.timestamp);
      
      const csvContent = CSVGenerator.generate(filteredMessages);
      const { channelName } = Utils.extractChannelInfo();
      const filename = `DiscordExport_${channelName}_${startDateStr}_to_${endDateStr}.csv`;
      
      FileDownloader.download(filename, csvContent);
      
      return {
        status: 'success',
        count: filteredMessages.length,
        filename: filename
      };

    } catch (error) {
      console.error('[Exporter] Export failed:', error);
      return {
        status: 'error',
        message: error.message
      };
    } finally {
      exportState.isRunning = false;
    }
  }
}

// === PROGRESS INDICATOR ===
class ProgressIndicator {
  constructor() {
    this.container = null;
    this.progressBar = null;
    this.statusText = null;
  }

  show() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2f3136;
      color: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      min-width: 300px;
    `;

    this.statusText = document.createElement('div');
    this.statusText.style.cssText = 'margin-bottom: 10px; font-size: 14px;';
    this.statusText.textContent = 'Preparing export...';

    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      width: 100%;
      height: 6px;
      background: #40444b;
      border-radius: 3px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: #5865f2;
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 3px;
    `;

    this.progressBar.appendChild(progressFill);
    this.container.appendChild(this.statusText);
    this.container.appendChild(this.progressBar);
    document.body.appendChild(this.container);
  }

  update({ current, total, phase }) {
    if (!this.container) return;

    this.statusText.textContent = phase || `Processing ${current} messages...`;
    
    if (total && current) {
      const percentage = Math.min((current / total) * 100, 100);
      const progressFill = this.progressBar.querySelector('div');
      progressFill.style.width = `${percentage}%`;
    }
  }

  hide() {
    if (this.container) {
      document.body.removeChild(this.container);
      this.container = null;
    }
  }
}

// === MESSAGE LISTENER ===
const progressIndicator = new ProgressIndicator();
const exporter = new DiscordExporter();

exportState.setProgress((progress) => {
  progressIndicator.update(progress);
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportChatAPI') {
    console.log('[Handler] Export request received:', request.channelId);
    
    if (exportState.isRunning) {
      sendResponse({ 
        status: 'error', 
        message: 'Export already in progress. Please wait.' 
      });
      return false;
    }

    progressIndicator.show();
    
    exporter.export(request.token, request.channelId, request.startDate, request.endDate)
      .then(result => {
        progressIndicator.hide();
        
        if (result.status === 'success') {
          console.log(`[Handler] Export completed: ${result.count} messages`);
          // Show subtle success notification
          progressIndicator.show();
          progressIndicator.update({ 
            phase: `✅ Export complete! ${result.count} messages saved to ${result.filename}` 
          });
          setTimeout(() => progressIndicator.hide(), 3000);
        } else if (result.status === 'no_messages') {
          console.log('[Handler] No messages found in date range');
        }
        
        sendResponse(result);
      })
      .catch(error => {
        progressIndicator.hide();
        console.error('[Handler] Export error:', error);
        sendResponse({ 
          status: 'error', 
          message: error.message 
        });
      });

    return true; // Keep message channel open for async response
  }
});

console.log('🚀 Discord Chat Exporter v5.0 loaded successfully');
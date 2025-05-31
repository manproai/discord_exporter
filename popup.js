// popup.js - Enhanced Discord Exporter UI (v5.0)

class DiscordExporterUI {
  constructor() {
    this.elements = {};
    this.isExporting = false;
    this.init();
  }

  init() {
    this.bindElements();
    this.attachEventListeners();
    this.loadSavedData();
    this.setDefaultDates();
  }

  bindElements() {
    this.elements = {
      tokenInput: document.getElementById('discordToken'),
      saveTokenButton: document.getElementById('saveTokenButton'),
      startDateInput: document.getElementById('startDate'),
      endDateInput: document.getElementById('endDate'),
      exportButton: document.getElementById('exportButton'),
      statusDiv: document.getElementById('status'),
      tokenStatus: document.getElementById('tokenStatus'),
      channelInfo: document.getElementById('channelInfo')
    };
  }

  attachEventListeners() {
    this.elements.saveTokenButton.addEventListener('click', () => this.saveToken());
    this.elements.exportButton.addEventListener('click', () => this.startExport());
    this.elements.tokenInput.addEventListener('input', () => this.validateToken());
    this.elements.startDateInput.addEventListener('change', () => this.validateDates());
    this.elements.endDateInput.addEventListener('change', () => this.validateDates());
  }

  async loadSavedData() {
    try {
      // Load saved token
      const result = await chrome.storage.local.get(['discordUserToken']);
      if (result.discordUserToken) {
        this.elements.tokenInput.value = result.discordUserToken;
        this.updateTokenStatus(true);
        console.log('Token loaded from storage');
      }

      // Get current channel info
      await this.updateChannelInfo();
    } catch (error) {
      console.error('Error loading saved data:', error);
      this.showStatus('Error loading saved settings', 'error');
    }
  }

  async updateChannelInfo() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) return;

      const activeTab = tabs[0];
      if (!this.isDiscordUrl(activeTab.url)) {
        this.elements.channelInfo.innerHTML = `
          <div class="warning">⚠️ Please navigate to a Discord channel first</div>
        `;
        return;
      }

      const channelMatch = activeTab.url.match(/channels\/([@\w]+)\/(\d+)/);
      if (channelMatch) {
        const [, serverId, channelId] = channelMatch;
        const channelName = this.extractChannelName(activeTab.title);
        
        this.elements.channelInfo.innerHTML = `
          <div class="channel-info">
            <strong>📋 Current Channel:</strong><br>
            <span class="channel-name">${channelName}</span><br>
            <span class="channel-id">ID: ${channelId}</span>
          </div>
        `;
      }
    } catch (error) {
      console.error('Error updating channel info:', error);
    }
  }

  setDefaultDates() {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    this.elements.endDateInput.value = today.toISOString().split('T')[0];
    this.elements.startDateInput.value = oneWeekAgo.toISOString().split('T')[0];
  }

  validateToken() {
    const token = this.elements.tokenInput.value.trim();
    const isValid = token.length > 50; // Basic validation
    this.updateTokenStatus(isValid);
    return isValid;
  }

  updateTokenStatus(isValid) {
    if (isValid) {
      this.elements.tokenStatus.innerHTML = '✅ Token format looks valid';
      this.elements.tokenStatus.className = 'token-status valid';
    } else {
      this.elements.tokenStatus.innerHTML = '❌ Please enter a valid Discord token';
      this.elements.tokenStatus.className = 'token-status invalid';
    }
  }

  validateDates() {
    const startDate = new Date(this.elements.startDateInput.value);
    const endDate = new Date(this.elements.endDateInput.value);
    
    if (startDate > endDate) {
      this.showStatus('Start date cannot be after end date', 'error');
      return false;
    }

    const daysDiff = (endDate - startDate) / (1000 * 60 * 60 * 24);
    if (daysDiff > 365) {
      this.showStatus('Date range should not exceed 1 year to avoid timeouts', 'warning');
    }

    return true;
  }

  async saveToken() {
    const token = this.elements.tokenInput.value.trim();
    
    if (!token) {
      this.showStatus('Please enter a token to save', 'error');
      return;
    }

    if (!this.validateToken()) {
      this.showStatus('Please enter a valid token format', 'error');
      return;
    }

    this.setButtonLoading(this.elements.saveTokenButton, true);

    try {
      await chrome.storage.local.set({ discordUserToken: token });
      this.showStatus('Token saved successfully!', 'success');
      console.log('Token saved to storage');
    } catch (error) {
      console.error('Error saving token:', error);
      this.showStatus('Failed to save token', 'error');
    } finally {
      this.setButtonLoading(this.elements.saveTokenButton, false);
    }
  }

  async startExport() {
    if (this.isExporting) {
      this.showStatus('Export already in progress...', 'info');
      return;
    }

    // Validation
    const token = this.elements.tokenInput.value.trim();
    const startDate = this.elements.startDateInput.value;
    const endDate = this.elements.endDateInput.value;

    if (!token) {
      this.showStatus('Please enter your Discord token first', 'error');
      return;
    }

    if (!startDate || !endDate) {
      this.showStatus('Please select both start and end dates', 'error');
      return;
    }

    if (!this.validateDates()) {
      return;
    }

    this.isExporting = true;
    this.setButtonLoading(this.elements.exportButton, true);
    this.showStatus('Starting export process...', 'info');

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error('No active tab found');
      }

      const activeTab = tabs[0];
      if (!this.isDiscordUrl(activeTab.url)) {
        throw new Error('Please navigate to a Discord channel first');
      }

      const channelMatch = activeTab.url.match(/channels\/([@\w]+)\/(\d+)/);
      if (!channelMatch || !channelMatch[2]) {
        throw new Error('Could not determine channel ID from URL');
      }

      const channelId = channelMatch[2];
      console.log(`Starting export for channel: ${channelId}`);

      // Inject content script and start export
      await this.injectContentScript(activeTab.id);
      const result = await this.sendExportMessage(activeTab.id, {
        token,
        channelId,
        startDate,
        endDate
      });

      this.handleExportResult(result);

    } catch (error) {
      console.error('Export error:', error);
      this.showStatus(`Export failed: ${error.message}`, 'error');
    } finally {
      this.isExporting = false;
      this.setButtonLoading(this.elements.exportButton, false);
    }
  }

  async injectContentScript(tabId) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript(
        {
          target: { tabId },
          files: ['content.js']
        },
        (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to inject script: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  async sendExportMessage(tabId, exportData) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          action: 'exportChatAPI',
          ...exportData
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Communication failed: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  handleExportResult(result) {
    if (!result) {
      this.showStatus('Export started - check the Discord tab for progress', 'info');
      return;
    }

    switch (result.status) {
      case 'success':
        this.showStatus(`✅ Export complete! ${result.count} messages exported`, 'success');
        break;
      case 'no_messages':
        this.showStatus('No messages found in the specified date range', 'warning');
        break;
      case 'error':
        this.showStatus(`Export failed: ${result.message}`, 'error');
        break;
      default:
        this.showStatus('Export process initiated', 'info');
    }
  }

  // Helper methods
  isDiscordUrl(url) {
    return url && (url.includes('discord.com/channels/') || url.includes('discord.com/dms'));
  }

  extractChannelName(title) {
    const match = title.match(/#([\w-]+)/);
    return match ? `#${match[1]}` : 'Unknown Channel';
  }

  setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.dataset.originalText = button.textContent;
      button.textContent = 'Loading...';
      button.classList.add('loading');
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
      button.classList.remove('loading');
    }
  }

  showStatus(message, type = 'info') {
    this.elements.statusDiv.textContent = message;
    this.elements.statusDiv.className = `status ${type}`;
    
    // Auto-hide success/info messages after 5 seconds
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (this.elements.statusDiv.textContent === message) {
          this.elements.statusDiv.textContent = '';
          this.elements.statusDiv.className = 'status';
        }
      }, 5000);
    }
  }
}

// Initialize the UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DiscordExporterUI();
});
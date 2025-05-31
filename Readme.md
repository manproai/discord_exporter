# Discord Chat Exporter

A Chrome extension that exports Discord chat messages from channels to CSV files. Extract conversation history with timestamps, user information, message content, attachments, embeds, and reactions.

<img width="394" alt="image" src="https://github.com/user-attachments/assets/b0fb1f55-7d28-4b98-bd39-c4695cd0b64b" />
<img width="398" alt="image" src="https://github.com/user-attachments/assets/6fd33656-aecd-4af3-9a73-5be4a52e8bd8" />



## ✨ Features

- **Easy Export**: Export any Discord channel messages to CSV format
- **Date Range Selection**: Choose specific time periods for export  
- **Comprehensive Data**: Includes timestamps, usernames, message content, attachments, embeds, and reactions
- **Progress Tracking**: Real-time progress indicator during export
- **Smart Pagination**: Automatically handles Discord's API limits
- **Rate Limit Handling**: Built-in protection against API rate limits
- **Clean CSV Output**: Properly formatted CSV with UTF-8 BOM for Excel compatibility

## 📋 Requirements

- Google Chrome browser (or Chromium-based browser)
- Discord account with access to the channels you want to export
- Your Discord user token (see instructions below)

## 🚀 Installation

### Method 1: Manual Installation (Recommended)

1. **Download the Extension**
   - Clone or download this repository to your computer
   - Extract the files if downloaded as ZIP

2. **Enable Developer Mode in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" in the top right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Select the folder containing the extension files
   - The Discord Chat Exporter icon should appear in your toolbar

## 🔑 Getting Your Discord Token

**⚠️ Important Security Notice**: Using user tokens is against Discord's Terms of Service. Use this tool responsibly and at your own risk. Never share your token with others.

### Steps to Get Your Token:

1. **Open Discord in Chrome**
   - Go to [discord.com](https://discord.com) and log in
   - Navigate to any server or channel

2. **Open Developer Tools**
   - Press `F12` or right-click and select "Inspect"
   - This opens Chrome's Developer Tools

3. **Find Your Token**
   - Click on the **"Application"** tab (or "Storage" in some versions)
   - In the left sidebar, expand **"Local Storage"**
   - Click on **"https://discord.com"**
   - Look for a key named **"token"** in the list
   - Double-click the value to select it, then copy it

4. **Save the Token**
   - Paste the token into the extension popup
   - Click "Save Token" to store it locally

## 📖 How to Use

### Step 1: Navigate to Discord Channel
- Open Discord in Chrome
- Go to the specific channel you want to export
- Make sure you're viewing the channel (not just the server)

### Step 2: Open the Extension
- Click the Discord Chat Exporter icon in your Chrome toolbar
- The extension will automatically detect the current channel

### Step 3: Configure Export Settings
- **Enter your Discord token** (if not already saved)
- **Select date range**: Choose start and end dates for the messages you want
- Default range is set to the last 7 days

### Step 4: Start Export
- Click "🚀 Start Export" button
- A progress indicator will show the export status
- Keep the Discord tab active during export

### Step 5: Download Complete
- The CSV file will automatically download when complete
- File name format: `DiscordExport_[ChannelName]_[StartDate]_to_[EndDate].csv`

## 📊 CSV Output Format

The exported CSV contains the following columns:

| Column | Description |
|--------|-------------|
| **Timestamp (ISO)** | Message timestamp in ISO format |
| **MessageID** | Unique Discord message ID |
| **AuthorID** | User ID of message author |
| **AuthorUsername** | Discord username |
| **AuthorDisplayName** | Display name (nickname or global name) |
| **MessageContent** | Text content of the message |
| **AttachmentsURL** | URLs of any attached files |
| **Embeds** | Information about embedded content |
| **Reactions** | Emoji reactions and counts |

## 🛠️ Troubleshooting

### Common Issues

**"Invalid token" error**
- Double-check you copied the entire token value
- Make sure you're logged into Discord
- Try refreshing Discord and getting a new token

**"Access forbidden" error**  
- Verify you have permission to view the channel
- Some channels may require specific roles

**Export stops or fails**
- Large date ranges may hit rate limits
- Try exporting smaller time periods
- Keep the Discord tab active during export

**CSV not opening correctly in Excel**
- The file uses UTF-8 encoding with BOM for proper Excel compatibility
- Try opening with "Open with encoding" option in Excel

### Rate Limiting
- The extension automatically handles Discord's rate limits
- For large exports, be patient as it will pause when needed
- Rate limits reset after a short wait period

## ⚡ Performance Tips

- **Smaller date ranges** export faster and are more reliable
- **Keep Discord tab active** during export to prevent interruptions  
- **Close other Discord tabs** to avoid potential conflicts
- **Stable internet connection** prevents timeouts

## 🔒 Privacy & Security

- **Your token stays local**: Stored only in your browser's local storage
- **Direct API calls**: Extension communicates directly with Discord's API
- **No data collection**: This extension doesn't collect or transmit your data anywhere
- **Open source**: All code is available for review

## 📝 Limitations

- **User tokens only**: Currently supports user tokens (against Discord ToS)
- **Text channels**: Optimized for server text channels
- **Chrome only**: Designed for Chrome/Chromium browsers
- **Rate limits**: Large exports may take time due to API limitations

## 🤝 Contributing

This is an open source project! Feel free to:
- Report bugs by creating GitHub issues
- Suggest new features
- Submit pull requests with improvements
- Help improve documentation

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the browser console (F12) for error messages
3. Create an issue on GitHub with details about the problem

---

This project is licensed under the MIT License.

**Happy exporting! 🎉**

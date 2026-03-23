# AGENTS

Configuration for OpenClaw agent behavior.

## Available Commands

- `/start` - Begin conversation with the bot
- `/help` - Display available commands and usage
- `/settings` - View and modify bot settings
- `/status` - Check bot status and usage
- `/reset` - Reset conversation context

## Message Handling

- Respond to all direct messages
- Maintain conversation context within sessions
- Handle media attachments appropriately
- Process commands with priority

## Behavior Settings

### Response Mode
- Default: Immediate response
- Max response time: 30 seconds
- Retry on failure: 3 attempts

### Context Management
- Session duration: 24 hours
- Max context messages: 50
- Memory persistence: Enabled

### Rate Limiting
- Max messages per minute: 20
- Cooldown on limit: 60 seconds

## Integration Settings

### Telegram
- Parse mode: Markdown
- Disable web preview: false
- Disable notification: false

### AI Provider
- Temperature: 0.7
- Max tokens: 4096
- Stop sequences: none

## Error Handling

- Log all errors to monitoring
- Send user-friendly error messages
- Retry transient failures
- Escalate persistent issues

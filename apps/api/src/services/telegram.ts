import { config } from "../config/index.js";
import { logger } from "./logger.js";

interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups: boolean;
  can_read_all_group_messages: boolean;
  supports_inline_queries: boolean;
}

interface TelegramResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export class TelegramService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = config.telegram.apiUrl;
  }

  private async request<T>(
    botToken: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.apiUrl}/bot${botToken}/${method}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: params ? JSON.stringify(params) : undefined,
    });

    const data = await response.json() as TelegramResponse<T>;

    if (!data.ok) {
      throw new Error(data.description || "Telegram API error");
    }

    return data.result as T;
  }

  async getBotInfo(botToken: string): Promise<TelegramBotInfo> {
    try {
      const info = await this.request<TelegramBotInfo>(botToken, "getMe");
      logger.info("Got Telegram bot info", { username: info.username });
      return info;
    } catch (error) {
      logger.error("Failed to get bot info", { error });
      throw error;
    }
  }

  async setWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
    try {
      await this.request(botToken, "setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message", "callback_query"],
      });
      logger.info("Set Telegram webhook", { webhookUrl });
      return true;
    } catch (error) {
      logger.error("Failed to set webhook", { error });
      throw error;
    }
  }

  async deleteWebhook(botToken: string): Promise<boolean> {
    try {
      await this.request(botToken, "deleteWebhook");
      logger.info("Deleted Telegram webhook");
      return true;
    } catch (error) {
      logger.error("Failed to delete webhook", { error });
      throw error;
    }
  }

  async sendMessage(
    botToken: string,
    chatId: number | string,
    text: string
  ): Promise<void> {
    try {
      await this.request(botToken, "sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      });
    } catch (error) {
      logger.error("Failed to send message", { error, chatId });
      throw error;
    }
  }
}

export const telegramService = new TelegramService();

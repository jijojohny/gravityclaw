const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${API_URL}/api${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // Health check
  async health() {
    return this.get<{ status: string }>("/health");
  }

  // Deploy
  async deploy(config: {
    model: string;
    telegramToken: string;
    personality: string;
    customSoul?: string;
  }) {
    return this.post<{
      instanceId: string;
      telegramBotUsername: string;
      telegramBotUrl: string;
    }>("/deploy", config);
  }

  // Get deployment status
  async getDeploymentStatus(instanceId: string) {
    return this.get<{
      status: string;
      progress: number;
      message: string;
      telegramBotUrl?: string;
    }>(`/deploy/${instanceId}/status`);
  }

  // Instances
  async getInstances() {
    return this.get<{
      instances: Array<{
        id: string;
        name: string;
        model: string;
        personality: string;
        telegramBotUsername: string;
        status: string;
        messagesCount: number;
        lastActiveAt: string;
        createdAt: string;
      }>;
    }>("/instances");
  }

  async getInstance(id: string) {
    return this.get<{
      instance: {
        id: string;
        name: string;
        model: string;
        personality: string;
        telegramBotUsername: string;
        status: string;
        messagesCount: number;
        lastActiveAt: string;
        createdAt: string;
      };
    }>(`/instances/${id}`);
  }

  async deleteInstance(id: string) {
    return this.delete<{ message: string }>(`/instances/${id}`);
  }

  async restartInstance(id: string) {
    return this.post<{ message: string }>(`/instances/${id}/restart`);
  }
}

export const api = new ApiClient();

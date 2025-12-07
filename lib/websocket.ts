/**
 * WebSocket client for real-time chat with backend
 */

export interface ChatMessage {
  type: 'user_message' | 'bot_message' | 'agent_switch' | 'error';
  content: string;
  agent?: string;
  metadata?: {
    stage?: string;
    intent?: string;
    [key: string]: any;
  };
}

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private customerId: string;
  private onMessageCallback: ((message: ChatMessage) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(customerId: string) {
    this.customerId = customerId;
  }

  connect() {
    const wsUrl = `${process.env.NEXT_PUBLIC_API_URL?.replace('http', 'ws')}/ws/chat/${this.customerId}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message: ChatMessage = JSON.parse(event.data);
        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (this.onErrorCallback) {
        this.onErrorCallback('Connection error occurred');
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    } else {
      if (this.onErrorCallback) {
        this.onErrorCallback('Unable to connect to chat server');
      }
    }
  }

  sendMessage(content: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ content }));
    } else {
      console.error('WebSocket is not connected');
      if (this.onErrorCallback) {
        this.onErrorCallback('Not connected to chat server');
      }
    }
  }

  onMessage(callback: (message: ChatMessage) => void) {
    this.onMessageCallback = callback;
  }

  onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

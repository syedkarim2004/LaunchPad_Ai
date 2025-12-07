/**
 * Custom hook for managing chat with backend WebSocket
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ChatWebSocket, ChatMessage } from '@/lib/websocket';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  agentType?: 'master' | 'sales' | 'verification' | 'underwriting' | 'sanction';
}

export function useChat() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<string>('master');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<ChatWebSocket | null>(null);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (session?.user?.id) {
      const ws = new ChatWebSocket(session.user.id);
      
      ws.onMessage((message: ChatMessage) => {
        setIsTyping(false);
        
        if (message.type === 'bot_message') {
          const botMessage: Message = {
            id: Date.now().toString(),
            text: message.content,
            sender: 'bot',
            timestamp: new Date(),
            agentType: message.agent as any || 'master'
          };
          
          setMessages(prev => [...prev, botMessage]);
          setCurrentAgent(message.agent || 'master');
        } else if (message.type === 'error') {
          setError(message.content);
          setIsTyping(false);
        }
      });

      ws.onError((errorMsg: string) => {
        setError(errorMsg);
        setIsConnected(false);
      });

      ws.connect();
      wsRef.current = ws;
      setIsConnected(true);

      return () => {
        ws.disconnect();
      };
    }
  }, [session?.user?.id]);

  const sendMessage = useCallback((text: string) => {
    if (!wsRef.current || !isConnected) {
      setError('Not connected to chat server');
      return;
    }

    // Add user message to UI
    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    // Send to backend
    wsRef.current.sendMessage(text);
  }, [isConnected]);

  return {
    messages,
    isTyping,
    currentAgent,
    isConnected,
    error,
    sendMessage,
    clearError: () => setError(null)
  };
}

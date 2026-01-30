'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useTheme } from './ThemeProvider';
import { 
  Send, 
  Paperclip, 
  Bot, 
  User, 
  CheckCircle2, 
  Shield, 
  FileText,
  Sparkles,
  ArrowLeft,
  MoreHorizontal,
  Mic,
  Plus,
  Search,
  Link2,
  Users,
  Clock,
  ChevronDown,
  Zap,
  Calculator,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  agentType?: 'master' | 'sales' | 'verification' | 'underwriting' | 'sanction' | 'document';
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatWidgetProps {
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  initialMessage?: string;
}

const agentInfo = {
  master: { name: 'LaunchPad AI', color: 'from-emerald-400 to-teal-500', icon: Bot },
  sales: { name: 'Business Guide', color: 'from-green-400 to-emerald-500', icon: Sparkles },
  verification: { name: 'Compliance Agent', color: 'from-purple-400 to-violet-500', icon: Shield },
  underwriting: { name: 'Platform Agent', color: 'from-blue-400 to-indigo-500', icon: FileText },
  sanction: { name: 'Registration Agent', color: 'from-teal-400 to-cyan-500', icon: CheckCircle2 },
  document: { name: 'Document Agent', color: 'from-pink-400 to-rose-500', icon: FileText },
} as const;

const quickReplies = [
  "I want to start a business",
  "Check my compliance requirements",
  "How to register on Amazon?",
  "What licenses do I need?"
];

const featureCards = [
  {
    icon: CreditCard,
    iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
    title: 'Register your business with AI-powered step-by-step guidance',
    subtitle: 'Register Business',
    color: 'text-emerald-600'
  },
  {
    icon: Calculator,
    iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    title: 'Check compliance requirements, licenses, and filings for your business type',
    subtitle: 'Compliance Check',
    color: 'text-blue-600'
  },
  {
    icon: TrendingUp,
    iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
    title: 'Get listed on e-commerce platforms like Amazon, Flipkart, and more',
    subtitle: 'Platform Onboarding',
    color: 'text-green-600'
  }
];

const actionButtons = [
  { icon: Zap, label: 'Start Business', color: 'from-purple-500 to-indigo-500' },
  { icon: Calculator, label: 'Check Compliance', color: 'from-blue-500 to-cyan-500' },
  { icon: Search, label: 'Find Licenses', color: 'from-green-500 to-emerald-500' },
  { icon: Shield, label: 'GST Registration', color: 'from-orange-500 to-amber-500' }
];

export default function ChatWidget({ isExpanded, onExpand, onCollapse, initialMessage }: ChatWidgetProps) {
  const { data: session, status } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [currentAgent, setCurrentAgent] = useState<keyof typeof agentInfo>('master');
  const [showWelcome, setShowWelcome] = useState(true);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<'aadhaar' | 'pan' | 'salary_slip' | 'bank_statement'>('aadhaar');
  const [customerId, setCustomerId] = useState<string>('guest');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isConnected, setIsConnected] = useState(true); // Always connected for REST API
  const [isTyping, setIsTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      setChatHistory(parsed.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      })));
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
    }
  }, [chatHistory]);

  // Create new chat session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setChatHistory(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setShowWelcome(true);
  };

  // Load a chat session
  const loadSession = (sessionId: string) => {
    const session = chatHistory.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      setShowWelcome(session.messages.length === 0);
    }
  };

  // Update current session with new messages
  const updateCurrentSession = (newMessages: Message[]) => {
    if (!currentSessionId) {
      // Create new session if none exists
      const firstUserMessage = newMessages.find(m => m.sender === 'user');
      const title = firstUserMessage ? firstUserMessage.text.slice(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '') : 'New Chat';
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title,
        messages: newMessages,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setChatHistory(prev => [newSession, ...prev]);
      setCurrentSessionId(newSession.id);
    } else {
      setChatHistory(prev => prev.map(session => {
        if (session.id === currentSessionId) {
          const firstUserMessage = newMessages.find(m => m.sender === 'user');
          const title = firstUserMessage ? firstUserMessage.text.slice(0, 30) + (firstUserMessage.text.length > 30 ? '...' : '') : session.title;
          return {
            ...session,
            title,
            messages: newMessages,
            updatedAt: new Date()
          };
        }
        return session;
      }));
    }
  };

  // Delete a chat session
  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
      setShowWelcome(true);
    }
  };

  // Update session when messages change
  useEffect(() => {
    if (messages.length > 0) {
      updateCurrentSession(messages);
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    if (initialMessage && isExpanded && messages.length === 1) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: initialMessage,
        sender: 'user',
        timestamp: new Date(),
        status: 'sent'
      };
      setMessages(prev => [...prev, newMessage]);
      simulateBotResponse(initialMessage);
    }
  }, [initialMessage, isExpanded]);

  // Setup user ID for REST API
  useEffect(() => {
    // For guests, use "guest" as the customer ID
    // For authenticated users, use their email
    const currentCustomerId = status === 'authenticated' && session?.user?.email
      ? encodeURIComponent(session.user.email)
      : 'guest';
    
    setCustomerId(currentCustomerId);
  }, [session, status]);

  const simulateBotResponse = async (userMessage: string) => {
    setIsTyping(true);

    try {
      // Send message to REST API backend
      const response = await fetch('http://localhost:5000/api/chat/simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': customerId
        },
        body: JSON.stringify({
          message: userMessage
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newMessage: Message = {
          id: Date.now().toString(),
          text: data.data?.message || data.message || 'Sorry, I had trouble processing your request.',
          sender: 'bot',
          timestamp: new Date(),
          agentType: data.data?.agent_used || data.agent_used || 'master'
        };
        setMessages(prev => [...prev, newMessage]);
        const incomingAgent = (data.data?.agent_used || data.agent_used as string) || 'master';
        const safeAgent: keyof typeof agentInfo =
          (incomingAgent in agentInfo ? incomingAgent : 'master') as keyof typeof agentInfo;
        setCurrentAgent(safeAgent);
        setIsTyping(false);
        return;
      } else {
        const errorData = await response.json();
        console.error('Chat API error:', errorData);
        throw new Error(`API Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error calling chat API:', error);
    }

    // Fallback: show error message instead of hardcoded responses
    setIsTyping(false);
    const errorMessage: Message = {
      id: Date.now().toString(),
      text: 'Sorry, I\'m having trouble connecting to the AI service right now. Please try again in a moment.',
      sender: 'bot',
      timestamp: new Date(),
      agentType: 'master'
    };
    setMessages(prev => [...prev, errorMessage]);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    // Switch from welcome to chat mode
    if (showWelcome) {
      setShowWelcome(false);
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newMessage]);
    const messageToSend = inputValue;
    setInputValue('');

    if (!isExpanded) {
      onExpand();
    }

    simulateBotResponse(messageToSend);
  };

  const handleFeatureClick = (subtitle: string) => {
    setShowWelcome(false);
    const messageMap: { [key: string]: string } = {
      'Register Business': 'I want to register my business',
      'Compliance Check': 'Help me check my compliance requirements',
      'Platform Onboarding': 'I want to get listed on e-commerce platforms'
    };
    const message = messageMap[subtitle] || subtitle;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };
    setMessages([newMessage]);
    simulateBotResponse(message);
  };

  const handleActionClick = (label: string) => {
    setShowWelcome(false);
    const messageMap: { [key: string]: string } = {
      'Start Business': 'I want to start a new business',
      'Check Compliance': 'Help me check compliance requirements for my business',
      'Find Licenses': 'What licenses do I need for my business?',
      'GST Registration': 'I want to register for GST'
    };
    const message = messageMap[label] || label;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      status: 'sent'
    };
    setMessages([newMessage]);
    simulateBotResponse(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (reply: string) => {
    setInputValue(reply);
    handleSend();
  };

  const handlePlusClick = () => {
    // Toggle upload menu - works for both logged in and guest users
    setShowUploadMenu((prev) => !prev);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Use the selected document type from the menu
      formData.append('document_type', uploadDocType);
      // Use email if logged in, otherwise use 'guest' identifier
      formData.append('customer_id', session?.user?.email || customerId);

      const response = await fetch('http://localhost:5000/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const confirmation: Message = {
          id: Date.now().toString(),
          text: data.message || 'Document uploaded successfully. ✅',
          sender: 'bot',
          timestamp: new Date(),
          agentType: 'document',
        };
        setMessages(prev => [...prev, confirmation]);
      } else {
        const errorText = await response.text();
        const errorMsg: Message = {
          id: Date.now().toString(),
          text: 'Failed to upload document. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
          agentType: 'document',
        };
        console.error('Upload error:', errorText);
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('Upload exception:', err);
    } finally {
      // Reset the input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUploadMenu(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Very small markdown-style link renderer: turns [label](url) into <a href="url">label</a>
  const renderMessageText = (text: string) => {
    const parts: React.ReactNode[] = [];
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const label = match[1];
      let url = match[2];

      // If backend sends a relative /uploads path or a localhost:3000/uploads URL,
      // rewrite it to point to the backend (port 5000) which actually serves the files.
      if (url.startsWith('/uploads')) {
        url = `http://localhost:5000${url}`;
      } else if (url.startsWith('http://localhost:3000/uploads') || url.startsWith('https://localhost:3000/uploads')) {
        url = url.replace('localhost:3000', 'localhost:5000');
      }
      parts.push(
        <a
          key={parts.length}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {label}
        </a>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

  const safeCurrentAgent: keyof typeof agentInfo =
    currentAgent in agentInfo ? currentAgent : 'master';
  const CurrentAgentIcon = agentInfo[safeCurrentAgent].icon;

  return (
    <AnimatePresence mode="wait">
      {isExpanded ? (
        <motion.div
          key="expanded"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex"
        >
          {/* Chat History Sidebar */}
          <motion.aside
            initial={{ width: sidebarOpen ? 280 : 0 }}
            animate={{ width: sidebarOpen ? 280 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-200/60 dark:border-gray-700/60 flex flex-col overflow-hidden relative shadow-sm"
          >
            {/* Sidebar Content */}
            <div className={`flex flex-col h-full w-[280px] ${sidebarOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
              {/* Sidebar Header */}
              <div className="p-4">
                <button
                  onClick={createNewSession}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 rounded-xl text-white text-sm font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  New Chat
                </button>
              </div>

              {/* Chat History List */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-3">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Chats</span>
                </div>
                {chatHistory.length === 0 ? (
                  <div className="px-5 py-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                      <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No chat history yet</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start a conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-1 px-3">
                    {chatHistory.map((chat) => (
                      <div
                        key={chat.id}
                        onClick={() => loadSession(chat.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && loadSession(chat.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left group transition-all cursor-pointer ${
                          currentSessionId === chat.id
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                        }`}
                      >
                        <MessageSquare className={`w-4 h-4 flex-shrink-0 ${currentSessionId === chat.id ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        <span className="flex-1 text-sm truncate">{chat.title}</span>
                        <button
                          onClick={(e) => deleteSession(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={onCollapse}
                  className="flex items-center gap-2 px-3 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Home</span>
                </button>
                
                {/* Collapse Button - Bottom Right */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.aside>

          {/* Sidebar Expand Button (shown when sidebar is closed) */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed left-4 bottom-4 w-12 h-12 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-lg z-50 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 relative overflow-hidden">
            {/* Gradient orbs */}
            <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-purple-200/40 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-amber-100/40 to-orange-100/40 dark:from-amber-900/20 dark:to-orange-900/20 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-6 py-4 flex items-center justify-between relative z-10 border-b border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <button
                  onClick={createNewSession}
                  className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Plus className="w-5 h-5 text-white" />
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">New Chat</span>
              </div>
              
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">LaunchPad Copilot</span>
              
              <div className="flex items-center gap-3">
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors"
                  title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
                
                {status === 'authenticated' && session?.user ? (
                  <>
                    <div className="flex items-center gap-2">
                      {session.user.image && (
                        <img 
                          src={session.user.image} 
                          alt={session.user.name || 'User'} 
                          className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">{session.user.name}</span>
                    </div>
                    <button 
                      onClick={() => signOut()}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded-full flex items-center gap-2 hover:bg-red-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="hidden sm:inline">Logout</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => signIn('google')}
                    className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded-full flex items-center gap-2 hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Login with Google
                  </button>
                )}
              </div>
            </motion.header>

            {showWelcome ? (
              /* Welcome Screen */
              <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center max-w-3xl"
                >
                  {/* Greeting */}
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                    Hi there, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Ready to</span>
                  </h1>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-12">
                    Launch Your Business?
                  </h1>

                  {/* Robot mascot with speech bubble */}
                  <div className="absolute right-12 top-32 hidden lg:block">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="relative"
                    >
                      <div className="absolute -top-16 -left-24 bg-white dark:bg-gray-800 rounded-2xl px-4 py-2 shadow-lg">
                        <p className="text-sm text-gray-700 dark:text-gray-300">Hey there! 👋</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">Starting a business?</p>
                      </div>
                      <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl">
                        <Bot className="w-16 h-16 text-white" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid md:grid-cols-3 gap-4 mb-12">
                    {featureCards.map((card, index) => (
                      <motion.button
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        onClick={() => handleFeatureClick(card.subtitle)}
                        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 text-left hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 group"
                      >
                        <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                          <card.icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">{card.title}</p>
                        <span className={`text-xs font-medium ${card.color}`}>{card.subtitle}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Bottom Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="w-full max-w-4xl px-4"
                >
                  {/* Pro Plan Banner */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Sparkles className="w-4 h-4" />
                      <span>Unlock more with Pro Plan</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <Settings className="w-4 h-4" />
                      <span>Powered by Assistant v2.6</span>
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-3">
                    {/* Hidden file input for document uploads via + button */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div
                        className="relative"
                      >
                        <button
                          type="button"
                          onClick={handlePlusClick}
                          className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        {showUploadMenu && (
                          <div className="absolute left-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('aadhaar');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Upload ID Proof
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('pan');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Upload PAN Card
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('salary_slip');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Upload Address Proof
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('bank_statement');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Upload Business Document
                            </button>
                          </div>
                        )}
                      </div>
                      <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder='Example: "I want to start a food delivery business"'
                        className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                      />
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSend}
                        className="p-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                      >
                        <Send className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                      </motion.button>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 px-2 pb-2 overflow-x-auto">
                      {actionButtons.map((btn, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleActionClick(btn.label)}
                          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${btn.color} text-white rounded-full text-sm font-medium whitespace-nowrap shadow-md hover:shadow-lg transition-shadow`}
                        >
                          <btn.icon className="w-4 h-4" />
                          {btn.label}
                        </motion.button>
                      ))}
                      <button className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Chat Mode */
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative z-10">
                  <div className="max-w-4xl mx-auto space-y-6">
                    {messages.map((message, index) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index === messages.length - 1 ? 0.1 : 0 }}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`flex items-start gap-3 max-w-[80%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                          {message.sender === 'bot' && (() => {
                            const rawAgent = message.agentType || 'master';
                            const safeAgent: keyof typeof agentInfo =
                              rawAgent in agentInfo ? (rawAgent as keyof typeof agentInfo) : 'master';
                            const AgentIcon = agentInfo[safeAgent].icon;
                            const agentColor = agentInfo[safeAgent].color;
                            return (
                              <div className={`w-10 h-10 bg-gradient-to-br ${agentColor} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                <AgentIcon className="w-5 h-5 text-white" />
                              </div>
                            );
                          })()}
                          <div
                            className={`${
                              message.sender === 'user'
                                ? 'bg-gray-900 text-white rounded-2xl rounded-tr-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm shadow-lg border border-gray-200 dark:border-gray-700'
                            } px-5 py-4`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                              {message.sender === 'bot' ? renderMessageText(message.text) : message.text}
                            </p>
                            <span className={`text-xs mt-2 block ${message.sender === 'user' ? 'text-gray-400' : 'text-gray-400 dark:text-gray-500'}`}>
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          {message.sender === 'user' && (
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                              <User className="w-5 h-5 text-white" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}

                    {/* Typing Indicator */}
                    <AnimatePresence>
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`w-10 h-10 bg-gradient-to-br ${agentInfo[currentAgent].color} rounded-xl flex items-center justify-center shadow-lg`}>
                            <CurrentAgentIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl rounded-tl-sm shadow-lg border border-gray-100 dark:border-gray-700 px-5 py-4">
                            <div className="flex gap-1.5">
                              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Quick Replies */}
                {messages.length <= 2 && (
                  <div className="px-4 sm:px-8 py-3 relative z-10">
                    <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-2">
                      {quickReplies.map((reply, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setInputValue(reply);
                            setTimeout(() => handleSend(), 100);
                          }}
                          className="flex-shrink-0 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-white dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-700 shadow-sm"
                        >
                          {reply}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="px-4 sm:px-8 py-4 relative z-10">
                  <div className="max-w-4xl mx-auto">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-3">
                      {/* Hidden file input for document uploads in chat mode */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <div className="flex items-center gap-3 px-4 py-2">
                        <button
                          type="button"
                          onClick={handlePlusClick}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors relative"
                        >
                          <Paperclip className="w-5 h-5" />
                          {showUploadMenu && (
                            <div className="absolute left-0 bottom-full mb-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('aadhaar');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Upload ID Proof
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('pan');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Upload PAN Card
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('salary_slip');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Upload Address Proof
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('bank_statement');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                Upload Business Document
                              </button>
                            </div>
                          )}
                        </button>
                        <input
                          ref={inputRef}
                          type="text"
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder="Type your message..."
                          className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                        />
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <Mic className="w-5 h-5" />
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSend}
                          disabled={!inputValue.trim()}
                          className={`p-2.5 rounded-xl transition-all ${
                            inputValue.trim() 
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-md' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <Send className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

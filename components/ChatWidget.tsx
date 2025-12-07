'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, signIn, signOut } from 'next-auth/react';
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
  LogIn
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  agentType?: 'master' | 'sales' | 'verification' | 'underwriting' | 'sanction' | 'document';
}

interface ChatWidgetProps {
  isExpanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  initialMessage?: string;
}

const agentInfo = {
  master: { name: 'FinanceAI', color: 'from-amber-400 to-orange-500', icon: Bot },
  sales: { name: 'Sales Agent', color: 'from-green-400 to-emerald-500', icon: Sparkles },
  verification: { name: 'Verification Agent', color: 'from-purple-400 to-violet-500', icon: Shield },
  underwriting: { name: 'Underwriting Agent', color: 'from-blue-400 to-indigo-500', icon: FileText },
  sanction: { name: 'Sanction Agent', color: 'from-teal-400 to-cyan-500', icon: CheckCircle2 },
  document: { name: 'Document Agent', color: 'from-pink-400 to-rose-500', icon: FileText },
} as const;

const quickReplies = [
  "I want a personal loan",
  "Check my eligibility",
  "What are the interest rates?",
  "View my pre-approved offers"
];

const featureCards = [
  {
    icon: CreditCard,
    iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500',
    title: 'Apply for a personal loan instantly with AI-powered verification',
    subtitle: 'Quick Apply',
    color: 'text-amber-600'
  },
  {
    icon: Calculator,
    iconBg: 'bg-gradient-to-br from-blue-400 to-indigo-500',
    title: 'Calculate your EMI, check eligibility, and compare loan options effortlessly',
    subtitle: 'Loan Calculator',
    color: 'text-blue-600'
  },
  {
    icon: TrendingUp,
    iconBg: 'bg-gradient-to-br from-green-400 to-emerald-500',
    title: 'Track your application status and manage your existing loans',
    subtitle: 'Track & Manage',
    color: 'text-green-600'
  }
];

const actionButtons = [
  { icon: Zap, label: 'Quick Apply', color: 'from-purple-500 to-indigo-500' },
  { icon: Calculator, label: 'EMI Calculator', color: 'from-blue-500 to-cyan-500' },
  { icon: Search, label: 'Check Status', color: 'from-green-500 to-emerald-500' },
  { icon: Shield, label: 'Verify KYC', color: 'from-orange-500 to-amber-500' }
];

export default function ChatWidget({ isExpanded, onExpand, onCollapse, initialMessage }: ChatWidgetProps) {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<keyof typeof agentInfo>('master');
  const [showWelcome, setShowWelcome] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<'aadhaar' | 'pan' | 'salary_slip' | 'bank_statement'>('aadhaar');
  const [customerId, setCustomerId] = useState<string>('guest');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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

  // Connect to backend WebSocket for real agent responses
  useEffect(() => {
    // Connect for both authenticated users and guests
    // For guests, use "guest" as the customer ID
    // For authenticated users, use their email
    const currentCustomerId = status === 'authenticated' && session?.user?.email
      ? encodeURIComponent(session.user.email)
      : 'guest';
    
    setCustomerId(currentCustomerId);
    
    const wsUrl = `ws://localhost:8000/ws/chat/${currentCustomerId}`;
    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('Chat WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'bot_message') {
          const newMessage: Message = {
            id: Date.now().toString(),
            text: data.content,
            sender: 'bot',
            timestamp: new Date(),
            agentType: data.agent as any
          };
          setMessages(prev => [...prev, newMessage]);
          const incomingAgent = (data.agent as string) || 'master';
          const safeAgent: keyof typeof agentInfo =
            (incomingAgent in agentInfo ? incomingAgent : 'master') as keyof typeof agentInfo;
          setCurrentAgent(safeAgent);
          setIsTyping(false);
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    ws.onerror = (event) => {
      console.error('Chat WebSocket error', event);
      setIsConnected(false);
    };

    ws.onclose = () => {
      console.log('Chat WebSocket closed');
      setIsConnected(false);
    };

    return () => {
      ws.close();
      websocketRef.current = null;
      setIsConnected(false);
    };
  }, [session, status]);

  const simulateBotResponse = (userMessage: string) => {
    setIsTyping(true);

    // If WebSocket is connected, send the message to backend and let agents respond
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ content: userMessage }));
      return;
    }

    // Fallback: use existing mock responses (in case backend is down)
    const lowerMessage = userMessage.toLowerCase();
    let responseAgent: keyof typeof agentInfo = 'master';
    let responseText = '';
    let delay = 1500;

    if (lowerMessage.includes('loan') || lowerMessage.includes('interest') || lowerMessage.includes('amount')) {
      responseAgent = 'sales';
      responseText = "Great choice! 🎉 Based on your profile, I can see you're pre-approved for up to ₹5,00,000. We're currently offering:\n\n• Interest rates starting at 10.5% p.a.\n• Flexible tenure from 12 to 60 months\n• Zero processing fee this month!\n\nWhat loan amount are you looking for?";
    } else if (lowerMessage.includes('eligibility') || lowerMessage.includes('check')) {
      responseAgent = 'verification';
      responseText = "Let me verify your details. I can see from our records:\n\n✅ Name: Verified\n✅ Phone: +91 ****7890\n✅ Address: Verified\n✅ KYC Status: Complete\n\nYour profile looks good! Would you like me to check your credit score and pre-approved limit?";
    } else if (lowerMessage.includes('credit') || lowerMessage.includes('score') || lowerMessage.includes('pre-approved')) {
      responseAgent = 'underwriting';
      responseText = "I've fetched your credit details:\n\n📊 Credit Score: 782/900 (Excellent!)\n💰 Pre-approved Limit: ₹5,00,000\n📈 Maximum Eligible: ₹10,00,000\n\nWith your excellent credit score, you qualify for our premium rates! Would you like to proceed with the loan application?";
    } else if (lowerMessage.includes('proceed') || lowerMessage.includes('apply') || lowerMessage.includes('yes')) {
      responseAgent = 'sanction';
      responseText = "Excellent! 🎊 I'm processing your loan application now.\n\n⏳ Verifying documents...\n✅ Credit check passed\n✅ Income verification complete\n✅ Loan approved!\n\nYour sanction letter is being generated. You'll receive it shortly via email and can download it from here.";
      delay = 2500;
    } else {
      responseAgent = 'master';
      responseText = "I'd be happy to help you with that! Our personal loans come with:\n\n• Quick approval in minutes\n• Competitive interest rates\n• Flexible repayment options\n• No hidden charges\n\nWould you like to check your eligibility or explore our pre-approved offers?";
    }

    setCurrentAgent(responseAgent);

    setTimeout(() => {
      setIsTyping(false);
      const newMessage: Message = {
        id: Date.now().toString(),
        text: responseText,
        sender: 'bot',
        timestamp: new Date(),
        agentType: responseAgent
      };
      setMessages(prev => [...prev, newMessage]);
    }, delay);
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
      'Quick Apply': 'I want to apply for a personal loan',
      'Loan Calculator': 'Help me calculate my EMI',
      'Track & Manage': 'I want to check my loan application status'
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
      'Quick Apply': 'I want to apply for a personal loan',
      'EMI Calculator': 'Help me calculate my EMI for a loan',
      'Check Status': 'Check my loan application status',
      'Verify KYC': 'I want to complete my KYC verification'
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

      const response = await fetch('http://localhost:8000/api/documents/upload', {
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
      // rewrite it to point to the backend (port 8000) which actually serves the files.
      if (url.startsWith('/uploads')) {
        url = `http://localhost:8000${url}`;
      } else if (url.startsWith('http://localhost:3000/uploads') || url.startsWith('https://localhost:3000/uploads')) {
        url = url.replace('localhost:3000', 'localhost:8000');
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
          {/* Left Sidebar */}
          <motion.aside
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-16 bg-white/80 backdrop-blur-xl border-r border-gray-200/50 flex flex-col items-center py-4 gap-2"
          >
            <button 
              onClick={onCollapse}
              className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg mb-4"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
            
            <button className="w-10 h-10 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
              <Link2 className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
              <Users className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 transition-colors">
              <Clock className="w-5 h-5" />
            </button>
            
            <div className="flex-1" />
            
            <button 
              onClick={onCollapse}
              className="w-10 h-10 hover:bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </motion.aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 relative overflow-hidden">
            {/* Gradient orbs */}
            <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-purple-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-amber-100/40 to-orange-100/40 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="px-8 py-4 flex items-center justify-between relative z-10"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm text-gray-600">Assistant v2.6</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
              
              <span className="text-sm font-medium text-gray-700">Daily FinanceAI</span>
              
              {status === 'authenticated' && session?.user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {session.user.image && (
                      <img 
                        src={session.user.image} 
                        alt={session.user.name || 'User'} 
                        className="w-8 h-8 rounded-full border-2 border-gray-200"
                      />
                    )}
                    <span className="text-sm font-medium text-gray-700">{session.user.name}</span>
                  </div>
                  <button 
                    onClick={() => signOut()}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-full flex items-center gap-2 hover:bg-red-700 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => signIn('google')}
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-full flex items-center gap-2 hover:bg-gray-800 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login with Google
                </button>
              )}
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
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                    Hi there, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Ready to</span>
                  </h1>
                  <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-12">
                    Get Your Perfect Loan?
                  </h1>

                  {/* Robot mascot with speech bubble */}
                  <div className="absolute right-12 top-32 hidden lg:block">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="relative"
                    >
                      <div className="absolute -top-16 -left-24 bg-white rounded-2xl px-4 py-2 shadow-lg">
                        <p className="text-sm text-gray-700">Hey there! 👋</p>
                        <p className="text-sm text-gray-700">Need a loan?</p>
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
                        className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-left hover:shadow-xl transition-all border border-gray-100 group"
                      >
                        <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                          <card.icon className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed mb-3">{card.title}</p>
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
                  className="w-full max-w-2xl"
                >
                  {/* Pro Plan Banner */}
                  <div className="flex items-center justify-between mb-4 px-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Sparkles className="w-4 h-4" />
                      <span>Unlock more with Pro Plan</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Settings className="w-4 h-4" />
                      <span>Powered by Assistant v2.6</span>
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-2">
                    {/* Hidden file input for document uploads via + button */}
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
                        className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors relative"
                      >
                        <Plus className="w-5 h-5" />
                        {showUploadMenu && (
                          <div className="absolute left-0 bottom-full mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('aadhaar');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Upload Aadhaar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('pan');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Upload PAN
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('salary_slip');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Upload Salary Slip
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadDocType('bank_statement');
                                fileInputRef.current?.click();
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                            >
                              Upload Bank Statement
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
                        placeholder='Example: "I need a personal loan of ₹5 lakhs"'
                        className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                      />
                      <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                        <Mic className="w-5 h-5" />
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSend}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        <Send className="w-4 h-4 text-gray-600" />
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
                      <button className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                        <MoreHorizontal className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Chat Mode */
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto px-8 py-6 relative z-10">
                  <div className="max-w-3xl mx-auto space-y-6">
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
                                : 'bg-white text-gray-900 rounded-2xl rounded-tl-sm shadow-lg border border-gray-200'
                            } px-5 py-4`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-line">
                              {message.sender === 'bot' ? renderMessageText(message.text) : message.text}
                            </p>
                            <span className={`text-xs mt-2 block ${message.sender === 'user' ? 'text-gray-400' : 'text-gray-400'}`}>
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
                          <div className="bg-white/90 backdrop-blur-sm rounded-2xl rounded-tl-sm shadow-lg border border-gray-100 px-5 py-4">
                            <div className="flex gap-1.5">
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
                  <div className="px-8 py-3 relative z-10">
                    <div className="max-w-3xl mx-auto flex gap-2 overflow-x-auto pb-2">
                      {quickReplies.map((reply, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setInputValue(reply);
                            setTimeout(() => handleSend(), 100);
                          }}
                          className="flex-shrink-0 px-4 py-2 bg-white/80 backdrop-blur-sm text-gray-700 rounded-full text-sm font-medium hover:bg-white transition-all border border-gray-200 shadow-sm"
                        >
                          {reply}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="px-8 py-4 relative z-10">
                  <div className="max-w-3xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-lg p-2">
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
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative"
                        >
                          <Paperclip className="w-5 h-5" />
                          {showUploadMenu && (
                            <div className="absolute left-0 bottom-full mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('aadhaar');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Upload Aadhaar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('pan');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Upload PAN
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('salary_slip');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Upload Salary Slip
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setUploadDocType('bank_statement');
                                  fileInputRef.current?.click();
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                Upload Bank Statement
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
                          className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 focus:outline-none"
                        />
                        <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                          <Mic className="w-5 h-5" />
                        </button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleSend}
                          disabled={!inputValue.trim()}
                          className={`p-2.5 rounded-xl transition-all ${
                            inputValue.trim() 
                              ? 'bg-gray-900 text-white shadow-md' 
                              : 'bg-gray-100 text-gray-400'
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

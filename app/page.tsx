'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { 
  Send,
  Plus,
  Cloud,
  Settings,
  Clock,
  FileText,
  Copy,
  Mic,
  Layers,
  Zap,
  Target,
  Shield,
  CheckCircle,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Award,
  Phone,
  Mail,
  MapPin,
  MessageSquare,
  CreditCard,
  Building2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';

// Parallax Section Component
function ParallaxSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 60 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating Card Component with parallax
function FloatingCard({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 40, scale: 0.95 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Parallax scroll for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const chatCardY = useTransform(scrollY, [0, 500], [0, -50]);

  const handleInputFocus = () => {
    setIsChatExpanded(true);
  };

  const handleInputSubmit = () => {
    if (inputValue.trim()) {
      setIsChatExpanded(true);
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-cyan-100/40 via-teal-50/30 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-orange-50/40 via-yellow-50/20 to-transparent rounded-full blur-3xl"></div>
      
      <AnimatePresence mode="wait">
        {!isChatExpanded ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="relative z-10"
          >
            {/* Navigation */}
            <nav className="px-6 lg:px-12 py-4">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full"></div>
                  <span className="text-xl font-semibold text-gray-900">FinanceAI</span>
                </div>
                <div className="hidden md:flex items-center gap-8">
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Products</a>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Solutions</a>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Resources</a>
                  <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors text-sm">Contact us</a>
                </div>
                <div className="flex items-center gap-3">
                  <button className="text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium">
                    Log in
                  </button>
                  <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                    Get started
                  </button>
                </div>
              </div>
            </nav>

            {/* Hero Section */}
            <section className="px-6 lg:px-12 pt-8 pb-16">
              <div className="max-w-7xl mx-auto">
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-center mb-6"
                >
                  <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
                    <div className="flex -space-x-2">
                      <img src="https://randomuser.me/api/portraits/men/32.jpg" className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                      <img src="https://randomuser.me/api/portraits/women/44.jpg" className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                      <img src="https://randomuser.me/api/portraits/men/67.jpg" className="w-6 h-6 rounded-full border-2 border-white" alt="" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">1k+ joined</span>
                  </div>
                </motion.div>

                {/* Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 text-center mb-6 leading-tight tracking-tight"
                >
                  Elevate your Loans,
                  <br />
                  Service and Success.
                </motion.h1>

                {/* CTA Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex justify-center mb-12"
                >
                  <button 
                    onClick={() => setIsChatExpanded(true)}
                    className="bg-gray-900 text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-all hover:shadow-lg"
                  >
                    Schedule a demo
                  </button>
                </motion.div>

                {/* Chat Interface Card */}
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                  className="max-w-4xl mx-auto"
                >
                  <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <div className="flex">
                      {/* Sidebar */}
                      <div className="w-16 bg-gray-50/80 border-r border-gray-100 py-6 flex flex-col items-center gap-4">
                        <button className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <Plus className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <Cloud className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <Settings className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <Copy className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <FileText className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <Clock className="w-5 h-5" />
                        </button>
                        
                        <div className="flex-1"></div>
                        
                        <button className="w-10 h-10 rounded-xl hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
                          <Settings className="w-5 h-5" />
                        </button>
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img src="https://randomuser.me/api/portraits/women/44.jpg" className="w-full h-full object-cover" alt="User" />
                        </div>
                      </div>

                      {/* Main Chat Area */}
                      <div className="flex-1 p-8">
                        {/* Greeting */}
                        <div className="flex items-start gap-4 mb-8">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-200/50">
                            <div className="w-6 h-6 bg-white/30 rounded-full"></div>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">Hi, there!</h2>
                            <p className="text-gray-500">How can I help you today?</p>
                          </div>
                        </div>

                        {/* Feature Cards Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {/* Apply for Loan Card */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsChatExpanded(true)}
                            className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl text-left group hover:shadow-lg transition-all border border-orange-100/50"
                          >
                            <h3 className="font-semibold text-gray-900 mb-1">Apply for Loan</h3>
                            <p className="text-sm text-gray-500 mb-3">Get instant approval for personal loans</p>
                            <div className="flex justify-end">
                              <div className="flex items-center gap-2">
                                <div className="w-10 h-14 bg-gray-800 rounded-lg shadow-lg flex items-center justify-center">
                                  <div className="w-6 h-8 bg-gray-700 rounded"></div>
                                </div>
                                <div className="w-16 h-12 bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center">
                                  <div className="space-y-1">
                                    <div className="w-8 h-1 bg-gray-200 rounded"></div>
                                    <div className="w-6 h-1 bg-gray-200 rounded"></div>
                                    <div className="flex gap-1">
                                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.button>

                          {/* Check Eligibility Card */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsChatExpanded(true)}
                            className="bg-gradient-to-br from-violet-50 to-purple-50 p-5 rounded-2xl text-left group hover:shadow-lg transition-all border border-purple-100/50"
                          >
                            <h3 className="font-semibold text-gray-900 mb-1">Check Eligibility</h3>
                            <p className="text-sm text-gray-500 mb-3">Verify your loan eligibility instantly</p>
                            <div className="flex justify-end items-end gap-2">
                              <span className="text-4xl font-bold text-purple-300">Aa</span>
                              <div className="flex items-center gap-1 mb-2">
                                <div className="w-6 h-6 bg-blue-500 rounded text-white text-xs flex items-center justify-center font-bold">G</div>
                                <span className="text-purple-400 font-medium">文</span>
                              </div>
                            </div>
                          </motion.button>

                          {/* Voice Assistant Card */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsChatExpanded(true)}
                            className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-2xl text-left group hover:shadow-lg transition-all border border-blue-100/50"
                          >
                            <h3 className="font-semibold text-gray-900 mb-1">Voice Assistant</h3>
                            <p className="text-sm text-gray-500 mb-3">Talk to our AI for quick help</p>
                            <div className="flex justify-end items-end">
                              <div className="flex items-end gap-1">
                                {[20, 32, 24, 40, 28, 36, 20].map((h, i) => (
                                  <div key={i} className="w-1.5 bg-blue-200 rounded-full" style={{ height: h }}></div>
                                ))}
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center ml-2 shadow-lg shadow-blue-200">
                                  <Mic className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            </div>
                          </motion.button>

                          {/* Upload Documents Card */}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setIsChatExpanded(true)}
                            className="bg-gradient-to-br from-rose-50 to-pink-50 p-5 rounded-2xl text-left group hover:shadow-lg transition-all border border-rose-100/50"
                          >
                            <h3 className="font-semibold text-gray-900 mb-1">Upload Documents</h3>
                            <p className="text-sm text-gray-500 mb-3">Submit your KYC documents here</p>
                            <div className="flex justify-end">
                              <div className="flex items-end gap-1">
                                <div className="w-12 h-10 rounded-lg overflow-hidden shadow-md">
                                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-cyan-400"></div>
                                </div>
                                <div className="w-10 h-12 rounded-lg overflow-hidden shadow-md -ml-2">
                                  <div className="w-full h-full bg-gradient-to-br from-orange-400 to-amber-400"></div>
                                </div>
                                <div className="w-8 h-8 rounded-lg bg-pink-100 flex items-center justify-center -ml-2 shadow-md border-2 border-white">
                                  <Plus className="w-4 h-4 text-pink-500" />
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        </div>

                        {/* Input Area */}
                        <div className="flex items-center gap-3 bg-gray-50 rounded-full px-5 py-3 border border-gray-100">
                          <span className="text-gray-400">|</span>
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onFocus={handleInputFocus}
                            onKeyPress={(e) => e.key === 'Enter' && handleInputSubmit()}
                            placeholder="Ask me anything..."
                            className="flex-1 bg-transparent text-sm focus:outline-none text-gray-700 placeholder-gray-400"
                          />
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleInputSubmit}
                            className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white"
                          >
                            <Send className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* Bottom Features - Quick Stats */}
            <section className="px-6 lg:px-12 py-12 border-t border-gray-100 bg-white/50">
              <div className="max-w-5xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Layers className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Multi-Agent AI</h3>
                      <p className="text-sm text-gray-500">Multiple specialized AI agents working together for seamless loan processing.</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Target className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">95% Approval Rate</h3>
                      <p className="text-sm text-gray-500">Industry-leading approval rates with intelligent underwriting.</p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Zap className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Instant Decisions</h3>
                      <p className="text-sm text-gray-500">Real-time credit scoring and instant loan decisions.</p>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Technology Section - Lead your AI transformation */}
            <section className="py-24 bg-slate-50">
              <div className="max-w-6xl mx-auto px-6 lg:px-12">
                {/* Section Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-4"
                >
                  <span className="inline-block px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-600">
                    Technology
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-16"
                >
                  Lead your AI transformation
                </motion.h2>

                <div className="grid lg:grid-cols-2 gap-12 items-center">
                  {/* Left - Feature List */}
                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      className="flex items-start gap-4 p-4"
                    >
                      <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                        <Settings className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-gray-600">Natively integrates with your banking platform</p>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 }}
                      className="bg-amber-100 rounded-2xl p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 flex items-center justify-center text-amber-600">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Seamlessly collaborates with your team and support all channels</h4>
                          <p className="text-sm text-gray-600">Functions like a team member, collaborating naturally with your staff.</p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 }}
                      className="flex items-start gap-4 p-4"
                    >
                      <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-gray-600">Flexibly adapts to your workflow and process</p>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 }}
                      className="flex items-start gap-4 p-4"
                    >
                      <div className="w-8 h-8 flex items-center justify-center text-gray-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-gray-600">Automate the full spectrum of loan tasks</p>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right - Chat Preview Card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-3xl shadow-xl p-6 relative"
                  >
                    {/* Email icon */}
                    <div className="absolute -top-4 left-8 w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-2xl flex items-center justify-center shadow-lg">
                      <Mail className="w-8 h-8 text-white" />
                    </div>

                    <div className="mt-8 space-y-4">
                      {/* Chat messages */}
                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <img src="https://randomuser.me/api/portraits/women/44.jpg" className="w-10 h-10 rounded-full" alt="" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900">Priya Sharma</span>
                            <span className="text-xs text-gray-400">10:30</span>
                          </div>
                          <p className="text-sm text-gray-500">Nice to meet you here!</p>
                        </div>
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">3</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <img src="https://randomuser.me/api/portraits/men/32.jpg" className="w-10 h-10 rounded-full" alt="" />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">Rahul Kumar</span>
                          <div className="flex gap-1 mt-1">
                            <div className="w-16 h-2 bg-gray-200 rounded"></div>
                            <div className="w-12 h-2 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                        <img src="https://randomuser.me/api/portraits/women/68.jpg" className="w-10 h-10 rounded-full" alt="" />
                        <div className="flex-1">
                          <span className="font-medium text-gray-400">Amit Patel</span>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp button */}
                    <div className="absolute -bottom-4 right-8 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Omni-channel Section - Bento Grid */}
            <section className="py-24 bg-white">
              <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-4"
                >
                  <span className="inline-block px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600">
                    Service
                  </span>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-4xl md:text-5xl font-bold text-gray-900 text-center mb-4"
                >
                  Omni-channel, any task,
                  <br />multi-language
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-gray-500 text-center max-w-3xl mx-auto mb-16"
                >
                  Assistant offers a human-like service that effortlessly blends in your process, completing nearly any tasks and collaborating with your team within the Agent Platform.
                </motion.p>

                {/* Bento Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Collaborative Intelligence - Large Card - Fixed Layout */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.3 }}
                    className="md:row-span-2 bg-gradient-to-b from-indigo-100 via-purple-50 to-pink-50 rounded-3xl p-6 flex flex-col min-h-[480px] relative overflow-hidden group cursor-pointer"
                  >
                    {/* Floating chat bubbles */}
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-blue-500 text-white text-xs px-4 py-2 rounded-2xl rounded-bl-sm shadow-lg max-w-[220px] mb-4"
                    >
                      I need help with my loan application status
                    </motion.div>
                    
                    {/* Center visual - Agent icons */}
                    <div className="flex-1 flex items-center justify-center relative py-6">
                      <div className="relative">
                        {/* Central AI Hub */}
                        <motion.div 
                          animate={{ scale: [1, 1.05, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl"
                        >
                          <Sparkles className="w-10 h-10 text-white" />
                        </motion.div>
                        
                        {/* Orbiting agent icons */}
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 w-40 h-40 -top-10 -left-10"
                        >
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-green-500" />
                          </div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-500" />
                          </div>
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-500" />
                          </div>
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-orange-500" />
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Response bubble */}
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white text-gray-700 text-xs px-4 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[200px] self-end mb-4"
                    >
                      Your application is approved! Funds will be disbursed shortly.
                    </motion.div>

                    {/* Bottom content - Fixed position */}
                    <div className="mt-auto pt-4 border-t border-white/30">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Collaborative Intelligence</h3>
                      <p className="text-sm text-gray-600 leading-relaxed">Multi-agent AI system where specialized agents work together seamlessly to handle complex loan scenarios.</p>
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-indigo-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  </motion.div>

                  {/* All major languages */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-gray-50 to-slate-100 rounded-3xl p-6 cursor-pointer group hover:shadow-xl transition-shadow"
                  >
                    <div className="flex flex-wrap gap-2 mb-4">
                      <motion.span whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-white rounded-full text-sm border border-gray-200 font-medium shadow-sm">EN</motion.span>
                      <motion.span whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-white rounded-full text-sm border border-gray-200 font-medium shadow-sm">हिं</motion.span>
                      <motion.span whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-amber-100 rounded-full text-sm border border-amber-200 shadow-sm">ES 🇪🇸</motion.span>
                      <motion.span whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-blue-100 rounded-full text-sm border border-blue-200 shadow-sm">🇬🇧</motion.span>
                      <motion.span whileHover={{ scale: 1.1 }} className="px-4 py-2 bg-white rounded-full text-sm border border-gray-200 font-medium shadow-sm">FR</motion.span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Automatically detect</p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">All major languages</h3>
                  </motion.div>

                  {/* Omni channel */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-6 cursor-pointer group hover:shadow-xl transition-shadow"
                  >
                    <motion.div 
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                    >
                      <MessageSquare className="w-7 h-7 text-white" />
                    </motion.div>
                    <div className="flex gap-2 mb-3">
                      <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500">WhatsApp</span>
                      <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500">SMS</span>
                      <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500">Email</span>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Connect everywhere</p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">Omni Channel</h3>
                  </motion.div>

                  {/* Multitasking */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl p-6 cursor-pointer group hover:shadow-xl transition-shadow"
                  >
                    <div className="space-y-2 mb-4">
                      <motion.div 
                        initial={{ x: -10, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-sm shadow-sm"
                      >
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">KYC Verification</span>
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      </motion.div>
                      <motion.div 
                        initial={{ x: -10, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 text-sm shadow-sm"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-gray-700">Credit Assessment</span>
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      </motion.div>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Parallel processing</p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">Multitasking</h3>
                  </motion.div>

                  {/* Credit Score */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.03, y: -5 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 cursor-pointer group hover:shadow-xl transition-shadow"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.1 }}
                      className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
                    >
                      <TrendingUp className="w-7 h-7 text-white" />
                    </motion.div>
                    {/* Mini score visualization */}
                    <div className="flex items-end gap-1 mb-3 h-8">
                      <div className="w-3 bg-orange-200 rounded-t h-3"></div>
                      <div className="w-3 bg-orange-300 rounded-t h-5"></div>
                      <div className="w-3 bg-orange-400 rounded-t h-6"></div>
                      <div className="w-3 bg-orange-500 rounded-t h-8"></div>
                      <div className="w-3 bg-green-500 rounded-t h-7"></div>
                    </div>
                    <p className="text-sm text-gray-400 mb-1">Instant verification</p>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">Credit Score Check</h3>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 bg-white">
              <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <div className="grid lg:grid-cols-2 gap-16">
                  {/* Left - Title */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                  >
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                      Frequently
                      <br />Asked
                      <br />Questions
                    </h2>
                    <p className="text-gray-500 mb-6">Find answers to frequently asked questions.</p>
                    <button className="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                      Contact us
                    </button>
                  </motion.div>

                  {/* Right - FAQ Accordion */}
                  <div className="space-y-4">
                    {[
                      { q: "What documents are required for a personal loan?", a: "You'll need ID proof (Aadhaar/PAN), address proof, income proof (salary slips/ITR), and bank statements for the last 6 months." },
                      { q: "How is the interest rate determined?", a: "Interest rates are determined based on your credit score, income, loan amount, and tenure. Our AI evaluates multiple factors to offer you the best possible rate." },
                      { q: "What is the maximum loan amount I can get?", a: "The maximum loan amount depends on your income, credit score, and existing obligations. Pre-approved customers can get up to 2x their pre-approved limit with additional documentation." },
                      { q: "How long does the approval process take?", a: "With our AI-powered system, most loans are approved within 2 minutes. Disbursement happens within 24 hours of approval." }
                    ].map((faq, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-50 rounded-2xl p-5 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900 pr-4">{faq.q}</h4>
                          <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-16 border-t border-gray-100">
              <div className="max-w-6xl mx-auto px-6 lg:px-12">
                <div className="grid md:grid-cols-6 gap-8 mb-12">
                  {/* Logo */}
                  <div className="md:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full"></div>
                      <span className="text-lg font-semibold text-gray-900">FinanceAI</span>
                    </div>
                  </div>

                  {/* Integrations */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Integrations</h4>
                    <ul className="space-y-2 text-gray-500 text-sm">
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Banking APIs</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Credit Bureau</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">KYC Services</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Payment Gateway</a></li>
                    </ul>
                  </div>

                  {/* Industries */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Industries</h4>
                    <ul className="space-y-2 text-gray-500 text-sm">
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Banking</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">NBFC</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Fintech</a></li>
                    </ul>
                  </div>

                  {/* Technology */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Technology</h4>
                    <ul className="space-y-2 text-gray-500 text-sm">
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Build Assistant</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Multi-Agent Architect</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Features</a></li>
                    </ul>
                  </div>

                  {/* Solutions */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-4">Solutions</h4>
                    <ul className="space-y-2 text-gray-500 text-sm">
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Sales</a></li>
                      <li><a href="#" className="hover:text-gray-900 transition-colors">Service</a></li>
                    </ul>
                  </div>

                  {/* Social + Contact */}
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-3 mb-4">
                      <a href="#" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                      <a href="#" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      </a>
                      <a href="#" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </a>
                      <a href="#" className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                      </a>
                    </div>
                    <button className="border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                      Contact us
                    </button>
                  </div>
                </div>

                {/* Bottom */}
                <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                  <p className="text-gray-400 text-sm">© 2025 FinanceAI. All rights reserved</p>
                  <div className="flex items-center gap-6 text-gray-400 text-sm">
                    <a href="#" className="hover:text-gray-600 transition-colors">Privacy Policy</a>
                    <a href="#" className="hover:text-gray-600 transition-colors">Terms</a>
                  </div>
                </div>
              </div>
            </footer>
          </motion.div>
        ) : (
          <ChatWidget 
            isExpanded={isChatExpanded} 
            onExpand={() => setIsChatExpanded(true)}
            onCollapse={() => setIsChatExpanded(false)}
            initialMessage={inputValue}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

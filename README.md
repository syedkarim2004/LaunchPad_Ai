# FinanceAI - NBFC Loan Chatbot

A professional, modern frontend for an AI-powered NBFC loan chatbot. This application features a clean landing page with an expandable chat interface that provides a WhatsApp-like conversational experience.

## Features

- **Professional Landing Page**: Clean, modern design with gradient backgrounds and smooth animations
- **Expandable Chat Interface**: Click on the chat widget or type a message to expand to fullscreen with beautiful parallax animation
- **WhatsApp-like Chat Experience**: Personal touch with message bubbles, typing indicators, read receipts, and agent avatars
- **Multi-Agent System Visualization**: Shows different AI agents (Sales, Verification, Underwriting, Sanction) with distinct colors and icons
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Framer Motion Animations**: Smooth, professional transitions throughout the application

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Animation library
- **Lucide React** - Beautiful icons

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd nbfc-loan-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
nbfc-loan-chatbot/
├── app/
│   ├── globals.css      # Global styles and animations
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main landing page
├── components/
│   └── ChatWidget.tsx   # Chat widget component
├── package.json
├── tailwind.config.js
└── README.md
```

## Chat Flow

The chatbot simulates a complete loan application process:

1. **Master Agent** - Greets the customer and understands their needs
2. **Sales Agent** - Discusses loan terms, amounts, and interest rates
3. **Verification Agent** - Confirms KYC details from CRM
4. **Underwriting Agent** - Fetches credit score and validates eligibility
5. **Sanction Agent** - Generates approval and sanction letter

## Customization

### Colors
Edit `tailwind.config.js` to customize the color palette:
- Primary colors (blue shades)
- Accent colors (green shades)

### Animations
Modify `app/globals.css` for custom animations:
- Message slide-in effects
- Typing indicator bounce
- Gradient backgrounds

## Demo

The frontend includes simulated responses to demonstrate the multi-agent workflow:
- Type "loan" or "interest" to trigger the Sales Agent
- Type "eligibility" or "check" to trigger the Verification Agent
- Type "credit" or "score" to trigger the Underwriting Agent
- Type "proceed" or "apply" to trigger the Sanction Agent

## License

MIT License

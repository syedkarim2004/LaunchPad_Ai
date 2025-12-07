"""
LLM Factory - Provides Groq LLM (Llama 3.1) for all agents
FREE tier - very fast inference
"""
from langchain_groq import ChatGroq
from langchain.chat_models.base import BaseChatModel
from app.config import get_settings

settings = get_settings()


class LLMFactory:
    """Factory to create Groq LLM for agents"""
    
    @staticmethod
    def get_llm(temperature: float = 0.7) -> BaseChatModel:
        """
        Get Groq LLM (Llama 3.1) with specified temperature.
        
        - FREE tier with generous limits
        - Very fast inference (~500 tokens/sec)
        - Model: llama-3.1-8b-instant
        """
        if not settings.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY not set!\n"
                "Get your FREE API key at: https://console.groq.com\n"
                "Then add to your .env file: GROQ_API_KEY=gsk_your_key_here"
            )
        
        return ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model=settings.GROQ_MODEL,
            temperature=temperature,
            max_tokens=1024
        )


# Singleton instances
# Higher temperature (0.7) for conversational agents (Master, Sales)
conversational_llm = LLMFactory.get_llm(temperature=0.7)

# Lower temperature (0.3) for analytical agents (Verification, Underwriting, Sanction)
analytical_llm = LLMFactory.get_llm(temperature=0.3)

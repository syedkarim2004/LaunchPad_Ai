"""
Quick test to verify OpenAI LLM is working
"""
import asyncio
from app.llm_factory import conversational_llm
from langchain_core.messages import SystemMessage, HumanMessage


async def test_llm():
    """Test if LLM is responding"""
    print("Testing OpenAI LLM connection...")
    print("-" * 50)
    
    messages = [
        SystemMessage(content="You are Shruti, a helpful loan assistant. Keep responses brief."),
        HumanMessage(content="Hi, I need a personal loan")
    ]
    
    try:
        response = await conversational_llm.ainvoke(messages)
        print("✅ LLM Response:")
        print(response.content)
        print("-" * 50)
        print("✅ OpenAI is working correctly!")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        print("-" * 50)
        print("❌ OpenAI connection failed!")
        return False


if __name__ == "__main__":
    asyncio.run(test_llm())

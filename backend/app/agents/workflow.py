"""
LangGraph Workflow - Complete Agent Orchestration
LLM-powered conversation flow

WORKFLOW STAGES:
1. Onboarding → Collect name, phone, age (if needed)
2. Greeting/Discovery → Understand what user needs (LLM-powered)
3. Sales → Present loan offer with EMI
4. Verification → KYC check
5. Documents → Collect if needed
6. Underwriting → Credit assessment
7. Sanction → Final approval and letter
"""
from typing import Dict, Any
from app.agents.state import LoanApplicationState
from app.agents.master_agent_llm import master_agent_llm  # LLM-powered (Groq - FREE)
from app.agents.sales_agent import sales_agent
from app.agents.verification_agent import verification_agent
from app.agents.underwriting_agent import underwriting_agent
from app.agents.sanction_agent import sanction_agent
from app.agents.document_agent import document_agent


class LoanWorkflow:
    """
    Orchestrates the complete loan application workflow.
    Uses LLM for natural conversation.
    """
    
    # Agent routing map
    AGENT_MAP = {
        "master": master_agent_llm,  # LLM-powered with Groq (FREE)
        "sales": sales_agent,
        "verification": verification_agent,
        "document": document_agent,
        "underwriting": underwriting_agent,
        "sanction": sanction_agent
    }
    
    async def process_message(
        self,
        state: LoanApplicationState,
        user_message: str
    ) -> LoanApplicationState:
        """
        Process user message through appropriate agent.
        Simple routing: check next_agent and call that agent.
        """
        # Update state with user message
        state["user_message"] = user_message
        
        # Get current routing info
        current_stage = state.get("current_stage", "greeting")
        next_agent = state.get("next_agent", "master")
        
        # Log for debugging
        print(f"[Workflow] Stage: {current_stage}, Next Agent: {next_agent}, Message: {user_message[:30]}...")
        
        # Route to appropriate agent
        if next_agent == "master" or (current_stage in ["greeting", "discovery", "persuasion", "onboarding"] and next_agent not in ["sales", "verification", "document", "underwriting", "sanction"]):
            # Master agent handles conversation flow (LLM-powered with Groq)
            updates = await master_agent_llm.run(state)
            state.update(updates)
            
            # If master routed to another agent and didn't provide response, call that agent
            routed_agent = state.get("next_agent")
            if routed_agent and routed_agent != "master" and not state.get("bot_response"):
                worker_updates = await self._call_agent(routed_agent, state)
                if worker_updates and worker_updates.get("bot_response"):
                    state.update(worker_updates)
        
        elif next_agent == "sales":
            # Sales agent handles loan offers
            updates = await sales_agent.run(state)
            state.update(updates)
        
        elif next_agent == "verification":
            updates = await verification_agent.run(state)
            state.update(updates)
            
            # Route based on verification result
            if state.get("kyc_verified"):
                if state.get("application_status") == "needs_documents":
                    state["next_agent"] = "document"
                else:
                    state["next_agent"] = "underwriting"
        
        elif next_agent == "document":
            updates = await document_agent.run(state)
            state.update(updates)
        
        elif next_agent == "underwriting":
            updates = await underwriting_agent.run(state)
            state.update(updates)
            
            # If approved, immediately generate sanction letter
            if state.get("application_status") == "approved":
                sanction_updates = await sanction_agent.run(state)
                state.update(sanction_updates)
            elif state.get("application_status") == "needs_documents":
                state["next_agent"] = "document"
        
        elif next_agent == "sanction":
            updates = await sanction_agent.run(state)
            state.update(updates)
            state["next_agent"] = "completed"
        
        elif next_agent == "completed":
            state["should_end"] = True
            name = state.get("customer_name", "").split()[0] if state.get("customer_name") else "there"
            state["bot_response"] = f"""Thank you for choosing NBFC Finance, {name}! 🙂

Your loan is all set. Disbursement will happen within a few hours.

If you have any questions, feel free to come back. Take care!"""
        
        return state
    
    async def _call_agent(self, agent_name: str, state: LoanApplicationState) -> Dict[str, Any]:
        """Call a specific agent by name"""
        agent = self.AGENT_MAP.get(agent_name)
        if agent:
            return await agent.run(state)
        return {}
    
    def get_stage_description(self, stage: str) -> str:
        """Get human-readable description of current stage"""
        descriptions = {
            "greeting": "Welcome & Introduction",
            "discovery": "Understanding Your Needs",
            "persuasion": "Exploring Options",
            "offer_presentation": "Presenting Your Offer",
            "sales": "Discussing Loan Terms",
            "verification": "Verifying Your Details",
            "document_collection": "Collecting Documents",
            "underwriting": "Assessing Your Application",
            "sanction": "Finalizing Approval",
            "closing": "Thank You!"
        }
        return descriptions.get(stage, "Processing...")


# Singleton instance
loan_workflow = LoanWorkflow()

"""
Mock CRM Service
Simulates fetching customer KYC data from CRM system
"""
import asyncio
from typing import Optional, Dict, Any
from app.mock_data import get_customer_by_email, get_customer_by_id


class CRMService:
    """Mock CRM service for customer verification"""
    
    @staticmethod
    async def verify_customer_kyc(customer_email: str) -> Dict[str, Any]:
        """
        Verify customer KYC details from CRM
        Simulates API call with delay
        """
        # Simulate API delay
        await asyncio.sleep(0.5)
        
        customer = get_customer_by_email(customer_email)
        
        if not customer:
            return {
                "success": False,
                "message": "Customer not found in CRM",
                "data": None
            }
        
        return {
            "success": True,
            "message": "KYC details verified successfully",
            "data": {
                "name": customer["name"],
                "phone": customer["phone"],
                "address": customer["address"],
                "city": customer["city"],
                "kyc_verified": customer["kyc_verified"],
                "kyc_status": "Complete" if customer["kyc_verified"] else "Pending"
            }
        }
    
    @staticmethod
    async def get_customer_profile(customer_id: str) -> Optional[Dict[str, Any]]:
        """Get complete customer profile from CRM"""
        await asyncio.sleep(0.3)
        
        customer = get_customer_by_id(customer_id)
        return customer
    
    @staticmethod
    async def update_customer_info(customer_id: str, updates: Dict[str, Any]) -> bool:
        """Update customer information in CRM (mock)"""
        await asyncio.sleep(0.2)
        # In real implementation, this would update the database
        return True


# Singleton instance
crm_service = CRMService()

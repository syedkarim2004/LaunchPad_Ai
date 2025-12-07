"""
Mock Credit Bureau API
Simulates fetching credit scores from credit bureau (CIBIL/Experian)
"""
import asyncio
import random
from typing import Dict, Any
from app.mock_data import get_customer_by_email


class CreditBureauService:
    """Mock Credit Bureau service for credit score fetching"""
    
    @staticmethod
    async def fetch_credit_score(customer_email: str) -> Dict[str, Any]:
        """
        Fetch credit score from credit bureau
        Simulates API call with delay
        """
        # Simulate API delay (credit bureau calls are usually slower)
        await asyncio.sleep(1.0)
        
        customer = get_customer_by_email(customer_email)
        
        if not customer:
            # Generate random score for unknown customers
            score = random.randint(650, 850)
            return {
                "success": True,
                "message": "Credit score fetched successfully",
                "data": {
                    "credit_score": score,
                    "max_score": 900,
                    "rating": CreditBureauService._get_rating(score),
                    "factors": {
                        "payment_history": "Good",
                        "credit_utilization": "Moderate",
                        "credit_age": "Fair",
                        "recent_inquiries": "Low"
                    }
                }
            }
        
        score = customer["credit_score"]
        return {
            "success": True,
            "message": "Credit score fetched successfully",
            "data": {
                "credit_score": score,
                "max_score": 900,
                "rating": CreditBureauService._get_rating(score),
                "factors": {
                    "payment_history": "Excellent" if score > 750 else "Good",
                    "credit_utilization": "Low" if score > 750 else "Moderate",
                    "credit_age": "Good",
                    "recent_inquiries": "Low"
                }
            }
        }

    @staticmethod
    async def fetch_credit_score_from_pan(pan: str) -> Dict[str, Any]:
        """Fetch credit score using PAN instead of email.

        If a real credit API is configured via settings (CREDIT_API_URL,
        CREDIT_API_KEY), this will attempt to call it. Otherwise it falls
        back to a deterministic simulated score based on the PAN string.
        """
        await asyncio.sleep(0.5)

        if not pan:
            return await CreditBureauService.fetch_credit_score("")

        # Try real external API if configured
        try:
            from app.config import get_settings  # local import to avoid cycles
            import httpx

            settings = get_settings()
            if settings.CREDIT_API_URL:
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.post(
                        settings.CREDIT_API_URL,
                        json={"pan": pan},
                        headers={"Authorization": f"Bearer {settings.CREDIT_API_KEY}"} if settings.CREDIT_API_KEY else {},
                    )
                resp.raise_for_status()
                payload = resp.json()

                # Expect payload like {"score": 782, "max_score": 900, "rating": "Very Good"}
                score = int(payload.get("score", 0)) or 0
                if score:
                    max_score = int(payload.get("max_score", 900)) or 900
                    rating = payload.get("rating") or CreditBureauService._get_rating(score)
                    return {
                        "success": True,
                        "message": "Credit score fetched successfully (PAN, external)",
                        "data": {
                            "credit_score": score,
                            "max_score": max_score,
                            "rating": rating,
                            "factors": {
                                "payment_history": "",  # optional extras from API
                                "credit_utilization": "",
                                "credit_age": "",
                                "recent_inquiries": "",
                            },
                        },
                    }
        except Exception as api_e:
            # Log and fall back to simulated score
            print(f"[CreditBureau] External PAN API error, falling back to mock: {api_e}")

        # Fallback: deterministic pseudo-random based on PAN characters
        base = sum(ord(c) for c in pan.upper() if c.isalnum())
        score = 650 + (base % 201)  # 650-850 range

        return {
            "success": True,
            "message": "Credit score fetched successfully (PAN, simulated)",
            "data": {
                "credit_score": score,
                "max_score": 900,
                "rating": CreditBureauService._get_rating(score),
                "factors": {
                    "payment_history": "Excellent" if score > 750 else "Good",
                    "credit_utilization": "Low" if score > 750 else "Moderate",
                    "credit_age": "Good",
                    "recent_inquiries": "Low",
                },
            },
        }
    
    @staticmethod
    def _get_rating(score: int) -> str:
        """Get credit rating based on score"""
        if score >= 800:
            return "Excellent"
        elif score >= 750:
            return "Very Good"
        elif score >= 700:
            return "Good"
        elif score >= 650:
            return "Fair"
        else:
            return "Poor"
    
    @staticmethod
    async def get_credit_report(customer_email: str) -> Dict[str, Any]:
        """Get detailed credit report"""
        await asyncio.sleep(1.5)
        
        score_data = await CreditBureauService.fetch_credit_score(customer_email)
        
        if not score_data["success"]:
            return score_data
        
        # Add more detailed information
        score_data["data"]["accounts"] = {
            "total_accounts": random.randint(3, 8),
            "active_accounts": random.randint(2, 5),
            "closed_accounts": random.randint(0, 3)
        }
        
        return score_data


# Singleton instance
credit_bureau = CreditBureauService()

#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class HyperEatsAPITester:
    def __init__(self, base_url="https://hyper-eats.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tokens = {}
        self.test_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": [],
            "auth_tests": [],
            "kitchen_tests": [],
            "order_tests": [],
            "admin_tests": [],
            "delivery_tests": []
        }
        
    def log_result(self, test_name: str, success: bool, category: str, details: str = ""):
        """Log test result"""
        self.test_results["total_tests"] += 1
        if success:
            self.test_results["passed_tests"] += 1
            print(f"✅ {test_name}")
        else:
            self.test_results["failed_tests"].append({
                "test": test_name,
                "category": category,
                "details": details
            })
            print(f"❌ {test_name} - {details}")
        
        self.test_results[f"{category}_tests"].append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request and return success status and response data"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == "PUT":
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                return False, {"error": f"Unsupported method: {method}"}
                
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}
                
            return success, response_data
            
        except Exception as e:
            return False, {"error": str(e)}

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test admin login
        success, data = self.make_request("POST", "/auth/login", {
            "email": "admin@example.com",
            "password": "admin123"
        })
        if success and "token" in data:
            self.tokens["admin"] = data["token"]
            self.log_result("Admin login", True, "auth")
        else:
            self.log_result("Admin login", False, "auth", f"Response: {data}")
            
        # Test kitchen provider login
        success, data = self.make_request("POST", "/auth/login", {
            "email": "amma@kitchen.com", 
            "password": "kitchen123"
        })
        if success and "token" in data:
            self.tokens["kitchen"] = data["token"]
            self.log_result("Kitchen provider login", True, "auth")
        else:
            self.log_result("Kitchen provider login", False, "auth", f"Response: {data}")
            
        # Test delivery agent login
        success, data = self.make_request("POST", "/auth/login", {
            "email": "driver1@delivery.com",
            "password": "delivery123"
        })
        if success and "token" in data:
            self.tokens["delivery"] = data["token"]
            self.log_result("Delivery agent login", True, "auth")
        else:
            self.log_result("Delivery agent login", False, "auth", f"Response: {data}")
            
        # Test invalid login
        success, data = self.make_request("POST", "/auth/login", {
            "email": "invalid@test.com",
            "password": "wrongpass"
        }, expected_status=401)
        self.log_result("Invalid login rejection", success, "auth")
        
        # Test /auth/me endpoint with admin token
        if "admin" in self.tokens:
            success, data = self.make_request("GET", "/auth/me", token=self.tokens["admin"])
            if success and data.get("role") == "admin":
                self.log_result("Auth me endpoint (admin)", True, "auth")
            else:
                self.log_result("Auth me endpoint (admin)", False, "auth", f"Response: {data}")
                
        # Test /auth/me endpoint with delivery token
        if "delivery" in self.tokens:
            success, data = self.make_request("GET", "/auth/me", token=self.tokens["delivery"])
            if success and data.get("role") == "delivery_agent":
                self.log_result("Auth me endpoint (delivery)", True, "auth")
            else:
                self.log_result("Auth me endpoint (delivery)", False, "auth", f"Response: {data}")

    def test_kitchen_endpoints(self):
        """Test kitchen-related endpoints"""
        print("\n🍳 Testing Kitchen Endpoints...")
        
        # Test list kitchens (public endpoint)
        success, data = self.make_request("GET", "/kitchens")
        if success and isinstance(data, list) and len(data) >= 3:
            self.log_result("List kitchens", True, "kitchen")
            self.kitchen_id = data[0].get("id") if data else None
        else:
            self.log_result("List kitchens", False, "kitchen", f"Expected list with 3+ kitchens, got: {data}")
            
        # Test get specific kitchen
        if hasattr(self, 'kitchen_id') and self.kitchen_id:
            success, data = self.make_request("GET", f"/kitchens/{self.kitchen_id}")
            if success and data.get("id") == self.kitchen_id:
                self.log_result("Get kitchen by ID", True, "kitchen")
            else:
                self.log_result("Get kitchen by ID", False, "kitchen", f"Response: {data}")
                
        # Test get kitchen menu
        if hasattr(self, 'kitchen_id') and self.kitchen_id:
            success, data = self.make_request("GET", f"/kitchens/{self.kitchen_id}/menu")
            if success and isinstance(data, list):
                self.log_result("Get kitchen menu", True, "kitchen")
                self.menu_items = data
            else:
                self.log_result("Get kitchen menu", False, "kitchen", f"Response: {data}")
                
        # Test my kitchen endpoint (requires kitchen provider token)
        if "kitchen" in self.tokens:
            success, data = self.make_request("GET", "/my/kitchen", token=self.tokens["kitchen"])
            if success and data and "id" in data:
                self.log_result("Get my kitchen", True, "kitchen")
                self.my_kitchen_id = data["id"]
            else:
                self.log_result("Get my kitchen", False, "kitchen", f"Response: {data}")
                
        # Test kitchen toggle (requires kitchen provider token)
        if "kitchen" in self.tokens and hasattr(self, 'my_kitchen_id'):
            success, data = self.make_request("PUT", f"/kitchens/{self.my_kitchen_id}/toggle", 
                                            token=self.tokens["kitchen"])
            if success and "is_open" in data:
                self.log_result("Toggle kitchen status", True, "kitchen")
            else:
                self.log_result("Toggle kitchen status", False, "kitchen", f"Response: {data}")

    def test_order_endpoints(self):
        """Test order-related endpoints"""
        print("\n📦 Testing Order Endpoints...")
        
        # Test create order (requires customer token - let's create one)
        customer_success, customer_data = self.make_request("POST", "/auth/register", {
            "email": f"testcustomer_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "testpass123",
            "name": "Test Customer",
            "role": "customer"
        })
        
        if customer_success and "token" in customer_data:
            self.tokens["customer"] = customer_data["token"]
            self.log_result("Customer registration", True, "order")
            
            # Test create order
            if hasattr(self, 'kitchen_id') and hasattr(self, 'menu_items') and self.menu_items:
                order_data = {
                    "kitchen_id": self.kitchen_id,
                    "items": [{"menu_item_id": self.menu_items[0]["id"], "quantity": 2}],
                    "delivery_address": "123 Test Street, Test City",
                    "origin_url": "https://hyper-eats.preview.emergentagent.com"
                }
                success, data = self.make_request("POST", "/orders", order_data, 
                                                token=self.tokens["customer"])
                if success and "order_id" in data:
                    self.log_result("Create order", True, "order")
                    self.order_id = data["order_id"]
                else:
                    self.log_result("Create order", False, "order", f"Response: {data}")
        else:
            self.log_result("Customer registration", False, "order", f"Response: {customer_data}")
            
        # Test list orders
        if "customer" in self.tokens:
            success, data = self.make_request("GET", "/orders", token=self.tokens["customer"])
            if success and isinstance(data, list):
                self.log_result("List customer orders", True, "order")
            else:
                self.log_result("List customer orders", False, "order", f"Response: {data}")
                
        # Test kitchen orders
        if "kitchen" in self.tokens:
            success, data = self.make_request("GET", "/orders", token=self.tokens["kitchen"])
            if success and isinstance(data, list):
                self.log_result("List kitchen orders", True, "order")
            else:
                self.log_result("List kitchen orders", False, "order", f"Response: {data}")

    def test_delivery_endpoints(self):
        """Test delivery-related endpoints"""
        print("\n🚚 Testing Delivery Endpoints...")
        
        if "delivery" in self.tokens:
            # Test delivery orders
            success, data = self.make_request("GET", "/delivery/orders", token=self.tokens["delivery"])
            if success and isinstance(data, list):
                self.log_result("Get delivery orders", True, "delivery")
            else:
                self.log_result("Get delivery orders", False, "delivery", f"Response: {data}")
                
            # Test available deliveries
            success, data = self.make_request("GET", "/delivery/available", token=self.tokens["delivery"])
            if success and isinstance(data, list):
                self.log_result("Get available deliveries", True, "delivery")
            else:
                self.log_result("Get available deliveries", False, "delivery", f"Response: {data}")

    def test_admin_endpoints(self):
        """Test admin-related endpoints"""
        print("\n👑 Testing Admin Endpoints...")
        
        if "admin" in self.tokens:
            # Test admin analytics
            success, data = self.make_request("GET", "/admin/analytics", token=self.tokens["admin"])
            if success and "total_orders" in data and "total_users" in data:
                self.log_result("Admin analytics", True, "admin")
            else:
                self.log_result("Admin analytics", False, "admin", f"Response: {data}")
                
            # Test admin users
            success, data = self.make_request("GET", "/admin/users", token=self.tokens["admin"])
            if success and isinstance(data, list) and len(data) > 0:
                self.log_result("Admin users list", True, "admin")
            else:
                self.log_result("Admin users list", False, "admin", f"Response: {data}")
                
            # Test admin users by role
            success, data = self.make_request("GET", "/admin/users?role=kitchen_provider", 
                                            token=self.tokens["admin"])
            if success and isinstance(data, list):
                self.log_result("Admin users by role", True, "admin")
            else:
                self.log_result("Admin users by role", False, "admin", f"Response: {data}")

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        print("\n🔒 Testing Unauthorized Access...")
        
        # Test accessing admin endpoint without token
        success, data = self.make_request("GET", "/admin/analytics", expected_status=401)
        self.log_result("Unauthorized admin access blocked", success, "auth", 
                       f"Expected 401, got {data.get('status_code', 'unknown')}")
        
        # Test accessing kitchen endpoint without token
        success, data = self.make_request("GET", "/my/kitchen", expected_status=401)
        self.log_result("Unauthorized kitchen access blocked", success, "auth",
                       f"Expected 401, got {data.get('status_code', 'unknown')}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting HyperEats API Testing...")
        print(f"Testing against: {self.base_url}")
        
        self.test_auth_endpoints()
        self.test_kitchen_endpoints()
        self.test_order_endpoints()
        self.test_delivery_endpoints()
        self.test_admin_endpoints()
        self.test_unauthorized_access()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Total Tests: {self.test_results['total_tests']}")
        print(f"Passed: {self.test_results['passed_tests']}")
        print(f"Failed: {len(self.test_results['failed_tests'])}")
        
        if self.test_results['failed_tests']:
            print(f"\n❌ Failed Tests:")
            for failure in self.test_results['failed_tests']:
                print(f"  - {failure['test']} ({failure['category']}): {failure['details']}")
        
        success_rate = (self.test_results['passed_tests'] / self.test_results['total_tests']) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return self.test_results

def main():
    tester = HyperEatsAPITester()
    results = tester.run_all_tests()
    
    # Save results to file
    with open("/app/test_reports/backend_api_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    # Return appropriate exit code
    return 0 if len(results['failed_tests']) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
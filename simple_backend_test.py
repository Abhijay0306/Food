#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SimpleAPITester:
    def __init__(self, base_url="https://hyper-eats.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        
    def test_api(self, name, method, endpoint, data=None, expected_status=200, session=None):
        """Test a single API endpoint"""
        if session is None:
            session = requests.Session()
            
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        self.tests_run += 1
        
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method.upper() == "GET":
                response = session.get(url)
            elif method.upper() == "POST":
                response = session.post(url, json=data)
            elif method.upper() == "PUT":
                response = session.put(url, json=data)
            else:
                print(f"❌ Unsupported method: {method}")
                return False, session
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ {name} - Status: {response.status_code}")
                try:
                    return True, session, response.json()
                except:
                    return True, session, {"status": "success"}
            else:
                print(f"❌ {name} - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Response: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, session, {}
                
        except Exception as e:
            print(f"❌ {name} - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, session, {}

    def run_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting HyperEats API Testing...")
        print(f"Testing against: {self.base_url}")
        
        # Test 1: Basic health check - list kitchens (public endpoint)
        success, _, kitchens = self.test_api("List kitchens (public)", "GET", "/kitchens")
        kitchen_id = None
        if success and isinstance(kitchens, list) and len(kitchens) > 0:
            kitchen_id = kitchens[0].get("id")
            print(f"   Found {len(kitchens)} kitchens")
        
        # Test 2: Get kitchen menu
        if kitchen_id:
            success, _, menu = self.test_api("Get kitchen menu", "GET", f"/kitchens/{kitchen_id}/menu")
            if success and isinstance(menu, list):
                print(f"   Found {len(menu)} menu items")
        
        # Test 3: Admin login and session
        admin_session = requests.Session()
        success, admin_session, admin_data = self.test_api(
            "Admin login", "POST", "/auth/login",
            {"email": "admin@example.com", "password": "admin123"},
            session=admin_session
        )
        
        if success:
            # Test admin endpoints with session
            self.test_api("Admin /auth/me", "GET", "/auth/me", session=admin_session)
            self.test_api("Admin analytics", "GET", "/admin/analytics", session=admin_session)
            self.test_api("Admin users", "GET", "/admin/users", session=admin_session)
        
        # Test 4: Kitchen provider login and session
        kitchen_session = requests.Session()
        success, kitchen_session, kitchen_data = self.test_api(
            "Kitchen provider login", "POST", "/auth/login",
            {"email": "amma@kitchen.com", "password": "kitchen123"},
            session=kitchen_session
        )
        
        if success:
            # Test kitchen endpoints with session
            self.test_api("Kitchen /auth/me", "GET", "/auth/me", session=kitchen_session)
            self.test_api("Get my kitchen", "GET", "/my/kitchen", session=kitchen_session)
        
        # Test 5: Delivery agent login and session
        delivery_session = requests.Session()
        success, delivery_session, delivery_data = self.test_api(
            "Delivery agent login", "POST", "/auth/login",
            {"email": "driver1@delivery.com", "password": "delivery123"},
            session=delivery_session
        )
        
        if success:
            # Test delivery endpoints with session
            self.test_api("Delivery /auth/me", "GET", "/auth/me", session=delivery_session)
            self.test_api("Delivery orders", "GET", "/delivery/orders", session=delivery_session)
            self.test_api("Available deliveries", "GET", "/delivery/available", session=delivery_session)
        
        # Test 6: Customer registration and order creation
        customer_session = requests.Session()
        customer_email = f"testcustomer_{datetime.now().strftime('%H%M%S')}@test.com"
        success, customer_session, customer_data = self.test_api(
            "Customer registration", "POST", "/auth/register",
            {
                "email": customer_email,
                "password": "testpass123",
                "name": "Test Customer",
                "role": "customer"
            },
            session=customer_session
        )
        
        if success and kitchen_id and menu:
            # Test order creation
            order_data = {
                "kitchen_id": kitchen_id,
                "items": [{"menu_item_id": menu[0]["id"], "quantity": 1}] if menu else [],
                "delivery_address": "123 Test Street, Test City",
                "origin_url": "https://hyper-eats.preview.emergentagent.com"
            }
            self.test_api("Create order", "POST", "/orders", order_data, session=customer_session)
            self.test_api("List customer orders", "GET", "/orders", session=customer_session)
        
        # Test 7: Unauthorized access
        unauthorized_session = requests.Session()
        self.test_api("Unauthorized admin access", "GET", "/admin/analytics", 
                     expected_status=401, session=unauthorized_session)
        self.test_api("Unauthorized kitchen access", "GET", "/my/kitchen", 
                     expected_status=401, session=unauthorized_session)
        
        # Test 8: Invalid login
        invalid_session = requests.Session()
        self.test_api("Invalid login", "POST", "/auth/login",
                     {"email": "invalid@test.com", "password": "wrongpass"},
                     expected_status=401, session=invalid_session)
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in self.failed_tests:
                error_msg = failure.get('error', f"Expected {failure.get('expected')}, got {failure.get('actual')}")
                print(f"  - {failure['test']}: {error_msg}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.failed_tests,
            "success_rate": success_rate
        }

def main():
    tester = SimpleAPITester()
    results = tester.run_tests()
    
    # Save results
    with open("/app/test_reports/backend_test_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return 0 if len(results['failed_tests']) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
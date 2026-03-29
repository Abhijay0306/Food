import os
import sys
import asyncio
import random
from datetime import datetime, timezone
import bcrypt
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Setup import path for backend modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_db, close_client
from utils import hash_password

KOLKATA_CENTER_LAT = 22.5726
KOLKATA_CENTER_LNG = 88.3639
RADIUS_DEG = 0.08  # Approx 8-10 km radius

def random_latlng():
    lat = KOLKATA_CENTER_LAT + random.uniform(-RADIUS_DEG, RADIUS_DEG)
    lng = KOLKATA_CENTER_LNG + random.uniform(-RADIUS_DEG, RADIUS_DEG)
    return lat, lng

RESTAURANT_NAMES = [
    ("Aminia", ["Mughlai", "Biryani"], ["Chicken Biryani", "Mutton Awadhi Biryani", "Firni", "Chicken Chaap"]),
    ("Arsalan", ["Mughlai", "Biryani"], ["Mutton Biryani", "Chicken Reshmi Kebab", "Phiri", "Mutton Tikka"]),
    ("Oh! Calcutta", ["Bengali", "Indian"], ["Daab Chingri", "Kosha Mangsho", "Bhetki Macher Paturi", "Luchi"]),
    ("Bhojohori Manna", ["Bengali", "Traditional"], ["Ilish Bhapa", "Chital Macher Muitha", "Aloo Posto", "Rosogolla"]),
    ("6 Ballygunge Place", ["Bengali", "Seafood"], ["Chingri Malai Curry", "Mutton Dakbungalow", "Gandharaj Chicken", "Mishti Doi"]),
    ("Mocambo", ["Continental", "European"], ["Deviled Crab", "Fish Diana", "Chicken Tetrazzini", "Baked Alaska"]),
    ("Peter Cat", ["Indian", "Continental"], ["Chelo Kebab", "Chicken Sizzler", "Mutton Seekh Kebab", "Caramel Custard"]),
    ("Nizam's", ["Street Food", "Mughlai"], ["Kathi Roll", "Mutton Roll", "Beef Roll", "Double Egg Roll"]),
    ("Kusum Rolls", ["Street Food", "Fast Food"], ["Egg Chicken Roll", "Paneer Tikka Roll", "Mutton Roll", "Cold Coffee"]),
    ("Flurys", ["Bakery", "Cafe", "Desserts"], ["Rum Ball", "English Breakfast", "Chocolate Pastry", "Darjeeling Tea"]),
    ("Indian Coffee House", ["Cafe", "Indian"], ["Cold Coffee", "Veg Sandwich", "Fish Kabiraji", "Chicken Afgani"]),
    ("Balaram Mullick & Radharaman Mullick", ["Sweets", "Desserts"], ["Baked Rosogolla", "Mango Sandesh", "Jalbhara", "Misti Doi"]),
    ("Gupta Brothers", ["Vegetarian", "Sweets"], ["Radhavallabhi", "Chole Bhature", "Malpua", "Samosa"]),
    ("Haldiram's", ["Vegetarian", "Street Food"], ["Raj Kachori", "Pani Puri", "Kesar Falooda", "Masala Dosa"]),
    ("Mainland China", ["Chinese", "Asian"], ["Dim Sum", "Kung Pao Chicken", "Hakka Noodles", "Chilli Garlic Fried Rice"]),
    ("Chowman", ["Chinese", "Thai"], ["Mixed Fried Rice", "Chilli Chicken", "Prawn Tempura", "Pad Thai"]),
    ("Shiraz Golden Restaurant", ["Mughlai", "Biryani"], ["Mutton Biryani", "Chicken Chaap", "Mutton Pasanda", "Shahi Tukda"]),
    ("Zeeshan", ["Mughlai", "Rolls"], ["Chicken Tikka Roll", "Mutton Biryani", "Reshmi Kebab", "Phirni"]),
    ("Oudh 1590", ["Awadhi", "Mughlai"], ["Raan Biryani", "Galawati Kebab", "Awadhi Handi Biryani", "Shahi Tukda"]),
    ("Kasturi", ["Dhakaite", "Bengali"], ["Kochupata Chingri", "Bhetki Paturi", "Mutton Kosha", "Kalo Jeere Diye Macher Jhol"]),
    ("Koshe Kosha", ["Bengali"], ["Gondhoraj Chicken", "Kosha Mangsho", "Basanti Pulao", "Aam Pora Shorbot"]),
    ("Golbari", ["Bengali", "Meat"], ["Kosha Mangsho", "Chicken Kosha", "Roti", "Mutton Ghugni"]),
    ("Allen Kitchen", ["Bengali", "Snacks"], ["Prawn Cutlet", "Fish Kabiraji", "Mutton Chop", "Fish Roll"]),
    ("Mitra Cafe", ["Snacks", "Bengali"], ["Brain Chop", "Fish Fry", "Diamond Fish Fry", "Mutton Afghani"]),
    ("Tung Fong", ["Chinese"], ["Golden Fried Prawns", "Hunan Chicken", "Mixed Chowmein", "Crispy Chilli Baby Corn"]),
    ("BarBQ", ["Chinese", "Indian"], ["Fish Tikka", "Chilli Chicken", "Mixed Fried Rice", "Paneer Butter Masala"]),
    ("Tiretti Bazaar Breakfast", ["Chinese", "Street Food"], ["Pork Dumplings", "Chicken Sausage", "Bao", "Fish Ball Soup"]),
    ("Dolly's The Tea Shop", ["Cafe", "Beverages"], ["First Flush Darjeeling", "Assam Tea", "Tuna Sandwich", "Lemon Iced Tea"]),
    ("The Biker's Cafe", ["Cafe", "Continental"], ["Eggs Benedict", "Club Sandwich", "Latte", "Waffles"]),
    ("Roastery Coffee House", ["Cafe", "Italian"], ["Pour Over Coffee", "Pasta Alfredo", "Brownie", "Cold Brew"]),
    ("Sienna Store & Cafe", ["Healthy", "Cafe"], ["Avocado Toast", "Quinoa Salad", "Cappuccino", "Carrot Cake"]),
    ("Artsag", ["Cafe", "Continental"], ["Chicken Stroganoff", "Greek Salad", "Hot Chocolate", "Cheesecake"]),
    ("Banzara", ["North Indian"], ["Butter Chicken", "Dal Makhani", "Garlic Naan", "Paneer Tikka"]),
    ("Pind Balluchi", ["Punjabi", "North Indian"], ["Sarson Ka Saag", "Makki Ki Roti", "Tandoori Chicken", "Lassi"]),
    ("Rang De Basanti Dhaba", ["Punjabi", "Street Food"], ["Chur Chur Naan", "Amritsari Kulcha", "Chicken Bharta", "Lassi"]),
    ("Azad Hind Dhaba", ["North Indian", "Street Food"], ["Chicken Tikka Masala", "Tandoori Roti", "Egg Tadka", "Lassi"]),
    ("Jai Hind Dhaba", ["North Indian"], ["Chicken Tartare", "Paneer Tikka Masala", "Tandoori Roti", "Salted Lassi"]),
    ("K.C. Das", ["Sweets", "Desserts"], ["Rosogolla", "Rasmalai", "Misti Doi", "Pantua"]),
    ("Girish Chandra Dey & Nakur Nandy", ["Sweets"], ["Jalbhara Sandesh", "Ice Cream Sandesh", "Parijat", "Monohara"]),
    ("Sen Mahasay", ["Sweets"], ["Chhanar Payesh", "Misti Doi", "Sita Bhog", "Mihidana"]),
    ("Putiram", ["Sweets", "Snacks"], ["Kachuri", "Chholar Dal", "Rosogolla", "Jilipi"]),
    ("Ganguram", ["Sweets"], ["Indrani", "Misti Doi", "Samosa", "Sandesh"]),
    ("Royal Indian Hotel", ["Mughlai", "Biryani"], ["Mutton Biryani", "Mutton Chaap", "Firni", "Chicken Tikka"]),
    ("Sabir's Hotel", ["Mughlai", "Meat"], ["Mutton Rezala", "Tandoori Roti", "Chicken Roast", "Firni"]),
    ("Mubarak", ["Mughlai", "Rolls"], ["Chicken Roll", "Mutton Chaap", "Biryani", "Kebab"]),
    ("Chhote Nawab", ["Awadhi", "Mughlai"], ["Mutton Galouti", "Lucknowi Biryani", "Chicken Handi", "Sheermal"]),
    ("Amber", ["North Indian"], ["Butter Chicken", "Mutton Rogan Josh", "Navratan Korma", "Naan"]),
    ("Trincas", ["Continental", "Indian"], ["Fish and Chips", "Chicken Sizzler", "Chilli Prawn", "Tandoori Chicken"]),
    ("Marco Polo", ["Continental", "Chinese"], ["Lobster Thermidor", "Peking Duck", "Hakka Noodles", "Brownie Sundae"]),
    ("Alfresco", ["Fine Dining", "Multicuisine"], ["Buffet Lunch", "Sushi", "Dim Sum", "Tiramisu"])
]

FOOD_IMAGES = [
    "https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?w=400",
    "https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=400",
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
    "https://images.unsplash.com/photo-1606851094655-b25cb7a7444b?w=400",
    "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
    "https://images.unsplash.com/photo-1544025162-d76694265947?w=400",
    "https://images.unsplash.com/photo-1594212691516-b18408f61536?w=400",
]

KITCHEN_IMAGES = [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600",
    "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600",
    "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=600",
    "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600",
    "https://images.unsplash.com/photo-1537047902294-62a40c20a6fa?w=600",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600",
]

async def seed_kolkata():
    print("Connecting to DB...")
    db = get_db()
    
    # Check if we already created Kolkata restaurants to avoid infinite inflation
    existing = await db.users.count_documents({"email": {"$regex": "kolkata"}})
    if existing > 0:
        print("Cleaning up old Kolkata seed data to prevent duplicates...")
        k_users = await db.users.find({"email": {"$regex": "kolkata"}}).to_list(100)
        u_ids = [k["_id"] for k in k_users]
        k_ids = [k["_id"] for k in await db.kitchens.find({"owner_id": {"$in": [str(u) for u in u_ids]}}).to_list(100)]
        
        await db.users.delete_many({"_id": {"$in": u_ids}})
        await db.kitchens.delete_many({"owner_id": {"$in": [str(u) for u in u_ids]}})
        await db.menu_items.delete_many({"kitchen_id": {"$in": [str(k) for k in k_ids]}})

    print(f"Injecting {len(RESTAURANT_NAMES)} Kolkata Restaurants...")
    
    hashed_pwd = hash_password("kolkata123")
    
    for i, (name, cuisines, items) in enumerate(RESTAURANT_NAMES):
        email = f"kolkata_{i}@example.com"
        
        # 1. Create User
        user_doc = {
            "email": email,
            "password_hash": hashed_pwd,
            "name": f"Manager: {name}",
            "role": "kitchen_provider",
            "phone": f"+919876543{i:03d}",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res_usr = await db.users.insert_one(user_doc)
        owner_id = str(res_usr.inserted_id)
        
        # 2. Create Kitchen Profile
        lat, lng = random_latlng()
        kitchen_doc = {
            "owner_id": owner_id,
            "name": name,
            "description": f"Authentic {cuisines[0]} restaurant located in the heart of Kolkata.",
            "address": f"{random.randint(1, 100)}, Gariahat Road, Kolkata",
            "lat": lat,
            "lng": lng,
            "cuisine_types": cuisines,
            "image_url": KITCHEN_IMAGES[i % len(KITCHEN_IMAGES)],
            "is_open": True,
            "rating": round(random.uniform(4.0, 5.0), 1),
            "total_orders": random.randint(10, 500),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        res_kit = await db.kitchens.insert_one(kitchen_doc)
        kitchen_id = str(res_kit.inserted_id)
        
        # 3. Create Menu Items
        for j, item_name in enumerate(items):
            menu_doc = {
                "kitchen_id": kitchen_id,
                "name": item_name,
                "description": f"Signature {item_name} made with authentic spices.",
                "price": round(random.uniform(3.99, 15.99), 2),
                "category": "Signature" if j == 0 else "Classics",
                "image_url": FOOD_IMAGES[(i + j) % len(FOOD_IMAGES)],
                "is_available": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            await db.menu_items.insert_one(menu_doc)
            
        print(f"✅ Injected: {name}")

    print("Successfully completed Kolkata expansion pack!")
    await close_client()

if __name__ == "__main__":
    asyncio.run(seed_kolkata())

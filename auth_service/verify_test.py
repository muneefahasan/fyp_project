# Save this file as verify_test.py
from passlib.context import CryptContext

# This MUST match your security.py file
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

# This is the password you are typing in the browser
password_from_user = "password123"

# This is the EXACT hash from your database for police@gov.lk
# I got this from your psql output.
hash_from_db = "$argon2id$v=19$m=65536,t=3,p=4$9sRk1nPAo6xXlCrRssvLBg$Vb2tNdsaG5s2lA2RRiG9H0tpKE/y/tAiFBqCG1XOM8I"

print("--- Manual Hash Verification Test ---")
print(f"Attempting to verify...")
print(f"Password: '{password_from_user}'")
print(f"Hash:     '{hash_from_db}'")
print("-------------------------------------")

try:
    # This is the same function from security.py
    is_valid = pwd_context.verify(password_from_user, hash_from_db)

    if is_valid:
        print("\n✅ SUCCESS: The password matches the hash.")
        print("Your login logic is correct.")
    else:
        print("\n❌ FAILED: The password does NOT match the hash.")
        print("This is very strange. The hash in the DB may be corrupted.")
        
except Exception as e:
    print(f"\n🚨 ERROR: An exception occurred: {e}")
    print("This means the hash in the database is not a valid Argon2 hash.")

print("-------------------------------------")
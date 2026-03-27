# Save this as generate_hash.py
from passlib.context import CryptContext

# Use the exact same context as your app
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

password_to_hash = "password123"

print("--- Argon2 Hash Generator ---")

# Generate the hash
new_hash = pwd_context.hash(password_to_hash)

print(f"Password: '{password_to_hash}'")
print(f"\nYour new hash is:\n")
print(new_hash)
print("\nCopy this full hash (starting with $argon2id$) for the next step.")
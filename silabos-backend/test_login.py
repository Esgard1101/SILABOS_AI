import requests

def test_login():
    url = "http://localhost:8000/api/auth/login"
    
    print("Testing Docente Login...")
    res = requests.post(url, json={
        "email": "docente@unprg.edu.pe",
        "password": "password123"
    })
    
    print(f"Status: {res.status_code}")
    if res.status_code == 200:
        token = res.json().get("access_token")
        print("Obtained Token:", token[:20] + "...")
        test_me(token)
    else:
        print("Response:", res.text)
        
    print("\nTesting Admin Login...")
    res2 = requests.post(url, json={
        "email": "admin@unprg.edu.pe",
        "password": "admin123"
    })
    
    print(f"Status: {res2.status_code}")
    if res2.status_code == 200:
        print("Admin Login OK")
    else:
        print("Response:", res2.text)

def test_me(token):
    print("\nTesting /me endpoint...")
    url = "http://localhost:8000/api/auth/me"
    res = requests.post(url, headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {res.status_code}")
    print("User Data:", res.json())

if __name__ == "__main__":
    test_login()

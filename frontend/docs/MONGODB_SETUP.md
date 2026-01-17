# MongoDB Atlas Setup Guide

## Step 1: Create Account ✓
Go to: https://www.mongodb.com/cloud/atlas/register

---

## Step 2: Choose Plan
- Select **M0 FREE** tier
- Cloud Provider: **AWS** (or any)
- Region: Choose closest to you (e.g., US East, Europe, etc.)
- Cluster Name: Leave as "Cluster0" or name it "mobilify"
- Click **"Create Deployment"**

---

## Step 3: Security Quickstart

### Database User (will appear automatically)
- Username: Choose a username (e.g., `admin` or your name)
- Password: **COPY THIS PASSWORD** - you'll need it!
- Click **"Create Database User"**

### Network Access
- Choose **"My Local Environment"**
- Click **"Add My Current IP Address"**
- **IMPORTANT**: Also click "Add IP Address" and enter `0.0.0.0/0` (allows from anywhere)
- Click **"Finish and Close"**

---

## Step 4: Get Connection String

1. Click **"Connect"** button
2. Choose **"Drivers"**
3. Select **Node.js** and version **6.8 or later**
4. Copy the connection string - looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

---

## Step 5: Update Your App

Replace in your connection string:
- `<username>` → your database username
- `<password>` → your database password
- Add `/mobilify` before the `?` 

Final format should be:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/mobilify?retryWrites=true&w=majority
```

**Copy this entire string - you'll need it!**

---

## Step 6: Test Connection

Once you have your connection string, tell me and I'll:
1. Update your `.env.local` file
2. Restart the server
3. Initialize the database
4. Test that everything works!

---

## Troubleshooting

**If connection fails:**
- Check username/password are correct (no < > brackets)
- Verify IP whitelist includes 0.0.0.0/0
- Make sure `/mobilify` is in the string before `?`
- Password cannot contain special characters like `@`, `:`, `/` (if it does, URL encode it)

---

## What Happens After Connection

The app will automatically:
✅ Create `reports` collection
✅ Create `areas` collection  
✅ Add geospatial indexes
✅ Set up all necessary indexes

Your database will be ready to use!


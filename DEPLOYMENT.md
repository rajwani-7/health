# Emergency Health Assistant - Render Deployment Guide

## 🚀 Deploy to Render

### Prerequisites
✅ GitHub account
✅ Render account (free tier available)
✅ Your code pushed to GitHub repository

---

## Step-by-Step Deployment Instructions

### Step 1: Sign Up / Log In to Render
1. Go to [https://render.com](https://render.com)
2. Click **"Get Started"** or **"Sign In"**
3. Sign up using your GitHub account (recommended for easy integration)

### Step 2: Connect Your GitHub Repository
1. Once logged in, click **"New +"** button in the top right
2. Select **"Web Service"**
3. Click **"Connect Account"** if you haven't connected GitHub yet
4. Select **rajwani-7/health** repository from the list
5. Click **"Connect"**

### Step 3: Configure Your Web Service

Fill in the following details:

**Basic Information:**
- **Name**: `emergency-health-assistant` (or any name you prefer)
- **Region**: Select closest to your location (e.g., Oregon, Frankfurt, Singapore)
- **Branch**: `master`
- **Root Directory**: Leave empty (or `.` if required)

**Build & Deploy:**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app`

**Instance Type:**
- Select **"Free"** (for testing) or **"Starter"** (for production)
- Free tier limitations:
  - Spins down after 15 minutes of inactivity
  - Takes 30-60 seconds to wake up
  - 750 hours/month free

### Step 4: Environment Variables (Optional)
If you want to add any environment variables:
1. Scroll down to **"Environment Variables"** section
2. Click **"Add Environment Variable"**
3. Add any variables you need (none required for basic setup)

### Step 5: Deploy!
1. Scroll to the bottom
2. Click **"Create Web Service"**
3. Render will now:
   - Clone your repository
   - Install dependencies from requirements.txt
   - Start your Flask app with Gunicorn
   - Assign a public URL

### Step 6: Monitor Deployment
You'll see the deployment logs in real-time:
```
==> Cloning from https://github.com/rajwani-7/health...
==> Installing dependencies...
==> Building...
==> Starting application...
==> Your service is live 🎉
```

### Step 7: Access Your Application
Once deployed, Render will provide a URL like:
```
https://emergency-health-assistant.onrender.com
```

Click on the URL to access your live application!

---

## 📝 Post-Deployment

### Automatic Deploys
Render automatically redeploys your app when you push to the `master` branch on GitHub.

### Custom Domain (Optional)
1. Go to your service dashboard
2. Click **"Settings"** tab
3. Scroll to **"Custom Domain"**
4. Add your domain and follow DNS configuration instructions

### Database Persistence
Note: The free tier uses **ephemeral storage**, meaning:
- SQLite database will reset on each deploy
- For persistent data, upgrade to a paid plan or use external database

### View Logs
- Click **"Logs"** tab to see application logs
- Useful for debugging issues

### Monitor Performance
- Click **"Metrics"** tab to see:
  - CPU usage
  - Memory usage
  - Request rate
  - Response time

---

## 🔧 Troubleshooting

### Build Fails
**Check:**
- requirements.txt has correct package names
- Python version compatibility
- Build logs for specific errors

**Fix:**
```bash
# Test locally first
pip install -r requirements.txt
python app.py
```

### Application Won't Start
**Check:**
- Start command is correct: `gunicorn app:app`
- app.py has `app = Flask(__name__)`
- No syntax errors in Python code

**Fix:** Check "Logs" tab for error messages

### 502 Bad Gateway
**Cause:** App crashed or taking too long to start

**Fix:**
- Check logs for Python errors
- Ensure all imports work
- Verify database initialization doesn't fail

### Slow First Load
**Normal for Free Tier:**
- Service spins down after 15 min inactivity
- First request takes 30-60 seconds to wake up
- Subsequent requests are fast

**Solution:** Upgrade to Starter plan ($7/month) for always-on service

---

## 🎯 Quick Commands for Updates

After making changes to your code:

```bash
# 1. Commit changes
git add -A
git commit -m "Your update message"

# 2. Push to GitHub
git push origin master

# 3. Render auto-deploys (watch logs in dashboard)
```

---

## 💡 Pro Tips

1. **Use render.yaml**: Already included for easy configuration
2. **Monitor logs**: Check regularly for errors
3. **Test locally first**: Always test before pushing
4. **Use environment variables**: For sensitive data
5. **Enable pull request previews**: Test changes before merging

---

## 🌐 Your Live URL Structure

```
https://emergency-health-assistant.onrender.com/           # Main page
https://emergency-health-assistant.onrender.com/check_health
https://emergency-health-assistant.onrender.com/find_hospitals
https://emergency-health-assistant.onrender.com/health_history
```

---

## ⚠️ Important Notes

### Free Tier Limitations:
- 750 hours/month (shared across all services)
- Spins down after 15 minutes
- Slower cold starts
- No persistent disk storage

### Recommended for Production:
- **Starter Plan**: $7/month
  - Always on
  - Faster performance
  - No cold starts
  - Better for real users

---

## 📊 Expected Deployment Time

| Step | Time |
|------|------|
| Clone repository | 10-20 seconds |
| Install dependencies | 30-60 seconds |
| Build application | 10-20 seconds |
| Start server | 5-10 seconds |
| **Total** | **~2 minutes** |

---

## ✅ Verification Checklist

After deployment, verify:
- [ ] Application loads at the Render URL
- [ ] Emergency button works
- [ ] Voice input works (requires HTTPS - automatically provided)
- [ ] Hospital finder works (location permission)
- [ ] Map displays correctly
- [ ] No console errors (press F12 to check)

---

## 🆘 Need Help?

- **Render Docs**: [https://render.com/docs](https://render.com/docs)
- **Community Forum**: [https://community.render.com](https://community.render.com)
- **Check deployment logs** in Render dashboard
- **Test locally first** to isolate issues

---

**🎉 Congratulations! Your Emergency Health Assistant is now live on the internet!**

Share your URL: `https://emergency-health-assistant.onrender.com` 🚀

# Live News

Associate Entity True News for news fact checking using AI

## 🚀 Quick Start

This project consists of a FastAPI backend and a React Native frontend. Follow the instructions below to run both services together.

## 📋 Prerequisites

### Backend

- Python 3.13+ (or Python 3.8+)
- pip or uv package manager

### Frontend

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (installed with dependencies)

## 🔧 Setup

### Backend Setup

1. **Navigate to the backend directory:**

   ```bash
   cd apps/fastapi
   ```

2. **Create and activate a virtual environment (recommended):**

   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

   **Note:** If you encounter `lxml` build errors on Windows with Python 3.13, the requirements.txt has been updated to use `lxml>=5.0.0` which includes pre-built wheels. You can test `lxml` installation separately:

   ```bash
   pip install "lxml>=5.0.0"
   ```

### Frontend Setup

1. **Navigate to the frontend directory:**

   ```bash
   cd apps/frontend
   ```

2. **Create environment file:**
   Create a `.env` file in the `apps/frontend` directory with your API URL:

   ```env
   EXPO_PUBLIC_API_URL=http://localhost:8000
   ```

   **Note:**

   - For local development, use `http://localhost:8000` (or `http://127.0.0.1:8000`)
   - For network access (e.g., from a mobile device), replace `localhost` with your computer's IP address or hostname
   - To find your hostname:
     - Windows: Run `echo %COMPUTERNAME%` in Command Prompt
     - macOS/Linux: Run `hostname` in terminal
   - The backend runs on port 8000 by default

3. **Install dependencies:**
   ```bash
   npm install
   ```

## 🏃 Running the Application

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd apps/fastapi

# Activate virtual environment if you created one
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or alternatively:

```bash
python app/main.py
```

The backend API will be available at: **http://localhost:8000**

You can verify it's running by visiting:

- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### Step 2: Start the Frontend

Open a **new terminal** and run:

```bash
cd apps/frontend
npm start
```

Expo will start the Metro bundler (typically on **http://localhost:8081**). You can then:

- Press `w` to open in web browser
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan the QR code with Expo Go app on your phone

The Metro bundler will be available at: **http://localhost:8081**

### Step 3: Run the Data Pipeline

After both services are running, you need to execute the data pipeline in the following order:

#### 1. Scrape All News Articles

```bash
POST http://localhost:8000/scrape/all
```

You can do this using:

- **curl:**
  ```bash
  curl -X POST http://localhost:8000/scrape/all
  ```
- **Postman or any API client**
- **Browser console:**
  ```javascript
  fetch("http://localhost:8000/scrape/all", { method: "POST" })
    .then((r) => r.json())
    .then(console.log);
  ```

#### 2. Cluster Stories

Open a **new terminal** and run:

```bash
cd apps/fastapi/app/services
python3 ./cluster_stories.py
```

Or on Windows:

```powershell
cd apps/fastapi/app/services
python cluster_stories.py
```

This script will:

- Read scraped articles from the data directory
- Cluster similar stories together
- Generate cluster outputs (clusters.json, cluster_assignments.csv, clusters_summary.md)

#### 3. Generate Summaries

```bash
POST http://localhost:8000/summaries
```

Using curl:

```bash
curl -X POST http://localhost:8000/summaries
```

Or with query parameters:

```bash
# Sync mode (wait for completion)
curl -X POST "http://localhost:8000/summaries?mode=sync"

# Background mode (return immediately)
curl -X POST "http://localhost:8000/summaries?mode=background"
```

## 📊 API Endpoints

### Main Endpoints

- `POST /scrape/all` - Scrape all news articles from RSS feeds
- `POST /summaries` - Generate summaries for all clusters
- `GET /summaries` - Get generated summaries (optionally filter by `?cluster_title=...`)
- `GET /health` - Health check endpoint
- `GET /docs` - Interactive API documentation (Swagger UI)

### Additional Endpoints

- `DELETE /scrape/clean?days=7` - Clean old articles (default: 7 days)
- `DELETE /scrape/clear` - Clear all scraped articles
- `GET /duplicates` - Check for duplicate articles
- `WebSocket /ws` - Real-time scraping progress

## 🔄 Complete Workflow

Here's the typical workflow to get news data processed:

1. **Start Backend:** `cd apps/fastapi && python -m uvicorn app.main:app --reload`
2. **Start Frontend:** `cd apps/frontend && npm start`
3. **Scrape Articles:** `POST http://localhost:8000/scrape/all`
4. **Cluster Stories:** `cd apps/fastapi/app/services && python3 cluster_stories.py`
5. **Generate Summaries:** `POST http://localhost:8000/summaries`
6. **View Results:** `GET http://localhost:8000/summaries`

## 🌐 Access Points

- **Frontend Metro Bundler:** http://localhost:8081 (Expo dev server)
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

**Note:** The frontend URL depends on which platform you're running (web, iOS, Android). Expo will display the correct URL when you start the server.

## 🛠️ Troubleshooting

### Backend Issues

**lxml Installation Error:**

- Ensure you're using `lxml>=5.0.0` (already updated in requirements.txt)
- Test separately: `pip install "lxml>=5.0.0"`

**Port Already in Use:**

- Change the port: `uvicorn app.main:app --reload --port 8001`

### Frontend Issues

**Metro Bundler Errors:**

```bash
cd apps/frontend
rm -rf node_modules
npm install
```

**Port Conflicts:**

- The Metro bundler uses port 8081 by default
- Web version may use port 19006 or 3000
- Check if another Expo app is running or change the port

### Data Pipeline Issues

**cluster_stories.py not found:**

- Ensure you're in the correct directory: `apps/fastapi/app/services/`
- Use the correct Python command for your system (`python3` or `python`)

**No scraped articles:**

- Verify the `POST /scrape/all` completed successfully
- Check the data directory: `apps/fastapi/data/scraped_articles/`

## 📁 Project Structure

```
livenews-clean/
├── apps/
│   ├── fastapi/              # Backend API
│   │   ├── app/
│   │   │   ├── main.py       # FastAPI application
│   │   │   └── services/     # Service modules
│   │   │       ├── cluster_stories.py
│   │   │       ├── complete_scraper.py
│   │   │       └── complete_summarizer.py
│   │   ├── requirements.txt
│   │   └── data/             # Generated data
│   └── frontend/             # React Native frontend
│       ├── package.json
│       └── ...
└── README.md                 # This file
```

## 🔗 Additional Resources

- [Frontend README](apps/frontend/README.md) - Detailed frontend documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Expo Documentation](https://docs.expo.dev/)

## 📝 Notes

- The backend runs on port **8000** by default
- The frontend Metro bundler runs on port **8081** by default
- Make sure to create the `.env` file in `apps/frontend/` with `EXPO_PUBLIC_API_URL` pointing to your backend
- The data pipeline must be run in order: scrape → cluster → summarize

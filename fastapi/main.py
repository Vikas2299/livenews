import feedparser
from fastapi import FastAPI, Request, Query, BackgroundTasks, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.websockets import WebSocketState
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from fastapi.staticfiles import StaticFiles
from complete_scraper import CompleteScraper
import asyncio
from pathlib import Path
from typing import Optional, Dict, List
import json

app = FastAPI(title="TruNews - Complete News Scraper")
app.mount("/static", StaticFiles(directory="static"), name="static")

RSS_FEEDS = {
    'BBC':              'https://feeds.bbci.co.uk/news/rss.xml', 
    'PBS':              'https://www.pbs.org/newshour/feeds/rss/headlines', 
    'NPR':              'https://feeds.npr.org/1001/rss.xml', 
    'NY_Times':         'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', 
    'CNN':              'http://rss.cnn.com/rss/edition.rss', 
    'Washington_Post':  'https://feeds.washingtonpost.com/rss/national', 
    'National_Review':  'https://www.nationalreview.com/feed/', 
    'Breitbart':        'https://feeds.feedburner.com/breitbart', 
    'Fox_News':         'http://feeds.foxnews.com/foxnews/latest'
}

templates = Jinja2Templates(directory="templates")
scraper = CompleteScraper()

# WebSocket connections for live updates
websocket_connections = set()

async def broadcast_progress(data: dict):
    """Send progress updates to all connected WebSocket clients"""
    if websocket_connections:
        message = json.dumps(data)
        disconnected = set()
        for websocket in websocket_connections:
            try:
                await websocket.send_text(message)
            except:
                disconnected.add(websocket)
        # Remove disconnected clients
        for ws in disconnected:
            websocket_connections.discard(ws)

# Set the progress callback
scraper.progress_callback = broadcast_progress

def entry_dt(entry) -> datetime:
    """Return a datetime for sorting, with safe fallbacks."""
    date = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if date: 
        return datetime(*date[:6], tzinfo=timezone.utc)
    for key in ("published", "updated"):
        string_date = getattr(entry, key, None)
        if string_date:
            try:
                date_time = parsedate_to_datetime(string_date)
                return date_time if date_time.tzinfo else date_time.replace(tzinfo=timezone.utc)
            except Exception:
                pass
    return datetime(1970, 1, 1, tzinfo=timezone.utc)

def fetch_all_feeds() -> Dict[str, List]:
    """Fetch ALL articles from ALL RSS feeds"""
    articles_by_source = {}
    all_articles = []
    
    print(f"\n{'='*60}")
    print("FETCHING RSS FEEDS")
    print(f"{'='*60}")
    
    for source, feed_url in RSS_FEEDS.items():
        try:
            print(f"📡 Fetching {source}...", end=" ")
            parsed_feed = feedparser.parse(feed_url)
            
            if parsed_feed.entries:
                # Get ALL articles from the feed
                source_articles = [(source, entry) for entry in parsed_feed.entries]
                articles_by_source[source] = source_articles
                all_articles.extend(source_articles)
                print(f"✅ {len(parsed_feed.entries)} articles")
            else:
                print(f"❌ No articles found")
                articles_by_source[source] = []
                
        except Exception as e:
            print(f"❌ Error: {e}")
            articles_by_source[source] = []
    
    # Sort all articles by date
    all_articles.sort(key=lambda item: entry_dt(item[1]), reverse=True)
    
    total = sum(len(articles) for articles in articles_by_source.values())
    print(f"{'='*60}")
    print(f"Total articles found: {total}")
    print(f"{'='*60}\n")
    
    return {"by_source": articles_by_source, "all": all_articles, "total": total}

@app.get("/", response_class=HTMLResponse)
async def index(request: Request, page: int = Query(1, ge=1)):
    """Main page displaying articles"""
    data = fetch_all_feeds()
    articles = data["all"]
    
    per_page = 20
    total_articles = len(articles)
    start = (page-1)*per_page
    end = start + per_page
    paginated_articles = articles[start:end]
    
    # Get statistics
    stats = scraper.get_statistics()
    
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "articles": paginated_articles, 
            "page": page, 
            "total_pages": (total_articles + per_page - 1) // per_page,
            "total_articles": total_articles,
            "scraped_count": stats["total_files"],
            "stats": stats
        }
    )

@app.get('/search')
async def search(request: Request, q: str = Query("")):
    """Search articles"""
    data = fetch_all_feeds()
    articles = data["all"]
    results = [article for article in articles if q.lower() in article[1].title.lower()]
    
    return templates.TemplateResponse(
        "search_results.html",
        {
            "request": request,
            "articles": results, 
            "query": q
        }
    )

@app.post("/scrape/all")
async def scrape_all_articles(background_tasks: BackgroundTasks):
    """Scrape ALL articles from ALL RSS feeds"""
    data = fetch_all_feeds()
    articles_by_source = data["by_source"]
    total = data["total"]
    
    if not articles_by_source:
        return {"error": "No articles to scrape"}
    
    # Start complete scraping in background
    background_tasks.add_task(
        scraper.scrape_all_feeds,
        articles_by_source,
        clear_old=True  # Clean old articles before scraping
    )
    
    return {
        "status": "started",
        "message": f"Started scraping ALL {total} articles from {len(RSS_FEEDS)} sources",
        "sources": list(articles_by_source.keys()),
        "articles_per_source": {k: len(v) for k, v in articles_by_source.items()},
        "total_articles": total
    }

@app.post("/scrape/source/{source_name}")
async def scrape_single_source(source_name: str, background_tasks: BackgroundTasks):
    """Scrape all articles from a specific source"""
    if source_name not in RSS_FEEDS:
        return {"error": f"Unknown source: {source_name}"}
    
    data = fetch_all_feeds()
    articles = data["by_source"].get(source_name, [])
    
    if not articles:
        return {"error": f"No articles found for {source_name}"}
    
    # Scrape just this source
    background_tasks.add_task(
        scraper.scrape_all_feeds,
        {source_name: articles},
        clear_old=False
    )
    
    return {
        "status": "started",
        "source": source_name,
        "articles_to_scrape": len(articles)
    }

@app.delete("/scrape/clean")
async def clean_old_articles(days: int = Query(7, description="Remove articles older than N days")):
    """Clean old scraped articles"""
    removed = scraper.clean_old_articles(days=days)
    return {
        "status": "cleaned",
        "removed_articles": removed,
        "older_than_days": days
    }

@app.delete("/scrape/clear")
async def clear_all_articles():
    """Clear ALL scraped articles and start fresh"""
    scraper.clear_all_articles()
    return {
        "status": "cleared",
        "message": "All scraped articles have been removed"
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time scraping progress"""
    await websocket.accept()
    websocket_connections.add(websocket)
    
    try:
        # Send initial status
        await websocket.send_text(json.dumps({
            "type": "connected",
            "message": "Connected to scraping progress updates"
        }))
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except:
        pass
    finally:
        websocket_connections.discard(websocket)

@app.get("/status")
async def get_status():
    """Get comprehensive scraping status"""
    stats = scraper.get_statistics()
    
    # Get current RSS feed counts
    data = fetch_all_feeds()
    
    return {
        "rss_feeds": {
            "sources": list(RSS_FEEDS.keys()),
            "total_available": data["total"],
            "per_source": {k: len(v) for k, v in data["by_source"].items()}
        },
        "scraped": {
            "total_files": stats["total_files"],
            "total_size_mb": stats["total_size_mb"],
            "unique_urls": stats["unique_urls"],
            "by_source": stats["storage"]
        },
        "last_session": stats["last_session"],
        "websocket_clients": len(websocket_connections)
    }

@app.get("/articles/{source}")
async def get_source_articles(source: str, limit: int = Query(50)):
    """Get scraped articles from a specific source"""
    source_dir = scraper.get_source_folder(source)
    
    if not source_dir.exists():
        return {"error": f"No articles found for source: {source}"}
    
    articles = []
    files = sorted(source_dir.glob("*.md"), key=lambda x: x.stat().st_mtime, reverse=True)
    
    for file_path in files[:limit]:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()[:10]
            
            metadata = {}
            for line in lines:
                if line.startswith('='):
                    break
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip()
            
            articles.append({
                "filename": file_path.name,
                "title": metadata.get("Title", "Untitled"),
                "url": metadata.get("URL", ""),
                "published": metadata.get("Published", ""),
                "scraped": metadata.get("Scraped", ""),
                "size_kb": round(file_path.stat().st_size / 1024, 2)
            })
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    
    return {
        "source": source,
        "count": len(articles),
        "total_in_folder": len(files),
        "articles": articles
    }

@app.get("/article/{source}/{filename}")
async def read_article(source: str, filename: str):
    """Read a specific scraped article"""
    file_path = scraper.get_source_folder(source) / filename
    
    if not file_path.exists():
        return {"error": "Article not found"}
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split metadata and content
        parts = content.split('='*80, 1)
        
        metadata = {}
        if len(parts) > 0:
            for line in parts[0].split('\n'):
                if ':' in line:
                    key, value = line.split(':', 1)
                    metadata[key.strip()] = value.strip()
        
        article_text = parts[1].strip() if len(parts) > 1 else content
        
        return {
            "source": source,
            "filename": filename,
            "metadata": metadata,
            "content": article_text,
            "word_count": len(article_text.split())
        }
        
    except Exception as e:
        return {"error": f"Error reading article: {str(e)}"}

@app.get("/progress")
async def get_progress():
    """Get current scraping progress"""
    return scraper.stats

@app.get("/duplicates")
async def check_duplicates():
    """Check for duplicate articles"""
    url_hashes = scraper.load_url_hashes()
    
    # Group by URL
    duplicates = {}
    for hash_val, data in url_hashes.items():
        url = data.get("url", "")
        if url in duplicates:
            duplicates[url].append(data)
        else:
            duplicates[url] = [data]
    
    # Find actual duplicates
    actual_duplicates = {url: files for url, files in duplicates.items() if len(files) > 1}
    
    return {
        "total_unique_urls": len(url_hashes),
        "duplicate_count": len(actual_duplicates),
        "duplicates": actual_duplicates
    }

# Health check
@app.get("/health")
async def health_check():
    stats = scraper.get_statistics()
    return {
        "status": "healthy",
        "service": "TruNews Complete Scraper",
        "total_scraped": stats["total_files"],
        "sources_configured": len(RSS_FEEDS)
    }

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 TRUNEWS COMPLETE SCRAPER")
    print("="*60)
    print("Access the application at: http://localhost:8000")
    print("="*60 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
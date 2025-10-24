import asyncio
import aiohttp
import aiofiles
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse, urljoin
import re
import json
from bs4 import BeautifulSoup
from newspaper import Article
import hashlib
from typing import Optional, Dict, List, Callable
import time
import shutil
from email.utils import parsedate_to_datetime


class CompleteScraper:
    def __init__(self, storage_dir = Path(__file__).resolve().parents[2] / "data" / "scraped_articles", progress_callback: Optional[Callable] = None):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.progress_callback = progress_callback
        self.url_hash_file = self.storage_dir / "url_hashes.json"
        self.url_hashes = self.load_url_hashes()
        
        # Optimized headers
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive'
        }
        
        # Statistics
        self.stats = {
            "total_to_scrape": 0,
            "completed": 0,
            "failed": 0,
            "duplicates_skipped": 0,
            "start_time": None,
            "current_source": "",
            "sources_completed": []
        }
    

    #TODO: Improve Auto-Delete Overflow Data Algorithm
    #TODO: After Notes Generation pipeline is complete, we can delete all scraping from storage
    def clean_old_articles(self, days: int = 7):
        """Remove articles older than specified days"""
        print(f"\n{'='*60}")
        print(f"CLEANING OLD ARTICLES (older than {days} days)")
        print(f"{'='*60}")
        
        cutoff_date = datetime.now() - timedelta(days=days)
        removed_count = 0
        
        for source_dir in self.storage_dir.iterdir():
            if source_dir.is_dir() and source_dir.name != "__pycache__":
                for file_path in source_dir.glob("*.md"):
                    try:
                        # Check file modification time
                        file_time = datetime.fromtimestamp(file_path.stat().st_mtime)
                        if file_time < cutoff_date:
                            file_path.unlink()
                            removed_count += 1
                            print(f"  ✗ Removed old file: {file_path.name}")
                    except Exception as e:
                        print(f"  Error removing {file_path}: {e}")
        
        print(f"Removed {removed_count} old articles")
        return removed_count
    
    def clear_all_articles(self):
        """Clear all scraped articles and start fresh"""
        print(f"\n{'='*60}")
        print("CLEARING ALL SCRAPED ARTICLES")
        print(f"{'='*60}")
        
        # Remove all source directories
        for source_dir in self.storage_dir.iterdir():
            if source_dir.is_dir() and source_dir.name != "__pycache__":
                shutil.rmtree(source_dir)
                print(f"  ✗ Removed directory: {source_dir.name}")
        
        # Clear URL hashes
        self.url_hashes = {}
        self.save_url_hashes()
        print("Cleared all articles and URL history")
    
    def load_url_hashes(self) -> Dict:
        """Load URL hashes to prevent duplicates"""
        if self.url_hash_file.exists():
            try:
                with open(self.url_hash_file, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}
    
    def save_url_hashes(self):
        """Save URL hashes"""
        try:
            with open(self.url_hash_file, 'w') as f:
                json.dump(self.url_hashes, f, indent=2)
        except Exception as e:
            print(f"Error saving URL hashes: {e}")
    
    def get_url_hash(self, url: str) -> str:
        """Generate unique hash for URL"""
        return hashlib.sha256(url.encode()).hexdigest()
    
    def is_duplicate(self, url: str) -> bool:
        """Check if URL has already been scraped"""
        url_hash = self.get_url_hash(url)
        return url_hash in self.url_hashes
    
    def mark_as_scraped(self, url: str, file_path: str):
        """Mark URL as scraped with file path"""
        url_hash = self.get_url_hash(url)
        self.url_hashes[url_hash] = {
            "url": url,
            "file": str(file_path),
            "scraped_at": datetime.now().isoformat()
        }
    
    def get_source_folder(self, source: str) -> Path:
        """Create and return source-specific folder"""
        safe_source = re.sub(r'[<>:"/\\|?*]', '_', source)
        source_dir = self.storage_dir / safe_source
        source_dir.mkdir(exist_ok=True)
        return source_dir
    
    def generate_filename(self, title: str, published_date: str, source: str) -> str:
        """Generate clean filename"""
        # Clean title
        safe_title = re.sub(r'[<>:"/\\|?*]', '_', title)
        safe_title = re.sub(r'\s+', '_', safe_title)[:80]
        
        # Extract date
        dt = None
        if published_date:
            try:
                dt = parsedate_to_datetime(published_data)
                if dt and dt.tzinfo is None:
                    dt = dt.replace(tzinfo=datetime.now().astimezone().tzinfo)
            except Exception:
                dt = None
        if dt is None:
            dt = datetime.now()

        timestamp = dt.strftime('%Y-%m-%d_%H-%M-%S')
        
        return f"{source}_{timestamp}_{safe_title}.md"
    
    async def print_progress(self, message: str, level: str = "info"):
        """Print colored progress message"""
        colors = {
            "success": "\033[92m",  # Green
            "error": "\033[91m",    # Red
            "warning": "\033[93m",   # Yellow
            "info": "\033[94m",      # Blue
            "header": "\033[95m"     # Purple
        }
        reset = "\033[0m"
        color = colors.get(level, "")
        
        # Calculate progress percentage
        if self.stats["total_to_scrape"] > 0:
            percentage = (self.stats["completed"] / self.stats["total_to_scrape"]) * 100
            progress_bar = f"[{self.stats['completed']}/{self.stats['total_to_scrape']}] {percentage:.1f}%"
        else:
            progress_bar = ""
        
        print(f"{color}{message} {progress_bar}{reset}")
        
        if self.progress_callback:
            await self.progress_callback({
                "message": message,
                "stats": self.stats,
                "level": level
            })
    
    async def scrape_with_newspaper(self, url: str) -> Optional[Dict]:
        """Quick newspaper3k extraction"""
        try:
            article = Article(url)
            article.download()
            article.parse()
            
            if article.text and len(article.text) > 100:
                return {
                    'title': article.title,
                    'content': article.text,
                    'method': 'newspaper3k'
                }
        except:
            pass
        return None
    
    async def scrape_with_requests(self, session: aiohttp.ClientSession, url: str) -> Optional[Dict]:
        """Fast extraction with aiohttp and BeautifulSoup"""
        try:
            timeout = aiohttp.ClientTimeout(total=15)
            async with session.get(url, headers=self.headers, timeout=timeout, ssl=False) as response:
                if response.status != 200:
                    return None
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Remove unwanted elements
                for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript']):
                    tag.decompose()
                
                # Get title
                title = soup.find('title')
                title = title.get_text().strip() if title else "Untitled"
                
                # Try to find article content
                content = ""
                
                # Try common article selectors
                selectors = [
                    'article', '[role="main"]', 'main',
                    '.article-body', '.story-body', '.content',
                    '.post-content', '.entry-content', '#content', 'article__content'
                ]
                
                pictures = []

                for selector in selectors:
                    element = soup.select_one(selector)
                    if element:

                        #get all pictures
                        #TODO: Filter the images to remove ads which are placed in the article
                        #TODO: Ad filtering could be completed with OCR
                        seen = set()
                        for img in element.find_all("img"):
                            image_url = img.get("src") or None
                            image_url = image_url.strip()
                            if image_url not in seen:
                                seen.add(image_url)
                                pictures.append(urljoin(url, image_url))

                        # Get all paragraphs within the element
                        paragraphs = element.find_all(['p', 'h2', 'h3'])
                        content = '\n\n'.join(p.get_text().strip() for p in paragraphs if p.get_text().strip())
                        if len(content) > 200:
                            break
                
                # Fallback to all paragraphs
                if len(content) < 200:
                    all_paragraphs = soup.find_all('p')
                    content = '\n\n'.join(
                        p.get_text().strip() 
                        for p in all_paragraphs 
                        if len(p.get_text().strip()) > 30
                    )
                
                if content and len(content) > 100:
                    return {
                        'title': title,
                        'content': content,
                        'method': 'beautifulsoup',
                        'pictures': pictures
                    }
        except asyncio.TimeoutError:
            await self.print_progress(f"  ⏱️ Timeout: {url[:50]}...", "warning")
        except Exception as e:
            await self.print_progress(f"  ❌ Error: {str(e)[:50]}", "error")
        
        return None
    
    #TODO: Get rid of advertisements in the scrape
    async def scrape_article(self, session: aiohttp.ClientSession, source: str, article_data: dict) -> bool:
        """Scrape a single article"""
        url = article_data.get('link', '')
        title = article_data.get('title', '')
        published = article_data.get('published', '')
        
        if not url:
            return False
        
        # Check for duplicates
        if self.is_duplicate(url):
            self.stats["duplicates_skipped"] += 1
            await self.print_progress(f"  ⏭️ Skipped (duplicate): {title[:60]}...", "warning")
            return False
        
        # Try scraping
        await self.print_progress(f"  📥 Scraping: {title[:60]}...", "info")
        
        # Try fast BeautifulSoup first
        scraped_data = await self.scrape_with_requests(session, url)
        
        # Fallback to newspaper3k
        if not scraped_data:
            scraped_data = await self.scrape_with_newspaper(url)
        
        if not scraped_data or not scraped_data.get('content'):
            self.stats["failed"] += 1
            await self.print_progress(f"  ❌ Failed: {title[:60]}...", "error")
            return False
        
        # Save to file
        source_dir = self.get_source_folder(source)
        filename = self.generate_filename(title or scraped_data['title'], published, source)
        filepath = source_dir / filename
        
        # Prepare content
        file_content = f"""Title: {title or scraped_data['title']}
URL: {url}
Source: {source}
Published: {published or 'Unknown'}
Scraped: {datetime.now().isoformat()}
Method: {scraped_data['method']}
Images: {scraped_data['pictures']}
================================================================================

{scraped_data['content']}
"""
        
        try:
            # Save file
            async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
                await f.write(file_content)
            
            # Mark as scraped
            self.mark_as_scraped(url, filepath)
            self.stats["completed"] += 1
            
            await self.print_progress(f"  ✅ Saved: {filename}", "success")
            return True
            
        except Exception as e:
            self.stats["failed"] += 1
            await self.print_progress(f"  ❌ Save error: {e}", "error")
            return False
    
    async def scrape_source(self, session: aiohttp.ClientSession, source: str, articles: List):
        """Scrape all articles from a source"""
        await self.print_progress(f"\n📰 {source} - Starting {len(articles)} articles", "header")
        self.stats["current_source"] = source
        
        # Process with controlled concurrency
        semaphore = asyncio.Semaphore(3)  # 3 concurrent per source
        
        async def limited_scrape(article):
            async with semaphore:
                return await self.scrape_article(session, source, article[1])
        
        tasks = [limited_scrape(article) for article in articles]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful = sum(1 for r in results if r is True)
        self.stats["sources_completed"].append(source)
        
        await self.print_progress(
            f"✅ {source} Complete: {successful}/{len(articles)} articles saved", 
            "success"
        )
    
    async def scrape_all_feeds(self, articles_by_source: Dict[str, List], clear_old: bool = True):
        """Scrape ALL articles from ALL sources"""
        
        # Clear old articles if requested
        if clear_old:
            self.clean_old_articles(days=3)  # Remove articles older than 3 days
        
        # Calculate total
        self.stats["total_to_scrape"] = sum(len(articles) for articles in articles_by_source.values())
        self.stats["completed"] = 0
        self.stats["failed"] = 0
        self.stats["duplicates_skipped"] = 0
        self.stats["start_time"] = time.time()
        self.stats["sources_completed"] = []
        
        print(f"\n{'='*80}")
        print(f"🚀 COMPLETE SCRAPING SESSION STARTED")
        print(f"{'='*80}")
        print(f"📊 Total articles to process: {self.stats['total_to_scrape']}")
        print(f"📚 Sources: {list(articles_by_source.keys())}")
        print(f"{'='*80}\n")
        
        # Create shared session with connection pooling
        connector = aiohttp.TCPConnector(
            limit=20,  # Total connections
            limit_per_host=3,  # Per host limit
            ttl_dns_cache=300
        )
        
        async with aiohttp.ClientSession(connector=connector) as session:
            # Process each source sequentially to show clear progress
            for source, articles in articles_by_source.items():
                await self.scrape_source(session, source, articles)
                
                # Small delay between sources
                await asyncio.sleep(1)
        
        # Save URL hashes
        self.save_url_hashes()
        
        # Final statistics
        elapsed = time.time() - self.stats["start_time"]
        
        print(f"\n{'='*80}")
        print(f"📊 SCRAPING SESSION COMPLETE")
        print(f"{'='*80}")
        print(f"✅ Successfully scraped: {self.stats['completed']} articles")
        print(f"❌ Failed: {self.stats['failed']} articles")
        print(f"⏭️ Duplicates skipped: {self.stats['duplicates_skipped']}")
        print(f"⏱️ Total time: {elapsed:.2f} seconds")
        print(f"⚡ Speed: {self.stats['completed']/max(elapsed, 1):.2f} articles/second")
        print(f"📁 Sources completed: {', '.join(self.stats['sources_completed'])}")
        print(f"{'='*80}\n")
        
        return self.stats
    
    def get_statistics(self) -> Dict:
        """Get current scraping statistics"""
        storage_stats = {}
        total_files = 0
        total_size = 0
        
        for source_dir in self.storage_dir.iterdir():
            if source_dir.is_dir() and source_dir.name != "__pycache__":
                files = list(source_dir.glob("*.md"))
                size = sum(f.stat().st_size for f in files)
                storage_stats[source_dir.name] = {
                    "files": len(files),
                    "size_mb": round(size / (1024*1024), 2)
                }
                total_files += len(files)
                total_size += size
        
        return {
            "storage": storage_stats,
            "total_files": total_files,
            "total_size_mb": round(total_size / (1024*1024), 2),
            "unique_urls": len(self.url_hashes),
            "last_session": self.stats
        }
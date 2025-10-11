from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process
load_dotenv()
from pathlib import Path
import os

from crewai import LLM
from cluster_organization import get_view_text_by_cluster, build_view_summary_tasks

ENV_PATH = Path(__file__).with_name(".env")
load_dotenv(ENV_PATH)

print("Loaded GOOGLE_API_KEY?", bool(os.getenv("GOOGLE_API_KEY")))

api_key = os.getenv("GOOGLE_API_KEY")

llm = LLM(
    model="gemini/gemini-2.5-flash",
    api_key= api_key,
    temperature=0.5
)

def run_view_summaries(text_views_by_cluster, view):
    articles_summarizer = Agent(
        role="News Summarizer",
        goal="Summarize sources for each cluster in a 300 word summary with verifiable facts.",
        backstory="Expert news analyst who distills multiple articles into neutral, structured briefs.",
        allow_delegation=False,
        llm=llm,
        verbose=True
    )

    tasks = build_view_summary_tasks(text_views_by_cluster, articles_summarizer, view)
    crew = Crew(agents=[articles_summarizer], tasks=tasks, process=Process.sequential)
    return crew.kickoff()


text_views_by_cluster = get_view_text_by_cluster()
view = "RIGHT"              ## change this to be LEFT, RIGHT, CENTER
results = run_view_summaries(text_views_by_cluster, view)

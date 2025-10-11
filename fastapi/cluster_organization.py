import json
from crewai import Task

CENTER_LIST = ["BBC", "NPR", "PBS"]
RIGHT_LIST = ["Fox_News", "Breitbart"]
LEFT_LIST = ["NY_Times", "CNN", "Washington_Post"]

with open("./cluster_output/clusters.json", "r", encoding="utf-8") as f:
    data = json.load(f)



def gather_articles_by_cluster_by_view(viewpoint_list):
    files_by_cluster = {
        cluster["representative_title"]: [m["path"] for m in cluster["members"] if m["source"] in viewpoint_list]
        for cluster in data
    }
    return files_by_cluster



def get_text_by_viewpoint(files_by_cluster):
    specific_article_texts = {}
    for title, files in files_by_cluster.items():

        title_article_text = []
        for file in files:
            with open(file, "r", encoding="utf-8") as f:
                raw_text = f.read()

            parts = raw_text.split("================================================================================")
        
            #If a separator exists, take the part after it"
            if len(parts) > 1:
                article_text = parts[1].strip()

            #Should not be reached 
            else:
                article_text = raw_text.strip()
            
            title_article_text.append(article_text)
        
        specific_article_texts[title] = title_article_text


    return specific_article_texts


def get_view_text_by_cluster():

    left_files_by_cluster = gather_articles_by_cluster_by_view(LEFT_LIST)
    right_files_by_cluster = gather_articles_by_cluster_by_view(RIGHT_LIST)
    center_files_by_cluster = gather_articles_by_cluster_by_view(CENTER_LIST)

    left_specific_article_texts = get_text_by_viewpoint(left_files_by_cluster)
    right_specific_article_texts = get_text_by_viewpoint(right_files_by_cluster)
    center_specific_article_texts = get_text_by_viewpoint(center_files_by_cluster)

    #RN we have three dicts with the same inde

    all_specific_article_texts_by_source = {}
    for title, text_list in left_specific_article_texts.items():
        all_texts_by_source = []

        #make a list of lists. 
        #each sublist contains all of the article text of a view point for a source
        all_texts_by_source.append(text_list)
        all_texts_by_source.append(right_specific_article_texts[title])
        all_texts_by_source.append(center_specific_article_texts[title])

        all_specific_article_texts_by_source[title] = all_texts_by_source

    return all_specific_article_texts_by_source


### {"tylenol gives babies autism": [LEFT ARTICLES TEXT, RIGHT ARTICLES TEXT, CENTER ARTICLES TEXT]}

def join_articles(texts):
    """Join articles with a clear delimiter"""
    joined = "\n\n--- ARTICLE SEPARATOR ---\n\n".join(t.strip() for t in texts if t and t.strip())
    return joined


def make_summary_agent_prompt(cluster_title, view_texts, view):

    body = join_articles(view_texts)
    
    return f"""You are summarizing articles for the news cluster:
"{cluster_title}"

GOAL:
- Produce a 300 words concise summary.
- Include 3-5 concrete, verifiable facts (short, quotable snippets).
- Be neutral and avoid speculation.
- If multiple articles repeat the same fact, collapse duplicates.

INPUT (all articles, separated by a delimiter):
{body}

Return ONLY JSON:
{{
  "cluster_title": "{cluster_title}",
  "viewpoint": "{view}",
  "summary": "...",
  "key_facts": [{{"claim": "...", "short_quote": "..."}}]
}}
"""

def build_view_summary_tasks(text_views_by_cluster, agent, view):

    view_index = 0 if view == "LEFT" else (1 if view == "RIGHT" else 2)

    tasks = []
    for cluster_title, view_lists in text_views_by_cluster.items():
        view_texts = (view_lists[view_index] if len(view_lists) > 0 else []) or []
        if not view_texts:
            continue  # skip clusters with no articles from the viewpoint
        prompt = make_summary_agent_prompt(cluster_title, view_texts, view)
        tasks.append(Task(
            description=prompt,
            expected_output='JSON with fields: cluster_title, viewpoint, summary, key_facts[].',
            agent=agent
        ))
    return tasks

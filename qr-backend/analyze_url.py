import whois
import requests
import os
import time
import base64
from urllib.parse import urlparse
from datetime import datetime
from dotenv import load_dotenv

# .env 파일에서 환경변수 불러오기
load_dotenv()
VIRUSTOTAL_API_KEY = os.getenv("VIRUSTOTAL_API_KEY")


def check_virustotal(url):
    """
    VirusTotal에 URL을 제출하고 결과를 조회하는 함수
    """
    if not VIRUSTOTAL_API_KEY:
        return "API key not set"

    try:
        # URL을 Base64로 인코딩
        url_bytes = url.encode("utf-8")
        url_id = base64.urlsafe_b64encode(url_bytes).decode().strip("=")

        headers = {"x-apikey": VIRUSTOTAL_API_KEY}
        # VirusTotal v3 API: GET /urls/{url_id}
        result_url = f"https://www.virustotal.com/api/v3/urls/{url_id}"
        response = requests.get(result_url, headers=headers)

        if response.status_code == 200:
            data = response.json()
            stats = data["data"]["attributes"]["last_analysis_stats"]
            malicious = stats.get("malicious", 0)
            suspicious = stats.get("suspicious", 0)
            harmless = stats.get("harmless", 0)
            undetected = stats.get("undetected", 0)
            return f"{malicious} malicious / {suspicious} suspicious / {harmless} harmless / {undetected} undetected"
        elif response.status_code == 404:
            return "URL not found in VT"
        else:
            return f"error: {response.status_code}"

    except Exception as e:
        return f"error: {str(e)}"


def analyze_url(url):
    """
    URL을 분석하여 도메인, SSL 유효성, WHOIS 생성일, VirusTotal 결과 반환
    """
    result = {
        "original_url": url,
        "final_url": None,
        "domain": None,
        "whois_creation_date": None,
        "ssl_valid": False,
        "virustotal_score": None,
        "phishtank_result": False,
        "label": None
    }

    try:
        # 1️⃣ 도메인 추출
        parsed = urlparse(url)
        domain = parsed.netloc or parsed.path
        result["domain"] = domain

        # 2️⃣ WHOIS 조회
        try:
            w = whois.whois(domain)
            creation_date = w.creation_date
            if isinstance(creation_date, list):
                creation_date = creation_date[0]
            if creation_date:
                result["whois_creation_date"] = creation_date.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            result["whois_creation_date"] = None

        # 3️⃣ SSL 유효성 검사
        try:
            r = requests.get(url, timeout=5, allow_redirects=True)
            result["ssl_valid"] = r.url.startswith("https://")
            result["final_url"] = r.url
        except Exception:
            result["ssl_valid"] = False

        # 4️⃣ VirusTotal 검사
        result["virustotal_score"] = check_virustotal(url)

        # 5️⃣ 단순 판별 로직
        if not result["ssl_valid"]:
            result["label"] = "위험"
        elif result["whois_creation_date"]:
            year = datetime.strptime(result["whois_creation_date"], "%Y-%m-%d %H:%M:%S").year
            if year >= 2023:
                result["label"] = "의심"
            else:
                result["label"] = "안전"
        else:
            result["label"] = "의심"

    except Exception as e:
        result["error"] = str(e)

    return result

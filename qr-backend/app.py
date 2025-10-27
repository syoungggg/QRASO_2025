from flask import Flask, request, jsonify
from flask_cors import CORS
from qr_decoder import decode_qr
from analyze_url import analyze_url
import os
import json
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import mysql.connector
from urllib.parse import urlparse
import traceback

print("🔥 Flask app.py import 시작됨", flush=True)

# -------------------
# 환경 변수 로드
# -------------------
try:
    load_dotenv()
except Exception as e:
    print("❌ dotenv 로드 실패:", e, flush=True)
    traceback.print_exc()

# -------------------
# Flask 서버 설정
# -------------------
app = Flask(__name__)
print("✅ Flask 인스턴스 생성됨", flush=True)

try:
    CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
except Exception as e:
    print("❌ CORS 설정 중 오류:", e, flush=True)
    traceback.print_exc()

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# -------------------
# MySQL 연결 설정
# -------------------
db_url = os.getenv("DATABASE_URL")  # Railway 내부 변수
if not db_url:
    raise Exception("❌ DATABASE_URL 환경 변수가 설정되어 있지 않습니다!")

parsed = urlparse(db_url)
MYSQL_CONFIG = {
    "host": parsed.hostname,
    "port": parsed.port or 3306,
    "user": parsed.username,
    "password": parsed.password,
    "database": parsed.path.lstrip('/')
}

def get_db_connection():
    return mysql.connector.connect(**MYSQL_CONFIG)

# -------------------
# DB 초기화 (테이블 자동 생성)
# -------------------
def init_db():
    print("🔧 MySQL DB 초기화 시작", flush=True)
    try:
        conn = get_db_connection()
        c = conn.cursor()

        tables = ['reports', 'suspected', 'warning']
        for table in tables:
            c.execute(f'''
                CREATE TABLE IF NOT EXISTS {table} (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    original_url VARCHAR(512) NOT NULL UNIQUE,  -- ✅ 길이 줄임
                    final_url VARCHAR(512),
                    domain VARCHAR(255),
                    ssl_valid BOOLEAN,
                    whois_creation_date VARCHAR(128),
                    virustotal_score VARCHAR(128),
                    phishtank_result BOOLEAN,
                    label VARCHAR(16),
                    count INT DEFAULT 1,
                    analysis_json TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    reported_count INT DEFAULT 0
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ''')
        conn.commit()
        conn.close()
        print("✅ MySQL 테이블 생성 완료", flush=True)
    except Exception as e:
        print("❌ DB 초기화 중 오류:", e, flush=True)
        traceback.print_exc()

init_db()

# -------------------
# DB 저장 함수
# -------------------
def save_report(analysis_result):
    try:
        url = analysis_result["original_url"]
        label = analysis_result.get("label", "의심")

        conn = get_db_connection()
        c = conn.cursor(dictionary=True)

        c.execute("SELECT id, count FROM reports WHERE original_url=%s", (url,))
        row = c.fetchone()

        if row:
            new_count = row["count"] + 1
            c.execute('''
                UPDATE reports SET count=%s, final_url=%s, domain=%s, ssl_valid=%s,
                whois_creation_date=%s, virustotal_score=%s, phishtank_result=%s,
                label=%s, analysis_json=%s WHERE id=%s
            ''', (
                new_count,
                analysis_result.get("final_url"),
                analysis_result.get("domain"),
                analysis_result.get("ssl_valid"),
                analysis_result.get("whois_creation_date"),
                analysis_result.get("virustotal_score"),
                analysis_result.get("phishtank_result"),
                label,
                json.dumps(analysis_result, ensure_ascii=False),
                row["id"]
            ))
        else:
            c.execute('''
                INSERT INTO reports (
                    original_url, final_url, domain, ssl_valid, whois_creation_date,
                    virustotal_score, phishtank_result, label, analysis_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                url,
                analysis_result.get("final_url"),
                analysis_result.get("domain"),
                analysis_result.get("ssl_valid"),
                analysis_result.get("whois_creation_date"),
                analysis_result.get("virustotal_score"),
                analysis_result.get("phishtank_result"),
                label,
                json.dumps(analysis_result, ensure_ascii=False)
            ))

        # suspected / warning 분기 저장
        if label == "의심":
            print("🟡 [DB] suspected 테이블에 저장", flush=True)
            c.execute('''
                INSERT IGNORE INTO suspected (
                    original_url, final_url, domain, ssl_valid,
                    whois_creation_date, virustotal_score,
                    phishtank_result, label, analysis_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                url,
                analysis_result.get("final_url"),
                analysis_result.get("domain"),
                analysis_result.get("ssl_valid"),
                analysis_result.get("whois_creation_date"),
                analysis_result.get("virustotal_score"),
                analysis_result.get("phishtank_result"),
                label,
                json.dumps(analysis_result, ensure_ascii=False)
            ))

        elif label == "위험":
            print("🔴 [DB] warning 테이블에 바로 저장", flush=True)
            c.execute('''
                INSERT IGNORE INTO warning (
                    original_url, final_url, domain, ssl_valid,
                    whois_creation_date, virustotal_score,
                    phishtank_result, label, analysis_json
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (
                url,
                analysis_result.get("final_url"),
                analysis_result.get("domain"),
                analysis_result.get("ssl_valid"),
                analysis_result.get("whois_creation_date"),
                analysis_result.get("virustotal_score"),
                analysis_result.get("phishtank_result"),
                label,
                json.dumps(analysis_result, ensure_ascii=False)
            ))

        conn.commit()
        conn.close()

    except Exception as e:
        print("❌ save_report() 오류:", e, flush=True)
        traceback.print_exc()

# -------------------
# 신고 API (3회 이상 → warning 이동)
# -------------------
@app.route('/report_qr', methods=['POST'])
def report_qr():
    try:
        data = request.get_json()
        url = data.get("url")
        if not url:
            return jsonify({"error": "URL 필요"}), 400

        conn = get_db_connection()
        c = conn.cursor(dictionary=True)
        c.execute("SELECT id, reported_count FROM suspected WHERE original_url=%s", (url,))
        row = c.fetchone()

        if not row:
            conn.close()
            return jsonify({"error": "이미 신고 처리된 QR 입니다."}), 400

        reported_count = row["reported_count"] + 1

        if reported_count >= 3:
            print("🚨 신고 누적 3회 이상 → warning 이동", flush=True)
            c.execute("INSERT IGNORE INTO warning SELECT * FROM suspected WHERE id=%s", (row["id"],))
            c.execute("DELETE FROM suspected WHERE id=%s", (row["id"],))
        else:
            c.execute("UPDATE suspected SET reported_count=%s WHERE id=%s", (reported_count, row["id"]))

        conn.commit()
        conn.close()
        return jsonify({"status": "신고 완료", "current_count": reported_count}), 200

    except Exception as e:
        print("❌ report_qr() 오류:", e, flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------
# QR 디코드 + URL 분석
# -------------------
@app.route('/decode_qr', methods=['POST', 'OPTIONS'])
def decode_qr_route():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200

    try:
        if 'file' in request.files:
            file = request.files['file']
            if file.filename == '':
                return jsonify({"error": "파일 없음"}), 400
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)

            qr_text = decode_qr(filepath)
            if not qr_text:
                return jsonify({"error": "QR 코드 디코딩 실패"}), 400
        else:
            data = request.get_json()
            if not data or "url" not in data or not data["url"]:
                return jsonify({"error": "URL 데이터 없음"}), 400
            qr_text = data["url"]

        print(f"[서버 수신] QR 내용: {qr_text}", flush=True)
        analysis_result = analyze_url(qr_text)
        analysis_result["original_url"] = qr_text

        save_report(analysis_result)

        print(f"[분석 결과] {analysis_result}", flush=True)

        return jsonify({
            "original_url": qr_text,
            "final_url": analysis_result.get("final_url"),
            "domain": analysis_result.get("domain"),
            "ssl_valid": analysis_result.get("ssl_valid"),
            "whois_creation_date": analysis_result.get("whois_creation_date"),
            "virustotal_score": analysis_result.get("virustotal_score"),
            "label": analysis_result.get("label", "의심")
        }), 200

    except Exception as e:
        print("❌ decode_qr_route() 오류:", e, flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------
# WARNING 테이블 조회 (대시보드)
# -------------------
@app.route('/get_warning', methods=['GET'])
def get_warning():
    try:
        conn = get_db_connection()
        c = conn.cursor(dictionary=True)
        c.execute("SELECT original_url, final_url, domain, ssl_valid, whois_creation_date, virustotal_score, phishtank_result, label FROM warning")
        rows = c.fetchall()
        conn.close()
        return jsonify(rows), 200
    except Exception as e:
        print("❌ get_warning() 오류:", e, flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------
# 서버 실행
# -------------------
@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response

if __name__ == '__main__':
    print("🚀 Flask starting (MySQL) ...", flush=True)
    try:
        port = int(os.environ.get("PORT", 8080))
        app.run(host="0.0.0.0", port=port)
    except Exception as e:
        print("❌ Flask crashed:", e, flush=True)
        traceback.print_exc()

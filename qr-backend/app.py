from flask import Flask, request, jsonify
from flask_cors import CORS
from qr_decoder import decode_qr
from analyze_url import analyze_url
import os
import sqlite3
import json
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
import sys, traceback

print("🔥 Flask app.py import 시작됨", flush=True)

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
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
DB_PATH = os.path.join("/tmp", "reports.db")

# -------------------
# DB 초기화 (컬럼 자동 추가)
# -------------------
def init_db():
    print("🔧 DB 초기화 시작", flush=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    tables = ['reports', 'suspected', 'warning']
    for table in tables:
        c.execute(f'''
            CREATE TABLE IF NOT EXISTS {table} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_url TEXT NOT NULL UNIQUE,
                final_url TEXT,
                domain TEXT,
                ssl_valid BOOLEAN,
                whois_creation_date TEXT,
                virustotal_score TEXT,
                phishtank_result BOOLEAN,
                label TEXT,
                count INTEGER DEFAULT 1,
                analysis_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        c.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in c.fetchall()]
        if "reported_count" not in columns:
            c.execute(f"ALTER TABLE {table} ADD COLUMN reported_count INTEGER DEFAULT 0")

    conn.commit()
    conn.close()
    print("✅ DB 초기화 완료", flush=True)

try:
    init_db()
except Exception as e:
    print("❌ DB 초기화 중 오류:", e, flush=True)
    traceback.print_exc()

# -------------------
# DB 저장 함수
# -------------------
def save_report(analysis_result):
    try:
        url = analysis_result["original_url"]
        label = analysis_result.get("label", "의심")
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()

        # reports 테이블 업데이트
        c.execute("SELECT id, count FROM reports WHERE original_url=?", (url,))
        row = c.fetchone()

        if row:
            report_id, count = row
            new_count = count + 1
            c.execute(
                "UPDATE reports SET count=?, final_url=?, domain=?, ssl_valid=?, whois_creation_date=?, virustotal_score=?, phishtank_result=?, label=?, analysis_json=? WHERE id=?",
                (
                    new_count,
                    analysis_result.get("final_url"),
                    analysis_result.get("domain"),
                    analysis_result.get("ssl_valid"),
                    analysis_result.get("whois_creation_date"),
                    analysis_result.get("virustotal_score"),
                    analysis_result.get("phishtank_result"),
                    label,
                    json.dumps(analysis_result, ensure_ascii=False),
                    report_id
                )
            )
        else:
            new_count = 1
            c.execute('''
                INSERT INTO reports (
                    original_url, final_url, domain, ssl_valid, whois_creation_date,
                    virustotal_score, phishtank_result, label, count, analysis_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                url,
                analysis_result.get("final_url"),
                analysis_result.get("domain"),
                analysis_result.get("ssl_valid"),
                analysis_result.get("whois_creation_date"),
                analysis_result.get("virustotal_score"),
                analysis_result.get("phishtank_result"),
                label,
                new_count,
                json.dumps(analysis_result, ensure_ascii=False)
            ))

        conn.commit()
        conn.close()
    except Exception as e:
        print("❌ save_report() 오류:", e, flush=True)
        traceback.print_exc()

# -------------------
# 신고 API
# -------------------
@app.route('/report_qr', methods=['POST'])
def report_qr():
    try:
        data = request.get_json()
        url = data.get("url")
        if not url:
            return jsonify({"error": "URL 필요"}), 400

        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT id, reported_count FROM suspected WHERE original_url=?", (url,))
        row = c.fetchone()
        if not row:
            conn.close()
            return jsonify({"error": "이미 신고 처리된 QR 입니다."}), 400

        suspected_id, reported_count = row
        reported_count += 1

        if reported_count >= 3:
            c.execute("INSERT OR REPLACE INTO warning SELECT * FROM suspected WHERE id=?", (suspected_id,))
            c.execute("DELETE FROM suspected WHERE id=?", (suspected_id,))
        else:
            c.execute("UPDATE suspected SET reported_count=? WHERE id=?", (reported_count, suspected_id))

        conn.commit()
        conn.close()
        return jsonify({"status": "신고 완료", "current_count": reported_count}), 200
    except Exception as e:
        print("❌ report_qr() 오류:", e, flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------
# Health 체크
# -------------------
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

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
# WARNING 테이블 조회
# -------------------
@app.route('/get_warning', methods=['GET'])
def get_warning():
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT original_url, final_url, domain, ssl_valid, whois_creation_date, virustotal_score, phishtank_result, label FROM warning")
        rows = c.fetchall()
        conn.close()
        
        warnings = []
        for row in rows:
            warnings.append({
                "original_url": row[0],
                "final_url": row[1],
                "domain": row[2],
                "ssl_valid": row[3],
                "whois_creation_date": row[4],
                "virustotal_score": row[5],
                "label": row[7],
            })
        return jsonify(warnings), 200
    except Exception as e:
        print("❌ get_warning() 오류:", e, flush=True)
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------
# 서버 실행
# -------------------
if __name__ == '__main__':
    print("🚀 Flask starting ...", flush=True)
    try:
        port = int(os.environ.get("PORT", 8080))  # ✅ Railway가 PORT 환경변수로 주는 값 사용
        app.run(host="0.0.0.0", port=port)
    except Exception as e:
        import traceback
        print("❌ Flask crashed:", e, flush=True)
        traceback.print_exc()


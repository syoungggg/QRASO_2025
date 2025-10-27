# Python 3.12 기반 이미지 사용
FROM python:3.12-slim

# 시스템 패키지 업데이트 + zbar 설치
RUN apt-get update && apt-get install -y libzbar0

# 앱 디렉토리 설정
WORKDIR /app/qr-backend

# 종속성 복사 및 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# Flask 앱 실행 (gunicorn)
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "app:app"]

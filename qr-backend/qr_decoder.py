from pyzbar.pyzbar import decode
from PIL import Image

def decode_qr(image_path):
    """
    이미지에서 QR 코드를 읽어 URL이나 텍스트를 반환
    :param image_path: QR 이미지 파일 경로
    :return: QR 안의 텍스트 (URL)
    """
    try:
        img = Image.open(image_path)
        decoded_objects = decode(img)

        if not decoded_objects:
            return None  # QR 코드 없음

        # 첫 번째 QR 코드 텍스트 반환
        qr_text = decoded_objects[0].data.decode("utf-8")
        return qr_text

    except Exception as e:
        print(f"QR 디코드 에러: {e}")
        return None

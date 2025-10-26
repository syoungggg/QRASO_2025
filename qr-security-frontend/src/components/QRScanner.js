import React, { useState, useRef } from "react";
import { QrReader } from "react-qr-reader";
import axios from "axios";

function QRScanner({ onResult }) {
  const [data, setData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useFrontCamera, setUseFrontCamera] = useState(false);
  const qrRef = useRef(null);

  const handleScan = async (scanData) => {
    if (!scanData) return;

    const scannedUrl = typeof scanData === "string" ? scanData : scanData?.text;
    if (!scannedUrl || scannedUrl.trim() === "") return;

    if (isLoading) return;
    setIsLoading(true);
    setData(scannedUrl);

    try {
      const response = await axios.post(
        "http://localhost:5000/decode_qr",
        { url: scannedUrl },
        { headers: { "Content-Type": "application/json" } }
      );

      console.log("서버 응답:", response.data);

      if (onResult && typeof onResult === "function") {
        onResult(response.data);
      }
    } catch (error) {
      console.error("서버 요청 실패:", error);
      alert("QR 코드 분석 중 오류가 발생했습니다. 서버가 실행 중인지 확인하세요.");
    } finally {
      setIsLoading(false);
      setIsScanning(false);
    }
  };

  return (
    <div className="border-4 border-dashed rounded-2xl p-12 text-center transition-all bg-white hover:border-gray-400">
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
          {isLoading ? (
            <div className="animate-spin text-blue-500 text-5xl">🔄</div>
          ) : (
            <div className="text-gray-400 text-5xl">📷</div>
          )}
        </div>

        <div className="text-gray-600 mb-2">
          <p className="font-medium">QR 코드 스캔하기</p>
          <p className="text-sm text-gray-500">카메라를 QR 코드에 맞춰주세요</p>
        </div>

        {!isScanning ? (
          <button
            onClick={() => setIsScanning(true)}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            📷 스캔 시작
          </button>
        ) : (
          <button
            onClick={() => setIsScanning(false)}
            className="px-8 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            ❌ 스캔 중지
          </button>
        )}

        <button
          onClick={() => setUseFrontCamera((prev) => !prev)}
          className="px-6 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          🔄 {useFrontCamera ? "후면 카메라로 전환" : "전면 카메라로 전환"}
        </button>

        {isScanning && (
          <div className="mt-4 w-64 h-64 border-2 border-blue-400 rounded-xl overflow-hidden shadow-md">
            <QrReader
              ref={qrRef}
              constraints={{ facingMode: useFrontCamera ? "user" : "environment" }}
              onResult={(result, error) => {
                if (!!result) handleScan(result?.text || result);
              }}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        )}

        {data && !isLoading && (
          <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-200 w-full max-w-md text-left">
            <h3 className="font-semibold text-gray-700 mb-2">스캔된 URL</h3>
            <a
              href={data}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all text-sm"
            >
              {data}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default QRScanner;

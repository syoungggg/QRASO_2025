import React, { useState } from "react";
import QRUpload from "../components/QRUpload";
import QRScanner from "../components/QRScanner";
import QRResultList from "../components/QRResultList";
import axios from "axios";

// 신고 API
const reportQR = async (url) => {
  try {
    const response = await axios.post("http://127.0.0.1:5000/report_qr", { url });
    return response.data; // { status: "신고 완료", current_count: n }
  } catch (error) {
    console.error("신고 요청 중 오류 발생:", error);
    return { error: error.response?.data?.error || "신고 실패" };
  }
};

function Home() {
  const [mode, setMode] = useState("upload");
  const [results, setResults] = useState([]);

  const handleResult = async (result) => {
    try {
      let url = "";

      if (typeof result === "string") {
        url = result;
      } else if (result && result.original_url) {
        url = result.original_url;
      } else {
        console.warn("잘못된 결과 형식:", result);
        return;
      }

      if (typeof result === "string") {
        const response = await axios.post("http://127.0.0.1:5000/decode_qr", { url });
        result = response.data;
      }

      const resultData = {
        id: Date.now(),
        original_url: result.original_url,
        final_url: result.final_url,
        domain: result.domain,
        ssl_valid: result.ssl_valid ? "유효" : "무효",
        whois_creation_date: result.whois_creation_date,
        virustotal_score: result.virustotal_score,
        phishtank_result: result.phishtank_result ? "위험" : "위험",
        label: result.label,
        reported_count: 0, // 신고 횟수 초기화
      };

      setResults((prev) => [...prev, resultData]);
    } catch (error) {
      console.error("QR 분석 중 오류:", error);
      alert("QR 코드 분석 중 오류가 발생했습니다. 서버를 확인하세요.");
    }
  };

  const handleReport = async (id, url) => {
    const result = await reportQR(url);
    if (result.error) {
      alert(result.error);
      return;
    }

    alert(`신고 완료! 현재 신고 횟수: ${result.current_count}`);

    // 신고 횟수 업데이트
    setResults((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, reported_count: result.current_count } : r
      )
    );
  };

  const deleteResult = (id) => {
    setResults(results.filter((r) => r.id !== id));
  };

  const deleteAll = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            QR Analysis & Security Operation
          </h1>
          <p className="text-gray-600">
            QR 코드를 업로드하거나 스캔하여 안전성을 검사하세요
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setMode("upload")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  mode === "upload"
                    ? "bg-white shadow-md border-2 border-blue-500 text-blue-600"
                    : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                📤 업로드
              </button>
              <button
                onClick={() => setMode("scan")}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  mode === "scan"
                    ? "bg-white shadow-md border-2 border-blue-500 text-blue-600"
                    : "bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                📷 QR 스캔
              </button>
            </div>

            {mode === "upload" ? (
              <QRUpload onResult={handleResult} />
            ) : (
              <QRScanner onResult={handleResult} />
            )}
          </div>

          <div>
            <QRResultList
              results={results}
              deleteResult={deleteResult}
              deleteAll={deleteAll}
              onReport={handleReport} // 신고 버튼 핸들러 전달
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;

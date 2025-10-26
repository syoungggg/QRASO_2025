import React, { useState } from "react";

function QRResultItem({ result, index, onDelete, onReport }) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusConfig = (label) => {
    switch (label) {
      case "안전":
        return { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", emoji: "✅" };
      case "의심":
        return { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", emoji: "⚠️" };
      case "위험":
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", emoji: "🚨" };
      default:
        return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", emoji: "📋" };
    }
  };

  const config = getStatusConfig(result.label);

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-gray-400 font-medium mt-1">{index + 1}</span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg mb-2">
              <span className="text-blue-600">🔗</span>
              <span className="text-sm font-medium text-blue-700">URL:</span>
              <a
                href={result.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline truncate"
              >
                {result.original_url}
              </a>
            </div>

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg ${config.bg} ${config.text} border ${config.border}`}>
              <span>{config.emoji}</span>
              <span className="font-medium text-sm">검사 결과: {result.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium"
          >
            {showDetails ? "닫기" : "상세"}
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(result.original_url);
              alert("URL이 복사되었습니다!");
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="URL 복사"
          >
            📋
          </button>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded transition-colors" title="삭제">
            <span className="text-red-600">🗑️</span>
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="ml-8 mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">📋 세부 검사 결과</h4>
          <ul className="space-y-2 text-sm">
            <li><span className="font-semibold text-gray-700">domain:</span> {result.domain}</li>
            <li><span className="font-semibold text-gray-700">final_url:</span> {result.final_url}</li>
            <li><span className="font-semibold text-gray-700">ssl_valid:</span> {result.ssl_valid}</li>
            <li><span className="font-semibold text-gray-700">whois_creation_date:</span> {result.whois_creation_date}</li>
            <li><span className="font-semibold text-gray-700">virustotal_score:</span> {result.virustotal_score}</li>
            <li><span className="font-semibold text-gray-700">phishtank_result:</span> {result.phishtank_result}</li>
          </ul>

          <div className="flex gap-2 mt-4 flex-wrap">
            <a
              href={result.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
            >
              🔗 페이지 미리보기
            </a>

            {/* 신고 버튼: 의심 QR만 표시, 클릭 시 Home.js의 handleReport 호출 */}
            {result.label === "의심" && (
              <button
                onClick={onReport}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
              >
                🚨 신고하기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default QRResultItem;

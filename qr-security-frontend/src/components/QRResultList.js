import React from "react";
import QRResultItem from "./QRResultItem";

function QRResultList({ results, deleteResult, deleteAll, onReport }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-800">스캔된 항목 ({results.length})</h2>
        {results.length > 0 && (
          <button
            onClick={deleteAll}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            전체 삭제
          </button>
        )}
      </div>

      <div className="bg-gray-100 rounded-t-xl p-3 flex items-center justify-between">
        <span className="text-gray-600 font-medium">검사 결과</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-sm">목록</span>
          <input
            type="number"
            defaultValue="50"
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-b-xl shadow-md divide-y divide-gray-100">
        {results.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="text-6xl mb-4 opacity-30">📱</div>
            <p className="text-lg">스캔된 항목이 없습니다</p>
          </div>
        ) : (
          results.map((result, index) => (
            <QRResultItem
              key={result.id}
              result={result}
              index={index}
              onDelete={() => deleteResult(result.id)}
              onReport={() => onReport(result.id, result.original_url)} // 신고 버튼 핸들러 전달
            />
          ))
        )}
      </div>
    </div>
  );
}

export default QRResultList;

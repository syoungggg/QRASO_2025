import React, { useEffect, useState } from "react";
import axios from "axios";

function Dashboard() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null); // 상세보기용 상태

  useEffect(() => {
    // Flask 서버에서 warning 데이터 가져오기
    axios
      .get("http://localhost:5000/get_warning")
      .then((res) => {
        const data = res.data.map((item, index) => ({
          id: index + 1,
          url: item.original_url,
          risk: item.label,
          domain: item.domain,
          ssl_valid: item.ssl_valid,
          whois_creation_date: item.whois_creation_date,
          virustotal_score: item.virustotal_score,
          phishtank_result: item.phishtank_result,
        }));
        setReports(data);
      })
      .catch((err) => {
        console.error("대시보드 데이터 로딩 오류:", err);
      });
  }, []);

  const getColor = (risk) => {
    switch (risk) {
      case "안전":
        return "green";
      case "의심":
        return "orange";
      case "위험":
        return "red";
      default:
        return "black";
    }
  };

  return (
    <div style={{ padding: "30px", textAlign: "center" }}>
      <h1 style={{fontWeight:"bold"}}>📊 신고된 URL 대시보드</h1>
      

      <table
        style={{
          width: "80%",
          margin: "20px auto",
          borderCollapse: "collapse",
          textAlign: "center",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0" }}>
            <th style={{ border: "1px solid #ddd", padding: "10px" }}>번호</th>
            <th style={{ border: "1px solid #ddd", padding: "10px" }}>URL</th>
            <th style={{ border: "1px solid #ddd", padding: "10px" }}>위험도</th>
            <th style={{ border: "1px solid #ddd", padding: "10px" }}>상세 보기</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td style={{ border: "1px solid #ddd", padding: "10px" }}>{r.id}</td>
              <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">
                  {r.url}
                </a>
              </td>
              <td
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  color: getColor(r.risk),
                  fontWeight: "bold",
                }}
              >
                {r.risk}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                <button
                  onClick={() => setSelectedReport(r)}
                  style={{
                    backgroundColor: "#007bff",
                    color: "white",
                    border: "none",
                    padding: "5px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                  }}
                >
                  보기
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 상세보기 모달 */}
      {selectedReport && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSelectedReport(null)}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "10px",
              width: "500px",
              maxHeight: "80vh",
              overflowY: "auto",
              
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>🔍 분석 상세 정보</h3>
            <p><strong>URL:</strong> {selectedReport.url}</p>
            <p><strong>도메인:</strong> {selectedReport.domain || "N/A"}</p>
            <p><strong>SSL 유효성:</strong> {selectedReport.ssl_valid ? "유효" : "무효"}</p>
            <p><strong>WHOIS 생성일:</strong> {selectedReport.whois_creation_date || "N/A"}</p>
            <p><strong>VirusTotal 점수:</strong> {selectedReport.virustotal_score || "N/A"}</p>
            
            <p><strong>위험도:</strong> {selectedReport.risk}</p>
            <button
              onClick={() => setSelectedReport(null)}
              style={{
                marginTop: "15px",
                backgroundColor: "gray",
                color: "white",
                border: "none",
                padding: "8px 15px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;

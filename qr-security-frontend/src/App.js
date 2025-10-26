import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import QRScanner from "./components/QRScanner"; // QRScanner 경로 확인
import "./App.css";

function App() {
  const [scanResult, setScanResult] = useState(null);

  const handleQRResult = (result) => {
    console.log("분석 결과:", result);
    setScanResult(result);
  };

  return (
    <Router>
      <div className="App">
        <header style={{ padding: "20px" }}>
          <h1>QRASO</h1>
          <nav style={{ marginTop: "10px" }}>
            <Link to="/" style={{ marginRight: "20px" }}>
              홈
            </Link>
            <Link to="/dashboard">대시보드</Link>
          </nav>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              <div>
                <Home />
                <QRScanner onResult={handleQRResult} />
                {scanResult && (
                  <div style={{ marginTop: "20px" }}>
                    <h3>최종 분석 결과:</h3>
                    <pre>{JSON.stringify(scanResult, null, 2)}</pre>
                  </div>
                )}
              </div>
            }
          />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

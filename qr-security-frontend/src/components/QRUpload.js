import React, { useState, useEffect } from "react";
import api from "../api/api"; // ✅ 공통 axios 인스턴스 불러오기

function QRUpload({ onResult }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleSubmit(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      handleSubmit(droppedFile);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const pastedFile = items[i].getAsFile();
        setFile(pastedFile);
        handleSubmit(pastedFile);
        break;
      }
    }
  };

  const handleSubmit = async (fileToUpload) => {
    if (!fileToUpload) {
      alert("QR 이미지를 선택해주세요.");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      // ✅ axios 대신 api 사용 (baseURL 자동 적용)
      const response = await api.post("/decode_qr", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("백엔드 응답:", response.data);

      if (onResult && typeof onResult === "function") {
        onResult(response.data);
      }
      setFile(null);
    } catch (error) {
      console.error("❌ 업로드 중 오류 발생:", error);
      alert("서버 연결 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div
      className={`border-4 border-dashed rounded-2xl p-12 text-center transition-all ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 bg-white hover:border-gray-400"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
          {isLoading ? (
            <div className="animate-spin text-blue-500 text-5xl">🔄</div>
          ) : (
            <div className="text-gray-400 text-5xl">📤</div>
          )}
        </div>
        <div className="text-gray-600">
          <p className="font-medium mb-1">
            파일 업로드 / 붙여넣기(Ctrl + V)
          </p>
          {file && <p className="text-sm text-gray-500">{file.name}</p>}
        </div>
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isLoading}
          />
          <span
            className={`inline-block px-8 py-3 rounded-lg font-medium transition-colors ${
              isLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            } text-white`}
          >
            {isLoading ? "검사 중..." : "업로드 📤"}
          </span>
        </label>
      </div>
    </div>
  );
}

export default QRUpload;

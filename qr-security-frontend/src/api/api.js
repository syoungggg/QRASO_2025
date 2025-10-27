import axios from "axios";

// -------------------
// axios 기본 설정
// -------------------
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://qr-backend-production-c511.up.railway.app",
  headers: {
    "Content-Type": "application/json",
  },
});

// -------------------
// QR 분석 (파일 업로드)
// -------------------
export const analyzeQR = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await api.post("/decode_qr", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("❌ QR 분석 요청 중 오류 발생:", error);
    throw error;
  }
};

// -------------------
// 신고 요청
// -------------------
export const reportQR = async (url) => {
  try {
    const response = await api.post("/report_qr", { url });
    return response.data; // { status: "신고 완료", current_count: n }
  } catch (error) {
    console.error("❌ 신고 요청 중 오류 발생:", error);
    return { error: error.response?.data?.error || "신고 실패" };
  }
};

import axios from "axios";

// -------------------
// QR 분석
// -------------------
export const analyzeQR = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post("https://qr-backend-production.up.railway.app/decode_qr", formData, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("API 요청 중 오류 발생:", error);
    throw error;
  }
};

// -------------------
// 신고 요청
// -------------------
export const reportQR = async (url) => {
  try {
    const response = await axios.post("http://localhost:5000/report_qr", { url });
    return response.data; // { status: "신고 완료", current_count: n }
  } catch (error) {
    console.error("신고 요청 중 오류 발생:", error);
    return { error: error.response?.data?.error || "신고 실패" };
  }
};

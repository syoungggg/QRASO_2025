import axios from "axios";

export const analyzeQR = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post("http://localhost:5000/decode_qr", formData, {
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

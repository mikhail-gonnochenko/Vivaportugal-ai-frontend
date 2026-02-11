import { useState } from "react";
import Cropper from "react-easy-crop";
import "./App.css";

type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AIResult = {
  pinterest_title: string;
  pinterest_description: string;
  board: string;
  crop: CropData;
};

// Тип для ответа от Cloudinary
type UploadResult = {
  ok: boolean;
  image: {
    pinterest_url: string;
    original_url: string;
    public_id: string;
  };
};

function App() {
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  // Состояние для хранения результата загрузки в облако
  const [cloudinaryResult, setCloudinaryResult] = useState<UploadResult | null>(null);

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "uploading"
  >("idle");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selected = e.target.files[0];
    setFile(selected);
    setImageUrl(URL.createObjectURL(selected));
    setAiResult(null);
    setCloudinaryResult(null); // Сбрасываем при выборе нового фото
    setStatus("idle");
  };

  const analyzeImage = async () => {
    if (!file) return;
    setStatus("loading");
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("AI analysis failed");

      const data: AIResult = await res.json();
      setAiResult(data);

      // Устанавливаем кроп из AI (переводим из 0-1 в проценты для Cropper)
      setCrop({
        x: data.crop.x * 100,
        y: data.crop.y * 100,
      });

      setStatus("success");
    } catch (err) {
      console.error("Analyze error:", err);
      setStatus("error");
    }
  };

  // ===== НОВАЯ ФУНКЦИЯ: UPLOAD TO CLOUDINARY =====
  const uploadToCloudinary = async () => {
    if (!file || !aiResult) return;

    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("image", file);
      // Отправляем те самые координаты, которые дал AI
      formData.append("crop", JSON.stringify(aiResult.crop));

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data: UploadResult = await res.json();
      setCloudinaryResult(data);
      setStatus("success");
      console.log("Cloudinary Image URL:", data.image.pinterest_url);
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
    }
  };

  return (
    <div className="app">
      <h1>VivaPortugal AI</h1>

      <p className={`status ${status}`}>Status: {status}</p>

      <input type="file" accept="image/*" onChange={onFileChange} />

      {imageUrl && (
        <div className="crop-wrapper">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={2 / 3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
          />
        </div>
      )}

      <div className="buttons">
        <button onClick={analyzeImage} disabled={!file || status === "loading" || status === "uploading"}>
          1. Analyze image
        </button>

        <button 
          onClick={uploadToCloudinary} 
          disabled={!aiResult || status === "uploading"}
          className="btn-upload"
        >
          2. Upload to Cloudinary
        </button>
      </div>

      {/* Показываем результат от Cloudinary, если он есть */}
      {cloudinaryResult && (
        <div className="cloudinary-success">
          <p>✅ Image ready for Pinterest!</p>
          <a href={cloudinaryResult.image.pinterest_url} target="_blank" rel="noreferrer">
            View Cropped Image
          </a>
        </div>
      )}

      {aiResult && (
        <pre className="result">
          {JSON.stringify(aiResult, null, 2)}
        </pre>
      )}

      {status === "error" && (
        <p className="error">Something went wrong. Check logs.</p>
      )}
    </div>
  );
}

export default App;

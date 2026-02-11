import { useState } from "react";
import Cropper from "react-easy-crop";
import "./App.css";

type CropData = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// 1. Обновили тип AIResult — добавили keywords
type AIResult = {
  pinterest_title: string;
  pinterest_description: string;
  keywords: string[]; 
  board: string;
  crop: CropData;
};

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
    setCloudinaryResult(null);
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

  const uploadToCloudinary = async () => {
    if (!file || !aiResult) return;
    setStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("crop", JSON.stringify(aiResult.crop));

      const res = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data: UploadResult = await res.json();
      setCloudinaryResult(data);
      setStatus("success");
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("error");
    }
  };

  return (
    <div className="app">
      <h1>VivaPortugal AI 🇵🇹</h1>

      <p className={`status ${status}`}>Status: {status}</p>

      <div className="upload-section">
        <input type="file" accept="image/*" onChange={onFileChange} id="file-input" />
      </div>

      {imageUrl && (
        <div className="crop-container">
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
        </div>
      )}

      <div className="buttons">
        <button 
          onClick={analyzeImage} 
          disabled={!file || status === "loading" || status === "uploading"}
        >
          {status === "loading" ? "Analyzing..." : "1. Analyze SEO"}
        </button>

        <button 
          onClick={uploadToCloudinary} 
          disabled={!aiResult || status === "uploading"}
          className="btn-upload"
        >
          {status === "uploading" ? "Uploading..." : "2. Generate Pinterest Link"}
        </button>
      </div>

      {/* Красивый вывод SEO данных */}
      {aiResult && (
        <div className="seo-result">
          <h2>Pinterest Preview</h2>
          <div className="seo-field">
            <strong>Title:</strong>
            <p>{aiResult.pinterest_title}</p>
          </div>
          <div className="seo-field">
            <strong>Description:</strong>
            <p>{aiResult.pinterest_description}</p>
          </div>
          <div className="seo-field">
            <strong>Board:</strong>
            <span className="badge">{aiResult.board}</span>
          </div>
          <div className="seo-field">
            <strong>Keywords:</strong>
            <div className="tags">
              {aiResult.keywords?.map((kw, i) => (
                <span key={i} className="tag">{kw}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {cloudinaryResult && (
        <div className="cloudinary-success">
          <p>✅ Image cropped & uploaded!</p>
          <a href={cloudinaryResult.image.pinterest_url} target="_blank" rel="noreferrer" className="view-link">
            Open Final Pinterest Image
          </a>
        </div>
      )}

      {status === "error" && (
        <p className="error">Error occurred. Check console for details.</p>
      )}
    </div>
  );
}

export default App;

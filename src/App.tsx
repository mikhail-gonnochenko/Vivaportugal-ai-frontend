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

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // ===== FILE SELECT =====
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const selected = e.target.files[0];
    setFile(selected);
    setImageUrl(URL.createObjectURL(selected));
    setAiResult(null);
    setStatus("idle");
  };

  // ===== ANALYZE IMAGE =====
  const analyzeImage = async () => {
    if (!file) return;

    setStatus("loading");

    try {
      const formData = new FormData();
      formData.append("image", file);

   const res = await fetch(
  `${import.meta.env.VITE_API_URL}/api/analyze`,
  {
    method: "POST",
    body: formData,
  }
);

      if (!res.ok) throw new Error("AI failed");

      const data: AIResult = await res.json();
      setAiResult(data);

      // Преобразуем относительный crop (0–1) в проценты для react-easy-crop
      setCrop({
        x: data.crop.x * 100,
        y: data.crop.y * 100,
      });

      setZoom(1);
      setStatus("success");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  // ===== PUBLISH (ПОКА ЗАГЛУШКА) =====
  const publishPin = () => {
    alert(
      "Publish coming next:\nCloudinary upload + Pinterest API\n\nТы уже близко."
    );
  };

  return (
    <div className="app">
      <h1>VivaPortugal AI</h1>

      <p className={`status ${status}`}>
        Status: {status}
      </p>

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
        <button onClick={analyzeImage} disabled={!file || status === "loading"}>
          Analyze image
        </button>

        <button
          onClick={publishPin}
          disabled={!aiResult}
        >
          Publish (soon)
        </button>
      </div>

      {aiResult && (
        <pre className="result">
{JSON.stringify(aiResult, null, 2)}
        </pre>
      )}

      {status === "error" && (
        <p className="error">
          Something went wrong. Check backend or API key.
        </p>
      )}
    </div>
  );
}

export default App;

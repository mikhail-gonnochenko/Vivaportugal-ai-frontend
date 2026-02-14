import { useState, useEffect } from "react";
import "./App.css";

type CropData = { x: number; y: number; width: number; height: number };

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
    public_id: string;
  };
};

type PinterestBoard = { id: string; name: string };

function App() {
  const API_URL =
    import.meta.env.VITE_API_URL ||
    "https://vivaportugal-ai-backend.onrender.com";

  // ---------------- STATE ----------------
  const [file, setFile] = useState<File | null>(null);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [cloudinaryResult, setCloudinaryResult] =
    useState<UploadResult | null>(null);

  const [pinterestToken, setPinterestToken] = useState<string | null>(null);
  const [boards, setBoards] = useState<PinterestBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string>("");

  const [status, setStatus] =
    useState<"idle" | "loading" | "uploading" | "publishing" | "error">(
      "idle"
    );

  // ---------------- OAUTH HANDLER ----------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const access = params.get("access");
    const refresh = params.get("refresh");

    if (access) {
      localStorage.setItem("pinterest_access_token", access);
      if (refresh) localStorage.setItem("pinterest_refresh_token", refresh);

      setPinterestToken(access);
      window.history.replaceState({}, document.title, "/");
    } else {
      const saved = localStorage.getItem("pinterest_access_token");
      if (saved) setPinterestToken(saved);
    }
  }, []);

  // ---------------- FETCH BOARDS ----------------
  useEffect(() => {
    if (pinterestToken) fetchBoards();
  }, [pinterestToken]);

  const fetchBoards = async () => {
    try {
      const res = await fetch(`${API_URL}/api/pinterest/boards`, {
        headers: { Authorization: `Bearer ${pinterestToken}` },
      });

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      if (data.ok) {
        setBoards(data.boards);
      } else if (res.status === 401) {
        await refreshAccessToken();
      }
    } catch (err) {
      console.error("Board fetch error:", err);
    }
  };

  // ---------------- SMART BOARD MATCHING ----------------
  useEffect(() => {
    if (aiResult && boards.length > 0) {
      const found = boards.find((b) =>
        b.name.toLowerCase().includes(aiResult.board.toLowerCase())
      );
      if (found) setSelectedBoardId(found.id);
    }
  }, [aiResult, boards]);

  // ---------------- REFRESH TOKEN ----------------
  const refreshAccessToken = async () => {
    const refresh = localStorage.getItem("pinterest_refresh_token");
    if (!refresh) return;

    try {
      const res = await fetch(`${API_URL}/api/pinterest/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      if (data.ok) {
        localStorage.setItem("pinterest_access_token", data.access_token);
        setPinterestToken(data.access_token);
      }
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  // ---------------- AUTH BUTTON ----------------
  const connectPinterest = () => {
    window.location.href = `${API_URL}/api/pinterest/auth`;
  };

  // ---------------- IMAGE HANDLING ----------------
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selected = e.target.files[0];
    setFile(selected);
    // ✅ Лишнее удалено (setImageUrl)
    setAiResult(null);
    setCloudinaryResult(null);
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

      if (!res.ok) throw new Error("Server error");
      const data: AIResult = await res.json();
      setAiResult(data);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const uploadImage = async () => {
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

      if (!res.ok) throw new Error("Server error");
      const data: UploadResult = await res.json();
      setCloudinaryResult(data);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  // ---------------- PUBLISH PIN ----------------
  const publishPin = async () => {
    if (!pinterestToken || !selectedBoardId || !aiResult || !cloudinaryResult)
      return;

    setStatus("publishing");

    try {
      const res = await fetch(`${API_URL}/api/pinterest/pins`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pinterestToken}`,
        },
        body: JSON.stringify({
          title: aiResult.pinterest_title,
          description: aiResult.pinterest_description,
          image_url: cloudinaryResult.image.pinterest_url,
          board_id: selectedBoardId,
          link: "https://viva-portugal.com",
        }),
      });

      if (res.status === 401) {
        await refreshAccessToken();
        setStatus("idle");
        return;
      }

      if (!res.ok) throw new Error("Server error");
      const data = await res.json();

      if (data.ok) {
        alert("✅ Pin Published!");
      } else {
        throw new Error();
      }

      setStatus("idle");
    } catch {
      alert("Publishing failed (likely Trial Access restriction)");
      setStatus("error");
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="app">
      <h1>VivaPortugal AI 🇵🇹</h1>

      {!pinterestToken ? (
        <button onClick={connectPinterest}>
          Connect Pinterest
        </button>
      ) : (
        <p>✅ Pinterest Connected</p>
      )}

      <input type="file" onChange={onFileChange} />

      <button onClick={analyzeImage} disabled={!file}>
        1. Analyze
      </button>

      <button onClick={uploadImage} disabled={!aiResult}>
        2. Prepare Image
      </button>

      {boards.length > 0 && (
        <select
          value={selectedBoardId}
          onChange={(e) => setSelectedBoardId(e.target.value)}
        >
          <option value="">Select Board</option>
          {boards.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={publishPin}
        disabled={!cloudinaryResult || !selectedBoardId}
      >
        3. Publish
      </button>

      <p>Status: {status}</p>
    </div>
  );
}

export default App;

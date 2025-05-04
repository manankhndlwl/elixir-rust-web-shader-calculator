import { useState, useEffect, useRef } from "preact/hooks";
import preactLogo from "./assets/preact.svg";
import viteLogo from "/vite.svg";
import "./app.css";
import init, { calculate } from "./rust_wasm/rust_wasm";

export function App() {
  const [tab, setTab] = useState("calculator");

  useEffect(() => {
    init().catch(console.error);
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>WASM & Shader Playground</h1>
      <div style={{ marginBottom: "1rem" }}>
        <button onClick={() => setTab("calculator")}>Rust Calculator</button>
        <button onClick={() => setTab("shader")} style={{ marginLeft: "1rem" }}>
          Text-to-Shader
        </button>
      </div>
      {tab === "calculator" ? <RustCalculator /> : <TextToShader />}
    </div>
  );
}

function RustCalculator() {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    try {
      const res = calculate(expr);
      setResult(res);
      setError("");
    } catch (e) {
      setResult(null);
      setError(e.message);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Rust Calculator (WASM)</h1>
      <input
        type="text"
        value={expr}
        onChange={(e) => setExpr(e.target.value)}
        placeholder="e.g., 3 + (2 * 4)"
        style={{ fontSize: "1rem", padding: "0.5rem", width: "300px" }}
      />
      <button onClick={handleCalculate} style={{ marginLeft: "1rem" }}>
        Calculate
      </button>
      {result !== null && <p>Result: {result}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}

function TextToShader() {
  const [prompt, setPrompt] = useState("");
  const [shaderCode, setShaderCode] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef();

  const renderShader = (code) => {
    try {
      const gl = canvasRef.current.getContext("webgl");
      const vertexShaderSource = `
        attribute vec4 position;
        void main() {
          gl_Position = position;
        }
      `;
      const fragmentShaderSource = code;

      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, vertexShaderSource);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, fragmentShaderSource);
      gl.compileShader(fs);

      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(fs));
      }

      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.useProgram(program);

      const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const pos = gl.getAttribLocation(program, "position");
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(pos);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } catch (err) {
      setError("Failed to render shader: " + err.message);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setShaderCode("");
    try {
      const res = await fetch("http://localhost:4000/generate-shader", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.shader) {
        setShaderCode(data.shader);
        renderShader(data.shader);
      } else {
        throw new Error("No shader returned");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Text to Shader</h2>
      <textarea
        rows={3}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your shader (e.g. 'rotating cube with gradient')"
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <br />
      <button onClick={handleSubmit}>Generate Shader</button>

      <h3>Canvas Output:</h3>
      <canvas
        ref={canvasRef}
        width={300}
        height={300}
        style={{ border: "1px solid #ccc" }}
      />

      <h3>Shader Code:</h3>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          background: "#f0f0f0",
          padding: "1rem",
        }}
      >
        {shaderCode}
      </pre>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}

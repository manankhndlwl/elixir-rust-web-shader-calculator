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
  const [shaderCode, setShaderCode] = useState({
    vertexShader: "",
    fragmentShader: "",
  });
  const [error, setError] = useState("");
  const canvasRef = useRef();

  const renderShader = (shaders) => {
    try {
      const gl = canvasRef.current.getContext("webgl");
      if (!gl) {
        throw new Error("WebGL not supported");
      }

      // Create vertex shader
      const vs = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vs, shaders.vertexShader);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        throw new Error("Vertex shader error: " + gl.getShaderInfoLog(vs));
      }

      // Create fragment shader
      const fs = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fs, shaders.fragmentShader);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        throw new Error("Fragment shader error: " + gl.getShaderInfoLog(fs));
      }

      // Create and link program
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(
          "Shader program error: " + gl.getProgramInfoLog(program)
        );
      }

      gl.useProgram(program);

      // Set up geometry for a triangle
      const vertices = new Float32Array([
        -0.5,
        -0.5, // bottom left
        0.5,
        -0.5, // bottom right
        0.0,
        0.5, // top center
      ]);

      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      // Get the attribute location using the correct name 'a_position'
      const positionLocation = gl.getAttribLocation(program, "a_position");
      if (positionLocation === -1) {
        throw new Error("Could not find attribute 'a_position'");
      }

      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      // Clear and draw
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } catch (err) {
      console.error("Shader error:", err);
      setError("Failed to render shader: " + err.message);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setShaderCode({ vertexShader: "", fragmentShader: "" });
    try {
      const res = await fetch(
        "https://elixir-rust-web-shader-calculator.onrender.com/api/shader/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }
      );
      const data = await res.json();
      console.log("data====>", data);
      if (data.success && data.shader_code) {
        // Parse the shader_code string as JSON
        const shaders = JSON.parse(data.shader_code);
        setShaderCode(shaders);
        renderShader(shaders);
      } else {
        throw new Error("Invalid shader response");
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

      <h3>Vertex Shader:</h3>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          //background: "#f0f0f0",
          padding: "1rem",
        }}
      >
        {shaderCode.vertexShader}
      </pre>

      <h3>Fragment Shader:</h3>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          //background: "#f0f0f0",
          padding: "1rem",
        }}
      >
        {shaderCode.fragmentShader}
      </pre>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}
    </div>
  );
}

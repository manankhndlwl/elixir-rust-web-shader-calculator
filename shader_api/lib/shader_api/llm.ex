defmodule ShaderApi.LLM do
  @ollama_api_url "http://localhost:11434/api/generate"
  # 30 seconds timeout
  @request_timeout 30_000

  def generate_shader(prompt) do
    headers = [{"Content-Type", "application/json"}]

    body = %{
      model: "mistral:latest",
      format: "json",
      stream: false,
      prompt: """
      You are a WebGL shader expert. Generate only the shader code without any explanation.
      The response should be valid GLSL code that can be directly used in WebGL.
      The shader should implement the following: #{prompt}
      Only return the shader code, no explanations or markdown formatting.
      Return both vertex and fragment shaders.
      Format the response as valid GLSL code only.
      """
    }

    case HTTPoison.post(@ollama_api_url, Jason.encode!(body), headers,
           timeout: @request_timeout,
           recv_timeout: @request_timeout
         ) do
      {:ok, %HTTPoison.Response{status_code: 200, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, %{"response" => shader_code}} ->
            # Clean up the response to ensure we only get the shader code
            clean_shader =
              shader_code
              |> String.trim()
              |> String.replace(~r/```glsl\n?/, "")
              |> String.replace(~r/```\n?/, "")
              |> String.trim()

            {:ok, clean_shader}

          error ->
            {:error, "Failed to decode Ollama response: #{inspect(error)}"}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
        {:error, "Ollama API returned status #{status_code}: #{body}"}

      {:error, %HTTPoison.Error{reason: :timeout}} ->
        {:error,
         "Request to Ollama timed out. Make sure Ollama is running locally with 'ollama serve' and the Mistral model is pulled with 'ollama pull mistral'"}

      {:error, %HTTPoison.Error{reason: :econnrefused}} ->
        {:error, "Connection refused. Make sure Ollama is running locally with 'ollama serve'"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Failed to call Ollama API: #{inspect(reason)}"}
    end
  end
end

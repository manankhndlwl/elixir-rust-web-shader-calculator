defmodule ShaderApi.LLM do
  @mistral_api_url "https://api.mistral.ai/v1/chat/completions"
  # 30 seconds timeout
  @request_timeout 30_000

  def generate_shader(prompt) do
    headers = [
      {"Content-Type", "application/json"},
      {"Accept", "application/json"},
      {"Authorization", "Bearer #{get_api_key()}"}
    ]

    body = %{
      model: "mistral-large-latest",
      messages: [
        %{
          role: "system",
          content: """
          You are a WebGL shader expert. You must respond with only valid GLSL shader code.
          Format your response as a JSON object with two fields: vertexShader and fragmentShader.
          Always use these attribute names in vertex shader:
          - a_position for position attribute
          - a_normal for normal attribute (if needed)
          - a_color for color attribute (if needed)
          - a_texCoord for texture coordinates (if needed)
          Do not include any explanations or markdown formatting.
          """
        },
        %{
          role: "user",
          content: "Generate WebGL shaders for: #{prompt}"
        }
      ]
    }

    case HTTPoison.post(@mistral_api_url, Jason.encode!(body), headers,
           timeout: @request_timeout,
           recv_timeout: @request_timeout
         ) do
      {:ok, %HTTPoison.Response{status_code: 200, body: response_body}} ->
        case Jason.decode(response_body) do
          {:ok, %{"choices" => [%{"message" => %{"content" => content}} | _]}} ->
            # Extract the JSON content from the markdown code block
            case Regex.run(~r/```json\n(.*)\n```/s, content) do
              [_, json_content] ->
                case Jason.decode(json_content) do
                  {:ok, %{"vertexShader" => vertex, "fragmentShader" => fragment}} ->
                    {:ok,
                     Jason.encode!(%{
                       vertexShader: cleanup_shader(vertex),
                       fragmentShader: cleanup_shader(fragment)
                     })}

                  error ->
                    {:error, "Invalid shader format in response: #{inspect(error)}"}
                end

              _ ->
                {:error, "Could not extract JSON content from response"}
            end

          error ->
            {:error, "Failed to decode Mistral response: #{inspect(error)}"}
        end

      {:ok, %HTTPoison.Response{status_code: status_code, body: body}} ->
        {:error, "Mistral API returned status #{status_code}: #{body}"}

      {:error, %HTTPoison.Error{reason: :timeout}} ->
        {:error, "Request to Mistral API timed out"}

      {:error, %HTTPoison.Error{reason: reason}} ->
        {:error, "Failed to call Mistral API: #{inspect(reason)}"}
    end
  end

  defp cleanup_shader(shader) do
    shader
    |> String.trim()
    # Convert literal \n to actual newlines
    |> String.replace(~r/\\n/, "\n")
    # Remove any remaining backticks
    |> String.replace("`", "")
    |> String.trim()
  end

  defp get_api_key do
    Application.get_env(:shader_api, :mistral_api_key) ||
      raise "MISTRAL_API_KEY environment variable is not set!"
  end
end

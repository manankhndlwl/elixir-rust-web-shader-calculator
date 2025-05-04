defmodule ShaderApiWeb.ShaderController do
  use ShaderApiWeb, :controller

  def generate(conn, %{"prompt" => prompt}) do
    case ShaderApi.LLM.generate_shader(prompt) do
      {:ok, shader_code} ->
        json(conn, %{
          success: true,
          shader_code: shader_code,
          prompt: prompt
        })

      {:error, error_message} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{
          success: false,
          error: error_message,
          prompt: prompt
        })
    end
  end

  def generate(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Missing prompt parameter"})
  end
end

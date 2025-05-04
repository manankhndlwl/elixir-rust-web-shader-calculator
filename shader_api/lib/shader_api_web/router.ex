defmodule ShaderApiWeb.Router do
  use ShaderApiWeb, :router

  pipeline :api do
    plug(:accepts, ["json"])
    plug(CORSPlug, origin: ["http://localhost:3000", "http://localhost:5173"])
  end

  scope "/api", ShaderApiWeb do
    pipe_through(:api)

    post("/shader/generate", ShaderController, :generate)
  end
end

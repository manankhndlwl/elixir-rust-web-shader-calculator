# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :shader_api,
  ecto_repos: [ShaderApi.Repo],
  generators: [timestamp_type: :utc_datetime, binary_id: true]

# Configures the endpoint
config :shader_api, ShaderApiWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: ShaderApiWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: ShaderApi.PubSub,
  live_view: [signing_salt: "tPIS8suz"]

# Configures Elixir's Logger
config :logger, :console,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
config :shader_api,
  mistral_api_key: System.get_env("MISTRAL_API_KEY")

# Load environment variables from .env file
import_config "#{config_env()}.exs"

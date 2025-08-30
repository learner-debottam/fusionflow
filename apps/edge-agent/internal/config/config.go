package config

import (
	"fmt"
	"os"

	"github.com/sirupsen/logrus"
	"github.com/spf13/viper"
)

// Config represents the application configuration
type Config struct {
	Environment string      `mapstructure:"environment"`
	LogLevel    logrus.Level `mapstructure:"log_level"`
	Server      ServerConfig `mapstructure:"server"`
	OTel        OTelConfig   `mapstructure:"otel"`
}

// ServerConfig represents server configuration
type ServerConfig struct {
	Port         int    `mapstructure:"port"`
	Host         string `mapstructure:"host"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

// OTelConfig represents OpenTelemetry configuration
type OTelConfig struct {
	Enabled     bool   `mapstructure:"enabled"`
	Endpoint    string `mapstructure:"endpoint"`
	ServiceName string `mapstructure:"service_name"`
	ServiceVersion string `mapstructure:"service_version"`
}

// Load loads configuration from file and environment variables
func Load(configFile string) (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("/etc/fusionflow/edge-agent")

	// Set defaults
	setDefaults()

	// Read config file if specified
	if configFile != "" {
		viper.SetConfigFile(configFile)
	}

	// Read environment variables
	viper.AutomaticEnv()
	viper.SetEnvPrefix("FUSIONFLOW_EDGE_AGENT")

	// Bind environment variables
	bindEnvVars()

	// Read config
	if err := viper.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("failed to read config file: %w", err)
		}
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	// Validate config
	if err := validateConfig(&config); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	return &config, nil
}

// setDefaults sets default configuration values
func setDefaults() {
	viper.SetDefault("environment", "development")
	viper.SetDefault("log_level", "info")
	viper.SetDefault("server.port", 8080)
	viper.SetDefault("server.host", "0.0.0.0")
	viper.SetDefault("server.read_timeout", 15)
	viper.SetDefault("server.write_timeout", 15)
	viper.SetDefault("otel.enabled", false)
	viper.SetDefault("otel.endpoint", "http://localhost:4317")
	viper.SetDefault("otel.service_name", "fusionflow-edge-agent")
	viper.SetDefault("otel.service_version", "0.1.0")
}

// bindEnvVars binds environment variables to configuration keys
func bindEnvVars() {
	viper.BindEnv("environment", "FUSIONFLOW_EDGE_AGENT_ENVIRONMENT")
	viper.BindEnv("log_level", "FUSIONFLOW_EDGE_AGENT_LOG_LEVEL")
	viper.BindEnv("server.port", "FUSIONFLOW_EDGE_AGENT_PORT")
	viper.BindEnv("server.host", "FUSIONFLOW_EDGE_AGENT_HOST")
	viper.BindEnv("otel.enabled", "FUSIONFLOW_EDGE_AGENT_OTEL_ENABLED")
	viper.BindEnv("otel.endpoint", "FUSIONFLOW_EDGE_AGENT_OTEL_ENDPOINT")
	viper.BindEnv("otel.service_name", "FUSIONFLOW_EDGE_AGENT_OTEL_SERVICE_NAME")
	viper.BindEnv("otel.service_version", "FUSIONFLOW_EDGE_AGENT_OTEL_SERVICE_VERSION")
}

// validateConfig validates the configuration
func validateConfig(config *Config) error {
	if config.Server.Port <= 0 || config.Server.Port > 65535 {
		return fmt.Errorf("invalid server port: %d", config.Server.Port)
	}

	if config.OTel.Enabled && config.OTel.Endpoint == "" {
		return fmt.Errorf("otel endpoint is required when otel is enabled")
	}

	return nil
}

// CreateDefaultConfig creates a default configuration file
func CreateDefaultConfig(filename string) error {
	config := `# FusionFlow Edge Agent Configuration

environment: development
log_level: info

server:
  port: 8080
  host: "0.0.0.0"
  read_timeout: 15
  write_timeout: 15

otel:
  enabled: false
  endpoint: "http://localhost:4317"
  service_name: "fusionflow-edge-agent"
  service_version: "0.1.0"
`

	return os.WriteFile(filename, []byte(config), 0644)
}

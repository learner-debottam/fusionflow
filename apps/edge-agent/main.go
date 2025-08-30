package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fusionflow/edge-agent/internal/config"
	"github.com/fusionflow/edge-agent/internal/handlers"
	"github.com/fusionflow/edge-agent/internal/otel"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var (
	cfgFile string
	port    int
)

func main() {
	var rootCmd = &cobra.Command{
		Use:   "edge-agent",
		Short: "FusionFlow Edge Agent",
		Long:  `A lightweight edge agent for FusionFlow middleware integration platform`,
		RunE:  run,
	}

	rootCmd.Flags().StringVar(&cfgFile, "config", "", "config file (default is ./config.yaml)")
	rootCmd.Flags().IntVar(&port, "port", 8080, "port to listen on")

	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run(cmd *cobra.Command, args []string) error {
	// Load configuration
	cfg, err := config.Load(cfgFile)
	if err != nil {
		return fmt.Errorf("failed to load config: %w", err)
	}

	// Initialize logger
	logger := logrus.New()
	logger.SetLevel(cfg.LogLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Initialize OpenTelemetry
	if err := otel.Initialize(cfg.OTel); err != nil {
		logger.Warnf("Failed to initialize OpenTelemetry: %v", err)
	}

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create router
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// Register routes
	handlers.RegisterRoutes(router, logger)

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Infof("Starting edge agent on port %d", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down edge agent...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Errorf("Server forced to shutdown: %v", err)
	}

	logger.Info("Edge agent stopped")
	return nil
}

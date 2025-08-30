package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// RegisterRoutes registers all HTTP routes
func RegisterRoutes(router *gin.Engine, logger *logrus.Logger) {
	// Health check endpoints
	router.GET("/", healthCheck)
	router.GET("/health", healthCheck)
	router.GET("/health/live", livenessCheck)
	router.GET("/health/ready", readinessCheck)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Connector endpoints
		connectors := v1.Group("/connectors")
		{
			connectors.GET("", listConnectors)
			connectors.POST("", createConnector)
			connectors.GET("/:id", getConnector)
			connectors.PUT("/:id", updateConnector)
			connectors.DELETE("/:id", deleteConnector)
			connectors.POST("/:id/test", testConnector)
		}

		// Flow endpoints
		flows := v1.Group("/flows")
		{
			flows.GET("", listFlows)
			flows.POST("", createFlow)
			flows.GET("/:id", getFlow)
			flows.PUT("/:id", updateFlow)
			flows.DELETE("/:id", deleteFlow)
			flows.POST("/:id/activate", activateFlow)
			flows.POST("/:id/deactivate", deactivateFlow)
		}

		// Execution endpoints
		executions := v1.Group("/executions")
		{
			executions.GET("", listExecutions)
			executions.POST("", executeFlow)
			executions.GET("/:id", getExecution)
			executions.POST("/:id/cancel", cancelExecution)
			executions.GET("/:id/logs", getExecutionLogs)
		}
	}

	// Add middleware for logging
	router.Use(loggingMiddleware(logger))
}

// healthCheck handles the main health check endpoint
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":    "healthy",
		"timestamp": time.Now().UTC(),
		"service":   "fusionflow-edge-agent",
		"version":   "0.1.0",
	})
}

// livenessCheck handles the liveness probe
func livenessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "alive",
	})
}

// readinessCheck handles the readiness probe
func readinessCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// listConnectors handles GET /api/v1/connectors
func listConnectors(c *gin.Context) {
	// TODO: Implement actual connector listing
	c.JSON(http.StatusOK, gin.H{
		"connectors": []gin.H{},
		"total":      0,
		"page":       1,
		"limit":      10,
	})
}

// createConnector handles POST /api/v1/connectors
func createConnector(c *gin.Context) {
	// TODO: Implement actual connector creation
	c.JSON(http.StatusCreated, gin.H{
		"id":        "conn_123",
		"name":      "Test Connector",
		"type":      "postgresql",
		"status":    "active",
		"createdAt": time.Now().UTC(),
	})
}

// getConnector handles GET /api/v1/connectors/:id
func getConnector(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual connector retrieval
	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"name":      "Test Connector",
		"type":      "postgresql",
		"status":    "active",
		"createdAt": time.Now().UTC(),
	})
}

// updateConnector handles PUT /api/v1/connectors/:id
func updateConnector(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual connector update
	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"name":      "Updated Connector",
		"type":      "postgresql",
		"status":    "active",
		"updatedAt": time.Now().UTC(),
	})
}

// deleteConnector handles DELETE /api/v1/connectors/:id
func deleteConnector(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual connector deletion
	c.JSON(http.StatusOK, gin.H{
		"message": "Connector deleted successfully",
		"id":      id,
	})
}

// testConnector handles POST /api/v1/connectors/:id/test
func testConnector(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual connector testing
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Connection test successful",
		"id":      id,
	})
}

// listFlows handles GET /api/v1/flows
func listFlows(c *gin.Context) {
	// TODO: Implement actual flow listing
	c.JSON(http.StatusOK, gin.H{
		"flows": []gin.H{},
		"total": 0,
		"page":  1,
		"limit": 10,
	})
}

// createFlow handles POST /api/v1/flows
func createFlow(c *gin.Context) {
	// TODO: Implement actual flow creation
	c.JSON(http.StatusCreated, gin.H{
		"id":          "flow_123",
		"name":        "Test Flow",
		"description": "A test flow",
		"status":      "draft",
		"createdAt":   time.Now().UTC(),
	})
}

// getFlow handles GET /api/v1/flows/:id
func getFlow(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual flow retrieval
	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"name":        "Test Flow",
		"description": "A test flow",
		"status":      "active",
		"createdAt":   time.Now().UTC(),
	})
}

// updateFlow handles PUT /api/v1/flows/:id
func updateFlow(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual flow update
	c.JSON(http.StatusOK, gin.H{
		"id":          id,
		"name":        "Updated Flow",
		"description": "An updated test flow",
		"status":      "active",
		"updatedAt":   time.Now().UTC(),
	})
}

// deleteFlow handles DELETE /api/v1/flows/:id
func deleteFlow(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual flow deletion
	c.JSON(http.StatusOK, gin.H{
		"message": "Flow deleted successfully",
		"id":      id,
	})
}

// activateFlow handles POST /api/v1/flows/:id/activate
func activateFlow(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual flow activation
	c.JSON(http.StatusOK, gin.H{
		"message": "Flow activated successfully",
		"id":      id,
		"status":  "active",
	})
}

// deactivateFlow handles POST /api/v1/flows/:id/deactivate
func deactivateFlow(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual flow deactivation
	c.JSON(http.StatusOK, gin.H{
		"message": "Flow deactivated successfully",
		"id":      id,
		"status":  "inactive",
	})
}

// listExecutions handles GET /api/v1/executions
func listExecutions(c *gin.Context) {
	// TODO: Implement actual execution listing
	c.JSON(http.StatusOK, gin.H{
		"executions": []gin.H{},
		"total":      0,
		"page":       1,
		"limit":      10,
	})
}

// executeFlow handles POST /api/v1/executions
func executeFlow(c *gin.Context) {
	// TODO: Implement actual flow execution
	c.JSON(http.StatusCreated, gin.H{
		"id":        "exec_123",
		"flowId":    "flow_123",
		"status":    "running",
		"startTime": time.Now().UTC(),
	})
}

// getExecution handles GET /api/v1/executions/:id
func getExecution(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual execution retrieval
	c.JSON(http.StatusOK, gin.H{
		"id":        id,
		"flowId":    "flow_123",
		"status":    "completed",
		"startTime": time.Now().UTC(),
		"endTime":   time.Now().UTC(),
	})
}

// cancelExecution handles POST /api/v1/executions/:id/cancel
func cancelExecution(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual execution cancellation
	c.JSON(http.StatusOK, gin.H{
		"message": "Execution cancelled successfully",
		"id":      id,
		"status":  "cancelled",
	})
}

// getExecutionLogs handles GET /api/v1/executions/:id/logs
func getExecutionLogs(c *gin.Context) {
	id := c.Param("id")
	// TODO: Implement actual log retrieval
	c.JSON(http.StatusOK, gin.H{
		"executionId": id,
		"logs":        []gin.H{},
		"total":       0,
	})
}

// loggingMiddleware adds request logging
func loggingMiddleware(logger *logrus.Logger) gin.HandlerFunc {
	return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		logger.WithFields(logrus.Fields{
			"client_ip":    param.ClientIP,
			"timestamp":    param.TimeStamp.Format(time.RFC3339),
			"method":       param.Method,
			"path":         param.Path,
			"protocol":     param.Request.Proto,
			"status_code":  param.StatusCode,
			"latency":      param.Latency,
			"user_agent":   param.Request.UserAgent(),
			"error":        param.ErrorMessage,
		}).Info("HTTP Request")
		return ""
	})
}

import { Flow, ValidationResult } from './schema';

// Validator for Flow DSL
export class FlowValidator {
  /**
   * Validate a flow definition
   */
  static validate(flow: Flow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required fields
    if (!flow.name) {
      errors.push('Flow name is required');
    }

    if (!flow.nodes || flow.nodes.length === 0) {
      errors.push('Flow must have at least one node');
    }

    // Validate nodes
    const nodeIds = new Set<string>();
    for (const node of flow.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);

      if (!node.name) {
        errors.push(`Node ${node.id} must have a name`);
      }
    }

    // Validate edges
    for (const edge of flow.edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    // Check for cycles (simple check)
    if (this.hasCycles(flow)) {
      warnings.push('Flow contains cycles which may cause infinite loops');
    }

    // Check for disconnected nodes
    const connectedNodes = this.getConnectedNodes(flow);
    for (const node of flow.nodes) {
      if (!connectedNodes.has(node.id)) {
        warnings.push(`Node ${node.id} is not connected to any other node`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if flow has cycles (simple implementation)
   */
  private static hasCycles(flow: Flow): boolean {
    // This is a simplified cycle detection
    // In a real implementation, you'd use a proper graph algorithm
    const visited = new Set<string>();
    const recStack = new Set<string>();

    for (const node of flow.nodes) {
      if (!visited.has(node.id)) {
        if (this.hasCyclesDFS(node.id, flow, visited, recStack)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * DFS for cycle detection
   */
  private static hasCyclesDFS(
    nodeId: string,
    flow: Flow,
    visited: Set<string>,
    recStack: Set<string>
  ): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const outgoingEdges = flow.edges.filter(edge => edge.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (this.hasCyclesDFS(edge.target, flow, visited, recStack)) {
          return true;
        }
      } else if (recStack.has(edge.target)) {
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  /**
   * Get all connected nodes
   */
  private static getConnectedNodes(flow: Flow): Set<string> {
    const connected = new Set<string>();
    
    for (const edge of flow.edges) {
      connected.add(edge.source);
      connected.add(edge.target);
    }

    return connected;
  }
}

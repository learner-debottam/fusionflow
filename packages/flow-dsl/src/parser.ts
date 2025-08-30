import { Flow, FlowSchema } from './schema';

// Parser for Flow DSL
export class FlowParser {
  /**
   * Parse a flow from YAML string
   */
  static parseYaml(yamlString: string): Flow {
    try {
      // For now, we'll use a simple JSON parser
      // In a real implementation, you'd use js-yaml
      const parsed = JSON.parse(yamlString);
      return FlowSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse flow YAML: ${error}`);
    }
  }

  /**
   * Parse a flow from JSON string
   */
  static parseJson(jsonString: string): Flow {
    try {
      const parsed = JSON.parse(jsonString);
      return FlowSchema.parse(parsed);
    } catch (error) {
      throw new Error(`Failed to parse flow JSON: ${error}`);
    }
  }

  /**
   * Parse a flow from object
   */
  static parseObject(obj: unknown): Flow {
    try {
      return FlowSchema.parse(obj);
    } catch (error) {
      throw new Error(`Failed to parse flow object: ${error}`);
    }
  }
}

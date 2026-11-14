import { createSchemaEndpoint } from "@jdevalk/astro-seo-graph";
import { buildSchemaGraph } from "../../data/schema.js";

/**
 * Exposes the site's full JSON-LD knowledge graph as an endpoint for AI
 * crawlers and schema validators. There is a single "entry" (the landing
 * page) whose graph is the homepage's inline @graph, so the endpoint and the
 * page always agree.
 */
export const GET = createSchemaEndpoint({
  entries: async () => ["landing"],
  mapper: () => buildSchemaGraph()["@graph"],
});

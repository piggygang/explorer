import createClient from "openapi-fetch";
import type { components, paths } from "@/lib/api/schema";
import { dispatchMock } from "@/lib/api/mock/dispatch";

export type CollectionWithStats = components["schemas"]["CollectionWithStats"];

/**
 * The trait filter is a map of trait type to selected values, serialized as
 * one `trait[<Type>]=<Value>` pair per selection (normative in the spec).
 * openapi-fetch's default deepObject serializer would emit indexed brackets
 * for the arrays, so serialization is defined once here — for both modes, so
 * mock and real requests are byte-identical.
 */
function querySerializer(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (key === "trait" && typeof value === "object") {
      for (const [type, values] of Object.entries(value as Record<string, unknown>)) {
        for (const item of Array.isArray(values) ? values : [values]) {
          search.append(`trait[${type}]`, String(item));
        }
      }
    } else {
      search.set(key, String(value));
    }
  }
  return search.toString();
}

/**
 * Typed client over the indexer's v1 contract. `API_BASE_URL` (server-only,
 * read per call so tests and previews can differ) selects the real API;
 * unset, the same generated client runs against the in-process mock — it
 * still builds the full Request against a sentinel base URL, so switching to
 * the real thing changes nothing but the base.
 */
export function api() {
  const base = process.env.API_BASE_URL;
  return base
    ? createClient<paths>({ baseUrl: base, querySerializer })
    : createClient<paths>({
        baseUrl: "http://mock.internal/v1",
        fetch: dispatchMock,
        querySerializer,
      });
}

export async function listCollections(): Promise<CollectionWithStats[]> {
  const { data, response } = await api().GET("/collections");
  if (!data) throw new Error(`listCollections failed (${response.status})`);
  return data.data;
}

export async function getCollection(slug: string): Promise<CollectionWithStats | null> {
  const { data, response } = await api().GET("/collections/{slug}", {
    params: { path: { slug } },
  });
  if (response.status === 404) return null;
  if (!data) throw new Error(`getCollection(${slug}) failed (${response.status})`);
  return data.data;
}

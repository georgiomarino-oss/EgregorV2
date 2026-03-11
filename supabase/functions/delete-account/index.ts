import { createClient } from "npm:@supabase/supabase-js@2.58.0";

import { corsHeaders } from "../_shared/cors.ts";

const CONFIRMATION_TEXT = "DELETE";
const RETAINED_DATA_SUMMARY =
  "Some records may be retained where required for legal, billing, fraud prevention, security, moderation, or audit obligations. Operational analytics may be retained in de-identified form.";
const STORAGE_REMOVE_CHUNK_SIZE = 100;
const STORAGE_LIST_PAGE_SIZE = 500;

interface DeleteAccountRequest {
  confirmationText?: string;
  confirmPermanentDeletion?: boolean;
  requestSource?: string;
  requestedReason?: string;
}

interface DeleteAccountAuditRow {
  id: string;
  status: "completed" | "failed" | "started";
}

interface StorageObjectRow {
  bucket_id: string;
  name: string;
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim() ?? "";
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

function getSupabaseAdminClient() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function parseBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization")?.trim() ?? "";
  if (!authorization) {
    return null;
  }

  const matches = authorization.match(/^Bearer\s+(.+)$/i);
  if (!matches) {
    return null;
  }

  const token = matches[1]?.trim();
  return token || null;
}

function toJsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

function toErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") {
    return "Unknown error";
  }

  const row = error as { message?: string };
  return row.message?.trim() || "Unknown error";
}

function isMissingColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column") &&
    normalized.includes("does not exist")
  );
}

function chunkArray<T>(values: T[], size: number) {
  if (size <= 0) {
    return [values];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function normalizeStorageRows(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as StorageObjectRow[];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const row = entry as Record<string, unknown>;
      const bucketId =
        typeof row.bucket_id === "string" ? row.bucket_id.trim() : "";
      const objectName = typeof row.name === "string" ? row.name.trim() : "";
      if (!bucketId || !objectName) {
        return null;
      }

      return {
        bucket_id: bucketId,
        name: objectName,
      } satisfies StorageObjectRow;
    })
    .filter((entry): entry is StorageObjectRow => entry !== null);
}

async function listStorageObjectsByOwnerColumn(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  ownerColumn: "owner" | "owner_id",
) {
  const rows: StorageObjectRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await adminClient
      .schema("storage")
      .from("objects")
      .select("bucket_id,name")
      .eq(ownerColumn, userId)
      .order("name", { ascending: true })
      .range(from, from + STORAGE_LIST_PAGE_SIZE - 1);

    if (error) {
      const message = toErrorMessage(error);
      if (isMissingColumnError(message)) {
        return null;
      }
      throw new Error(`Failed to list owned storage objects: ${message}`);
    }

    const normalizedRows = normalizeStorageRows(data);
    rows.push(...normalizedRows);

    if (normalizedRows.length < STORAGE_LIST_PAGE_SIZE) {
      break;
    }

    from += STORAGE_LIST_PAGE_SIZE;
  }

  return rows;
}

async function listOwnedStorageObjects(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const ownerRows = await listStorageObjectsByOwnerColumn(
    adminClient,
    userId,
    "owner",
  );
  if (ownerRows) {
    return ownerRows;
  }

  const ownerIdRows = await listStorageObjectsByOwnerColumn(
    adminClient,
    userId,
    "owner_id",
  );
  if (ownerIdRows) {
    return ownerIdRows;
  }

  return [] as StorageObjectRow[];
}

async function removeOwnedStorageObjects(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const ownedRows = await listOwnedStorageObjects(adminClient, userId);
  if (ownedRows.length === 0) {
    return {
      bucketsTouched: [] as string[],
      removedObjectCount: 0,
    };
  }

  const dedupedRows = Array.from(
    new Map(
      ownedRows.map((row) => [`${row.bucket_id}/${row.name}`, row]),
    ).values(),
  );

  const groupedPaths = new Map<string, string[]>();
  for (const row of dedupedRows) {
    const existing = groupedPaths.get(row.bucket_id) ?? [];
    existing.push(row.name);
    groupedPaths.set(row.bucket_id, existing);
  }

  let removedObjectCount = 0;
  const bucketsTouched = Array.from(groupedPaths.keys()).sort();

  for (const bucketId of bucketsTouched) {
    const objectPaths = groupedPaths.get(bucketId) ?? [];
    for (const pathChunk of chunkArray(objectPaths, STORAGE_REMOVE_CHUNK_SIZE)) {
      const { error } = await adminClient.storage
        .from(bucketId)
        .remove(pathChunk);
      if (error) {
        throw new Error(
          `Failed to remove storage objects from bucket ${bucketId}: ${error.message}`,
        );
      }
      removedObjectCount += pathChunk.length;
    }
  }

  return {
    bucketsTouched,
    removedObjectCount,
  };
}

async function getExistingAuditRow(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await adminClient
    .from("account_deletion_audit_logs")
    .select("id,status")
    .eq("deleted_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to check account deletion audit state: ${error.message}`,
    );
  }

  if (!data || typeof data !== "object") {
    return null;
  }

  const row = data as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const status = typeof row.status === "string" ? row.status.trim() : "";
  if (!id || !status) {
    return null;
  }

  if (status !== "started" && status !== "completed" && status !== "failed") {
    return null;
  }

  return { id, status } satisfies DeleteAccountAuditRow;
}

async function insertStartedAuditRow(
  adminClient: ReturnType<typeof createClient>,
  input: {
    metadata: Record<string, unknown>;
    requestSource: string;
    requestedReason: string | null;
    userId: string;
  },
) {
  const { data, error } = await adminClient
    .from("account_deletion_audit_logs")
    .insert({
      metadata: input.metadata,
      request_source: input.requestSource,
      requested_reason: input.requestedReason,
      status: "started",
      deleted_user_id: input.userId,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create account deletion audit row: ${error.message}`);
  }

  const row = data as { id?: string } | null;
  if (!row?.id) {
    throw new Error("Account deletion audit row insert returned no id.");
  }

  return row.id;
}

async function updateAuditRow(
  adminClient: ReturnType<typeof createClient>,
  input: {
    auditId: string;
    cleanupSummary?: Record<string, unknown>;
    completed: boolean;
    failureDetail?: string | null;
    retainedDataSummary?: string;
    storageSummary?: Record<string, unknown>;
  },
) {
  const payload = input.completed
    ? {
        cleanup_summary: input.cleanupSummary ?? {},
        completed_at: new Date().toISOString(),
        failure_detail: null,
        retained_data_summary: input.retainedDataSummary ?? RETAINED_DATA_SUMMARY,
        status: "completed",
        storage_summary: input.storageSummary ?? {},
      }
    : {
        failure_detail: input.failureDetail ?? "Unknown account deletion failure",
        status: "failed",
      };

  const { error } = await adminClient
    .from("account_deletion_audit_logs")
    .update(payload)
    .eq("id", input.auditId);

  if (error) {
    throw new Error(`Failed to update account deletion audit row: ${error.message}`);
  }
}

function toObjectRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as Record<string, unknown>;
  }
  return value as Record<string, unknown>;
}

async function runRelationalCleanup(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await adminClient.rpc("run_account_deletion_cleanup", {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to clean user-owned relational data: ${error.message}`);
  }

  return toObjectRecord(data);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return toJsonResponse({ error: "Method not allowed" }, 405);
  }

  const adminClient = getSupabaseAdminClient();
  const accessToken = parseBearerToken(request);
  if (!accessToken) {
    return toJsonResponse({ error: "Missing bearer token" }, 401);
  }

  let payload: DeleteAccountRequest;
  try {
    payload = (await request.json()) as DeleteAccountRequest;
  } catch {
    return toJsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const confirmationText = payload.confirmationText?.trim().toUpperCase() ?? "";
  const confirmed = payload.confirmPermanentDeletion === true &&
    confirmationText === CONFIRMATION_TEXT;
  if (!confirmed) {
    return toJsonResponse(
      {
        error: "Deletion confirmation failed",
        detail: "confirmPermanentDeletion=true and confirmationText='DELETE' are required.",
      },
      400,
    );
  }

  const {
    data: userData,
    error: userError,
  } = await adminClient.auth.getUser(accessToken);

  if (userError || !userData.user) {
    return toJsonResponse(
      {
        error: "Authentication failed",
        detail: userError?.message ?? "Could not resolve authenticated user.",
      },
      401,
    );
  }

  const userId = userData.user.id;
  let auditId: string | null = null;

  try {
    const existingAudit = await getExistingAuditRow(adminClient, userId);
    if (existingAudit?.status === "started") {
      return toJsonResponse(
        {
          deleted: false,
          error: "Deletion already in progress",
        },
        409,
      );
    }

    if (existingAudit?.status === "completed") {
      return toJsonResponse(
        {
          alreadyDeleted: true,
          deleted: true,
          retainedDataSummary: RETAINED_DATA_SUMMARY,
        },
        200,
      );
    }

    const requestSource = payload.requestSource?.trim() || "in_app_self_service";
    const requestedReason = payload.requestedReason?.trim() || null;
    const requestMetadata = {
      confirmation_text: confirmationText,
      request_source: requestSource,
      request_user_agent: request.headers.get("user-agent"),
    } as Record<string, unknown>;

    auditId = await insertStartedAuditRow(adminClient, {
      metadata: requestMetadata,
      requestSource,
      requestedReason,
      userId,
    });

    const cleanupSummary = await runRelationalCleanup(adminClient, userId);
    const storageSummary = await removeOwnedStorageObjects(adminClient, userId);

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(
      userId,
      false,
    );
    if (deleteUserError) {
      throw new Error(`Auth deletion failed: ${deleteUserError.message}`);
    }

    if (auditId) {
      await updateAuditRow(adminClient, {
        auditId,
        cleanupSummary,
        completed: true,
        retainedDataSummary: RETAINED_DATA_SUMMARY,
        storageSummary,
      });
    }

    return toJsonResponse(
      {
        alreadyDeleted: false,
        deleted: true,
        deletedAt: new Date().toISOString(),
        retainedDataSummary: RETAINED_DATA_SUMMARY,
      },
      200,
    );
  } catch (error) {
    if (auditId) {
      try {
        await updateAuditRow(adminClient, {
          auditId,
          completed: false,
          failureDetail: toErrorMessage(error),
        });
      } catch {
        // Avoid overriding the original error response with audit update failures.
      }
    }

    return toJsonResponse(
      {
        error: "Account deletion failed",
        detail: toErrorMessage(error),
      },
      500,
    );
  }
});

"use client";

import * as React from "react";
import type { Address } from "viem";
import {
  listCovenants,
  getVaultEvents,
  VAULT_ADDRESS,
  type PaymentEvent,
  type CovenantCreatedEvent,
} from "@/lib/flare/vault";
import { getXrpUsdPrice } from "@/lib/flare/ftso";
import { toDisplayCovenant, type DisplayCovenant } from "@/lib/covenant-view";

const VAULT_DEPLOYED = !!VAULT_ADDRESS;

export function useVaultDeployed() {
  return VAULT_DEPLOYED;
}

export function useCovenants(owner?: Address) {
  const [covenants, setCovenants] = React.useState<DisplayCovenant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const refetch = React.useCallback(async () => {
    if (!owner || !VAULT_DEPLOYED) return;
    setLoading(true);
    setError(undefined);
    try {
      const raw = await listCovenants(owner);
      setCovenants(raw.map((c) => toDisplayCovenant(c.id, c)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [owner]);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return { covenants, loading, error, refetch };
}

export interface AuditEvent {
  kind: "payment" | "covenant_created";
  covenantId: bigint;
  transactionHash: string;
  blockNumber: bigint;
  timestamp: number; // unix seconds, from the log itself
  payment?: PaymentEvent;
  created?: CovenantCreatedEvent;
}

export function useAuditLog() {
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();

  const refetch = React.useCallback(async () => {
    if (!VAULT_DEPLOYED) return;
    setLoading(true);
    setError(undefined);
    try {
      const { payments, created } = await getVaultEvents();
      const merged: AuditEvent[] = [
        ...payments.map((p) => ({
          kind: "payment" as const,
          covenantId: p.covenantId,
          transactionHash: p.transactionHash,
          blockNumber: p.blockNumber,
          timestamp: p.timestamp,
          payment: p,
        })),
        ...created.map((c) => ({
          kind: "covenant_created" as const,
          covenantId: c.covenantId,
          transactionHash: c.transactionHash,
          blockNumber: c.blockNumber,
          timestamp: c.timestamp,
          created: c,
        })),
      ].sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEvents(merged);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return { events, loading, error, refetch };
}

export function useFtsoPrice() {
  const [priceWei, setPriceWei] = React.useState<bigint>();
  const [timestamp, setTimestamp] = React.useState<number>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>();

  const refetch = React.useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const p = await getXrpUsdPrice();
      setPriceWei(p.priceWei);
      setTimestamp(p.timestamp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refetch();
  }, [refetch]);

  return { priceWei, timestamp, loading, error, refetch };
}

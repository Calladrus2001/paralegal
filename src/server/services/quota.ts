import type { Request, Response } from "express";
import { redis } from "../clients/redis";
import type { QuotaInfo } from "../../types/quota";

export const DAILY_QUOTA_LIMIT = 100;
const KEY_TTL_SECONDS = 172800;

const DEDUCT_LUA_SCRIPT = `
local key = KEYS[1]
local defaultLimit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

local exists = redis.call('EXISTS', key)
if exists == 0 then
    local newVal = defaultLimit - 1
    redis.call('SET', key, newVal, 'EX', ttl)
    return newVal
else
    local current = tonumber(redis.call('GET', key)) or 0
    if current > 0 then
        local newVal = redis.call('DECR', key)
        return newVal
    else
        return 0
    end
end
`;

class QuotaServiceImpl {
  private subscribers = new Set<Response>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  public getDailyKey(date: Date = new Date()): string {
    const utcDate = date.toISOString().slice(0, 10);
    return `quota:daily:${utcDate}`;
  }

  public getNextResetTime(date: Date = new Date()): string {
    const nextUtc = new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate() + 1,
        0,
        0,
        0,
        0
      )
    );
    return nextUtc.toISOString();
  }

  public async getQuota(): Promise<QuotaInfo> {
    const key = this.getDailyKey();
    const rawVal = await redis.get(key);

    let remaining: number;
    if (rawVal === null) {
      remaining = DAILY_QUOTA_LIMIT;
    } else {
      remaining = Math.max(0, parseInt(rawVal, 10) || 0);
    }

    return {
      remaining,
      total: DAILY_QUOTA_LIMIT,
      resetsAt: this.getNextResetTime(),
    };
  }

  public async hasQuota(): Promise<boolean> {
    const quota = await this.getQuota();
    return quota.remaining > 0;
  }

  public async deductQuota(): Promise<QuotaInfo> {
    const key = this.getDailyKey();
    const remaining = (await redis.eval(
      DEDUCT_LUA_SCRIPT,
      1,
      key,
      DAILY_QUOTA_LIMIT.toString(),
      KEY_TTL_SECONDS.toString()
    )) as number;

    const quotaInfo: QuotaInfo = {
      remaining: Math.max(0, remaining),
      total: DAILY_QUOTA_LIMIT,
      resetsAt: this.getNextResetTime(),
    };

    this.broadcastQuota(quotaInfo);
    return quotaInfo;
  }

  public async addSubscriber(req: Request, res: Response): Promise<void> {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    this.subscribers.add(res);

    try {
      const currentQuota = await this.getQuota();
      res.write(`data: ${JSON.stringify(currentQuota)}\n\n`);
    } catch (err) {
      console.error("[QuotaService] Failed to send initial quota snapshot:", err);
    }

    const cleanup = () => {
      this.subscribers.delete(res);
    };

    req.on("close", cleanup);
    res.on("error", cleanup);
  }

  public broadcastQuota(quota: QuotaInfo): void {
    const message = `data: ${JSON.stringify(quota)}\n\n`;
    for (const client of this.subscribers) {
      try {
        client.write(message);
      } catch {
        this.subscribers.delete(client);
      }
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.subscribers) {
        try {
          client.write(": keep-alive\n\n");
        } catch {
          this.subscribers.delete(client);
        }
      }
    }, 30000);

    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }
}

export const QuotaService = new QuotaServiceImpl();

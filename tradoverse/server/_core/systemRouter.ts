import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { getAlpacaStreamStatus, subscribeToSymbols, unsubscribeFromSymbols, reconnectAlpacaStream } from "../services/alpacaWebSocket";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Alpaca WebSocket stream status
  alpacaStreamStatus: publicProcedure
    .query(() => {
      return getAlpacaStreamStatus();
    }),

  // Subscribe to Alpaca stream symbols
  subscribeAlpacaSymbols: publicProcedure
    .input(z.object({
      symbols: z.array(z.string()).min(1),
    }))
    .mutation(({ input }) => {
      subscribeToSymbols(input.symbols);
      return { success: true, symbols: input.symbols };
    }),

  // Unsubscribe from Alpaca stream symbols
  unsubscribeAlpacaSymbols: publicProcedure
    .input(z.object({
      symbols: z.array(z.string()).min(1),
    }))
    .mutation(({ input }) => {
      unsubscribeFromSymbols(input.symbols);
      return { success: true, symbols: input.symbols };
    }),

  // Reconnect Alpaca stream
  reconnectAlpacaStream: adminProcedure
    .mutation(() => {
      reconnectAlpacaStream();
      return { success: true };
    }),
});
